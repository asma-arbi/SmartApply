import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { z } from 'zod';
import { DataError, requireCandidate } from './identity.js';
import { withOwnerTransaction, runOperation } from './operations.js';
const uuid = z.string().uuid();
const fields = {
    title: z.string().trim().min(1).max(200), language: z.enum(['fr', 'en']),
    company: z.string().max(200), role: z.string().max(200), jobDescription: z.string().max(12000),
    tone: z.enum(['professional', 'enthusiastic', 'concise']), emphasis: z.string().max(2000), cvId: uuid.nullable(),
};
const createFields = { ...fields, company: fields.company.default(''), role: fields.role.default(''),
    jobDescription: fields.jobDescription.default(''), tone: fields.tone.default('professional'),
    emphasis: fields.emphasis.default(''), cvId: fields.cvId.default(null),
    subject: z.string().max(200).default(''), body: z.string().max(15000).default('') };
export const createLetterSchema = z.object({ ...createFields, source: z.literal('manual').default('manual') }).strict();
const renderedTemplateSchema = z.object({ ...createFields, source: z.literal('template').default('template') }).strict();
export const patchLetterSchema = z.object({
    title: fields.title.optional(), language: fields.language.optional(), company: fields.company.optional(),
    role: fields.role.optional(), jobDescription: fields.jobDescription.optional(), tone: fields.tone.optional(),
    emphasis: fields.emphasis.optional(), cvId: fields.cvId.optional(),
    subject: z.string().max(200).optional(), body: z.string().max(15000).optional(), version: z.number().int().positive(),
}).strict();
// Old versions omitted tone/emphasis. Restore deterministic defaults, never current target inputs.
const snapshotMetadataSchema = z.object({
    title: fields.title.default('Lettre restaurée'), company: createFields.company, role: createFields.role,
    jobDescription: createFields.jobDescription, cvId: createFields.cvId, tone: createFields.tone, emphasis: createFields.emphasis,
    profile: z.unknown().default(null), model: z.string().max(500).nullable().default(null),
});
const restoredContentSchema = z.object({ ...createFields, source: z.enum(['manual', 'template', 'ai']) }).strict();
const versionSchema = z.object({ version: z.number().int().positive() }).strict();
const restoreSchema = versionSchema.extend({ versionId: uuid }).strict();
const generatedSchema = z.object({ subject: z.string().min(1).max(200), body: z.string().min(30).max(15000) }).strict();
function parse(schema, input) {
    const result = schema.safeParse(input);
    if (!result.success)
        throw new DataError('VALIDATION', result.error.issues.map(i => i.message).join(' · '));
    return result.data;
}
const letterSchema = new Schema({
    id: { type: String, required: true, immutable: true }, user_id: { type: String, required: true, immutable: true },
    cv_id: { type: String, default: null }, title: { type: String, required: true }, language: { type: String, enum: ['fr', 'en'], required: true },
    company: { type: String, default: '' }, role: { type: String, default: '' }, job_description: { type: String, default: '' },
    tone: { type: String, enum: ['professional', 'enthusiastic', 'concise'], required: true }, emphasis: { type: String, default: '' },
    subject: { type: String, default: '' }, body: { type: String, default: '' }, source: { type: String, enum: ['manual', 'template', 'ai'], required: true },
    version: { type: Number, required: true, min: 1 },
}, { collection: 'candidate_letters', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: 'throw', bufferCommands: false });
letterSchema.index({ id: 1 }, { unique: true });
letterSchema.index({ user_id: 1, updated_at: -1 });
const savedSchema = new Schema({
    id: { type: String, required: true, immutable: true }, letter_id: { type: String, required: true, immutable: true },
    user_id: { type: String, required: true, immutable: true }, number: { type: Number, required: true, immutable: true },
    subject: { type: String, default: '', immutable: true }, body: { type: String, default: '', immutable: true },
    source: { type: String, enum: ['manual', 'template', 'ai'], required: true, immutable: true },
    language: { type: String, enum: ['fr', 'en'], required: true, immutable: true },
    snapshot: { type: Schema.Types.Mixed, required: true, immutable: true },
    created_at: { type: Date, required: true, immutable: true, default: Date.now },
}, { collection: 'candidate_letter_versions', strict: 'throw', bufferCommands: false });
savedSchema.index({ id: 1 }, { unique: true });
savedSchema.index({ letter_id: 1, number: 1 }, { unique: true });
savedSchema.index({ user_id: 1, letter_id: 1 });
export function letterModel(c) { return c.models.CandidateLetter ?? c.model('CandidateLetter', letterSchema); }
export function letterVersionModel(c) { return c.models.CandidateLetterVersion ?? c.model('CandidateLetterVersion', savedSchema); }
const readyModels = new WeakMap();
async function indexes(model) { let ready = readyModels.get(model); if (!ready) {
    ready = model.createIndexes().catch(error => { readyModels.delete(model); throw error; });
    readyModels.set(model, ready);
} await ready; }
/** Return plain JSON: no ObjectIds, Mongoose documents, or Date instances cross a server action boundary. */
function dto(row) { if (!row)
    return row; const { _id: _ignored, __v: _ignoredVersion, ...value } = row; return JSON.parse(JSON.stringify(value)); }
