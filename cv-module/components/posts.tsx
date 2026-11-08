'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { archivePost, deletePost, getComments, listJobs, listMine, listPosts, postInteraction, savePost, postsViewer, managePost, uploadPostMedia } from '../actions/postActions';
const categoryGroups = { Entreprise: [['Annonce d’entreprise', 'Annonce d’entreprise'], ['Offre d’emploi', 'Offre d’emploi'], ['Annonce de stage ou PFE', 'Stage / PFE'], ['Actualité de recrutement', 'Actualité recrutement'], ['Vie d’entreprise', 'Vie d’entreprise'], ['Événement ou journée portes ouvertes', 'Portes ouvertes'], ['Atelier', 'Atelier'], ['Bourse', 'Bourse'], ['Campus', 'Campus'], ['Témoignage', 'Témoignage'], ['Conseil carrière', 'Conseil carrière']], Candidat: [['Conseil carrière', 'Conseil carrière'], ['Témoignage', 'Témoignage'], ['Campus', 'Campus'], ['Atelier', 'Atelier'], ['Actualité de recrutement', 'Actualité recrutement']] } as const;
const kinds = [['TEXT', 'Texte'], ['PHOTO', 'Photo'], ['VIDEO', 'Vidéo'], ['DOCUMENT', 'Document'], ['POLL', 'Sondage'], ['EVENT', 'Événement'], ['CELEBRATE', 'Célébration'], ['ARTICLE', 'Article'], ['JOB', 'Offre détaillée']] as const;
type FormValue = {
    title: string;
    content: string;
    category: string;
    tags: string[];
    mediaUrl: string;
    coverImageUrl: string;
    sourceUrl: string;
    jobId: string;
    commentsEnabled: boolean;
    visibility: string;
    postKind: string;
    pollOptions: string[];
    pollDuration: string;
    eventAt: string;
    eventLocation: string;
    celebration: string;
    status: string;
    scheduledAt: string;
    pinned: boolean;
    urgent: boolean;
    language: string;
    publishAs: string;
    imageAlt: string;
    jobDetails: Record<string, string>;
};
const empty: FormValue = { title: '', content: '', category: categoryGroups.Candidat[0][0], tags: [], mediaUrl: '', coverImageUrl: '', sourceUrl: '', jobId: '', commentsEnabled: true, visibility: 'public', postKind: 'TEXT', pollOptions: ['', ''], pollDuration: '7', eventAt: '', eventLocation: '', celebration: 'GRADUATION', status: 'published', scheduledAt: '', pinned: false, urgent: false, language: 'FR', publishAs: 'company', imageAlt: '', jobDetails: {} };
type Post = any;
const splitTags = (s: string) => Array.from(new Set(s.split(/[,;\n]/).map(x => x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(x => x.length >= 2).slice(0, 12)));
export { PostsFeed } from './posts-feed';
function localDate(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export function MyPosts({ embedded = false, onCreated, initialKind = 'TEXT', editId }: {
    embedded?: boolean;
    onCreated?: () => void;
    initialKind?: string;
    editId?: string;
}) {
    const [rows, setRows] = useState<Post[]>([]), [jobs, setJobs] = useState<any[]>([]), [form, setForm] = useState<FormValue>({ ...empty, postKind: initialKind }), [editing, setEditing] = useState(''), [tab, setTab] = useState('all'), [notice, setNotice] = useState(''), [isCompany, setIsCompany] = useState(false), [section, setSection] = useState(['TEXT', 'ARTICLE'].includes(initialKind) ? 'content' : 'media'), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false);
    async function load() { const [r, j, v] = await Promise.all([listMine(), listJobs(), postsViewer()]); if (r.ok) {
        setRows(r.data);
        if (editId) {
            const found = r.data.find(p => p.id === editId);
            if (found)
                edit(found);
        }
    }
    else
        setNotice(r.error.message); if (j.ok)
        setJobs(j.data); if (v.ok)
        setIsCompany(v.data.role === 'recruiter'); }
    useEffect(() => { void load(); }, []);
    const shown = rows.filter(p => tab === 'all' || p.status === tab);
    const options = useMemo(() => isCompany ? categoryGroups.Entreprise : categoryGroups.Candidat, [isCompany]);
    function field(name: keyof FormValue, value: any) { setForm(prev => ({ ...prev, [name]: value })); }
    async function submit(e: FormEvent){
      e.preventDefault();if(busy||uploading)return;setBusy(true);
      try{
       const result=await savePost({...form,pollOptions:form.postKind==='POLL'?form.pollOptions:[],scheduledAt:form.scheduledAt?new Date(form.scheduledAt).toISOString():'',eventAt:form.eventAt?new Date(form.eventAt).toISOString():''},editing||undefined);
       if(result.ok){setNotice('Publication enregistrée.');setForm({...empty,category:isCompany?categoryGroups.Entreprise[0][0]:categoryGroups.Candidat[0][0]});setEditing('');if(onCreated)onCreated();else await load();}else setNotice(result.error.message);
      }catch{setNotice('La publication n’a pas pu être enregistrée. Réessayez.');}finally{setBusy(false);}
    }
    function edit(p: Post) { setEditing(p.id); setForm({ pinned: !!p.pinned, urgent: !!p.urgent, language: p.language || 'FR', publishAs: p.publish_as || 'company', imageAlt: p.image_alt || '', jobDetails: p.job_details || {}, title: p.title || '', content: p.content || '', category: p.category, tags: p.tags || [], mediaUrl: p.media_url || '', coverImageUrl: p.cover_image_url || '', sourceUrl: p.source_url || '', jobId: p.job_id || '', commentsEnabled: p.comments_enabled !== false, visibility: p.visibility || 'public', postKind: p.post_kind || 'TEXT', pollOptions: p.poll?.options || ['', ''], pollDuration: String(p.poll_duration || '7'), eventAt: p.event?.starts_at ? localDate(p.event.starts_at) : '', eventLocation: p.event?.location || '', celebration: p.celebration || 'GRADUATION', status: ['published', 'draft', 'scheduled'].includes(p.status) ? p.status : 'draft', scheduledAt: p.scheduled_at ? localDate(p.scheduled_at) : '' }); if (!embedded)
        window.scrollTo({ top: 0, behavior: 'smooth' }); }
    const tagText = form.tags.join(', '), setTags = (raw: string) => field('tags', splitTags(raw));
    return <section className={`cv-module posts-studio ${embedded ? 'posts-embedded' : ''}`}><header className="cv-page-heading"><div><p className="cv-eyebrow">Espace personnel</p><h1>Mes publications</h1><p>Créez et gérez vos contenus professionnels.</p></div><a className="cv-button" href="/dashboard/posts">Voir le fil</a></header>
  <form className="cv-card post-editor" onSubmit={submit} onInvalidCapture={e => { const panel = (e.target as HTMLElement).closest('.post-panel'); if (panel) {
        const index = Array.from(panel.parentElement!.querySelectorAll('.post-panel')).indexOf(panel);
        setSection(['content', 'media', 'settings'][index]);
    } }}><h2>{editing ? 'Modifier la publication' : 'Nouvelle publication'}</h2><div className="post-account-note">{isCompany ? 'Publication au nom de votre entreprise' : 'Publication candidate'} · profil SmartApply</div>
   <nav className="post-section-tabs" aria-label="Sections du compositeur">{[['content', 'Contenu'], ['media', 'Médias & formats'], ['settings', 'Paramètres']].map(([id, label]) => <button type="button" key={id} onClick={() => setSection(id)} aria-pressed={section === id}>{label}</button>)}</nav>
   <div hidden={section !== 'content'} className="post-panel"><fieldset className="post-fieldset"><legend>Type de publication</legend><div className="post-choice-grid">{kinds.filter(([v]) => v !== 'JOB' || isCompany).map(([v, l]) => <button type="button" className={form.postKind === v ? 'selected' : ''} key={v} onClick={() => { field('postKind', v); if (!['TEXT', 'ARTICLE'].includes(v))
        setSection('media'); }}>{l}</button>)}</div></fieldset>
   <label>Titre (facultatif)<input maxLength={200} value={form.title} onChange={e => field('title', e.target.value)} placeholder={isCompany ? 'Ex. Stage développement web — été 2026' : 'Ex. Comment préparer un entretien PFE'}/><small>{form.title.length}/200</small></label>
   <label>Contenu<textarea aria-label="Contenu" required minLength={10} maxLength={20000} rows={7} value={form.content} onChange={e => field('content', e.target.value)} placeholder={isCompany ? 'Présentez votre annonce, votre équipe ou votre événement…' : 'Partagez un conseil ou votre expérience professionnelle…'}/><small>{form.content.length}/20 000</small></label>
   <div className="post-emoji-bar">{['😀', '👏', '💪', '🔥', '✨', '🎉', '❤️', '🤝', '🚀', '✅'].map(emoji => <button type="button" key={emoji} aria-label={`Insérer ${emoji}`} onClick={() => field('content', form.content + emoji)}>{emoji}</button>)}</div><fieldset className="post-fieldset"><legend>Catégorie</legend><div className="post-category-grid">{options.map(([v, l]) => <button type="button" className={form.category === v ? 'selected' : ''} key={v} onClick={() => field('category', v)}>{l}</button>)}</div></fieldset>
   </div><div hidden={section !== 'media'} className="post-panel">{(form.postKind === 'PHOTO' || form.postKind === 'VIDEO' || form.postKind === 'DOCUMENT') && <label>{form.postKind === 'PHOTO' ? 'Lien de l’image' : form.postKind === 'VIDEO' ? 'Lien de la vidéo' : 'Lien du document'}<input required value={form.mediaUrl} onChange={e => field('mediaUrl', e.target.value)} placeholder="https://…"/></label>}
   {form.postKind === 'POLL' && <fieldset className="post-fieldset"><legend>Sondage</legend>{form.pollOptions.map((v, i) => <label key={i}>Option {i + 1}<input maxLength={80} value={v} onChange={e => field('pollOptions', form.pollOptions.map((x, j) => i === j ? e.target.value : x))}/></label>)}{form.pollOptions.length > 2 && <button className="cv-button" type="button" onClick={() => field('pollOptions', form.pollOptions.slice(0, -1))}>Retirer la dernière option</button>}{form.pollOptions.length < 4 && <button className="cv-button" type="button" onClick={() => field('pollOptions', [...form.pollOptions, ''])}>Ajouter une option</button>}<label>Durée<select value={form.pollDuration} onChange={e => field('pollDuration', e.target.value)}><option value="1">1 jour</option><option value="3">3 jours</option><option value="7">7 jours</option><option value="14">14 jours</option></select></label></fieldset>}
   {form.postKind === 'EVENT' && <fieldset className="post-fieldset"><legend>Événement</legend><label>Date et heure<input required type="datetime-local" value={form.eventAt} onChange={e => field('eventAt', e.target.value)}/></label><label>Lieu<input maxLength={160} value={form.eventLocation} onChange={e => field('eventLocation', e.target.value)} placeholder="Lieu ou lien de visioconférence"/></label></fieldset>}
   {form.postKind === 'CELEBRATE' && <label>Occasion<select value={form.celebration} onChange={e => field('celebration', e.target.value)}><option value="NEW_JOB">Nouveau poste</option><option value="GRADUATION">Diplôme</option><option value="PROMOTION">Promotion</option><option value="PROJECT">Projet</option><option value="CERTIFICATE">Certification</option><option value="ANNIVERSARY">Anniversaire professionnel</option></select></label>}
   {form.postKind === 'JOB' && <><label>Offre publiée de votre entreprise<select value={form.jobId} onChange={e => field('jobId', e.target.value)}><option value="">Sélectionner une offre</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}{j.city ? ` · ${j.city}` : ''}</option>)}</select></label>{!jobs.length && <p className="post-hint">Publiez d’abord une offre pour pouvoir l’associer à ce post.</p>}</>}
   {form.postKind === 'JOB' && <fieldset className="post-fieldset"><legend>Détails du poste</legend><div className="cv-form-grid">{[['profession', 'Métier'], ['contractType', 'Contrat'], ['experience', 'Expérience'], ['workMode', 'Mode de travail'], ['location', 'Localisation'], ['salaryMin', 'Salaire minimum'], ['salaryMax', 'Salaire maximum'], ['currency', 'Devise'], ['education', 'Formation'], ['skills', 'Compétences'], ['responsibilities', 'Missions'], ['deadline', 'Date limite'], ['applicationUrl', 'Lien de candidature']].map(([key, label]) => <label key={key}>{label}<input value={form.jobDetails[key] || ''} onChange={e => field('jobDetails', { ...form.jobDetails, [key]: e.target.value })}/></label>)}</div></fieldset>}
   {['PHOTO', 'VIDEO', 'DOCUMENT'].includes(form.postKind) && <><label>Importer un fichier (4 Mo maximum)<input type="file" accept={form.postKind === 'PHOTO' ? 'image/jpeg,image/png,image/webp,image/gif' : form.postKind === 'VIDEO' ? 'video/mp4,video/webm' : 'application/pdf'} onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; if (file.size > 4 * 1024 * 1024) {
        setNotice('Le fichier dépasse 4 Mo.');
        return;
    } setUploading(true); try {
        const data = new FormData();
        data.set('file', file);
        const result = await uploadPostMedia(data);
        if (!result.ok)
            throw new Error(result.error.message);
        field('mediaUrl', result.data);
        setNotice('Fichier importé.');
    }
    catch (error) {
        setNotice(error instanceof Error ? error.message : 'Import impossible.');
    }
    finally {
        setUploading(false);
    } }}/></label>{uploading && <p role="status">Import en cours…</p>}{form.mediaUrl&&<div className="post-media-preview">{form.postKind==='PHOTO'?<img className="post-cover" src={form.mediaUrl} alt={form.imageAlt||'Aperçu de la photo'}/>:form.postKind==='VIDEO'?<video className="post-cover" controls src={form.mediaUrl}/>:<a className="cv-button" target="_blank" rel="noreferrer" href={form.mediaUrl}>Consulter le document</a>}<button type="button" className="cv-button" onClick={()=>field('mediaUrl','')}>Retirer le média</button></div>}<label>Description du média<input maxLength={300} value={form.imageAlt} onChange={e => field('imageAlt', e.target.value)}/></label></>}
   <div className="cv-form-grid"><label>Image de couverture HTTPS<input type="url" value={form.coverImageUrl} onChange={e => field('coverImageUrl', e.target.value)} placeholder="https://… (facultatif)"/></label><label>Lien source<input type="url" value={form.sourceUrl} onChange={e => field('sourceUrl', e.target.value)} placeholder="https://… (facultatif)"/></label></div>
   </div><div hidden={section !== 'settings'} className="post-panel"><label>Tags (séparés par virgules)<input value={tagText} onChange={e => setTags(e.target.value)} placeholder="recrutement, stage, carrière"/>{form.tags.length > 0 && <small>{form.tags.map(t => `#${t}`).join(' · ')}</small>}</label>
   <div className="cv-form-grid"><label>Visibilité<select value={form.visibility} onChange={e => field('visibility', e.target.value)}><option value="public">Tout le monde</option><option value="members">Membres connectés</option></select></label><label>Publication<select aria-label="Publication" value={form.status} onChange={e => field('status', e.target.value)}><option value="published">Publier maintenant</option><option value="draft">Enregistrer en brouillon</option><option value="scheduled">Programmer</option></select></label></div>{form.status === 'scheduled' && <label>Date de publication<input type="datetime-local" required value={form.scheduledAt} onChange={e => field('scheduledAt', e.target.value)}/></label>}
   <div className="cv-form-grid"><label>Langue<select value={form.language} onChange={e => field('language', e.target.value)}><option value="FR">Français</option><option value="EN">English</option></select></label>{isCompany && <label>Publier en tant que<select value={form.publishAs} onChange={e => field('publishAs', e.target.value)}><option value="company">Mon entreprise</option><option value="personal">Mon profil personnel</option></select></label>}</div><label className="post-check"><input type="checkbox" checked={form.pinned} onChange={e => field('pinned', e.target.checked)}/> Épingler en haut</label><label className="post-check"><input type="checkbox" checked={form.urgent} onChange={e => field('urgent', e.target.checked)}/> Publication urgente</label><label className="post-check"><input type="checkbox" checked={form.commentsEnabled} onChange={e => field('commentsEnabled', e.target.checked)}/> Autoriser les commentaires</label>
   </div>{notice && <p role="status" className="post-notice">{notice}</p>}<div className="post-actions"><button disabled={busy || uploading} className="cv-button cv-button-primary">{form.status === 'draft' ? 'Enregistrer le brouillon' : form.status === 'scheduled' ? 'Programmer' : 'Publier'}</button>{editing && <button type="button" className="cv-button" onClick={() => { setEditing(''); setForm(empty); }}>Annuler</button>}</div>
  </form>
  {!embedded && <><nav className="post-tabs" aria-label="Filtrer mes publications">{[['all', 'Toutes'], ['published', 'Publiées'], ['draft', 'Brouillons'], ['scheduled', 'Programmées'], ['archived', 'Archives']].map(([id, label]) => <button type="button" className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}>{label}</button>)}</nav><div className="posts-feed">{shown.map(p => <article className="cv-card post-card" key={p.id}><small>{p.status === 'scheduled' ? 'Programmée' : p.status === 'draft' ? 'Brouillon' : p.status === 'archived' ? 'Archivée' : 'Publiée'}{p.scheduled_at && ` · ${new Date(p.scheduled_at).toLocaleString('fr-FR')}`}</small><h2>{p.title}</h2><p>{p.content}</p><p className="post-counters">{p.likes || 0} réaction(s) · {p.comments || 0} commentaire(s) · {p.bookmarks || 0} enregistrement(s)</p><div className="post-actions">{p.status !== 'published' && <button onClick={async () => { const r = await managePost(p.id, 'publish'); setNotice(r.ok ? 'Publication publiée.' : r.error.message); await load(); }}>Publier maintenant</button>}{p.status === 'scheduled' && <button onClick={async () => { const r = await savePost({ ...empty, ...{ title: p.title, content: p.content, category: p.category, tags: p.tags || [], postKind: p.post_kind || 'TEXT', mediaUrl: p.media_url || '', coverImageUrl: p.cover_image_url || '', sourceUrl: p.source_url || '', jobId: p.job_id || '', pollOptions: p.poll?.options || [], pollDuration: String(p.poll_duration || '7'), eventAt: p.event?.starts_at || '', eventLocation: p.event?.location || '', celebration: p.celebration || 'GRADUATION', visibility: p.visibility || 'public', commentsEnabled: p.comments_enabled !== false, jobDetails: p.job_details || {}, pinned: !!p.pinned, urgent: !!p.urgent, language: p.language || 'FR', publishAs: p.publish_as || 'company' }, status: 'draft' }, p.id); setNotice(r.ok ? 'Programmation annulée.' : r.error.message); await load(); }}>Annuler la programmation</button>}<button onClick={() => edit(p)}>Modifier</button><button onClick={async () => { const r = await archivePost(p.id, p.status === 'archived'); setNotice(r.ok ? 'État de la publication mis à jour.' : r.error.message); await load(); }}>{p.status === 'archived' ? 'Restaurer' : 'Archiver'}</button><button onClick={async () => { if (confirm('Supprimer définitivement cette publication ?')) {
        const r = await deletePost(p.id);
        setNotice(r.ok ? 'Publication supprimée.' : r.error.message);
        await load();
    } }}>Supprimer</button></div></article>)}</div></>}
 </section>;
}
