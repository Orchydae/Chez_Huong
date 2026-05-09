export class LikeRecipeCommand {
    constructor(
        public readonly userId: string,
        public readonly recipeId: number,
    ) { }
}