function clone(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)); }
export class LetterRepository {
    connection;
    letters;
    saved;
    constructor(connection) {
        this.connection = connection;
    }
    async ready() { this.letters ??= letterModel(this.connection); this.saved ??= letterVersionModel(this.connection); await Promise.all([indexes(this.letters), indexes(this.saved)]); }
    async owned(user_id, id, session) {
        const row = await this.letters.findOne({ id, user_id }).session(session ?? null).lean();
        if (!row)
            throw new DataError('NOT_FOUND', 'Lettre introuvable.', 404);
        return row;
    }
    checkVersion(row, version) { if (row.version !== version)
        throw new DataError('VERSION_CONFLICT', 'Cette lettre a été modifiée ailleurs. Actualisez avant de continuer.', 409); }
    async checkCv(user_id, id, session) {
        if (!id)
            return;
        if (!await this.connection.collection('candidate_cvs').findOne({ id, user_id, status: 'ready' }, { session, projection: { _id: 1 } }))
            throw new DataError('NOT_FOUND', 'CV introuvable.', 404);
    }
    async profile(user_id, provided, session) {
        if (provided !== undefined)
            return clone(provided);
        const row = await this.connection.collection('candidate_profiles').findOne({ user_id }, { session });
        return row ? { ...row.data, version: row.version } : null;
    }
    async snapshot(user_id, letter, session, profile, model = null) {
        const previous = await this.saved.findOne({ user_id, letter_id: letter.id }).sort({ number: -1 }).session(session).lean();
        const row = { id: randomUUID(), letter_id: letter.id, user_id, number: (previous?.number ?? 0) + 1,
            subject: letter.subject, body: letter.body, source: letter.source, language: letter.language,
            snapshot: { title: letter.title, company: letter.company, role: letter.role, jobDescription: letter.job_description,
                cvId: letter.cv_id, tone: letter.tone, emphasis: letter.emphasis, profile: clone(profile) ?? null, model: letter.source === 'ai' ? model : null },
        };
        await this.saved.create([row], { session });
    }
    async list(p) { const user_id = requireCandidate(p); await this.ready(); return (await this.letters.find({ user_id }).sort({ updated_at: -1, id: 1 }).lean()).map(dto); }
    async get(p, id) { const user_id = requireCandidate(p); parse(uuid, id); await this.ready(); return dto(await this.owned(user_id, id)); }
    async create(p, input, key, profileSnapshot) {
        requireCandidate(p);
        const value = parse(createLetterSchema, input);
        return this.insert(p, value, key, profileSnapshot);
    }
    /** Trusted NestJS template command: the caller renders the fallback before invoking persistence. */
    async createRenderedTemplate(p, input, key, profileSnapshot) {
        requireCandidate(p);
        const value = parse(renderedTemplateSchema, input);
        return this.insert(p, value, key, profileSnapshot);
    }
    async insert(p, value, key, profileSnapshot) {
        const user_id = requireCandidate(p);
        await this.ready();
        const captured = clone(profileSnapshot);
        return runOperation(this.connection, p, key, 'letters:create', { value, profileSnapshot: captured ?? null }, async (session) => {
            await this.checkCv(user_id, value.cvId, session);
            const { cvId, jobDescription, ...fields } = value;
            const [row] = await this.letters.create([{ ...fields, id: randomUUID(), user_id, cv_id: cvId, job_description: jobDescription, version: 1 }], { session });
            const plain = row.toObject();
            await this.snapshot(user_id, plain, session, await this.profile(user_id, captured, session));
            return dto(plain);
        });
    }
    async patch(p, id, input) {
        const user_id = requireCandidate(p);
        parse(uuid, id);
        const value = parse(patchLetterSchema, input);
        await this.ready();
        return withOwnerTransaction(this.connection, p, async (session) => {
            const prior = await this.owned(user_id, id, session);
            this.checkVersion(prior, value.version);
            await this.checkCv(user_id, value.cvId, session);
            const { version, cvId, jobDescription, ...fields } = value;
            const set = { ...fields };
            if (cvId !== undefined)
                set.cv_id = cvId;
            if (jobDescription !== undefined)
                set.job_description = jobDescription;
            if (value.subject !== undefined || value.body !== undefined)
                set.source = 'manual';
            const row = await this.letters.findOneAndUpdate({ id, user_id, version }, { $set: set, $inc: { version: 1 } }, { session, returnDocument: 'after', runValidators: true }).lean();
            if (!row)
                throw new DataError('VERSION_CONFLICT', 'Cette lettre a été modifiée ailleurs.', 409);
            return dto(row);
        });
    }
    async versions(p, id) { const user_id = requireCandidate(p); parse(uuid, id); await this.ready(); await this.owned(user_id, id); return (await this.saved.find({ user_id, letter_id: id }).sort({ number: -1 }).lean()).map(dto); }
    async saveVersion(p, id, input, key, profileSnapshot) {
        const user_id = requireCandidate(p);
        parse(uuid, id);
        const value = parse(versionSchema, input);
        await this.ready();
        const captured = clone(profileSnapshot);
        return runOperation(this.connection, p, key, 'letters:save-version', { letterId: id, ...value, profileSnapshot: captured ?? null }, async (session) => {
            const row = await this.owned(user_id, id, session);
            this.checkVersion(row, value.version);
            const previous = await this.saved.findOne({ user_id, letter_id: id }).sort({ number: -1 }).session(session).lean();
            const profile = await this.profile(user_id, captured, session);
            const nextSnapshot = { title: row.title, company: row.company, role: row.role, jobDescription: row.job_description, cvId: row.cv_id, tone: row.tone, emphasis: row.emphasis, profile, model: row.source === 'ai' ? previous?.snapshot?.model ?? null : null };
            if (!previous || previous.subject !== row.subject || previous.body !== row.body || previous.language !== row.language || previous.source !== row.source || JSON.stringify(previous.snapshot) !== JSON.stringify(nextSnapshot))
                await this.snapshot(user_id, row, session, profile, nextSnapshot.model);
            return dto(row);
        });
    }
    async restore(p, id, input, key) {
        const user_id = requireCandidate(p);
        parse(uuid, id);
        const value = parse(restoreSchema, input);
        await this.ready();
        return runOperation(this.connection, p, key, 'letters:restore', { letterId: id, ...value }, async (session) => {
            const prior = await this.owned(user_id, id, session);
            this.checkVersion(prior, value.version);
            const version = await this.saved.findOne({ id: value.versionId, letter_id: id, user_id }).session(session).lean();
            if (!version)
                throw new DataError('NOT_FOUND', 'Version introuvable.', 404);
            const metadata = parse(snapshotMetadataSchema, version.snapshot);
            const { profile, model, ...target } = metadata;
            const restored = parse(restoredContentSchema, { ...target, subject: version.subject, body: version.body, language: version.language, source: version.source });
            await this.checkCv(user_id, restored.cvId, session);
            const { cvId, jobDescription, ...content } = restored;
            const row = await this.letters.findOneAndUpdate({ id, user_id, version: value.version }, { $set: { ...content, cv_id: cvId, job_description: jobDescription }, $inc: { version: 1 } }, { session, returnDocument: 'after', runValidators: true }).lean();
            if (!row)
                throw new DataError('VERSION_CONFLICT', 'Cette lettre a été modifiée ailleurs.', 409);
            await this.snapshot(user_id, row, session, profile, model);
            return dto(row);
        });
    }
    async remove(p, id) {
        const user_id = requireCandidate(p);
        parse(uuid, id);
        await this.ready();
        return withOwnerTransaction(this.connection, p, async (session) => {
            await this.owned(user_id, id, session);
            const versions = await this.saved.find({ user_id, letter_id: id }).select({ id: 1, _id: 0 }).session(session).lean();
            const reference = await this.connection.collection('applications').findOne({ $or: [{ letter_id: id }, { letter_version_id: { $in: versions.map(v => v.id) } }] }, { session, projection: { _id: 1 } });
            if (reference)
                throw new DataError('LETTER_REFERENCED', 'Cette lettre est jointe à une candidature. Ses versions doivent être conservées.', 409);
            await this.saved.deleteMany({ user_id, letter_id: id }, { session });
            await this.letters.deleteOne({ user_id, id }, { session });
            return { message: 'Lettre et versions supprimées.' };
        });
    }
    async applyGenerated(p, id, expectedVersion, content, profileSnapshot, model, completionJobId) {
        const user_id = requireCandidate(p);
        parse(uuid, id);
        parse(z.number().int().positive(), expectedVersion);
        const generated = parse(generatedSchema, content);
        await this.ready();
        const captured = clone(profileSnapshot);
        return withOwnerTransaction(this.connection, p, async (session) => {
            const prior = await this.owned(user_id, id, session);
            this.checkVersion(prior, expectedVersion);
            const row = await this.letters.findOneAndUpdate({ id, user_id, version: expectedVersion }, { $set: { ...generated, source: 'ai' }, $inc: { version: 1 } }, { session, returnDocument: 'after', runValidators: true }).lean();
            if (!row)
                throw new DataError('VERSION_CONFLICT', 'Cette lettre a été modifiée ailleurs.', 409);
            await this.snapshot(user_id, row, session, captured, model ?? null);
            const result = dto(row);
            if (completionJobId) {
                const completed = await this.connection.collection('candidate_ai_jobs').updateOne({ id: completionJobId, user_id, status: 'running' }, { $set: { status: 'completed', result, finished_at: new Date() } }, { session });
                if (completed.matchedCount !== 1)
                    throw new DataError('JOB_NOT_RUNNING', 'Cette génération a été interrompue ou déjà traitée.', 409);
            }
            return result;
        });
    }
}
