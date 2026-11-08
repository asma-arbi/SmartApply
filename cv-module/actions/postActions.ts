'use server';
import 'server-only';
import { Binary } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authenticated } from '../lib/action-result';
import { connectDB } from '../lib/mongodb';
import { DataError, type Principal } from '@smartapply/data';
import { requireIdentity } from '../lib/identity';
import type { ActionResult } from '../lib/action-result';
const categories = ['Annonce d’entreprise', 'Offre d’emploi', 'Annonce de stage ou PFE', 'Actualité de recrutement', 'Conseil carrière', 'Vie d’entreprise', 'Événement ou journée portes ouvertes', 'Atelier', 'Témoignage', 'Bourse', 'Campus'] as const;
const postKinds = ['TEXT', 'PHOTO', 'VIDEO', 'DOCUMENT', 'POLL', 'EVENT', 'CELEBRATE', 'ARTICLE', 'JOB'] as const;
const postInput = z.object({ title: z.string().trim().max(200).default(''), content: z.string().trim().min(10, 'Le texte doit contenir au moins 10 caractères.').max(20000), category: z.enum(categories), tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]), mediaUrl: z.string().trim().max(2000).default('').refine(v => !v || /^https:\/\//i.test(v) || /^\/api\/posts\/media\/[a-f0-9]{24}$/.test(v), 'Le média doit être un lien HTTPS.'), coverImageUrl: z.string().trim().max(2000).default('').refine(v => !v || /^https:\/\//i.test(v) || /^\/api\/posts\/media\/[a-f0-9]{24}$/.test(v), 'L’image de couverture doit être un lien HTTPS.'), sourceUrl: z.string().trim().max(2000).default('').refine(v => !v || /^https?:\/\//i.test(v), 'Le lien source doit utiliser HTTP ou HTTPS.'), jobId: z.string().trim().max(300).default(''), commentsEnabled: z.boolean().default(true), visibility: z.enum(['public', 'members']).default('public'), postKind: z.enum(postKinds).default('TEXT'), pollOptions: z.array(z.string().trim().min(1).max(80)).max(4).default([]), pollDuration: z.enum(['1', '3', '7', '14']).default('7'), eventAt: z.string().optional(), eventLocation: z.string().trim().max(160).default(''), celebration: z.enum(['NEW_JOB', 'GRADUATION', 'PROMOTION', 'PROJECT', 'CERTIFICATE', 'ANNIVERSARY']).default('GRADUATION'), status: z.enum(['published', 'draft', 'scheduled']).default('published'), scheduledAt: z.string().optional(), pinned: z.boolean().default(false), urgent: z.boolean().default(false), language: z.enum(['FR', 'EN']).default('FR'), publishAs: z.enum(['personal', 'company']).default('company'), imageAlt: z.string().trim().max(300).default(''), jobDetails: z.record(z.string(), z.string().max(2000)).default({}) }).strict();
const err = (message: string): never => { throw new DataError('VALIDATION', message, 400); };
async function ready(db: any) {
    await Promise.all([
        db.collection('posts').createIndex({ status: 1, published_at: -1 }), db.collection('posts').createIndex({ author_id: 1, created_at: -1 }),
        db.collection('post_reactions').createIndex({ post_id: 1, user_id: 1 }, { unique: true }), db.collection('post_bookmarks').createIndex({ post_id: 1, user_id: 1 }, { unique: true }),
        db.collection('post_votes').createIndex({ post_id: 1, user_id: 1 }, { unique: true }), db.collection('post_hidden').createIndex({ post_id: 1, user_id: 1 }, { unique: true }), db.collection('post_comment_reactions').createIndex({comment_id:1,user_id:1},{unique:true}),db.collection('post_comments').createIndex({ post_id: 1, created_at: 1 }), db.collection('post_reports').createIndex({ post_id: 1, created_at: -1 }),
    ]);
}
async function publishDue(db: any) { const now = new Date(); await db.collection('posts').updateMany({ status: 'scheduled', scheduled_at: { $lte: now } }, { $set: { status: 'published', published_at: now, updated_at: now } }); }
async function base(p: Principal) { const c = await connectDB(); const db = c.db!; await ready(db); const user = await db.collection('users').findOne({ id: p.userId }); if (!user || user.active === false)
    throw new DataError('POSTS_ACCESS', 'Compte indisponible.', 403); return { db, user }; }
async function notifyPostRealtime(type: 'post_changed' | 'comment_created', postId: string) { const secret = process.env.POSTS_REALTIME_SECRET, baseUrl = process.env.CV_MODULE_BACKEND_URL; if (!secret || !baseUrl)
    return; try {
    await fetch(`${baseUrl}/api/posts/events`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-smartapply-request': '1', 'x-posts-realtime-secret': secret }, body: JSON.stringify({ type, postId }), cache: 'no-store', signal: AbortSignal.timeout(1500) });
}
catch { /* persistence remains authoritative */ } }
function publicActionError(error: unknown): ActionResult<never> {
    if(error instanceof DataError)return {ok:false,error:{message:error.message,code:error.code,status:error.status}};
    return {ok:false,error:{message:'Le fil est momentanément indisponible. Réessayez.',code:'POSTS_UNAVAILABLE',status:503}};
}
function publicFilter(): any { return { $or: [{ visibility: { $ne: 'members' } }, { visibility: 'members' }] }; }
export async function listPosts(filters: {
    q?: string;
    category?: string;
    tag?: string;
    company?: string;
    kind?: string;
    saved?: boolean;
    sort?: string;
    offset?: number;
    id?: string;
} = {}): Promise<ActionResult<any[]>> { try {
    const db = (await connectDB()).db!;
    await ready(db);
    await publishDue(db);
    const principal = await requireIdentity().catch(() => null);
    const f: any = { status: 'published', ...publicFilter() };
    if (!principal)
        f.visibility = { $ne: 'members' };
    if (filters.id)
        f.id = filters.id;
    const hidden = principal ? await db.collection('post_hidden').find({ user_id: principal.userId }).toArray() : [];
    f.id = filters.id ? filters.id : { $nin: hidden.map(h => h.post_id) };
    if (filters.saved) {
        if (!principal)
            return { ok: true, data: [] };
        const saved = await db.collection('post_bookmarks').find({ user_id: principal.userId }).toArray();
        f.id = { $in: saved.map(b => b.post_id), $nin: hidden.map(h => h.post_id) };
    }
    if (filters.category)
        f.category = filters.category;
    if (filters.kind)
        f.post_kind = filters.kind;
    if (filters.company)
        f.company_name = filters.company.trim().slice(0, 150);
    if (filters.tag)
        f.tags = filters.tag;
    if (filters.q) {
        const q = filters.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (q)
            f.$and = [...(f.$and || []), { $or: [{ title: { $regex: q, $options: 'i' } }, { content: { $regex: q, $options: 'i' } }, { company_name: { $regex: q, $options: 'i' } }, { tags: { $regex: q, $options: 'i' } }] }];
    }
    const rows = await db.collection('posts').find(f).sort(filters.sort === 'oldest' ? { published_at: 1 } : { pinned: -1, published_at: -1 }).skip(Math.max(0, Math.min(filters.offset || 0, 10000))).limit(20).toArray();
    const data = await Promise.all(rows.map(async ({ _id, ...r }) => ({ ...r, can_manage: principal?.userId === r.author_id, reaction: principal ? (await db.collection('post_reactions').findOne({ post_id: r.id, user_id: principal.userId }))?.type || null : null, poll_results: r.poll ? await pollResults(db, r.id, principal?.userId) : null, likes: await db.collection('post_reactions').countDocuments({ post_id: r.id }), comments: await db.collection('post_comments').countDocuments({ post_id: r.id }), liked: principal ? !!await db.collection('post_reactions').findOne({ post_id: r.id, user_id: principal.userId }) : false, saved: principal ? !!await db.collection('post_bookmarks').findOne({ post_id: r.id, user_id: principal.userId }) : false })));
    return { ok: true, data };
}
catch (e) {
    return publicActionError(e);
} }
export async function listMine(): Promise<ActionResult<any[]>> { return authenticated(async (p) => { const { db } = await base(p); await publishDue(db); const rows = await db.collection('posts').find({ author_id: p.userId }).sort({ created_at: -1 }).limit(100).toArray(); return Promise.all(rows.map(async ({ _id, ...r }: any) => ({ ...r, likes: await db.collection('post_reactions').countDocuments({ post_id: r.id }), comments: await db.collection('post_comments').countDocuments({ post_id: r.id }), bookmarks: await db.collection('post_bookmarks').countDocuments({ post_id: r.id }) }))); }); }
export async function listJobs() { return authenticated(async (p) => { const { db } = await base(p); if (p.role !== 'recruiter')
    return []; return db.collection('jobs').find({ company_id: p.userId, status: 'published', archived: { $ne: true } }).project({ _id: 0, id: 1, title: 1, contract: 1, city: 1 }).sort({ created_at: -1 }).limit(100).toArray(); }); }
export async function savePost(input: unknown, id?: string) {
    return authenticated(async (p) => {
        const { db, user } = await base(p);
        if (!['candidate', 'recruiter'].includes(p.role))
            throw new DataError('POSTS_ACCESS', 'Seuls les candidats et entreprises peuvent publier.', 403);
        const parsed = postInput.safeParse(input);
        if (!parsed.success)
            err(parsed.error.issues[0]?.message || 'Vérifiez les champs.');
        if (!parsed.success)
            return '';
        const v = parsed.data;
        for (const url of [v.mediaUrl, v.coverImageUrl]) {
            if (url.startsWith('/api/posts/media/')) {
                const { ObjectId } = await import('mongodb');
                if (!await db.collection('post_media').findOne({ _id: new ObjectId(url.split('/').pop()), owner_id: p.userId }))
                    err('Ce média ne vous appartient pas.');
            }
            else if (url) {
                try {
                    const parsedUrl = new URL(url);
                    if (parsedUrl.protocol !== 'https:')
                        err('Utilisez un lien HTTPS valide.');
                }
                catch {
                    err('Lien média invalide.');
                }
            }
        }
        let scheduledAt: Date | null = null;
        if (v.status === 'scheduled') {
            scheduledAt = new Date(v.scheduledAt || '');
            if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date())
                err('Choisissez une date future valide.');
        }
        if (v.postKind === 'POLL' && new Set(v.pollOptions.map(x => x.toLowerCase())).size !== v.pollOptions.length)
            err('Les options du sondage doivent être distinctes.');
        if (v.postKind === 'POLL' && (v.pollOptions.length < 2 || v.pollOptions.some(x => !x.trim())))
            err('Un sondage nécessite au moins deux options.');
        if (v.postKind === 'EVENT' && !v.eventAt)
            err('Indiquez la date de l’événement.');
        if (v.postKind === 'JOB' && p.role !== 'recruiter')
            err('Seule une entreprise peut publier un format offre.');
        let company: any = null;
        if (p.role === 'recruiter') {
            company = await db.collection('companies').findOne({ id: p.userId, archived: { $ne: true } });
            if (!company)
                err('Profil entreprise introuvable.');
        }
        let job: any = null;
        if (v.jobId) {
            job = await db.collection('jobs').findOne({ id: v.jobId, status: 'published', archived: { $ne: true } });
            if (!job)
                err('Offre publiée introuvable.');
            if (p.role === 'recruiter' && job.company_id !== p.userId)
                err('Cette offre publiée ne vous appartient pas.');
        }
        if (v.jobId && p.role !== 'recruiter')
            err('Seule une entreprise peut associer son offre.');
        if (['PHOTO', 'VIDEO', 'DOCUMENT'].includes(v.postKind) && !v.mediaUrl)
            err('Ajoutez un média.');
        if (v.postKind === 'EVENT' && !Number.isFinite(new Date(v.eventAt || '').getTime()))
            err('Date invalide.');
        const now = new Date();
        const update = { pinned: v.pinned, urgent: v.urgent, language: v.language, publish_as: v.publishAs, image_alt: v.imageAlt, job_details: v.jobDetails, poll_duration: v.pollDuration, title: v.title || v.content.split('\n')[0].slice(0, 180), content: v.content, category: v.category, tags: Array.from(new Set(v.tags.map(t => t.trim().toLowerCase()).filter(Boolean))), media_url: v.mediaUrl, media_type: v.postKind === 'PHOTO' ? 'image' : v.postKind === 'VIDEO' ? 'video' : v.postKind === 'DOCUMENT' ? 'document' : null, cover_image_url: v.coverImageUrl, source_url: v.sourceUrl, source_label: v.sourceUrl ? new URL(v.sourceUrl).hostname.replace(/^www\./, '') : null, job_id: job?.id || null, job_title: job?.title || null, comments_enabled: v.commentsEnabled, visibility: v.visibility, post_kind: v.postKind, poll: v.postKind === 'POLL' ? { options: v.pollOptions, closes_at: new Date((scheduledAt||now).getTime() + Number(v.pollDuration) * 86400000) } : null, event: v.postKind === 'EVENT' ? { starts_at: new Date(v.eventAt || '').toISOString(), location: v.eventLocation || null } : null, celebration: v.postKind === 'CELEBRATE' ? v.celebration : null, status: v.status, scheduled_at: scheduledAt, published_at: v.status === 'published' ? now : null, updated_at: now };
        if (v.postKind === 'EVENT' && (!Number.isFinite(new Date(v.eventAt || '').getTime())))
            err('La date de l’événement est invalide.');
        if (id) {
            const found = await db.collection('posts').findOne({ id, author_id: p.userId });
            if (!found)
                throw new DataError('POSTS_ACCESS', 'Publication introuvable ou non autorisée.', 403);
            if (found.poll && v.postKind === 'POLL' && JSON.stringify(found.poll.options) !== JSON.stringify(v.pollOptions) && await db.collection('post_votes').countDocuments({ post_id: id }))
                err('Un sondage ayant reçu des votes ne peut plus changer ses options.');
            if (found.poll && found.status==='published' && v.postKind === 'POLL')
                update.poll!.closes_at = found.poll.closes_at;
            await db.collection('posts').updateOne({ id, author_id: p.userId }, { $set: { ...update, company_name: v.publishAs === 'company' ? company?.name || null : null } });
            if (v.status === 'published')
                await notifyPostRealtime('post_changed', id);
            return id;
        }
        const post = { id: randomUUID(), author_id: p.userId, author_name: user.name || user.company_name || 'Membre SmartApply', author_role: p.role, company_id: v.publishAs === 'company' ? company?.id || null : null, company_name: v.publishAs === 'company' ? company?.name || null : null, avatar_url: user.avatar_url || null, ...update, created_at: now };
        await db.collection('posts').insertOne(post);
        if (v.status === 'published')
            await notifyPostRealtime('post_changed', post.id);
        return post.id;
    }, ['/dashboard/posts', '/dashboard/candidate/posts', '/dashboard/company/posts', '/']);
}
export async function archivePost(id: string, restore = false) { return authenticated(async (p) => { const { db } = await base(p); const r = await db.collection('posts').updateOne({ id, author_id: p.userId, status: restore ? 'archived' : { $in: ['published', 'draft', 'scheduled'] } }, { $set: { status: restore ? 'draft' : 'archived', updated_at: new Date() } }); if (!r.matchedCount)
    throw new DataError('POSTS_ACCESS', 'Publication introuvable ou non autorisée.', 403); await notifyPostRealtime('post_changed', id); return true; }, ['/dashboard/posts', '/dashboard/candidate/posts', '/dashboard/company/posts', '/']); }
export async function deletePost(id: string) { return authenticated(async (p) => { const { db } = await base(p); const r = await db.collection('posts').deleteOne({ id, author_id: p.userId }); if (!r.deletedCount)
    throw new DataError('POSTS_ACCESS', 'Publication introuvable ou non autorisée.', 403); await Promise.all(['post_reactions', 'post_bookmarks', 'post_comments', 'post_reports', 'post_votes', 'post_hidden', 'post_comment_reactions'].map(c => db.collection(c).deleteMany({ post_id: id }))); await notifyPostRealtime('post_changed', id); return true; }, ['/dashboard/posts', '/dashboard/candidate/posts', '/dashboard/company/posts', '/']); }
export async function postInteraction(id: string, kind: 'like' | 'save' | 'comment' | 'report' | 'vote' | 'hide' | 'repost', value = '', parentId = '') { return authenticated(async (p) => { const { db } = await base(p); const post = await db.collection('posts').findOne({ id, status: 'published' }); if (!post)
    throw new DataError('POSTS_ACCESS', 'Publication introuvable.', 404); const now = new Date(); if (kind === 'vote') {
    const option = Number(value);
    if (!post.poll || new Date(post.poll.closes_at) <= now || !Number.isInteger(option) || option < 0 || option >= post.poll.options.length)
        err('Ce vote n’est pas disponible.');
    await db.collection('post_votes').updateOne({ post_id: id, user_id: p.userId }, { $set: { option, updated_at: now } }, { upsert: true });
    await notifyPostRealtime('post_changed', id);
    return true;
} if (kind === 'hide') {
    await db.collection('post_hidden').updateOne({ post_id: id, user_id: p.userId }, { $set: { created_at: now } }, { upsert: true });
    return true;
} if (kind === 'repost') {
    if (!['candidate', 'recruiter'].includes(p.role))
        err('Publication non autorisée.');
    const { _id, ...original } = post;
    const user = await db.collection('users').findOne({ id: p.userId });
    const copy = { ...original, id: randomUUID(), author_id: p.userId, author_name: user?.name || 'Membre', author_role: p.role, company_id: null, company_name: null, repost_of: id, pinned: false, published_at: now, created_at: now, updated_at: now };
    await db.collection('posts').insertOne(copy);
    await notifyPostRealtime('post_changed', copy.id);
    return true;
} if (kind === 'like' || kind === 'save') {
    const collection = db.collection(kind === 'like' ? 'post_reactions' : 'post_bookmarks');
    const existing = await collection.findOne({ post_id: id, user_id: p.userId });
    const type = ['LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'SUPPORT', 'FUNNY'].includes(value) ? value : 'LIKE';
    if (existing && (kind === 'save' || (existing.type || 'LIKE') === type))
        await collection.deleteOne({ _id: existing._id });
    else
        await collection.updateOne({ post_id: id, user_id: p.userId }, { $set: { type, created_at: now }, $setOnInsert: { id: randomUUID() } }, { upsert: true });
    await notifyPostRealtime('post_changed', id);
    return true;
} if (kind === 'comment') {
    if (!post.comments_enabled)
        err('Les commentaires sont désactivés.');
    const text = value.trim();
    if (!text || text.length > 1200)
        err('Le commentaire doit contenir entre 1 et 1 200 caractères.');
    if(parentId&&!await db.collection('post_comments').findOne({id:parentId,post_id:id}))err('Commentaire parent introuvable.');
    await db.collection('post_comments').insertOne({parent_id:parentId||null, id: randomUUID(), post_id: id, user_id: p.userId, user_name: (await db.collection('users').findOne({ id: p.userId }))?.name || 'Membre', content: text, created_at: now });
    await notifyPostRealtime('comment_created', id);
    return true;
} const reason = value.trim(); if (reason.length < 5 || reason.length > 500)
    err('Précisez un motif (5 à 500 caractères).'); await db.collection('post_reports').updateOne({ post_id: id, user_id: p.userId, status: 'open' }, { $setOnInsert: { id: randomUUID(), post_id: id, user_id: p.userId, reason, status: 'open', created_at: now } }, { upsert: true }); return true; }, ['/dashboard/posts', '/dashboard/candidate/posts', '/dashboard/company/posts']); }
export async function getComments(id: string): Promise<ActionResult<any[]>> { try {
    const db = (await connectDB()).db!;
    await ready(db);
    const principal = await requireIdentity().catch(() => null);
    if (!await db.collection('posts').findOne({ id, status: 'published', ...(!principal ? { visibility: { $ne: 'members' } } : {}) }))
        err('Publication indisponible.');
    const rows=await db.collection('post_comments').find({post_id:id}).sort({created_at:1}).limit(300).toArray();
    const data=await Promise.all(rows.map(async c=>({id:c.id,parent_id:c.parent_id,user_name:c.user_name,content:c.deleted?'Commentaire supprimé.':c.content,deleted:!!c.deleted,created_at:c.created_at,can_manage:principal?.userId===c.user_id,likes:await db.collection('post_comment_reactions').countDocuments({comment_id:c.id}),reaction:principal?(await db.collection('post_comment_reactions').findOne({comment_id:c.id,user_id:principal.userId}))?.type||null:null})));
    return {ok:true,data};
}
catch (e) {
    return publicActionError(e);
} }
export async function listReports() { return authenticated(async (p) => { if (p.role !== 'admin')
    throw new DataError('POSTS_ACCESS', 'Accès réservé à l’administration.', 403); const { db } = await base(p); const reports = await db.collection('post_reports').find({ status: 'open' }).sort({ created_at: -1 }).limit(100).toArray(); return Promise.all(reports.map(async ({ _id, ...r }) => { const post = await db.collection('posts').findOne({ id: r.post_id }); return { ...r, post_title: post?.title, post_content: post?.content, post_author: post?.company_name || post?.author_name }; })); }); }
export async function moderateReport(id: string, decision: 'dismiss' | 'remove') { return authenticated(async (p) => { if (p.role !== 'admin')
    throw new DataError('POSTS_ACCESS', 'Accès réservé à l’administration.', 403); const { db } = await base(p); const report = await db.collection('post_reports').findOne({ id, status: 'open' }); if (!report)
    err('Signalement introuvable.'); if (!report)
    return false; const now = new Date(); await db.collection('post_reports').updateOne({ id }, { $set: { status: decision === 'dismiss' ? 'rejected' : 'actioned', decision, moderator_id: p.userId, decided_at: now } }); if (decision === 'remove')
    await db.collection('posts').updateOne({ id: report.post_id }, { $set: { status: 'removed', moderated_at: now, moderator_id: p.userId } }); return true; }, ['/dashboard/admin/posts', '/dashboard/posts', '/']); }
async function pollResults(db: any, id: string, userId?: string) { const votes = await db.collection('post_votes').find({ post_id: id }).toArray(); return { counts: votes.reduce((a: any, v: any) => ({ ...a, [v.option]: (a[v.option] || 0) + 1 }), {}), total: votes.length, myOption: votes.find((v: any) => v.user_id === userId)?.option ?? null }; }
export async function postsViewer() { return authenticated(async (p) => { const { user } = await base(p); return { role: p.role, name: user.name || 'Vous' }; }); }
export async function managePost(id: string, action: 'pin' | 'comments' | 'publish') { return authenticated(async (p) => { const { db } = await base(p); const post = await db.collection('posts').findOne({ id, author_id: p.userId }); if (!post)
    throw new DataError('POSTS_ACCESS', 'Publication introuvable.', 404); const update:any = action === 'pin' ? { pinned: !post.pinned } : action === 'comments' ? { comments_enabled: !post.comments_enabled } : { status: 'published', published_at: new Date(), scheduled_at: null }; if(action==='publish'&&post.poll&&post.status!=='published'&&!await db.collection('post_votes').countDocuments({post_id:id}))update['poll.closes_at']=new Date(Date.now()+Number(post.poll_duration||7)*86400000);await db.collection('posts').updateOne({ id, author_id: p.userId }, { $set: { ...update, updated_at: new Date() } }); await notifyPostRealtime('post_changed', id); return true; }, ['/dashboard/posts', '/']); }
export async function uploadPostMedia(data: FormData) { return authenticated(async (p) => { if (!['candidate', 'recruiter'].includes(p.role))
    err('Publication non autorisée.'); const file = data.get('file'); if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024)
    err('Choisissez un fichier de moins de 4 Mo.'); if (!(file instanceof File))
    return ''; const bytes = Buffer.from(await file.arrayBuffer()); const mime = file.type; const valid = (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) || (mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) || (mime === 'image/gif' && bytes.subarray(0, 3).toString() === 'GIF') || (mime === 'image/webp' && bytes.subarray(8, 12).toString() === 'WEBP') || (mime === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-') || (mime === 'video/mp4' && bytes.subarray(4, 8).toString() === 'ftyp') || (mime === 'video/webm' && bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))); if (!valid)
    err('Format de fichier invalide.'); const { db } = await base(p); const result = await db.collection('post_media').insertOne({ owner_id: p.userId, name: file.name.slice(0, 180), mime, data: new Binary(bytes), created_at: new Date() }); return '/api/posts/media/' + result.insertedId.toHexString(); }); }

export async function commentAction(id:string,action:'react'|'edit'|'delete',value=''){return authenticated(async p=>{
 const {db}=await base(p);if(!['react','edit','delete'].includes(action))err('Action invalide.');
 const comment=await db.collection('post_comments').findOne({id});if(!comment)err('Commentaire introuvable.');
 const post=await db.collection('posts').findOne({id:comment!.post_id,status:'published'});if(!post)err('Publication indisponible.');
 if(action==='react'){
  if(comment!.deleted)err('Ce commentaire a été supprimé.');
  const type=['LIKE','LOVE','CELEBRATE','INSIGHTFUL','SUPPORT','FUNNY'].includes(value)?value:'LIKE';
  const reactions=db.collection('post_comment_reactions');const existing=await reactions.findOne({comment_id:id,user_id:p.userId});
  if(existing?.type===type)await reactions.deleteOne({_id:existing._id});else await reactions.updateOne({comment_id:id,user_id:p.userId},{$set:{type,post_id:comment!.post_id},$setOnInsert:{id:randomUUID()}},{upsert:true});
 }else{
  if(comment!.user_id!==p.userId)throw new DataError('POSTS_ACCESS','Ce commentaire ne vous appartient pas.',403);
  if(action==='edit'&&(comment!.deleted||!post!.comments_enabled))err('Ce commentaire ne peut plus être modifié.');
  const content=value.trim();if(action==='edit'&&(!content||content.length>1200))err('Le commentaire doit contenir entre 1 et 1 200 caractères.');
  await db.collection('post_comments').updateOne({id,user_id:p.userId},{$set:action==='delete'?{deleted:true,content:'',updated_at:new Date()}:{content,updated_at:new Date()}});
 }
 await notifyPostRealtime('comment_created',comment!.post_id);return true;
},['/dashboard/posts','/']);}
