'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {ThumbsUp,MessageCircle,Repeat2,Send,Share2,Copy,Mail,Bookmark,EyeOff,Pencil,Trash2,FileText,Download,Globe} from 'lucide-react';
import './posts-social.css';
import { createPortal } from 'react-dom';
import { archivePost, commentAction, deletePost, getComments, listPosts, managePost, postInteraction, postsViewer } from '../actions/postActions';
import { MyPosts } from './posts';
const formats = [['TEXT', '✎', 'Texte'], ['PHOTO', '▧', 'Photo'], ['VIDEO', '▷', 'Vidéo'], ['DOCUMENT', '▤', 'Document'], ['POLL', '▥', 'Sondage'], ['EVENT', '▦', 'Événement'], ['CELEBRATE', '☆', 'Célébrer'], ['ARTICLE', '≡', 'Article'], ['JOB', '▣', 'Lier une offre']];
const categories = ['Conseil carrière', 'Actualité de recrutement', 'Annonce de stage ou PFE', 'Offre d’emploi', 'Annonce d’entreprise', 'Vie d’entreprise', 'Événement ou journée portes ouvertes', 'Atelier', 'Témoignage', 'Bourse', 'Campus'];
const reactions = [['LIKE', '👍', 'J’aime'], ['LOVE', '❤️', 'J’adore'], ['CELEBRATE', '👏', 'Bravo'], ['INSIGHTFUL', '💡', 'Instructif'], ['SUPPORT', '🤝', 'Soutien'], ['FUNNY', '😄', 'Drôle']];
const occasions: Record<string, string> = { NEW_JOB: 'Nouveau poste', GRADUATION: 'Diplôme', PROMOTION: 'Promotion', PROJECT: 'Projet', CERTIFICATE: 'Certification', ANNIVERSARY: 'Anniversaire professionnel' };
type Post = any;
export function Modal({ title, onClose, children }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const previous = document.activeElement as HTMLElement; const bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; ref.current?.focus(); function key(e: KeyboardEvent) { if (e.key === 'Escape')
        onClose(); if (e.key === 'Tab') {
        const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]') || []).filter(n => n.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    } } document.addEventListener('keydown', key); return () => { document.body.style.overflow = bodyOverflow; document.removeEventListener('keydown', key); previous?.focus(); }; }, [onClose]);
    return createPortal(<div className="cv-module post-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="post-modal"><header><h2>{title}</h2><button type="button" className="cv-button" aria-label="Fermer" onClick={onClose}>×</button></header>{children}</div></div>, document.body);
}
export function PostsFeed({ canInteract = true, canPublish = canInteract, manageHref = '/dashboard/posts?view=mine', postId }: {
    canInteract?: boolean;
    canPublish?: boolean;
    manageHref?: string;
    postId?: string;
}) {
    const [rows, setRows] = useState<Post[]>([]), [q, setQ] = useState(''), [category, setCategory] = useState(''), [tag, setTag] = useState(''), [company, setCompany] = useState(''), [kind, setKind] = useState(''), [sort, setSort] = useState('recent'), [saved, setSaved] = useState(false), [loading, setLoading] = useState(true), [more, setMore] = useState(false), [message, setMessage] = useState(''), [viewer, setViewer] = useState({ role: '', name: 'Vous' }), [composer, setComposer] = useState<string | null>(null), [editId, setEditId] = useState<string>(), [report, setReport] = useState<string>(), [reason, setReason] = useState('Spam ou publicité'), [details, setDetails] = useState(''), [busy, setBusy] = useState(false);
    const request = useRef(0);
    const load=useCallback(async()=>{const serial=++request.current;setLoading(true);try{const r=await listPosts({q,category,tag,company,kind,saved,sort,id:postId});if(serial!==request.current)return;if(!r?.ok)throw new Error(r?.error?.message||'Chargement impossible. Réessayez.');setRows(r.data);setMore(r.data.length===20);}catch(e){if(serial===request.current)setMessage((e as Error).message||'Chargement impossible.');}finally{if(serial===request.current)setLoading(false);}},[q,category,tag,company,kind,saved,sort,postId]);
    useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
    useEffect(() => { if (canInteract)
        void postsViewer().then(r => { if (r?.ok)
            setViewer(r.data); }).catch(()=>{}); }, [canInteract]);
    useEffect(() => { if (!canInteract)
        return; const refreshTimer=window.setInterval(()=>void load(),15000);
        let ws: WebSocket | undefined; try {
        if(location.protocol==='https:'&&!process.env.NEXT_PUBLIC_POSTS_WS_URL)return()=>window.clearInterval(refreshTimer);
        const url = new URL(process.env.NEXT_PUBLIC_POSTS_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:${process.env.NEXT_PUBLIC_POSTS_WS_PORT || '4300'}/api/posts/ws`);
        url.searchParams.set('channel', 'feed');
        ws = new WebSocket(url);
        ws.onmessage = event => {void load();try{window.dispatchEvent(new CustomEvent('smartapply-post-event',{detail:JSON.parse(event.data)}));}catch{}};
    }
    catch { } return () => {window.clearInterval(refreshTimer);ws?.close();}; }, [canInteract, load]);
    async function run(action: () => Promise<any>, note = '') { if (busy)
        return; setBusy(true); try {
        const r = await action();
        if (!r?.ok) {
            setMessage(r?.error?.message||'Action impossible. Réessayez.');
            return false;
        }
        setMessage(note);
        await load();
        return true;
    }
    catch {
        setMessage('L’action a échoué. Réessayez.');
        return false;
    }
    finally {
        setBusy(false);
    } }
    const closeComposer = useCallback(() => { setComposer(null); setEditId(undefined); }, []);
    const closeReport = useCallback(() => setReport(undefined), []);
    const isCompany = viewer.role === 'recruiter';
    return <section className={`cv-module posts-public posts-workspace social-feed ${isCompany?'company-feed-design':''}`} aria-label="Publications SmartApply">
  <header className="cv-page-heading"><div><p className="cv-eyebrow">{isCompany?'VOTRE ENTREPRISE, VOTRE COMMUNAUTÉ':'Communauté SmartApply'}</p><h2>{isCompany?'Faites rayonner votre entreprise.':'Actualités & publications'}</h2><p>{isCompany?'Partagez vos actualités, présentez vos équipes et rencontrez vos futurs talents.':'Partagez vos expériences et découvrez les actualités professionnelles.'}</p></div>{canInteract && <a className="cv-button" href={manageHref}>{canPublish ? 'Mes publications' : 'Modération'}</a>}</header>
  <div className="post-feed-layout"><div className="post-feed-main">
   {canPublish && canInteract && <div className="cv-card post-compose-trigger">{isCompany&&<div className="company-compose-heading"><span className="company-section-mark">✦</span><div><h3>Une actualité à partager ?</h3><p>Donnez la parole à votre entreprise.</p></div><span className="company-public-badge">Publication publique</span></div>}<div className="post-compose-row"><span className="post-avatar">{viewer.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</span><button className="post-start" onClick={() => setComposer('TEXT')}>Commencer un post</button></div><div className="post-quick-actions">{formats.filter(([id]) => ['PHOTO', 'VIDEO', 'ARTICLE'].includes(id)).map(([id, icon, label]) => <button key={id} onClick={() => setComposer(id)}><span aria-hidden className={`format-icon format-${id.toLowerCase()}`}><PostFormatIcon kind={id}/></span>{id==='ARTICLE'?'Rédiger un article':label}</button>)}</div></div>}
   {!postId && <><nav className="post-tabs" aria-label="Vue des publications"><button className={!saved ? 'active' : ''} onClick={() => setSaved(false)}>Fil d’actualité</button>{canInteract && <button className={saved ? 'active' : ''} onClick={() => setSaved(true)}>Enregistrées</button>}</nav><label className="social-feed-sort">Trier par :<select aria-label="Tri rapide des publications" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Récents</option><option value="oldest">Anciens</option></select></label><div className="post-category-strip"><button className={!category ? 'selected' : ''} onClick={() => setCategory('')}>Tout</button>{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(category === c ? '' : c)}>{c === 'Annonce de stage ou PFE' ? 'Stage / PFE' : c}</button>)}</div><details className="post-filter-disclosure"><summary>Affiner les résultats <span>{[q,kind,company,tag].filter(Boolean).length||'Recherche et filtres'}</span></summary><div className="cv-card posts-filters"><input aria-label="Rechercher des publications" placeholder="Rechercher un post, un tag…" value={q} onChange={e => setQ(e.target.value)}/><select aria-label="Format" value={kind} onChange={e => setKind(e.target.value)}><option value="">Tous les formats</option>{formats.filter(([id]) => id !== 'JOB' || isCompany || !canPublish).map(([id, , label]) => <option key={id} value={id}>{label}</option>)}</select><input aria-label="Entreprise" placeholder="Entreprise" value={company} onChange={e => setCompany(e.target.value)}/><input aria-label="Tag" placeholder="Tag" value={tag} onChange={e => setTag(e.target.value)}/><select aria-label="Trier les publications" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Plus récentes</option><option value="oldest">Plus anciennes</option></select></div></details></>}
   {message && <p role="status" className="post-notice">{message}</p>}
   <div className="posts-feed" aria-busy={loading}>{loading && rows.length === 0 ? <div className="cv-card post-loading" role="status">Chargement des publications…</div> : rows.map(p => <FeedCard key={p.id} p={p} canInteract={canInteract} busy={busy} onAction={(action, value) => run(() => postInteraction(p.id, action, value))} onManage={action => run(() => managePost(p.id, action))} onEdit={() => { setEditId(p.id); setComposer(p.post_kind || 'TEXT'); }} onArchive={() => run(() => archivePost(p.id))} onDelete={() => { if (confirm('Supprimer définitivement cette publication ?'))
        void run(() => deletePost(p.id)); }} onReport={() => { setReport(p.id); setDetails(''); }} onTag={setTag} notice={setMessage} refresh={load}/>)}{!loading && !rows.length && <div className="cv-empty-state">{isCompany&&<span className="company-empty-icon" aria-hidden><PostFormatIcon kind="ARTICLE"/></span>}<h3>{saved ? 'Aucune publication enregistrée' : 'Aucune publication pour le moment'}</h3><p>{saved ? 'Enregistrez les posts que vous souhaitez retrouver ici.' : 'Essayez d’autres filtres ou partagez votre première publication.'}</p>{isCompany&&canPublish&&<button className="cv-button cv-button-primary" onClick={()=>setComposer('TEXT')}>Créer une publication</button>}</div>}</div>
   {more && <button disabled={loading || busy} className="cv-button post-load-more" onClick={async () => { setLoading(true); const serial = request.current; const r = await listPosts({ q, category, tag, company, kind, saved, sort, offset: rows.length }); if (serial === request.current && r.ok) {
        setRows(previous => [...previous, ...r.data.filter(p => !previous.some(old => old.id === p.id))]);
        setMore(r.data.length === 20);
    }
    else if (!r.ok)
        setMessage(r?.error?.message||'Chargement impossible. Réessayez.'); setLoading(false); }}>Voir plus de publications</button>}
  </div><aside className="post-feed-aside"><div className="cv-card company-space-card">{isCompany&&<span className="company-space-symbol" aria-hidden><PostFormatIcon kind="JOB"/></span>}<p className="cv-eyebrow">Votre espace</p><h3>{isCompany ? 'Faites vivre votre entreprise' : 'Votre réseau professionnel'}</h3><p>{isCompany ? 'Partagez vos recrutements, vos événements et la vie de votre équipe.' : 'Partagez un conseil, une réussite ou une expérience avec la communauté.'}</p>{canPublish && canInteract ? <a className="cv-button" href={manageHref}>Gérer mes publications</a> : <a className="cv-button" href="/login">Se connecter</a>}</div><div className="cv-card company-discover-card"><h3>À découvrir</h3>{['Conseil carrière', 'Annonce de stage ou PFE', 'Événement ou journée portes ouvertes'].map(c => <button key={c} onClick={() => setCategory(c)}>{c}</button>)}</div></aside></div>
  {composer && <Modal title={editId ? 'Modifier la publication' : isCompany ? 'Créer une publication entreprise' : 'Créer une publication'} onClose={closeComposer}><MyPosts embedded initialKind={composer} editId={editId} onCreated={() => { closeComposer(); void load(); }}/></Modal>}
  {report && <Modal title="Signaler cette publication" onClose={closeReport}><form className="post-report-form" onSubmit={async (e) => { e.preventDefault(); if (await run(() => postInteraction(report, 'report', `${reason} : ${details}`), 'Signalement envoyé.'))
        closeReport(); }}><label>Motif<select value={reason} onChange={e => setReason(e.target.value)}>{['Spam ou publicité', 'Contenu abusif', 'Fausses informations', 'Droits d’auteur', 'Autre'].map(v => <option key={v}>{v}</option>)}</select></label><label>Précisions<textarea maxLength={400} value={details} onChange={e => setDetails(e.target.value)} placeholder="Expliquez le problème rencontré…"/></label><button disabled={busy} className="cv-button cv-button-primary">Envoyer le signalement</button></form></Modal>}
 </section>;
}
export function FeedCard({ p, canInteract, busy, onAction, onManage, onEdit, onArchive, onDelete, onReport, onTag, notice, refresh }: {
    p: Post;
    canInteract: boolean;
    busy: boolean;
    onAction: (kind: 'like' | 'save' | 'vote' | 'hide' | 'repost', value?: string) => Promise<any>;
    onManage: (action: 'pin' | 'comments' | 'publish') => Promise<any>;
    onEdit: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onReport: () => void;
    onTag: (tag: string) => void;
    notice: (text: string) => void;
    refresh:()=>Promise<void>;
}) {
    const [open, setOpen] = useState(false), [comments, setComments] = useState<any[]>([]), [draft, setDraft] = useState(''), [sending, setSending] = useState(false), [loading, setLoading] = useState(false),[replyTo,setReplyTo]=useState<any>(null);
    const link = () => `${location.origin}/posts/${p.id}`;
    const loadComments=useCallback(async()=>{setLoading(true);try{const r=await getComments(p.id);if(!r?.ok)throw new Error(r?.error?.message||'Impossible de charger les commentaires.');setComments(r.data);}catch(e){notice((e as Error).message);}finally{setLoading(false);}},[p.id,notice]);
    useEffect(() => { if (open)
        void loadComments(); }, [open, p.comments, loadComments]);
    useEffect(()=>{if(!open)return;const listener=(event:Event)=>{if((event as CustomEvent).detail?.postId===p.id)void loadComments();};window.addEventListener('smartapply-post-event',listener);return()=>window.removeEventListener('smartapply-post-event',listener);},[open,p.id,loadComments]);
    async function send() { if (sending || !draft.trim())
        return; setSending(true); try {
        const r = await postInteraction(p.id, 'comment', draft,replyTo?.id||'');
        if (r?.ok) {
            setDraft('');setReplyTo(null);
            await loadComments();await refresh();
        }
        else
            notice(r.error.message);
    }
    catch {notice('Impossible d’envoyer le commentaire. Réessayez.');}
    finally {
        setSending(false);
    } }
    const current = reactions.find(([id]) => id === (p.reaction || (p.liked ? 'LIKE' : '')));
    return <article className="cv-card post-card" id={`post-${p.id}`}><div className="post-author"><span className="post-avatar">{p.avatar_url?<img src={p.avatar_url} alt=""/>:(p.company_name || p.author_name || 'S').split(' ').slice(0,2).map((n:string)=>n[0]).join('')}</span><div className="post-author-info"><strong>{p.company_name || p.author_name}</strong><small>{p.category}</small><small>{new Date(p.published_at).toLocaleString('fr-FR',{timeZone:'Africa/Tunis',dateStyle:'medium',timeStyle:'short'})} · {p.visibility==='members'?'Membres':'🌐'}</small></div><details className="post-menu"><summary aria-label="Options de la publication">•••</summary><div>{p.can_manage && <><button disabled={busy} onClick={onEdit}><Pencil size={16}/>Modifier ma publication</button><button disabled={busy} onClick={() => void onManage('pin')}>{p.pinned ? 'Désépingler' : 'Épingler en haut'}</button><button disabled={busy} onClick={() => void onManage('comments')}>{p.comments_enabled ? 'Désactiver' : 'Activer'} les commentaires</button><button disabled={busy} onClick={onArchive}>Archiver</button><button disabled={busy} className="social-danger" onClick={onDelete}><Trash2 size={16}/>Supprimer ma publication</button></>}{canInteract && <><button disabled={busy} onClick={() => void onAction('save')}><Bookmark size={16}/>{p.saved ? 'Retirer des enregistrements' : 'Enregistrer'}</button><button disabled={busy} onClick={() => void onAction('hide')}><EyeOff size={16}/>Masquer ce post</button>{!p.can_manage&&<button disabled={busy} onClick={onReport}>Signaler</button>}</>}<button disabled={busy} onClick={() => void navigator.clipboard.writeText(link()).then(() => notice('Lien copié.')).catch(() => notice('Copie impossible.'))}><Copy size={16}/>Copier le lien</button></div></details></div>
  <div className="post-badges"><span>{p.category}</span>{p.pinned && <span>Épinglée</span>}{p.urgent && <span>Urgent</span>}{p.repost_of && <span>Republication</span>}</div>{p.title&&p.title!==p.content.split('\n')[0].slice(0,180)&&<a className="post-title-link" href={`/posts/${p.id}`}><h3>{p.title}</h3></a>}<p className="post-content">{p.content}</p>
  {p.cover_image_url && <img className="post-cover" src={p.cover_image_url} alt={p.image_alt || 'Illustration de la publication'}/>}
  {p.media_url && (p.post_kind === 'PHOTO' ? <img className="post-cover" src={p.media_url} alt={p.image_alt || 'Photo jointe'}/> : p.post_kind === 'VIDEO' ? <video controls preload="metadata" className="post-cover" src={p.media_url}/> : <div className="post-attachment"><span className="social-pdf-icon">PDF</span><div><strong>{p.media_name||p.title||'Document PDF'}</strong><small>Document · PDF</small></div><a href={p.media_url} target="_blank" rel="noreferrer" download={p.media_name||undefined}><Download size={15}/>Télécharger</a></div>)}
  {p.event && <div className="post-event"><strong>▦ Événement</strong><p>{new Date(p.event.starts_at).toLocaleString('fr-FR')}</p><p>{p.event.location}</p></div>}{p.celebration && <div className="post-event">🎉 {occasions[p.celebration] || p.celebration}</div>}
  {p.poll && <div className="post-poll"><strong>Sondage</strong>{p.poll.options.map((option: string, i: number) => { const percent = p.poll_results?.total ? Math.round((p.poll_results.counts[i] || 0) * 100 / p.poll_results.total) : 0; return <button key={i} disabled={!canInteract || busy || new Date(p.poll.closes_at) <= new Date()} onClick={() => void onAction('vote', String(i))} className={p.poll_results?.myOption === i ? 'selected' : ''}><span>{option}{p.poll_results?.myOption === i ? ' ✓' : ''}</span><strong>{percent}%</strong><span className="post-poll-progress" style={{ width: `${percent}%` }}/></button>; })}<small>{p.poll_results?.total || 0} vote(s) · Clôture le {new Date(p.poll.closes_at).toLocaleDateString('fr-FR')}</small></div>}
  {p.job_title && <a className="post-job" href={`/jobs/${encodeURIComponent(p.job_id)}`}>▣ {p.job_title}</a>}{p.post_kind === 'JOB' && p.job_details && <dl className="post-job-details">{Object.entries(p.job_details).filter(([, v]) => v).map(([key, value]) => <div key={key}><dt>{({ profession: 'Métier', contractType: 'Contrat', experience: 'Expérience', workMode: 'Mode de travail', location: 'Lieu', salaryMin: 'Salaire minimum', salaryMax: 'Salaire maximum', currency: 'Devise', education: 'Formation', skills: 'Compétences', responsibilities: 'Missions', deadline: 'Date limite', applicationUrl: 'Candidature' } as Record<string, string>)[key] || key}</dt><dd>{String(value)}</dd></div>)}</dl>}
  {p.source_url && <a className="post-source" href={p.source_url} target="_blank" rel="noreferrer">Source : {p.source_label || p.source_url} ↗</a>}{p.tags?.length > 0 && <div className="post-tags">{p.tags.map((tag: string) => <button key={tag} onClick={() => onTag(tag)}>#{tag}</button>)}</div>}
  <div className="post-counters"><span>{p.likes>0&&<>👍 {p.likes}</>}</span><div>{p.comments>0&&<button onClick={()=>setOpen(!open)}>{p.comments} commentaire{p.comments>1?'s':''}</button>}{p.reposts>0&&<span>{p.reposts} republication{p.reposts>1?'s':''}</span>}</div></div>
  {canInteract?<div className="post-social-actions"><div className="social-reaction-action"><button aria-label={p.liked?'Retirer ma réaction':'J’aime'} disabled={busy} className={p.liked?'selected':''} onClick={()=>void onAction('like',p.reaction||'LIKE')}>{current?<span>{current[1]}</span>:<ThumbsUp size={19}/>}<span>{current?current[2]:'J’aime'}</span></button><details className="post-reaction-picker"><summary aria-label="Choisir une réaction">⌄</summary><div>{reactions.map(([id,emoji,label])=><button disabled={busy} key={id} aria-label={label} title={label} onClick={e=>{void onAction('like',id);e.currentTarget.closest('details')?.removeAttribute('open');}}>{emoji}</button>)}</div></details></div><button onClick={()=>setOpen(!open)}><MessageCircle size={19}/>Commenter</button><button disabled={busy} onClick={()=>void onAction('repost')}><Repeat2 size={19}/>Republier{p.reposts>0?' '+p.reposts:''}</button><details className="post-share"><summary><Send size={19}/>Envoyer</summary><div><button onClick={()=>void (async()=>{try{if(navigator.share)await navigator.share({title:p.title,url:link()});else{await navigator.clipboard.writeText(link());notice('Lien copié.');}}catch(e){if((e as Error).name!=='AbortError')notice('Le partage a échoué.');}})()}><Share2 size={16}/>Partager…</button><button onClick={()=>void navigator.clipboard.writeText(link()).then(()=>notice('Lien copié.')).catch(()=>notice('Copie impossible.'))}><Copy size={16}/>Copier le lien</button><a href={`mailto:?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(typeof location==='undefined'?'':link())}`}><Mail size={16}/>Envoyer par e-mail</a><a href={`https://wa.me/?text=${encodeURIComponent(p.title+' '+(typeof location==='undefined'?'':link()))}`} target="_blank" rel="noreferrer"><Send size={16}/>Envoyer sur WhatsApp</a></div></details></div>:<a className="cv-button" href="/login">Se connecter pour interagir</a>}
  {open && <div className="post-comments"><h4>Commentaires</h4>{loading ? <p role="status">Chargement…</p> : comments.length ? <CommentTree comments={comments} parentId={null} canInteract={canInteract} commentsEnabled={p.comments_enabled!==false} onReply={c=>{setReplyTo(c);setTimeout(()=>document.getElementById('comment-input-'+p.id)?.focus(),0);}} onChange={loadComments} notice={notice}/> : <p>Aucun commentaire pour le moment.</p>}{replyTo&&<div className="post-reply-note">Réponse à {replyTo.user_name}<button type="button" onClick={()=>setReplyTo(null)}>Annuler</button></div>}{canInteract && p.comments_enabled !== false ? <form onSubmit={e => { e.preventDefault(); void send(); }}><input id={'comment-input-'+p.id} required maxLength={1200} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Écrire un commentaire…" aria-label="Votre commentaire"/><button disabled={sending} className="cv-button cv-button-primary">Envoyer</button></form> : p.comments_enabled === false && <p>Les commentaires sont désactivés.</p>}</div>}
 </article>;
}

function CommentTree({comments,parentId,canInteract,commentsEnabled,onReply,onChange,notice,depth=0}:{comments:any[];parentId:string|null;canInteract:boolean;commentsEnabled:boolean;onReply:(comment:any)=>void;onChange:()=>Promise<void>;notice:(text:string)=>void;depth?:number}){
 const [editing,setEditing]=useState(''),[text,setText]=useState(''),[busy,setBusy]=useState(false);
 async function act(id:string,action:'react'|'edit'|'delete',value=''){if(busy)return;setBusy(true);try{const result=await commentAction(id,action,value);if(result.ok){setEditing('');await onChange();}else notice(result.error.message);}catch{notice('Cette action a échoué.');}finally{setBusy(false);}}
 return <div className={depth?'post-comment-replies':'post-comment-thread'}>{comments.filter(c=>(c.parent_id||null)===parentId).map(c=><div className="post-comment" key={c.id}><span className="social-comment-avatar">{c.user_name?.split(' ').slice(0,2).map((n:string)=>n[0]).join('')||'S'}</span><strong>{c.user_name}</strong><small>{new Date(c.created_at).toLocaleString('fr-FR')}</small>{editing===c.id?<form onSubmit={e=>{e.preventDefault();void act(c.id,'edit',text);}}><textarea aria-label="Modifier mon commentaire" required maxLength={1200} value={text} onChange={e=>setText(e.target.value)}/><button disabled={busy} className="cv-button">Enregistrer</button><button type="button" onClick={()=>setEditing('')}>Annuler</button></form>:<p>{c.content}</p>}{canInteract&&!c.deleted&&<div className="post-comment-controls"><details className="post-comment-react"><summary>{reactions.find(([id])=>id===c.reaction)?.[1]||'♡'} {c.likes||0}</summary><div>{reactions.map(([id,emoji,label])=><button disabled={busy} title={label} aria-label={label} key={id} onClick={e=>{void act(c.id,'react',id);e.currentTarget.closest('details')?.removeAttribute('open');}}>{emoji}</button>)}</div></details>{commentsEnabled&&<button onClick={()=>onReply(c)}>Répondre</button>}{c.can_manage&&<>{commentsEnabled&&<button onClick={()=>{setEditing(c.id);setText(c.content);}}>Modifier</button>}<button onClick={()=>{if(confirm('Supprimer votre commentaire ?'))void act(c.id,'delete');}}>Supprimer</button></>}</div>}{depth<20&&<CommentTree comments={comments} parentId={c.id} canInteract={canInteract} commentsEnabled={commentsEnabled} onReply={onReply} onChange={onChange} notice={notice} depth={depth+1}/>}</div>)}</div>;
}

function PostFormatIcon({kind}:{kind:string}){
 const paths:Record<string,ReactNode>={PHOTO:<><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,VIDEO:<><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></>,DOCUMENT:<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/></>,POLL:<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 16v-4m5 4V7m5 9v-6"/></>,EVENT:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3"/></>,JOB:<><rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12c6 4 12 4 18 0M12 12v4"/></>};
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[kind]||paths.DOCUMENT}</svg>;
}
