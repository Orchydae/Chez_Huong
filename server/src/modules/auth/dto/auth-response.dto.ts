/**
 * Response DTO for successful authentication (login/register)
 */
export class AuthResponseDto {
    access_token: string;

    constructor(accessToken: string) {
        this.access_token = accessToken;
    }
}

/**
 * User profile returned from JWT token (no sensitive data)
 */
export class UserProfileDto {
    userId: string;
    email: string;
    role: string;

    constructor(userId: string, email: string, role: string) {
        this.userId = userId;
        this.email = email;
        this.role = role;
    }
}

/**
 * Validated user (after password check, password stripped)
 */
export class ValidatedUserDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;

    constructor(id: string, firstName: string, lastName: string, email: string, role: string) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.role = role;
    }
}
