import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { DataError } from './identity.js';
export const accountRegistration = z.object({ email: z.email().max(254).transform(v => v.toLowerCase().trim()), name: z.string().trim().min(1).max(150), password: z.string().min(10).max(72).refine(v => Buffer.byteLength(v, 'utf8') <= 72), role: z.enum(['candidat', 'entreprise']), companyName: z.string().trim().max(150).default(''), aiCvConsent: z.boolean().default(false) }).strict();
export function normalizedRole(role) { if (role === 'candidat' || role === 'candidate')
    return 'candidate'; if (role === 'entreprise' || role === 'recruiter')
    return 'recruiter'; if (role === 'admin')
    return 'admin'; throw new DataError('FORBIDDEN', 'Rôle inconnu.', 403); }
export class AccountRepository {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    get db() { return this.connection.db; }
    async register(input) { const v = accountRegistration.safeParse(input); if (!v.success)
        throw new DataError('VALIDATION', 'Nom, email valide, mot de passe de 10 à 72 caractères et rôle candidat/entreprise requis.'); const u = v.data; await this.db.collection('users').createIndex({ email: 1 }, { unique: true }); await this.db.collection('users').createIndex({ id: 1 }, { unique: true }); const now = new Date().toISOString(); const user = { id: randomUUID(), email: u.email, name: u.name, role: u.role, password_hash: await bcrypt.hash(u.password, 12), ...(u.role === 'entreprise' ? { company_name: u.companyName || u.name } : {}), auth_provider: 'email', email_verified: false, credential_version: 0, active: true, created_at: now, updated_at: now }; const s = await this.connection.startSession(); try {
        await s.withTransaction(async () => { try {
            await this.db.collection('users').insertOne(user, { session: s });
        }
        catch (e) {
            if (e.code === 11000)
                throw new DataError('ACCOUNT_EXISTS', 'Inscription indisponible pour cette adresse. Connectez-vous ou utilisez la récupération.', 409);
            throw e;
        } await this.db.collection('profiles').insertOne({ id: user.id, role: u.role, full_name: u.name, email: u.email, language: 'fr', notifications_enabled: true, visible_to_companies: true, created_at: now, updated_at: now }, { session: s }); if (u.role === 'entreprise')
            await this.db.collection('companies').insertOne({ id: user.id, name: u.companyName || u.name, status: 'pending', created_at: now, updated_at: now }, { session: s }); if (u.role === 'candidat')
            await this.db.collection('candidate_profiles').insertOne({ user_id: user.id, version: 1, data: { name: u.name, objective: '', city: '', education: [], experience: [], projects: [], skills: [] }, created_at: new Date(), updated_at: new Date() }, { session: s }); await this.db.collection('consent_records').insertOne({ id: randomUUID(), user_id: user.id, tos_version: '2026-11', privacy_version: '2026-11', ai_cv_consent: u.aiCvConsent, consented_at: now }, { session: s }); });
    }
    finally {
        await s.endSession();
    } return { id: user.id, email: user.email }; }
    async activeUser(id) { const u = await this.db.collection('users').findOne({ id, active: { $ne: false } }); if (!u)
        throw new DataError('UNAUTHENTICATED', 'Session invalide ou compte désactivé.', 401); return u; }
    async authorize(p, role) { const u = await this.activeUser(p.userId); if (!u.email_verified || !p.emailVerified || role && normalizedRole(u.role) !== role)
        throw new DataError('FORBIDDEN', 'Accès non autorisé.', 403); return u; }
    async adminUser(p, id, change) { await this.authorize(p, 'admin'); if (change.role && !['admin', 'candidat', 'entreprise'].includes(change.role))
        throw new DataError('VALIDATION', 'Rôle invalide.'); const s = await this.connection.startSession(); await this.db.collection('account_locks').updateOne({ _id: 'admins' }, { $setOnInsert: { version: 0 } }, { upsert: true }); try {
        await s.withTransaction(async () => { await this.db.collection('account_locks').updateOne({ _id: 'admins' }, { $inc: { version: 1 } }, { session: s }); const actor = await this.db.collection('users').findOne({ id: p.userId, active: { $ne: false }, role: 'admin', email_verified: true }, { session: s }); if (!actor)
            throw new DataError('FORBIDDEN', 'Droits révoqués.', 403); const u = await this.db.collection('users').findOne({ id }, { session: s }); if (!u)
            throw new DataError('NOT_FOUND', 'Compte introuvable.', 404); if (u.role === 'admin' && u.active !== false && (change.active === false || change.role && change.role !== 'admin') && await this.db.collection('users').countDocuments({ role: 'admin', active: { $ne: false } }, { session: s }) <= 1)
            throw new DataError('LAST_ADMIN', 'Le dernier administrateur actif doit être conservé.', 409); await this.db.collection('users').updateOne({ id }, { $set: { ...change, updated_at: new Date().toISOString() }, $inc: { credential_version: 1 } }, { session: s }); if (change.role)
            await this.db.collection('profiles').updateOne({ id }, { $set: { role: change.role } }, { session: s }); await this.db.collection('sessions').updateMany({ user_id: id }, { $set: { revoked_at: new Date().toISOString() } }, { session: s }); await this.db.collection('account_audit').insertOne({ id: randomUUID(), actor_id: p.userId, target_id: id, change, created_at: new Date() }, { session: s }); });
    }
    finally {
        await s.endSession();
    } }
    async updateAccount(p, input) { await this.authorize(p); const v = z.object({ phone: z.string().max(50).default(''), linkedin_url: z.string().max(500).default(''), github_url: z.string().max(500).default(''), portfolio_url: z.string().max(500).default(''), language: z.enum(['fr', 'en']).default('fr'), notifications_enabled: z.boolean(), visible_to_companies: z.boolean() }).strict().safeParse(input); if (!v.success)
        throw new DataError('VALIDATION', 'Paramètres invalides.'); for (const k of ['linkedin_url', 'github_url', 'portfolio_url'])
        if (v.data[k] && !/^https?:\/\//.test(v.data[k]))
            throw new DataError('VALIDATION', 'Les liens doivent commencer par https:// ou http://.'); await this.db.collection('profiles').updateOne({ id: p.userId }, { $set: { ...v.data, updated_at: new Date().toISOString() } }, { upsert: true }); }
}
