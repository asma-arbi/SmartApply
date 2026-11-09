import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DataError } from './identity.js';
import { runOperation } from './operations.js';
import { ApplicationRepository, applicationModel } from './applications.js';
import { CatalogRepository } from './catalog.js';
export const interviewSchema = z.object({
    version: z.number().int().positive(),
    scheduledAt: z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Date invalide.'),
    durationMinutes: z.number().int().min(10).max(480).default(45),
    mode: z.enum(['VISIO', 'ONSITE', 'PHONE']),
    location: z.string().trim().min(1, 'Indiquez le lien ou le lieu.').max(500),
    note: z.string().trim().max(1000).default('')
}).strict();
const iso = (d) => d ? new Date(d).toISOString() : null;
export class InterviewRepository {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    get db() { return this.connection.db; }
    requireRecruiter(p) {
        if (p.role !== 'recruiter')
            throw new DataError('FORBIDDEN', 'Action réservée aux entreprises.', 403);
        if (!p.emailVerified && !p.authenticatedSession)
            throw new DataError('FORBIDDEN', 'Identité vérifiée requise.', 403);
    }
    view(i) {
        return i ? { id: i.id, scheduledAt: iso(i.scheduled_at), durationMinutes: i.duration_minutes, mode: i.mode, location: i.location, note: i.note ?? '' } : null;
    }
    async received(p) {
        this.requireRecruiter(p);
        const companies = await new CatalogRepository(this.connection).recruiterCompanies(p.userId);
        const rows = await applicationModel(this.connection)
            .find({ company_id: { $in: companies.map(c => c.id) }, submitted_at: { $ne: null } })
            .sort({ submitted_at: -1 }).limit(300).lean();
        const db = this.db;
        return Promise.all(rows.map(async (row) => {
            const user = await db.collection('users').findOne({ id: row.candidate_id }, { projection: { name: 1, email: 1 } });
            const profile = await db.collection('profiles').findOne({ id: row.candidate_id }, { projection: { title: 1, city: 1 } });
            const job = row.job_id ? await db.collection('jobs').findOne({ id: row.job_id }, { projection: { title: 1 } }) : null;
            const interview = await db.collection('application_interviews').findOne({ application_id: row.id });
            return {
                id: row.id,
                jobId: row.job_id ?? null,
                jobTitle: job?.title ?? 'Candidature spontanée',
                candidateName: user?.name || user?.email || 'Candidat',
                candidateEmail: user?.email ?? '',
                candidateTitle: profile?.title ?? '',
                candidateCity: profile?.city ?? '',
                status: row.status,
                version: row.version,
                submittedAt: iso(row.submitted_at),
                interview: this.view(interview)
            };
        }));
    }
    async forApplication(p, appId) {
        await new ApplicationRepository(this.connection).owned(p, appId);
        return this.view(await this.db.collection('application_interviews').findOne({ application_id: appId }));
    }
    async schedule(p, appId, input, key) {
        this.requireRecruiter(p);
        const parsed = interviewSchema.safeParse(input);
        if (!parsed.success)
            throw new DataError('VALIDATION', parsed.error.issues.map(i => i.message).join(' · '));
        const v = parsed.data;
        const when = new Date(v.scheduledAt);
        if (when.getTime() <= Date.now())
            throw new DataError('INTERVIEW_DATE', 'La date de l’entretien doit être dans le futur.');
        return runOperation(this.connection, p, key, 'application:interview', { appId, ...v }, async (session) => {
            const row = await new ApplicationRepository(this.connection).owned(p, appId, session);
            if (!['SENT', 'PENDING', 'INTERVIEW'].includes(row.status))
                throw new DataError('INVALID_TRANSITION', 'Impossible de planifier un entretien pour cette candidature.', 409);
            const statusChanged = row.status !== 'INTERVIEW';
            const label = when.toLocaleString('fr-TN', { timeZone: 'Africa/Tunis', dateStyle: 'long', timeStyle: 'short' });
            const changed = await applicationModel(this.connection).findOneAndUpdate({ id: appId, version: v.version }, { $set: { status: 'INTERVIEW', active: true }, $inc: { version: 1 }, $push: { history: { id: randomUUID(), previous_status: row.status, status: 'INTERVIEW', actor_role: p.role, origin: p.role, note: `${statusChanged ? 'Entretien planifié' : 'Entretien replanifié'} le ${label}.`, created_at: new Date() } } }, { session, returnDocument: 'after' }).lean();
            if (!changed)
                throw new DataError('VERSION_CONFLICT', 'La candidature a changé. Actualisez la page.', 409);
            const now = new Date();
            await this.db.collection('application_interviews').updateOne({ application_id: appId }, { $set: { company_id: row.company_id, candidate_id: row.candidate_id, scheduled_at: when, duration_minutes: v.durationMinutes, mode: v.mode, location: v.location, note: v.note, scheduled_by: p.userId, updated_at: now }, $setOnInsert: { id: randomUUID(), application_id: appId, created_at: now } }, { upsert: true, session });
            if (statusChanged)
                await this.db.collection('module_outbox').insertOne({ id: randomUUID(), kind: 'application.status.changed', application_id: appId, created_at: now }, { session });
            return {
                applicationId: appId,
                status: 'INTERVIEW',
                version: changed.version,
                interview: { scheduledAt: when.toISOString(), durationMinutes: v.durationMinutes, mode: v.mode, location: v.location, note: v.note }
            };
        });
    }
}
