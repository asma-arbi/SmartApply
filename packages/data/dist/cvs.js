import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';
import { z } from 'zod';
import { DataError, requireCandidate } from './identity.js';
import { PrivateCvFiles } from './files.js';
import { validateFile } from './document.js';
import { runOperation, withOwnerTransaction } from './operations.js';
const schema = new Schema({ id: { type: String, required: true, immutable: true }, user_id: { type: String, required: true, immutable: true }, original_filename: { type: String, required: true, immutable: true }, storage_path: { type: String, required: true, immutable: true }, mime_type: { type: String, required: true, immutable: true }, file_size: { type: Number, required: true, immutable: true }, file_hash: { type: String, required: true, immutable: true }, is_primary: { type: Boolean, required: true }, processing_status: { type: String, default: 'unavailable' }, extraction: { type: Schema.Types.Mixed, default: null }, status: { type: String, enum: ['ready', 'deleting'], required: true }, created_at: { type: String, required: true, immutable: true }, updated_at: { type: String, required: true } }, { collection: 'candidate_cvs', strict: 'throw', bufferCommands: false });
schema.index({ id: 1 }, { unique: true });
schema.index({ user_id: 1, status: 1, created_at: -1 });
// The common owner transaction lock enforces one primary while allowing an atomic switch.
export function cvModel(connection) { return connection.models.CandidateCv ?? connection.model('CandidateCv', schema); }
function identifier(id) { if (!z.string().uuid().safeParse(id).success)
    throw new DataError('VALIDATION', 'Identifiant CV invalide.'); return id; }
function record(row) { return { id: row.id, user_id: row.user_id, original_filename: row.original_filename, storage_path: row.storage_path, mime_type: row.mime_type, file_size: row.file_size, file_hash: row.file_hash, is_primary: row.is_primary, processing_status: row.processing_status ?? 'unavailable', extraction: row.extraction ?? null, created_at: row.created_at, updated_at: row.updated_at }; }
function safe(row) { const { user_id: _owner, storage_path: _path, file_hash: _hash, ...value } = record(row); return value; }
const readiness = new WeakMap();
export class CvRepository {
    connection;
    files;
    model;
    constructor(connection) {
        this.connection = connection;
        this.model = cvModel(connection);
        this.files = new PrivateCvFiles(connection);
    }
    async ready() { let pending = readiness.get(this.model); if (!pending) {
        pending = this.model.createIndexes().catch(e => { readiness.delete(this.model); throw e; });
        readiness.set(this.model, pending);
    } await pending; }
    async list(p) { const user_id = requireCandidate(p); await this.ready(); return (await this.model.find({ user_id, status: 'ready' }).sort({ created_at: -1, id: -1 }).lean()).map(safe); }
    async owned(p, id, session) { const user_id = requireCandidate(p); identifier(id); await this.ready(); const row = await this.model.findOne({ user_id, id, status: 'ready' }).session(session ?? null).lean(); if (!row)
        throw new DataError('NOT_FOUND', 'CV introuvable.', 404); return record(row); }
    async upload(p, bytes, name, key, replaceId) {
        const user_id = requireCandidate(p);
        if (replaceId)
            identifier(replaceId);
        if (!/^[a-zA-Z0-9-]{8,100}$/.test(key))
            throw new DataError('IDEMPOTENCY_REQUIRED', "Une clé d'opération valide est requise.");
        const file = await validateFile(bytes, name);
        await this.ready();
        // GridFS cannot enlist in metadata transactions: each invocation stages its own immutable bytes.
        // A replay removes this invocation's unused staging file, never the winning upload's bytes.
        const id = randomUUID();
        await this.files.put(p, id, file.bytes, file.mime);
        try {
            const result = await runOperation(this.connection, p, key, 'upload', { hash: file.hash, name, replaceId: replaceId ?? null }, async (session) => {
                let primary = false;
                if (replaceId)
                    primary = (await this.owned(p, replaceId, session)).is_primary;
                primary = primary || !(await this.model.exists({ user_id, status: 'ready', is_primary: true }).session(session));
                const now = new Date().toISOString();
                if (primary)
                    await this.model.updateMany({ user_id, status: 'ready', is_primary: true }, { $set: { is_primary: false, updated_at: now } }, { session });
                const row = { id, user_id, original_filename: file.name, storage_path: id, mime_type: file.mime, file_size: file.size, file_hash: file.hash, is_primary: primary, processing_status: 'unavailable', extraction: null, status: 'ready', created_at: now, updated_at: now };
                await this.model.create([row], { session });
                return safe(row);
            });
            if (result.id !== id)
                await this.files.remove(p, id);
            return result;
        }
        catch (error) {
            // Never remove bytes after an uncertain commit unless MongoDB confirms metadata is absent.
            try {
                if (!await this.model.exists({ id, user_id }))
                    await this.files.remove(p, id);
            }
            catch { /* Retain the private claim for later orphan reconciliation. */ }
            throw error;
        }
    }
    async primary(p, id) { const user_id = requireCandidate(p); identifier(id); await this.ready(); return withOwnerTransaction(this.connection, p, async (session) => { await this.owned(p, id, session); const now = new Date().toISOString(); await this.model.updateMany({ user_id, status: 'ready', is_primary: true }, { $set: { is_primary: false, updated_at: now } }, { session }); await this.model.updateOne({ id, user_id, status: 'ready' }, { $set: { is_primary: true, updated_at: now } }, { session }); return { message: 'CV principal mis à jour.' }; }); }
    async remove(p, id) { return this.delete(p, id); }
    async deleteCv(p, id) { return this.delete(p, id); }
    async delete(p, id) {
        const user_id = requireCandidate(p);
        identifier(id);
        await this.ready();
        await withOwnerTransaction(this.connection, p, async (session) => {
            const row = await this.model.findOne({ id, user_id }).session(session).lean();
            if (!row)
                throw new DataError('NOT_FOUND', 'CV introuvable.', 404);
            if (row.status === 'deleting')
                return;
            for (const collection of ['applications', 'candidate_letters', 'candidate_letter_versions']) {
                if (await this.connection.db.collection(collection).findOne(collection === 'candidate_letter_versions' ? { 'snapshot.cvId': id } : { cv_id: id }, { session, projection: { _id: 1 } }))
                    throw new DataError('CV_REFERENCED', 'Ce CV est utilisé par une candidature ou une lettre. Sa suppression est bloquée pour conserver le document original.', 409);
            }
            await this.model.updateOne({ id, user_id }, { $set: { status: 'deleting', is_primary: false, updated_at: new Date().toISOString() } }, { session });
            if (row.is_primary) {
                const next = await this.model.findOne({ user_id, status: 'ready' }).sort({ created_at: -1, id: -1 }).session(session).lean();
                if (next)
                    await this.model.updateOne({ id: next.id, user_id }, { $set: { is_primary: true, updated_at: new Date().toISOString() } }, { session });
            }
        });
        // Durable tombstone forbids new references. If storage fails, deletion stays pending and retry resumes.
        try {
            await this.files.remove(p, id);
        }
        catch (error) {
            if (!(error instanceof DataError && error.code === 'NOT_FOUND'))
                throw new DataError('STORAGE_UNAVAILABLE', 'La suppression privée est en attente. Réessayez.', 503);
        }
        await withOwnerTransaction(this.connection, p, async (session) => { await this.model.deleteOne({ id, user_id, status: 'deleting' }, { session }); });
        return { message: 'CV et fichier privé supprimés.' };
    }
}
