import { User, InvalidEmailError, InvalidPasswordError } from './user.entity';

describe('User Entity', () => {
    describe('validateEmail', () => {
        it('should return true for valid email with .com', () => {
            expect(User.validateEmail('test@example.com')).toBe(true);
        });

        it('should return true for valid email with .org', () => {
            expect(User.validateEmail('test@example.org')).toBe(true);
        });

        it('should return true for valid email with .io', () => {
            expect(User.validateEmail('test@example.io')).toBe(true);
        });

        it('should return true for email with dots in local part', () => {
            expect(User.validateEmail('user.name@domain.com')).toBe(true);
        });

        it('should return true for email with numbers', () => {
            expect(User.validateEmail('user123@domain.com')).toBe(true);
        });

        it('should return true for email with subdomain', () => {
            expect(User.validateEmail('user@mail.domain.com')).toBe(true);
        });

        it('should return true for email with country code TLD', () => {
            expect(User.validateEmail('user@domain.co.uk')).toBe(true);
        });

        it('should return false for email missing @ symbol', () => {
            expect(User.validateEmail('testexample.com')).toBe(false);
        });

        it('should return false for email with empty domain', () => {
            expect(User.validateEmail('test@.com')).toBe(false);
        });

        it('should return false for email with empty local part', () => {
            expect(User.validateEmail('@example.com')).toBe(false);
        });

        it('should return false for email missing extension', () => {
            expect(User.validateEmail('test@example')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(User.validateEmail('')).toBe(false);
        });

        it('should return false for whitespace only', () => {
            expect(User.validateEmail('   ')).toBe(false);
        });

        it('should return false for email with spaces', () => {
            expect(User.validateEmail('test @example.com')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(User.validateEmail(null as any)).toBe(false);
            expect(User.validateEmail(undefined as any)).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should return true for valid password (6+ chars, number, special)', () => {
            expect(User.validatePassword('pass1!')).toBe(true);
        });

        it('should return true for strong password', () => {
            expect(User.validatePassword('Password123!')).toBe(true);
        });

        it('should return false for password with less than 6 characters', () => {
            expect(User.validatePassword('ab1!')).toBe(false);  // Only 4 chars
        });

        it('should return false for password with exactly 5 characters', () => {
            expect(User.validatePassword('abc1!')).toBe(false);  // Only 5 chars
        });

        it('should return true for password with exactly 6 characters', () => {
            expect(User.validatePassword('abcd1!')).toBe(true);  // Exactly 6 chars
        });

        it('should return false for password without a number', () => {
            expect(User.validatePassword('password!')).toBe(false);
        });

        it('should return false for password without a special character', () => {
            expect(User.validatePassword('password123')).toBe(false);
        });

        it('should return false for password with only letters', () => {
            expect(User.validatePassword('password')).toBe(false);
        });

        it('should return false for empty password', () => {
            expect(User.validatePassword('')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(User.validatePassword(null as any)).toBe(false);
            expect(User.validatePassword(undefined as any)).toBe(false);
        });

        it('should accept various special characters', () => {
            expect(User.validatePassword('pass1@')).toBe(true);
            expect(User.validatePassword('pass1#')).toBe(true);
            expect(User.validatePassword('pass1$')).toBe(true);
            expect(User.validatePassword('pass1%')).toBe(true);
            expect(User.validatePassword('pass1!')).toBe(true);
            expect(User.validatePassword('pass1*')).toBe(true);
        });
    });

    describe('create (factory method)', () => {
        const validUserData = {
            id: 'uuid-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            role: 'READER',
            password: 'hashedPass1!',
        };

        it('should create a User instance with valid data', () => {
            const user = User.create(
                validUserData.id,
                validUserData.firstName,
                validUserData.lastName,
                validUserData.email,
                validUserData.role,
                validUserData.password,
            );

            expect(user).toBeInstanceOf(User);
            expect(user.id).toBe(validUserData.id);
            expect(user.firstName).toBe(validUserData.firstName);
            expect(user.lastName).toBe(validUserData.lastName);
            expect(user.email).toBe(validUserData.email);
            expect(user.role).toBe(validUserData.role);
            expect(user.password).toBe(validUserData.password);
        });

        it('should throw InvalidEmailError for invalid email format', () => {
            expect(() => {
                User.create(
                    validUserData.id,
                    validUserData.firstName,
                    validUserData.lastName,
                    'invalid-email',
                    validUserData.role,
                    validUserData.password,
                );
            }).toThrow(InvalidEmailError);
        });

        it('should throw InvalidEmailError with descriptive message', () => {
            const invalidEmail = 'test@example';
            expect(() => {
                User.create(
                    validUserData.id,
                    validUserData.firstName,
                    validUserData.lastName,
                    invalidEmail,
                    validUserData.role,
                    validUserData.password,
                );
            }).toThrow(`Invalid email format: ${invalidEmail}. Must be in XXX@XXX.XXX format`);
        });

        it('should throw InvalidPasswordError for password less than 6 characters', () => {
            expect(() => {
                User.create(
                    validUserData.id,
                    validUserData.firstName,
                    validUserData.lastName,
                    validUserData.email,
                    validUserData.role,
                    'ab1!', // Too short (4 chars)
                );
            }).toThrow(InvalidPasswordError);
        });

        it('should throw InvalidPasswordError for password without number', () => {
            expect(() => {
                User.create(
                    validUserData.id,
                    validUserData.firstName,
                    validUserData.lastName,
                    validUserData.email,
                    validUserData.role,
                    'password!',
                );
            }).toThrow(InvalidPasswordError);
        });

        it('should throw InvalidPasswordError for password without special character', () => {
            expect(() => {
                User.create(
                    validUserData.id,
                    validUserData.firstName,
                    validUserData.lastName,
                    validUserData.email,
                    validUserData.role,
                    'password123',
                );
            }).toThrow(InvalidPasswordError);
        });

        it('should throw InvalidPasswordError with descriptive message', () => {
            expect(() => {
                User.create(
                    validUserData.id,
                    validUserData.firstName,
                    validUserData.lastName,
                    validUserData.email,
                    validUserData.role,
                    'abc',
                );
            }).toThrow('Password must be at least 6 characters and contain at least one number and one special character');
        });
    });

    describe('constructor', () => {
        it('should create User instance without validation (for DB reconstitution)', () => {
            // Constructor doesn't validate - this is intentional for reconstituting from DB
            // Passwords from DB are already hashed so may not match original validation rules
            const user = new User(
                'uuid-456',
                'Jane',
                'Doe',
                'any-email-format',
                'ADMIN',
                '$argon2id$v=19$hashed', // Hashed password from DB
            );

            expect(user).toBeInstanceOf(User);
            expect(user.email).toBe('any-email-format');
            expect(user.password).toBe('$argon2id$v=19$hashed');
        });
    });
});

describe('InvalidEmailError', () => {
    it('should have correct name property', () => {
        const error = new InvalidEmailError('bad@email');
        expect(error.name).toBe('InvalidEmailError');
    });

    it('should have correct message', () => {
        const email = 'bad@email';
        const error = new InvalidEmailError(email);
        expect(error.message).toBe(`Invalid email format: ${email}. Must be in XXX@XXX.XXX format`);
    });

    it('should be an instance of Error', () => {
        const error = new InvalidEmailError('bad@email');
        expect(error).toBeInstanceOf(Error);
    });
});

describe('InvalidPasswordError', () => {
    it('should have correct name property', () => {
        const error = new InvalidPasswordError('Password too short');
        expect(error.name).toBe('InvalidPasswordError');
    });

    it('should have correct message', () => {
        const error = new InvalidPasswordError('Password must be at least 6 characters');
        expect(error.message).toBe('Password must be at least 6 characters');
    });

    it('should be an instance of Error', () => {
        const error = new InvalidPasswordError('test');
        expect(error).toBeInstanceOf(Error);
    });
});
