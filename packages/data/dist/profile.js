import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { DataError, requireCandidate } from './identity.js';
const uuid = z.string().uuid();
function normalizeSkill(name) { const n = name.trim().toLowerCase(); return ['react', 'reactjs', 'react.js'].includes(n) ? 'react' : n; }
const entry = z.object({ id: uuid, title: z.string().trim().min(1).max(200), organization: z.string().max(200).default(''), description: z.string().max(5000).default(''), start: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), end: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), current: z.boolean().default(false), url: z.string().max(1000).refine(v => !v || /^https?:\/\//i.test(v) && z.url().safeParse(v).success).default(''), technologies: z.array(z.string().max(60)).max(40).default([]), source: z.enum(['manual', 'extraction']).default('manual') }).strict().refine(e => !e.start || !e.end || e.current || e.start <= e.end, 'La fin doit suivre le début.');
export const profileSchema = z.object({ version: z.number().int().positive(), name: z.string().trim().max(150).default(''), objective: z.string().max(300).default(''), city: z.string().max(100).default(''), education: z.array(entry).max(40), experience: z.array(entry).max(40), projects: z.array(entry).max(40), skills: z.array(z.object({ id: uuid, name: z.string().trim().min(1).max(80), category: z.string().max(80).default(''), proficiency: z.string().max(50).default(''), source: z.enum(['manual', 'extraction']).default('manual') }).strict()).max(150) }).strict().refine(p => new Set(p.skills.map(s => normalizeSkill(s.name))).size === p.skills.length, 'Cette compétence existe déjà.');
export const emptyProfile = () => ({ version: 1, name: '', objective: '', city: '', education: [], experience: [], projects: [], skills: [] });
const schema = new Schema({ user_id: { type: String, required: true, immutable: true }, version: { type: Number, required: true, min: 1 }, data: { type: Schema.Types.Mixed, required: true } }, { collection: 'candidate_profiles', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: 'throw', bufferCommands: false });
schema.index({ user_id: 1 }, { unique: true });
export function profileModel(connection) { return connection.models.CandidateProfile ?? connection.model('CandidateProfile', schema); }
const indexReadiness = new WeakMap();
async function ensureIndexes(model) { let ready = indexReadiness.get(model); if (!ready) {
    ready = model.createIndexes().catch(error => { indexReadiness.delete(model); throw error; });
    indexReadiness.set(model, ready);
} await ready; }
export class ProfileRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async get(principal) {
        const user_id = requireCandidate(principal);
        await ensureIndexes(this.model);
        const initial = emptyProfile();
        if (principal.authenticatedSession) {
            const legacy = await this.model.db.db.collection('profiles').findOne({ id: user_id });
            const user = await this.model.db.db.collection('users').findOne({ id: user_id });
            initial.name = legacy?.full_name || user?.name || '';
            initial.city = legacy?.city || '';
            initial.objective = legacy?.title || '';
            const names = [...new Set((Array.isArray(legacy?.skills) ? legacy.skills : []).filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()))];
            initial.skills = names.slice(0, 150).map(name => ({ id: randomUUID(), name, category: '', proficiency: '', source: 'manual' }));
        }
        let row;
        try {
            row = await this.model.findOneAndUpdate({ user_id }, { $setOnInsert: { user_id, version: 1, data: { ...initial, version: undefined } } }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }).lean();
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
            row = await this.model.findOne({ user_id }).lean();
            if (!row)
                throw error;
        }
        return { ...row.data, version: row.version };
    }
    async save(principal, input) {
        const user_id = requireCandidate(principal);
        const parsed = profileSchema.safeParse(input);
        if (!parsed.success)
            throw new DataError('VALIDATION', parsed.error.issues.map(e => e.message).join(' · '));
        const { version, ...data } = parsed.data;
        await ensureIndexes(this.model);
        const row = await this.model.findOneAndUpdate({ user_id, version }, { $set: { data }, $inc: { version: 1 } }, { returnDocument: 'after', runValidators: true }).lean();
        if (!row)
            throw new DataError('VERSION_CONFLICT', 'Le profil a changé. Actualisez avant de continuer.', 409);
        return { ...row.data, version: row.version };
    }
}
