export class Comment {
    constructor(
        public readonly id: number,
        public readonly content: string,
        public readonly createdAt: Date,
        public readonly userId: string,
        public readonly recipeId: number,
        public readonly parentId: number | null = null,
        public readonly replies: Comment[] = [],
    ) { }
}
