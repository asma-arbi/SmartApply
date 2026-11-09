import { z } from 'zod';
export declare class DataError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status?: number);
}
export declare const principalSchema: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodEnum<{
        candidate: "candidate";
        recruiter: "recruiter";
        admin: "admin";
    }>;
    emailVerified: z.ZodBoolean;
    authenticatedSession: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export type Principal = z.infer<typeof principalSchema>;
export type Credentials = {
    authorization?: string;
    cookie?: string;
};
/** Implement this with the teammate's verified protocol, never by decoding an unverified token. */
export type IdentityVerifier = (credentials: Readonly<Credentials>) => Promise<unknown>;
export declare class IdentityBoundary {
    private readonly verify?;
    constructor(verify?: IdentityVerifier | undefined);
    resolve(credentials: Credentials): Promise<Principal>;
}
export declare function requireCandidate(principal: Principal): string;
/** Called by trusted server bootstrap when the teammate authentication module is integrated. */
export declare function installIdentityVerifier(verifier: IdentityVerifier): void;
export declare function resolveConfiguredIdentity(credentials: Credentials): Promise<Principal>;
