export interface NutritionalInfo {
    calories?: number | null;
    protein?: number | null;
    carbohydrates?: number | null;
    fiber?: number | null;
    sugar?: number | null;
    totalFat?: number | null;
    saturatedFat?: number | null;
    monounsatFat?: number | null;
    polyunsatFat?: number | null;
    transFat?: number | null;
    cholesterol?: number | null;
    sodium?: number | null;
    potassium?: number | null;
    calcium?: number | null;
    iron?: number | null;
    magnesium?: number | null;
    zinc?: number | null;
    vitaminA?: number | null;
    vitaminC?: number | null;
    vitaminD?: number | null;
    vitaminE?: number | null;
    vitaminK?: number | null;
    vitaminB6?: number | null;
    vitaminB12?: number | null;
    folate?: number | null;
}


/**
 * Fixed dietary restriction/particularity types
 */
export enum ParticularityType {
    VEGETARIAN = 'VEGETARIAN',
    VEGAN = 'VEGAN',
    GLUTEN_FREE = 'GLUTEN_FREE',
    DAIRY_FREE = 'DAIRY_FREE',
    NUT_FREE = 'NUT_FREE',
    EGG_FREE = 'EGG_FREE',
    SEAFOOD_FREE = 'SEAFOOD_FREE',
    SOY_FREE = 'SOY_FREE',
    HALAL = 'HALAL',
    KOSHER = 'KOSHER',
    LOW_SODIUM = 'LOW_SODIUM',
    LOW_SUGAR = 'LOW_SUGAR',
    LOW_CARB = 'LOW_CARB',
    HIGH_PROTEIN = 'HIGH_PROTEIN',
}

export enum TimeUnit {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
}

export class Recipe {
    constructor(
        public id: number,
        public title: string,
        public title_fr: string | null,
        public description: string | null,
        public description_fr: string | null,
        public prepTime: number,
        public prepTimeUnit: TimeUnit,
        public cookTime: number,
        public cookTimeUnit: TimeUnit,
        public difficulty: string,
        public type: string,
        public cuisine: string,
        public servings: number,
        public authorId: string,
        public nutritionalInfo?: NutritionalInfo | null,
        public particularities?: ParticularityType[],
    ) { }
}

