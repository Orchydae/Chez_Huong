import { Like } from './like.entity';

describe('Like Entity', () => {
    describe('constructor', () => {
        it('should create a Like with userId and recipeId', () => {
            const like = new Like('user-123', 1);

            expect(like.userId).toBe('user-123');
            expect(like.recipeId).toBe(1);
        });

        it('should create Like instances with different data', () => {
            const like1 = new Like('user-1', 100);
            const like2 = new Like('user-2', 200);

            expect(like1.userId).toBe('user-1');
            expect(like1.recipeId).toBe(100);
            expect(like2.userId).toBe('user-2');
            expect(like2.recipeId).toBe(200);
        });

        it('should have readonly properties', () => {
            const like = new Like('user-123', 1);

            // TypeScript compile-time check: properties are readonly
            expect(like).toBeInstanceOf(Like);
        });
    });
});
