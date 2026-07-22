import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { NutrientValues } from './nutrient-values';

export interface UsdaFoodMatch {
    fdcId: number;
    name: string;
    description?: string;
    dataType?: string;
}

export interface UsdaPortionData {
    portionName: string;    // e.g. "cup", "tbsp", "large"
    gramWeight: number;     // grams per 1 unit of this portion
}

export type UsdaNutritionData = Partial<NutrientValues>;

interface UsdaSearchResponse {
    foods: Array<{
        fdcId: number;
        description: string;
        additionalDescriptions?: string;
        dataType?: string;
    }>;
}

interface UsdaFoodNutrient {
    nutrient: { id: number; name: string; unitName: string };
    amount?: number;
}

interface UsdaFoodPortion {
    gramWeight?: number;
    modifier?: string;
    portionDescription?: string;
    measureUnit?: { name?: string; abbreviation?: string };
}

interface UsdaFoodResponse {
    fdcId: number;
    description: string;
    foodNutrients: UsdaFoodNutrient[];
    foodPortions?: UsdaFoodPortion[];
    servingSize?: number;
    servingSizeUnit?: string;
    householdServingFullText?: string;
}

/**
 * USDA's gateway (nginx) returns 400 on un-encoded parentheses, and axios's
 * default serializer leaves `(`/`)` literal — so a dataType filter like
 * "Survey (FNDDS)" breaks EVERY search. URLSearchParams percent-encodes parens
 * (and commas/spaces) strictly, which USDA accepts. Numbers are coerced to
 * strings so `pageSize` serializes cleanly.
 */
function usdaParamsSerializer(params: Record<string, string | number | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.append(key, String(value));
    }
    return search.toString();
}

/** Extracts the bits we want to log from an axios error without spreading `any` through the codebase. */
function describeAxiosError(error: unknown): { message: string; status?: number; data?: unknown } {
    if (typeof error !== 'object' || error === null) {
        return { message: String(error) };
    }
    const e = error as { message?: string; response?: { status?: number; data?: unknown } };
    return {
        message: e.message ?? 'Unknown error',
        status: e.response?.status,
        data: e.response?.data,
    };
}

// USDA's nginx gateway intermittently rejects perfectly well-formed requests
// (~1 in 6 in practice), so every call is retried a few times with a short
// backoff. Two ceilings keep a hung/slow gateway from stalling the live-typing
// picker: each attempt is time-boxed (USDA_PER_ATTEMPT_TIMEOUT_MS), AND the whole
// retry sequence is bounded by an overall wall-clock deadline
// (USDA_TOTAL_DEADLINE_MS) so the timeouts can't stack. The instant gateway-400s
// this targets fail fast and never approach either ceiling.
const USDA_MAX_ATTEMPTS = 3;
const USDA_RETRY_BACKOFF_MS = 200;
const USDA_PER_ATTEMPT_TIMEOUT_MS = 5_000;
const USDA_TOTAL_DEADLINE_MS = 8_000;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Which failures are worth retrying. The gateway's spurious 400s arrive with an
 * HTML body (a raw string once axios gives up parsing it), whereas the API's own
 * validation errors come back as parsed JSON (an object) — so a string body on a
 * 400 is the tell-tale of the flaky gateway. Rate-limits (429), 5xx, and
 * network/timeout errors (no response at all) are transient too; a genuine JSON
 * 4xx is not.
 */
function isTransientUsdaError(error: unknown): boolean {
    const e = error as { response?: { status?: number; data?: unknown } };
    const status = e.response?.status;
    if (status === undefined) return true; // no response: network error / timeout
    if (status === 429 || status >= 500) return true;
    if (status === 400) return typeof e.response?.data === 'string';
    return false;
}

/**
 * USDA `dataType`s we accept — generic, lab-analysed/reference foods only.
 * "Branded" (label data for commercial products) is deliberately excluded so
 * the shared ingredient catalogue stays brand-free.
 */
const ALLOWED_DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'] as const;

const NUTRIENT_IDS = {
    CALORIES: 1008, PROTEIN: 1003, TOTAL_FAT: 1004, CARBOHYDRATES: 1005,
    FIBER: 1079, SUGAR: 2000,
    SATURATED_FAT: 1258, MONOUNSAT_FAT: 1292, POLYUNSAT_FAT: 1293, TRANS_FAT: 1257,
    CHOLESTEROL: 1253, SODIUM: 1093, POTASSIUM: 1092, CALCIUM: 1087, IRON: 1089,
    MAGNESIUM: 1090, ZINC: 1095,
    VITAMIN_A: 1106, VITAMIN_C: 1162, VITAMIN_D: 1114, VITAMIN_E: 1109, VITAMIN_K: 1185,
    VITAMIN_B6: 1175, VITAMIN_B12: 1178, FOLATE: 1177,
} as const;

