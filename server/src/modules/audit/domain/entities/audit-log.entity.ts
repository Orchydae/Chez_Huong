export class AuditLog {
    constructor(
        public readonly id: number,
        public readonly timestamp: Date,
        public readonly userId: string | null,
        public readonly userEmail: string | null,
        public readonly action: string,
        public readonly resourceType: string,
        public readonly resourceId: string | null,
        public readonly metadata: any | null,
        public readonly ipAddress: string | null,
        public readonly userAgent: string | null,
    ) { }
}
