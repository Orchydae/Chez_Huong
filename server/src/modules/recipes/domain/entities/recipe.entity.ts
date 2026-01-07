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


export class Recipe {
    constructor(
        public id: number,
        public title: string,
        public description: string | null,
        public prepTime: number,
        public cookTime: number,
        public difficulty: string,
        public type: string,
        public cuisine: string,
        public servings: number,
        public authorId: string,
        public nutritionalInfo?: NutritionalInfo | null,
    ) { }
}

