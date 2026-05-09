import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { UsdaPort, UsdaFoodMatch, UsdaNutritionData, UsdaPortionData } from '../../../domain/ports/usda.port';

interface UsdaSearchResponse {
    foods: Array<{
        fdcId: number;
        description: string;
        additionalDescriptions?: string;
        dataType?: string;
    }>;
}

interface UsdaFoodNutrient {
    nutrient: {
        id: number;
        name: string;
        unitName: string;
    };
    amount?: number;
}

interface UsdaFoodPortion {
    gramWeight?: number;
    modifier?: string;           // e.g., "10205" (portion code)
    portionDescription?: string; // e.g., "1 cup, halves"
    measureUnit?: {
        name?: string;           // e.g., "cup"
        abbreviation?: string;
    };
}

interface UsdaFoodResponse {
    fdcId: number;
    description: string;
    foodNutrients: UsdaFoodNutrient[];
    foodPortions?: UsdaFoodPortion[];
    // For branded foods
    servingSize?: number;
    servingSizeUnit?: string;
    householdServingFullText?: string;
}

// USDA Nutrient ID mapping
const NUTRIENT_IDS = {
    CALORIES: 1008,
    PROTEIN: 1003,
    TOTAL_FAT: 1004,
    CARBOHYDRATES: 1005,
    FIBER: 1079,
    SUGAR: 2000,
    SATURATED_FAT: 1258,
    MONOUNSAT_FAT: 1292,
    POLYUNSAT_FAT: 1293,
    TRANS_FAT: 1257,
    CHOLESTEROL: 1253,
    SODIUM: 1093,
    POTASSIUM: 1092,
    CALCIUM: 1087,
    IRON: 1089,
    MAGNESIUM: 1090,
    ZINC: 1095,
    VITAMIN_A: 1106,
    VITAMIN_C: 1162,
    VITAMIN_D: 1114,
    VITAMIN_E: 1109,
    VITAMIN_K: 1185,
    VITAMIN_B6: 1175,
    VITAMIN_B12: 1178,
    FOLATE: 1177,
} as const;

@Injectable()
export class UsdaAdapter implements UsdaPort {
    private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1';

    constructor(
        private readonly httpService: HttpService,
        @Inject('USDA_API_KEY') private readonly apiKey: string,
    ) { }

