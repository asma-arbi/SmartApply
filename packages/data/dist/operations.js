import { createHash } from 'node:crypto';
import { DataError, principalSchema } from './identity.js';
const readiness = new WeakMap();
export async function ensureOperationIndexes(c) { if (!c.db)
    throw new DataError('DATABASE_UNAVAILABLE', 'MongoDB non connecté.', 503); let promise = readiness.get(c); if (!promise) {
    promise = c.db.collection('module_operations').createIndex({ user_id: 1, key: 1 }, { unique: true }).catch(e => { readiness.delete(c); throw e; });
    readiness.set(c, promise);
} await promise; }
export async function withOwnerTransaction(c, p, work) {
    const parsed = principalSchema.safeParse(p);
    if (!parsed.success || (!p.emailVerified && !p.authenticatedSession))
        throw new DataError('FORBIDDEN', 'Identité vérifiée requise.', 403);
    if (!c.db)
        throw new DataError('DATABASE_UNAVAILABLE', 'MongoDB non connecté.', 503);
    const locks = c.db.collection('module_owner_locks');
    try {
        await locks.updateOne({ _id: p.userId }, { $setOnInsert: { sequence: 0 } }, { upsert: true });
    }
    catch (e) {
        if (e.code !== 11000)
            throw e;
    }
    return c.transaction(async (session) => { await locks.updateOne({ _id: p.userId }, { $inc: { sequence: 1 } }, { session }); return work(session); });
}
export function operationFingerprint(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export async function runOperation(c, p, key, kind, input, work) {
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(key))
        throw new DataError('IDEMPOTENCY_REQUIRED', 'Clé d’opération valide requise.');
    await ensureOperationIndexes(c);
    const fingerprint = operationFingerprint(input);
    return withOwnerTransaction(c, p, async (session) => { const operations = c.db.collection('module_operations'); const prior = await operations.findOne({ user_id: p.userId, key }, { session }); if (prior) {
        if (prior.kind !== kind || prior.fingerprint !== fingerprint)
            throw new DataError('IDEMPOTENCY_CONFLICT', 'Cette clé appartient à une autre demande.', 409);
        return prior.result;
    } const result = await work(session); await operations.insertOne({ user_id: p.userId, key, kind, fingerprint, result, created_at: new Date() }, { session }); return result; });
}
export function toDTO(record) { if (!record)
    return record; return JSON.parse(JSON.stringify(record, (key, value) => key === '_id' || key === '__v' ? undefined : value)); }
