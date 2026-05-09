import { Comment } from './comment.entity';

describe('Comment Entity', () => {
    describe('constructor', () => {
        it('should create a Comment with all required properties', () => {
            const createdAt = new Date('2024-01-01T12:00:00Z');
            const comment = new Comment(
                1,
                'Great recipe!',
                createdAt,
                'user-123',
                100,
            );

            expect(comment.id).toBe(1);
            expect(comment.content).toBe('Great recipe!');
            expect(comment.createdAt).toEqual(createdAt);
            expect(comment.userId).toBe('user-123');
            expect(comment.recipeId).toBe(100);
            expect(comment.parentId).toBeNull();
            expect(comment.replies).toEqual([]);
        });

        it('should create a Comment with parentId (reply)', () => {
            const createdAt = new Date();
            const comment = new Comment(
                2,
                'I agree!',
                createdAt,
                'user-456',
                100,
                1, // parentId
            );

            expect(comment.id).toBe(2);
            expect(comment.parentId).toBe(1);
            expect(comment.replies).toEqual([]);
        });

        it('should create a Comment with nested replies', () => {
            const createdAt = new Date();
            const reply = new Comment(2, 'Reply content', createdAt, 'user-456', 100, 1);
            const parentComment = new Comment(
                1,
                'Parent content',
                createdAt,
                'user-123',
                100,
                null,
                [reply],
            );

            expect(parentComment.replies).toHaveLength(1);
            expect(parentComment.replies[0]).toBe(reply);
            expect(parentComment.replies[0].parentId).toBe(1);
        });

        it('should default parentId to null when not provided', () => {
            const comment = new Comment(1, 'Content', new Date(), 'user-1', 1);

            expect(comment.parentId).toBeNull();
        });

        it('should default replies to empty array when not provided', () => {
            const comment = new Comment(1, 'Content', new Date(), 'user-1', 1);

            expect(comment.replies).toEqual([]);
        });

        it('should have readonly properties', () => {
            const comment = new Comment(1, 'Content', new Date(), 'user-1', 1);

            expect(comment).toBeInstanceOf(Comment);
        });
    });
});
