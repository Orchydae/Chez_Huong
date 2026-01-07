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
    ) { }
}