    async searchFoods(query: string, maxResults = 5): Promise<UsdaFoodMatch[]> {
        try {
            const response = await this.httpService.axiosRef.get<UsdaSearchResponse>(
                `${this.baseUrl}/foods/search`,
                {
                    params: {
                        api_key: this.apiKey,
                        query,
                        pageSize: maxResults,
                    },
                },
            );

            if (!response.data.foods || response.data.foods.length === 0) {
                return [];
            }

            return response.data.foods.map(food => ({
                fdcId: food.fdcId,
                name: food.description,
                description: food.additionalDescriptions,
                dataType: food.dataType,
            }));
        } catch (error: any) {
            console.error('USDA API search failed:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw new Error(`Failed to search USDA database: ${error.message}`);
        }
    }

    async getFoodNutrition(fdcId: number): Promise<UsdaNutritionData> {
        try {
            const response = await this.httpService.axiosRef.get<UsdaFoodResponse>(
                `${this.baseUrl}/food/${fdcId}`,
                {
                    params: {
                        api_key: this.apiKey,
                        format: 'full',
                    },
                },
            );

            const nutrients = response.data.foodNutrients;
            return this.mapNutrients(nutrients);
        } catch (error: any) {
            console.error('USDA API get food failed:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            throw new Error(`Failed to get food nutrition from USDA: ${error.message}`);
        }
    }

    async getFoodPortions(fdcId: number): Promise<UsdaPortionData[]> {
        try {
            const response = await this.httpService.axiosRef.get<UsdaFoodResponse>(
                `${this.baseUrl}/food/${fdcId}`,
                {
                    params: {
                        api_key: this.apiKey,
                        format: 'full',
                    },
                },
            );

            const portions: UsdaPortionData[] = [];

            // Extract from foodPortions array (Foundation/Survey foods)
            if (response.data.foodPortions && response.data.foodPortions.length > 0) {
                for (const portion of response.data.foodPortions) {
                    if (!portion.gramWeight || portion.gramWeight <= 0) continue;

                    // Try to get portion name from various fields
                    const portionName = this.extractPortionName(portion);
                    if (!portionName) continue;

                    const normalizedName = this.normalizePortionName(portionName);
                    if (!normalizedName) continue;

                    // Avoid duplicates
                    if (!portions.find(p => p.portionName === normalizedName)) {
                        portions.push({
                            portionName: normalizedName,
                            gramWeight: portion.gramWeight,
                        });
                    }
                }
            }

            // For branded foods, try servingSize
            if (portions.length === 0 && response.data.servingSize && response.data.servingSizeUnit === 'g') {
                const servingText = response.data.householdServingFullText;
                if (servingText) {
                    const normalizedName = this.normalizePortionName(servingText);
                    if (normalizedName) {
                        portions.push({
                            portionName: normalizedName,
                            gramWeight: response.data.servingSize,
                        });
                    }
                }
            }

            return portions;
        } catch (error: any) {
            console.error('USDA API get food portions failed:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
            });
            // Return empty array instead of throwing - portions are optional
            return [];
        }
    }

    private extractPortionName(portion: UsdaFoodPortion): string | null {
        // Priority: measureUnit.name > parsed from portionDescription
        if (portion.measureUnit?.name && portion.measureUnit.name !== 'undetermined') {
            return portion.measureUnit.name;
        }

        // Try to parse from portionDescription (e.g., "1 cup, halves" -> "cup")
        if (portion.portionDescription) {
            const match = portion.portionDescription.match(/^[\d\.]+\s+([a-zA-Z]+)/i);
            if (match) {
                return match[1];
            }
            // Check for size descriptors like "large", "medium", "small"
            const sizeMatch = portion.portionDescription.match(/\b(large|medium|small|extra large|extra small)\b/i);
            if (sizeMatch) {
                return sizeMatch[1].toLowerCase();
            }
        }

        return null;
    }

    private normalizePortionName(name: string): string | null {
        const normalized = name.toLowerCase().trim();

        // Common aliases
        const aliases: Record<string, string> = {
            'cups': 'cup',
            'tablespoons': 'tbsp',
            'tablespoon': 'tbsp',
            'teaspoons': 'tsp',
            'teaspoon': 'tsp',
            'ounces': 'oz',
            'ounce': 'oz',
            'pounds': 'lb',
            'pound': 'lb',
            'grams': 'g',
            'gram': 'g',
            'kilograms': 'kg',
            'kilogram': 'kg',
            'milliliters': 'ml',
            'milliliter': 'ml',
            'liters': 'l',
            'liter': 'l',
            'extra large': 'extra-large',
            'extra small': 'extra-small',
        };

        return aliases[normalized] || normalized;
    }

    private mapNutrients(nutrients: UsdaFoodNutrient[]): UsdaNutritionData {
        const getNutrient = (id: number): number | undefined => {
            const nutrient = nutrients.find(n => n.nutrient.id === id);
            return nutrient?.amount;
        };

        return {
            // Macronutrients
            calories: getNutrient(NUTRIENT_IDS.CALORIES),
            protein: getNutrient(NUTRIENT_IDS.PROTEIN),
            carbohydrates: getNutrient(NUTRIENT_IDS.CARBOHYDRATES),
            fiber: getNutrient(NUTRIENT_IDS.FIBER),
            sugar: getNutrient(NUTRIENT_IDS.SUGAR),

            // Fats
            totalFat: getNutrient(NUTRIENT_IDS.TOTAL_FAT),
            saturatedFat: getNutrient(NUTRIENT_IDS.SATURATED_FAT),
            monounsatFat: getNutrient(NUTRIENT_IDS.MONOUNSAT_FAT),
            polyunsatFat: getNutrient(NUTRIENT_IDS.POLYUNSAT_FAT),
            transFat: getNutrient(NUTRIENT_IDS.TRANS_FAT),
            cholesterol: getNutrient(NUTRIENT_IDS.CHOLESTEROL),

            // Minerals
            sodium: getNutrient(NUTRIENT_IDS.SODIUM),
            potassium: getNutrient(NUTRIENT_IDS.POTASSIUM),
            calcium: getNutrient(NUTRIENT_IDS.CALCIUM),
            iron: getNutrient(NUTRIENT_IDS.IRON),
            magnesium: getNutrient(NUTRIENT_IDS.MAGNESIUM),
            zinc: getNutrient(NUTRIENT_IDS.ZINC),

            // Vitamins
            vitaminA: getNutrient(NUTRIENT_IDS.VITAMIN_A),
            vitaminC: getNutrient(NUTRIENT_IDS.VITAMIN_C),
            vitaminD: getNutrient(NUTRIENT_IDS.VITAMIN_D),
            vitaminE: getNutrient(NUTRIENT_IDS.VITAMIN_E),
            vitaminK: getNutrient(NUTRIENT_IDS.VITAMIN_K),
            vitaminB6: getNutrient(NUTRIENT_IDS.VITAMIN_B6),
            vitaminB12: getNutrient(NUTRIENT_IDS.VITAMIN_B12),
            folate: getNutrient(NUTRIENT_IDS.FOLATE),
        };
    }
}

