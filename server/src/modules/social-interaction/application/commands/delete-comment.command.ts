export class DeleteCommentCommand {
    constructor(
        public readonly commentId: number,
        public readonly userId: string,
    ) { }
}
