/**
 * Response DTO for successful authentication (login/register)
 */
export class AuthResponseDto {
    access_token: string;

    constructor(accessToken: string) {
        this.access_token = accessToken;
    }
}
