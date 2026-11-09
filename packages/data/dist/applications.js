import { CatalogRepository } from './catalog.js';
import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { z } from 'zod';
import { DataError, requireCandidate } from './identity.js';
import { runOperation, withOwnerTransaction, toDTO } from './operations.js';
const id = z.string().uuid();
export const applicationSchema = z.object({ companyId: z.string().min(1).max(300), jobId: z.string().min(1).max(300).optional(), cvId: id, type: z.enum(['JOB', 'SPONTANEOUS']), letterVersionId: id.optional(), subject: z.string().max(200).default(''), body: z.string().max(15000).default(''), answers: z.record(z.string(), z.string().max(3000)).default({}), confirm: z.literal(true).optional() }).strict();
const schema = new Schema({ id: { type: String, required: true, immutable: true }, candidate_id: { type: String, required: true, immutable: true }, company_id: { type: String, required: true }, job_id: String, cv_id: { type: String, required: true }, letter_version_id: String, type: String, subject: String, body: String, answers: Schema.Types.Mixed, recipient: String, status: String, delivery: String, submitted_at: Date, version: { type: Number, default: 1 }, active: Boolean, history: [Schema.Types.Mixed], personal_note: { type: String, default: '' } }, { collection: 'applications', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, strict: 'throw', bufferCommands: false });
schema.index({ id: 1 }, { unique: true });
schema.index({ candidate_id: 1, job_id: 1 }, { unique: true, partialFilterExpression: { type: 'JOB', active: true } });
export function applicationModel(c) { return c.models.Application ?? c.model('Application', schema); }
const readiness = new WeakMap();
export class ApplicationRepository {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async ready() { let promise = readiness.get(this.connection); if (!promise) {
        promise = applicationModel(this.connection).createIndexes().catch(e => { readiness.delete(this.connection); throw e; });
        readiness.set(this.connection, promise);
    } await promise; }
    get db() { return this.connection.db; }
    validate(s, input) { const p = s.safeParse(input); if (!p.success)
        throw new DataError('VALIDATION', p.error.issues.map(i => i.message).join(' · ')); return p.data; }
    async jobs() { return toDTO(await new CatalogRepository(this.connection).jobs()); }
    async companies() { return toDTO((await new CatalogRepository(this.connection).companies()).map(r => ({ id: r.id, name: r.name, city: r.city ?? '', technologies: r.technologies ?? [], opted_out: !!r.opted_out }))); }
    async allowed(p, row, session) {
        if (p.role === 'candidate' && row.candidate_id === p.userId)
            return;
        if (p.role === 'recruiter' && row.submitted_at) {
            const companies = await new CatalogRepository(this.connection).recruiterCompanies(p.userId, session);
            if (companies.some(c => c.id === row.company_id))
                return;
        }
        throw new DataError('FORBIDDEN', 'Vous ne pouvez pas consulter cette candidature.', 403);
    }
    async owned(p, appId, session) { this.validate(id, appId); const row = await applicationModel(this.connection).findOne({ id: appId }).session(session ?? null).lean(); if (!row)
        throw new DataError('NOT_FOUND', 'Candidature introuvable.', 404); await this.allowed(p, row, session); return row; }
    async decorate(row, p) { const company = await this.db.collection('companies').findOne({ id: row.company_id }) ?? await this.db.collection('integration_company_refs').findOne({ id: row.company_id }); const job = row.job_id ? await this.db.collection('jobs').findOne({ id: row.job_id }) ?? await this.db.collection('integration_job_refs').findOne({ id: row.job_id }) : null; const { personal_note, ...safe } = row; return toDTO({ ...safe, company_name: company?.name ?? '', job_title: job?.title ?? '', ...(p.role === 'candidate' ? { note: personal_note ?? '' } : {}) }); }
    async list(p) {
        if (!p.emailVerified && !p.authenticatedSession)
            throw new DataError('FORBIDDEN', 'Identité vérifiée requise.', 403);
        let filter;
        if (p.role === 'candidate')
            filter = { candidate_id: p.userId };
        else if (p.role === 'recruiter') {
            const companies = await new CatalogRepository(this.connection).recruiterCompanies(p.userId);
            filter = { company_id: { $in: companies.map(c => c.id) }, submitted_at: { $ne: null } };
        }
        else
            throw new DataError('FORBIDDEN', 'Accès non autorisé.', 403);
        const rows = await applicationModel(this.connection).find(filter).sort({ created_at: -1 }).lean();
        return Promise.all(rows.map(row => this.decorate(row, p)));
    }
    async messagingContacts(p) { if (!p.emailVerified && !p.authenticatedSession)
        throw new DataError('FORBIDDEN', 'Identité vérifiée requise.', 403); if (p.role !== 'candidate' && p.role !== 'recruiter')
        throw new DataError('FORBIDDEN', 'Accès réservé aux candidats et entreprises.', 403); const db = this.db; let filter; if (p.role === 'candidate')
        filter = { candidate_id: p.userId, submitted_at: { $ne: null } };
    else {
        const companies = await new CatalogRepository(this.connection).recruiterCompanies(p.userId);
        filter = { company_id: { $in: companies.map(c => c.id) }, submitted_at: { $ne: null } };
    } const rows = await applicationModel(this.connection).find(filter).sort({ updated_at: -1 }).limit(200).lean(); return Promise.all(rows.map(async (row) => { const company = await db.collection('companies').findOne({ id: row.company_id }); const candidate = await db.collection('users').findOne({ id: row.candidate_id }, { projection: { id: 1, name: 1, email: 1, avatar_url: 1 } }); const recipient = p.role === 'candidate' ? await db.collection('users').findOne({ id: company?.id }, { projection: { id: 1, name: 1, email: 1, avatar_url: 1 } }) : candidate; const job = row.job_id ? await db.collection('jobs').findOne({ id: row.job_id }, { projection: { title: 1 } }) : null; if (!recipient)
        return null; const conversation = await db.collection('conversations').findOne({ application_id: row.id }, { projection: { id: 1 } }); const unread = conversation ? await db.collection('direct_messages').countDocuments({ conversation_id: conversation.id, sender_id: { $ne: p.userId }, read_at: null }) : 0; return { applicationId: row.id, conversationId: conversation?.id ?? null, recipientId: recipient.id, recipientName: p.role === 'candidate' ? (company?.name || recipient.name || 'Entreprise') : (candidate?.name || candidate?.email || 'Candidat'), recipientEmail: recipient.email || '', recipientAvatar: recipient.avatar_url || null, jobTitle: job?.title || row.job_title || 'Candidature', applicationStatus: row.status, unread, updatedAt: row.updated_at }; })).then(rows => rows.filter(Boolean)); }
    async messagingContact(p, applicationId) { if (!p.emailVerified && !p.authenticatedSession)
        throw new DataError('FORBIDDEN', 'Identité vérifiée requise.', 403); const row = await this.owned(p, applicationId); if (!row.submitted_at)
        throw new DataError('MESSAGING_ACCESS', 'La messagerie est disponible après le dépôt de la candidature.', 403); const company = await this.db.collection('companies').findOne({ id: row.company_id }); const recipient = p.role === 'candidate' ? await this.db.collection('users').findOne({ id: row.company_id }, { projection: { id: 1, name: 1, email: 1 } }) : await this.db.collection('users').findOne({ id: row.candidate_id }, { projection: { id: 1, name: 1, email: 1 } }); if (!recipient)
        throw new DataError('MESSAGING_CONTACT', 'Compte destinataire introuvable.', 404); const job = row.job_id ? await this.db.collection('jobs').findOne({ id: row.job_id }, { projection: { title: 1 } }) : null; return { applicationId: row.id, recipientId: recipient.id, recipientName: p.role === 'candidate' ? (company?.name || recipient.name || 'Entreprise') : (recipient.name || recipient.email || 'Candidat'), recipientEmail: recipient.email || '', jobTitle: job?.title || row.job_title || 'Candidature' }; }
    async cv(p, cvId, session) { const cv = await this.db.collection('candidate_cvs').findOne({ id: cvId, user_id: p.userId, status: 'ready' }, { session }); if (!cv)
        throw new DataError('CV_FORBIDDEN', 'Ce CV ne vous appartient pas ou sa suppression est en cours.', 403); return cv; }
    async create(p, input, key) {
        requireCandidate(p);
        const v = this.validate(applicationSchema, input);
        await this.ready();
        return runOperation(this.connection, p, key, 'application:create', v, async (session) => {
            await this.cv(p, v.cvId, session);
            const company = await new CatalogRepository(this.connection).company(v.companyId, session);
            if (!company || company.opted_out && v.type === 'SPONTANEOUS')
                throw new DataError('COMPANY_NOT_FOUND', 'Entreprise introuvable.', 404);
            let subject = v.subject, body = v.body;
            if (v.letterVersionId) {
                const letter = await this.db.collection('candidate_letter_versions').findOne({ id: v.letterVersionId, user_id: p.userId }, { session });
                if (!letter)
                    throw new DataError('LETTER_FORBIDDEN', 'Cette version ne vous appartient pas.', 403);
                subject = letter.subject;
                body = letter.body;
            }
            let submitted_at = null, status = 'DRAFT', delivery = 'NONE';
            if (v.type === 'JOB') {
                if (!v.jobId || !v.confirm)
                    throw new DataError('CONFIRM_REQUIRED', 'Confirmez votre candidature.');
                const job = await new CatalogRepository(this.connection).job(v.jobId, session);
                if (!job || job.company_id !== v.companyId)
                    throw new DataError('JOB_NOT_FOUND', 'Offre introuvable.', 404);
                if (job.route === 'external')
                    throw new DataError('EXTERNAL_ONLY', 'Postulez sur le site d’origine.');
                if (job.state !== 'published' || job.deadline && new Date(job.deadline) < new Date())
                    throw new DataError('JOB_CLOSED', 'Cette offre est clôturée.', 409);
                for (const q of job.questions ?? [])
                    if (q.required && !v.answers[q.id]?.trim())
                        throw new DataError('ANSWERS_REQUIRED', 'Répondez aux questions obligatoires.');
                if (await applicationModel(this.connection).exists({ candidate_id: p.userId, job_id: v.jobId, active: true }).session(session))
                    throw new DataError('ALREADY_APPLIED', 'Candidature active déjà présente.', 409);
                submitted_at = new Date();
                status = 'SENT';
                delivery = 'SUBMITTED';
            }
            else if (v.jobId)
                throw new DataError('APPLICATION_TYPE', 'Une candidature spontanée ne doit pas être liée à une offre.');
            const appId = randomUUID();
            const row = { id: appId, candidate_id: p.userId, company_id: v.companyId, job_id: v.jobId ?? null, cv_id: v.cvId, letter_version_id: v.letterVersionId ?? null, type: v.type, subject, body, recipient: company.recipient ?? '', answers: v.answers, status, delivery, submitted_at, active: true, version: 1, history: [{ id: randomUUID(), status, previous_status: null, origin: 'candidate', actor_role: p.role, note: '', created_at: new Date() }] };
            const [created] = await applicationModel(this.connection).create([row], { session });
            return toDTO(created.toObject());
        });
    }
    async detail(p, appId) { const row = await this.owned(p, appId); const cv = await this.db.collection('candidate_cvs').findOne({ id: row.cv_id }); if (!cv)
        throw new DataError('NOT_FOUND', 'CV introuvable.', 404); const { user_id: _owner, file_hash: _hash, storage_path: _path, _id: _id, ...safeCv } = cv; return { ...await this.decorate(row, p), cv: toDTO(safeCv) }; }
    async editDraft(p, appId, input) { requireCandidate(p); const v = this.validate(z.object({ version: z.number().int().positive(), subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(15000), cvId: id }).strict(), input); return withOwnerTransaction(this.connection, p, async (session) => { const row = await this.owned(p, appId, session); if (row.status !== 'DRAFT' || ['SENDING', 'UNCERTAIN', 'ACCEPTED'].includes(row.delivery))
        throw new DataError('NOT_DRAFT', 'Ce brouillon ne peut plus être modifié.', 409); await this.cv(p, v.cvId, session); const changed = await applicationModel(this.connection).findOneAndUpdate({ id: appId, candidate_id: p.userId, version: v.version }, { $set: { subject: v.subject, body: v.body, cv_id: v.cvId, letter_version_id: null }, $inc: { version: 1 } }, { session, returnDocument: 'after' }).lean(); if (!changed)
        throw new DataError('VERSION_CONFLICT', 'Le brouillon a changé.', 409); const { personal_note: _privateNote, ...safe } = changed; return toDTO(safe); }); }
    async saveNote(p, appId, input) { requireCandidate(p); const v = this.validate(z.object({ text: z.string().max(5000) }).strict(), input); return withOwnerTransaction(this.connection, p, async (session) => { await this.owned(p, appId, session); await applicationModel(this.connection).updateOne({ id: appId, candidate_id: p.userId }, { $set: { personal_note: v.text } }, { session }); return { message: 'Note personnelle enregistrée.' }; }); }
    async transition(p, appId, input, key) { const v = this.validate(z.object({ version: z.number().int().positive(), status: z.enum(['DRAFT', 'SENT', 'PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']), note: z.string().max(500).default('') }).strict(), input); return runOperation(this.connection, p, key, 'application:status', { appId, ...v }, async (session) => { const row = await this.owned(p, appId, session); const allowed = { DRAFT: [], SENT: ['PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'], PENDING: ['INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'], INTERVIEW: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'], ACCEPTED: [], REJECTED: [], WITHDRAWN: [] }; if (!allowed[row.status]?.includes(v.status) || v.status === 'WITHDRAWN' && p.role !== 'candidate')
        throw new DataError('INVALID_TRANSITION', 'Transition non autorisée.', 409); const changed = await applicationModel(this.connection).findOneAndUpdate({ id: appId, version: v.version }, { $set: { status: v.status, active: v.status !== 'WITHDRAWN' }, $inc: { version: 1 }, $push: { history: { id: randomUUID(), previous_status: row.status, status: v.status, actor_role: p.role, origin: p.role, note: v.note, created_at: new Date() } } }, { session, returnDocument: 'after' }).lean(); if (!changed)
        throw new DataError('VERSION_CONFLICT', 'La candidature a changé.', 409); await this.db.collection('module_outbox').insertOne({ id: randomUUID(), kind: 'application.status.changed', application_id: appId, created_at: new Date() }, { session }); const { personal_note: _privateNote, ...safe } = changed; return toDTO(safe); }); }
}
