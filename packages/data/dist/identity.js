import { z } from 'zod';
export class DataError extends Error {
    code;
    status;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
export const principalSchema = z.object({ userId: z.string().trim().min(1).max(300), role: z.enum(['candidate', 'recruiter', 'admin']), emailVerified: z.boolean(), authenticatedSession: z.literal(true).optional() }).strict();
export class IdentityBoundary {
    verify;
    constructor(verify) {
        this.verify = verify;
    }
    async resolve(credentials) {
        if (!this.verify)
            throw new DataError('AUTH_UNAVAILABLE', 'Le module utilisateur doit être intégré avant cet accès.', 503);
        let raw;
        try {
            raw = await this.verify(Object.freeze({ ...credentials }));
        }
        catch {
            throw new DataError('UNAUTHENTICATED', 'Connectez-vous avec le module utilisateur.', 401);
        }
        const parsed = principalSchema.safeParse(raw);
        if (!parsed.success)
            throw new DataError('UNAUTHENTICATED', 'Identité non vérifiée.', 401);
        if (!parsed.data.emailVerified && !parsed.data.authenticatedSession)
            throw new DataError('EMAIL_UNVERIFIED', 'Vérifiez votre adresse email.', 403);
        return parsed.data;
    }
}
export function requireCandidate(principal) {
    if (principal.role !== 'candidate' || (!principal.emailVerified && !principal.authenticatedSession))
        throw new DataError('FORBIDDEN', 'Accès réservé au propriétaire candidat.', 403);
    return principal.userId;
}
let installedVerifier;
/** Called by trusted server bootstrap when the teammate authentication module is integrated. */
export function installIdentityVerifier(verifier) { if (installedVerifier)
    throw new Error('Identity verifier is already installed.'); installedVerifier = verifier; }
export async function resolveConfiguredIdentity(credentials) {
    if (installedVerifier)
        return new IdentityBoundary(installedVerifier).resolve(credentials);
    // Isolated local tests supply an unguessable token through the harness, never through a public account picker.
    if (process.env.SMARTAPPLY_ISOLATED_TEST === '1' && process.env.NODE_ENV !== 'production') {
        const { timingSafeEqual } = await import('node:crypto');
        const cookie = credentials.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('smartapply_test_identity='))?.slice('smartapply_test_identity='.length);
        const token = credentials.authorization?.startsWith('Bearer ') ? credentials.authorization.slice(7) : cookie;
        for (const [key, userId] of [['SMARTAPPLY_TEST_CANDIDATE_TOKEN', 'isolated|candidate'], ['SMARTAPPLY_TEST_OTHER_TOKEN', 'isolated|other']]) {
            const expected = process.env[key];
            if (expected && expected.length >= 32 && token) {
                const a = Buffer.from(expected), b = Buffer.from(token);
                if (a.length === b.length && timingSafeEqual(a, b))
                    return { userId, role: 'candidate', emailVerified: true };
            }
        }
        throw new DataError('UNAUTHENTICATED', 'Identité de test non reconnue.', 401);
    }
    return new IdentityBoundary().resolve(credentials);
}
