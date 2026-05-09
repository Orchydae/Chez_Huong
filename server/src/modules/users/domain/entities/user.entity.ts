/**
 * Custom error thrown when email format is invalid
 */
export class InvalidEmailError extends Error {
    constructor(email: string) {
        super(`Invalid email format: ${email}. Must be in XXX@XXX.XXX format`);
        this.name = 'InvalidEmailError';
    }
}

/**
 * Custom error thrown when password is invalid
 */
export class InvalidPasswordError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidPasswordError';
    }
}

/**
 * User domain entity
 */
export class User {
    constructor(
        public id: string,
        public firstName: string,
        public lastName: string,
        public email: string,
        public role: string,
        public password: string,  // Required, not optional
    ) { }

    /**
     * Validates email format: XXX@XXX.XXX
     * Requires @ symbol and domain with extension
     */
    static validateEmail(email: string): boolean {
        if (!email || typeof email !== 'string') {
            return false;
        }
        // Matches: local@domain.extension (any extension)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
        return emailRegex.test(email);
    }

    /**
     * Validates password:
     * - Minimum 6 characters
     * - At least one number
     * - At least one special character
     */
    static validatePassword(password: string): boolean {
        if (!password || typeof password !== 'string') {
            return false;
        }
        if (password.length < 6) {
            return false;
        }
        // Check for at least one number
        const hasNumber = /\d/.test(password);
        // Check for at least one special character
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasNumber && hasSpecialChar;
    }

    /**
     * Factory method with validation - use when creating new users
     * @throws InvalidEmailError if email format is invalid
     * @throws InvalidPasswordError if password is invalid
     */
    static create(
        id: string,
        firstName: string,
        lastName: string,
        email: string,
        role: string,
        password: string,  // Required
    ): User {
        if (!User.validateEmail(email)) {
            throw new InvalidEmailError(email);
        }
        if (!User.validatePassword(password)) {
            throw new InvalidPasswordError('Password must be at least 6 characters and contain at least one number and one special character');
        }
        return new User(id, firstName, lastName, email, role, password);
    }
}
