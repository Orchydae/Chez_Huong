import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
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

    async searchFoods(query: string, maxResults = 5): Promise<UsdaFoodMatch[]> {
        try {
            const response = await this.http.axiosRef.get<UsdaSearchResponse>(
                `${this.baseUrl}/foods/search`,
                {
                    params: {
                        api_key: this.apiKey,
                        query,
                        pageSize: maxResults,
                        // USDA accepts a comma-separated dataType filter on GET.
                        dataType: ALLOWED_DATA_TYPES.join(','),
                    },
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
            const response = await this.http.axiosRef.get<UsdaFoodResponse>(
                `${this.baseUrl}/food/${fdcId}`,
                { params: { api_key: this.apiKey, format: 'full' } },
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
            const response = await this.http.axiosRef.get<UsdaFoodResponse>(
                `${this.baseUrl}/food/${fdcId}`,
                { params: { api_key: this.apiKey, format: 'full' } },
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
