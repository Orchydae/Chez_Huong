export class AddCommentCommand {
    constructor(
        public readonly userId: string,
        public readonly recipeId: number,
        public readonly content: string,
        public readonly parentId?: number,
    ) { }
}