/**
 * Thin HTTP client for the USDA FoodData Central API. Used by the
 * ingredients module to search for foods, fetch their nutrition (per 100g),
 * and pull portion data (unit → gram conversions).
 */
@Injectable()
export class UsdaService {
    private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1';
    private readonly apiKey: string;

    constructor(
        private readonly http: HttpService,
        config: ConfigService,
    ) {
        const key = config.get<string>('USDA_API_KEY');
        if (!key) throw new Error('USDA_API_KEY environment variable is not set');
        this.apiKey = key;
    }

    /**
     * GET the USDA API, retrying transient failures (see isTransientUsdaError)
     * with a short escalating backoff. Two ceilings bound total latency so a hung
     * gateway can't stall the picker: a per-attempt timeout AND an overall
     * deadline across all attempts (each attempt gets whatever time is left, so
     * the timeouts never stack). Non-transient errors are thrown at once; the last
     * error is re-thrown once the deadline or attempt budget is spent, so callers
     * still log and handle it exactly as before.
     */
    private async getWithRetry<T>(
        url: string,
        config: AxiosRequestConfig,
        attempts = USDA_MAX_ATTEMPTS,
    ): Promise<AxiosResponse<T>> {
        const deadline = Date.now() + USDA_TOTAL_DEADLINE_MS;
        let lastError: unknown;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) break;
            // cap this attempt at whatever the overall deadline still allows
            const timeout = Math.min(USDA_PER_ATTEMPT_TIMEOUT_MS, remaining);
            try {
                return await this.http.axiosRef.get<T>(url, { timeout, ...config });
            } catch (error: unknown) {
                lastError = error;
                if (attempt === attempts || !isTransientUsdaError(error)) throw error;
                const backoff = USDA_RETRY_BACKOFF_MS * attempt;
                if (Date.now() + backoff >= deadline) break; // no point sleeping past the deadline
                await delay(backoff);
            }
        }
        throw lastError;
    }

    async searchFoods(query: string, maxResults = 5): Promise<UsdaFoodMatch[]> {
        try {
            const response = await this.getWithRetry<UsdaSearchResponse>(
                `${this.baseUrl}/foods/search`,
                {
                    params: {
                        api_key: this.apiKey,
                        query,
                        pageSize: maxResults,
                        // USDA accepts a comma-separated dataType filter on GET.
                        dataType: ALLOWED_DATA_TYPES.join(','),
                    },
                    // strict encoding — "Survey (FNDDS)" has parens USDA's gateway
                    // 400s on unless percent-encoded (see usdaParamsSerializer)
                    paramsSerializer: usdaParamsSerializer,
                },
            );
            if (!response.data.foods?.length) return [];
            return response.data.foods
                // Defensive: keep generic foods only even if the API ignores the filter.
                .filter(food => !food.dataType || (ALLOWED_DATA_TYPES as readonly string[]).includes(food.dataType))
                .map(food => ({
                    fdcId: food.fdcId,
                    name: food.description,
                    description: food.additionalDescriptions,
                    dataType: food.dataType,
                }));
        } catch (error: unknown) {
            const info = describeAxiosError(error);
            console.error('USDA API search failed:', info);
            throw new Error(`Failed to search USDA database: ${info.message}`, { cause: error });
        }
    }

    async getFoodNutrition(fdcId: number): Promise<UsdaNutritionData> {
        try {
            const response = await this.getWithRetry<UsdaFoodResponse>(
                `${this.baseUrl}/food/${fdcId}`,
                { params: { api_key: this.apiKey, format: 'full' }, paramsSerializer: usdaParamsSerializer },
            );
            return this.mapNutrients(response.data.foodNutrients);
        } catch (error: unknown) {
            const info = describeAxiosError(error);
            console.error('USDA API get food failed:', info);
            throw new Error(`Failed to get food nutrition from USDA: ${info.message}`, { cause: error });
        }
    }

    async getFoodPortions(fdcId: number): Promise<UsdaPortionData[]> {
        try {
            const response = await this.getWithRetry<UsdaFoodResponse>(
                `${this.baseUrl}/food/${fdcId}`,
                { params: { api_key: this.apiKey, format: 'full' }, paramsSerializer: usdaParamsSerializer },
            );

            const portions: UsdaPortionData[] = [];

            if (response.data.foodPortions?.length) {
                for (const portion of response.data.foodPortions) {
                    if (!portion.gramWeight || portion.gramWeight <= 0) continue;
                    const portionName = this.extractPortionName(portion);
                    if (!portionName) continue;
                    const normalizedName = this.normalizePortionName(portionName);
                    if (!normalizedName) continue;
                    if (!portions.find(p => p.portionName === normalizedName)) {
                        portions.push({ portionName: normalizedName, gramWeight: portion.gramWeight });
                    }
                }
            }

            // Branded foods sometimes only have servingSize + householdServingFullText.
            if (portions.length === 0 && response.data.servingSize && response.data.servingSizeUnit === 'g') {
                const servingText = response.data.householdServingFullText;
                if (servingText) {
                    const normalizedName = this.normalizePortionName(servingText);
                    if (normalizedName) {
                        portions.push({ portionName: normalizedName, gramWeight: response.data.servingSize });
                    }
                }
            }

            return portions;
        } catch (error: unknown) {
            console.error('USDA API get food portions failed:', describeAxiosError(error));
            return [];
        }
    }

    private extractPortionName(portion: UsdaFoodPortion): string | null {
        if (portion.measureUnit?.name && portion.measureUnit.name !== 'undetermined') {
            return portion.measureUnit.name;
        }
        if (portion.portionDescription) {
            const m = portion.portionDescription.match(/^[\d.]+\s+([a-zA-Z]+)/i);
            if (m) return m[1];
            const sizeMatch = portion.portionDescription.match(/\b(large|medium|small|extra large|extra small)\b/i);
            if (sizeMatch) return sizeMatch[1].toLowerCase();
        }
        return null;
    }

    private normalizePortionName(name: string): string | null {
        const normalized = name.toLowerCase().trim();
        const aliases: Record<string, string> = {
            cups: 'cup',
            tablespoons: 'tbsp', tablespoon: 'tbsp',
            teaspoons: 'tsp', teaspoon: 'tsp',
            ounces: 'oz', ounce: 'oz',
            pounds: 'lb', pound: 'lb',
            grams: 'g', gram: 'g',
            kilograms: 'kg', kilogram: 'kg',
            milliliters: 'ml', milliliter: 'ml',
            liters: 'l', liter: 'l',
            'extra large': 'extra-large',
            'extra small': 'extra-small',
            // keep count-based portion names aligned with the calculator's
            // UNIT_ALIASES so a recipe unit of "pcs" matches stored "piece" data
            pc: 'piece', pcs: 'piece', pieces: 'piece',
            units: 'unit',
        };
        return aliases[normalized] || normalized;
    }

    private mapNutrients(nutrients: UsdaFoodNutrient[]): UsdaNutritionData {
        const get = (id: number) => nutrients.find(n => n.nutrient.id === id)?.amount;
        return {
            calories: get(NUTRIENT_IDS.CALORIES),
            protein: get(NUTRIENT_IDS.PROTEIN),
            carbohydrates: get(NUTRIENT_IDS.CARBOHYDRATES),
            fiber: get(NUTRIENT_IDS.FIBER),
            sugar: get(NUTRIENT_IDS.SUGAR),
            totalFat: get(NUTRIENT_IDS.TOTAL_FAT),
            saturatedFat: get(NUTRIENT_IDS.SATURATED_FAT),
            monounsatFat: get(NUTRIENT_IDS.MONOUNSAT_FAT),
            polyunsatFat: get(NUTRIENT_IDS.POLYUNSAT_FAT),
            transFat: get(NUTRIENT_IDS.TRANS_FAT),
            cholesterol: get(NUTRIENT_IDS.CHOLESTEROL),
            sodium: get(NUTRIENT_IDS.SODIUM),
            potassium: get(NUTRIENT_IDS.POTASSIUM),
            calcium: get(NUTRIENT_IDS.CALCIUM),
            iron: get(NUTRIENT_IDS.IRON),
            magnesium: get(NUTRIENT_IDS.MAGNESIUM),
            zinc: get(NUTRIENT_IDS.ZINC),
            vitaminA: get(NUTRIENT_IDS.VITAMIN_A),
            vitaminC: get(NUTRIENT_IDS.VITAMIN_C),
            vitaminD: get(NUTRIENT_IDS.VITAMIN_D),
            vitaminE: get(NUTRIENT_IDS.VITAMIN_E),
            vitaminK: get(NUTRIENT_IDS.VITAMIN_K),
            vitaminB6: get(NUTRIENT_IDS.VITAMIN_B6),
            vitaminB12: get(NUTRIENT_IDS.VITAMIN_B12),
            folate: get(NUTRIENT_IDS.FOLATE),
        };
    }
}
