'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { archivePost, deletePost, getComments, listJobs, listMine, listPosts, postInteraction, savePost, postsViewer, managePost, uploadPostMedia } from '../actions/postActions';
import {Image as ImageIcon,Video,FileText,BarChart3,CalendarDays,Smile,Globe,Hash,Upload,X,Pin,MessageSquare,Plus} from 'lucide-react';
import './posts-social.css';
const categoryGroups = { Entreprise: [['Annonce d’entreprise', 'Annonce d’entreprise'], ['Offre d’emploi', 'Offre d’emploi'], ['Annonce de stage ou PFE', 'Stage / PFE'], ['Actualité de recrutement', 'Actualité recrutement'], ['Vie d’entreprise', 'Vie d’entreprise'], ['Événement ou journée portes ouvertes', 'Portes ouvertes'], ['Atelier', 'Atelier'], ['Bourse', 'Bourse'], ['Campus', 'Campus'], ['Témoignage', 'Témoignage'], ['Conseil carrière', 'Conseil carrière']], Candidat: [['Conseil carrière', 'Conseil carrière'], ['Annonce de stage ou PFE','Annonce de stage'], ['Témoignage', 'Témoignage'], ['Campus', 'Campus'], ['Atelier', 'Atelier'], ['Actualité de recrutement', 'Actualité recrutement']] } as const;
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
function localDate(value: string) { return new Date(new Date(value).getTime()+3600000).toISOString().slice(0,16); }
export function MyPosts({ embedded = false, onCreated, initialKind = 'TEXT', editId }: {
    embedded?: boolean;
    onCreated?: () => void;
    initialKind?: string;
    editId?: string;
}) {
    const textarea=useRef<HTMLTextAreaElement>(null),fileInput=useRef<HTMLInputElement>(null);
    const [tagInput,setTagInput]=useState('');
    const [ready,setReady]=useState(false);
    const [author,setAuthor]=useState('Vous'),[emojis,setEmojis]=useState(false);
    const [rows, setRows] = useState<Post[]>([]), [jobs, setJobs] = useState<any[]>([]), [form, setForm] = useState<FormValue>({ ...empty, postKind: initialKind }), [editing, setEditing] = useState(editId||''), [tab, setTab] = useState('all'), [notice, setNotice] = useState(''), [isCompany, setIsCompany] = useState(false), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false);
    async function load() { try{const [r, j, v] = await Promise.all([listMine(), listJobs(), postsViewer()]); if(!v?.ok){setNotice('Impossible de charger votre identité. Fermez le compositeur et réessayez.');return;} if (r.ok) {
        setRows(r.data);
        if (editId) {
            const found = r.data.find(p => p.id === editId);
            if (found){edit(found);setReady(true);}else setNotice('Publication introuvable ou non autorisée. Fermez le compositeur et actualisez.');
        }
    }
    else
        setNotice(r.error.message); if (j.ok)
        setJobs(j.data); if (v.ok)
        {setIsCompany(v.data.role === 'recruiter');setAuthor(v.data.name);if(!editId)setReady(true);} }catch{setNotice('Impossible de charger le compositeur. Réessayez.');} }
    useEffect(() => { void load(); }, []);
    const shown = rows.filter(p => tab === 'all' || p.status === tab);
    const options = useMemo(() => isCompany ? categoryGroups.Entreprise : categoryGroups.Candidat, [isCompany]);
    function field(name: keyof FormValue, value: any) { setForm(prev => ({ ...prev, [name]: value })); }
    async function submit(e: FormEvent){
      e.preventDefault();if(busy||uploading||!ready)return;setBusy(true);
      try{
       const result=await savePost({...form,status:(e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='draft'?'draft':form.status==='scheduled'?'scheduled':'published',pollOptions:form.postKind==='POLL'?form.pollOptions:[],scheduledAt:form.scheduledAt?new Date(form.scheduledAt+':00+01:00').toISOString():'',eventAt:form.eventAt?new Date(form.eventAt+':00+01:00').toISOString():''},editing||undefined);
       if(result.ok){setNotice('Publication enregistrée.');setForm({...empty,category:isCompany?categoryGroups.Entreprise[0][0]:categoryGroups.Candidat[0][0]});setEditing('');if(onCreated)onCreated();else await load();}else setNotice(result.error.message);
      }catch{setNotice('La publication n’a pas pu être enregistrée. Réessayez.');}finally{setBusy(false);}
    }
    function edit(p: Post) { setTagInput((p.tags||[]).join(', '));setEditing(p.id); setForm({ pinned: !!p.pinned, urgent: !!p.urgent, language: p.language || 'FR', publishAs: p.publish_as || 'company', imageAlt: p.image_alt || '', jobDetails: p.job_details || {}, title: p.title || '', content: p.content || '', category: p.category, tags: p.tags || [], mediaUrl: p.media_url || '', coverImageUrl: p.cover_image_url || '', sourceUrl: p.source_url || '', jobId: p.job_id || '', commentsEnabled: p.comments_enabled !== false, visibility: p.visibility || 'public', postKind: p.post_kind || 'TEXT', pollOptions: p.poll?.options || ['', ''], pollDuration: String(p.poll_duration || '7'), eventAt: p.event?.starts_at ? localDate(p.event.starts_at) : '', eventLocation: p.event?.location || '', celebration: p.celebration || 'GRADUATION', status: ['published', 'draft', 'scheduled'].includes(p.status) ? p.status : 'draft', scheduledAt: p.scheduled_at ? localDate(p.scheduled_at) : '' }); if (!embedded)
        window.scrollTo({ top: 0, behavior: 'smooth' }); }
    const tagText = form.tags.join(', '), setTags = (raw: string) => field('tags', splitTags(raw));
    function insertEmoji(emoji:string){const start=textarea.current?.selectionStart??form.content.length,end=textarea.current?.selectionEnd??start;field('content',form.content.slice(0,start)+emoji+form.content.slice(end));requestAnimationFrame(()=>{textarea.current?.focus();textarea.current?.setSelectionRange(start+emoji.length,start+emoji.length);});}
    async function upload(file?:File){if(!file)return;if(file.size>4*1024*1024){setNotice('Le fichier dépasse 4 Mo.');return;}setUploading(true);try{const data=new FormData();data.set('file',file);const r=await uploadPostMedia(data);if(!r?.ok)throw new Error(r?.error?.message||'Import impossible.');field('mediaUrl',r.data);setNotice('Fichier importé.');}catch(e){setNotice(e instanceof Error?e.message:'Import impossible.');}finally{setUploading(false);}}
    const media=['PHOTO','VIDEO','DOCUMENT'].includes(form.postKind);
    const toolbar=[['PHOTO','Photo',ImageIcon],['VIDEO','Vidéo',Video],['DOCUMENT','Document PDF',FileText],['POLL','Sondage',BarChart3],['EVENT','Événement',CalendarDays]] as const;
    return <section className="cv-module posts-studio posts-embedded social-composer">
      <form className="post-editor social-editor" onSubmit={submit} aria-busy={!ready||busy||uploading}>{!ready&&<p role="status" className="post-notice">{notice||'Chargement de votre publication…'}</p>}<fieldset className="social-editor-fields" disabled={!ready||busy||uploading}>
       <div className="social-composer-author"><span className="post-avatar">{author.split(' ').slice(0,2).map(x=>x[0]).join('')}</span><div><p>Publier en tant que <strong>{author}</strong></p><div className="social-author-settings"><Globe size={14}/><select aria-label="Visibilité" value={form.visibility} onChange={e=>field('visibility',e.target.value)}><option value="public">Tout le monde</option><option value="members">Membres connectés</option></select><select aria-label="Langue" value={form.language} onChange={e=>field('language',e.target.value)}><option value="FR">FR</option><option value="EN">EN</option></select>{isCompany&&<select aria-label="Publier en tant que" value={form.publishAs} onChange={e=>field('publishAs',e.target.value)}><option value="company">Mon entreprise</option><option value="personal">Mon profil</option></select>}</div></div></div>
       <div className="social-composer-scroll">
        <fieldset className="social-categories"><legend>Catégorie</legend>{options.map(([v,l])=><button type="button" key={v} aria-pressed={form.category===v} className={form.category===v?'selected':''} onClick={()=>field('category',v)}>{l}</button>)}</fieldset>
        {form.postKind==='ARTICLE'&&<label>Titre de l’article<input aria-label="Titre de l’article" maxLength={200} value={form.title} onChange={e=>field('title',e.target.value)} placeholder="Donnez un titre à votre article"/></label>}
        <textarea ref={textarea} className="social-content-input" aria-label="Contenu" required={!media} minLength={1} maxLength={20000} rows={5} value={form.content} onChange={e=>field('content',e.target.value)} placeholder="Partagez un conseil, un retour d’expérience…"/>
        <small className="social-character-count">{form.content.length} / 20 000 caractères</small>
        {emojis&&<div className="social-emoji-picker"><header><strong>EMOJIS</strong><button type="button" onClick={()=>setEmojis(false)}>Fermer</button></header><div>{['😀','😃','😄','😁','🥰','😅','🤣','😂','🙂','😊','😍','😘','🤩','😎','🤗','👍','👏','🙌','💪','🔥','✨','🎉','💯','❤️','💙','💚','🤝','🚀','⭐','📌','✅'].map(emoji=><button type="button" key={emoji} aria-label={'Insérer '+emoji} onClick={()=>insertEmoji(emoji)}>{emoji}</button>)}</div></div>}
        <label className="social-tag-input"><Hash size={17}/><input aria-label="Tags" value={tagInput} onChange={e=>{setTagInput(e.target.value);setTags(e.target.value);}} placeholder="Ajouter des tags, séparés par des virgules…"/></label>
        {form.postKind!=='TEXT'&&<div className="social-format-panel"><header><strong>{kinds.find(([k])=>k===form.postKind)?.[1]}</strong><button type="button" aria-label="Retirer ce format" onClick={()=>{field('postKind','TEXT');field('mediaUrl','');}}><X size={17}/></button></header>
        {media&&<><div className="social-upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files[0]);}}>{form.mediaUrl?(form.postKind==='PHOTO'?<img src={form.mediaUrl} alt={form.imageAlt||'Aperçu de la photo'}/>:form.postKind==='VIDEO'?<video controls src={form.mediaUrl}/>:<a href={form.mediaUrl} target="_blank" rel="noreferrer"><FileText/>Consulter le document PDF</a>):<><Upload size={25}/><p>Déposez {form.postKind==='DOCUMENT'?'votre PDF':'votre fichier'} ici ou téléversez-le</p><small>4 Mo maximum · {form.postKind==='PHOTO'?'PNG, JPG, WebP, GIF':form.postKind==='VIDEO'?'MP4, WebM':'PDF'}</small></>}</div><input ref={fileInput} aria-label="Importer un fichier" type="file" className="social-file-input" accept={form.postKind==='PHOTO'?'image/png,image/jpeg,image/webp,image/gif':form.postKind==='VIDEO'?'video/mp4,video/webm':'application/pdf'} onChange={e=>void upload(e.target.files?.[0])}/><button className="social-upload-button" type="button" disabled={uploading} onClick={()=>fileInput.current?.click()}><Upload size={16}/>{uploading?'Import en cours…':'Téléverser un fichier'}</button><input aria-label="Lien du média" value={form.mediaUrl} onChange={e=>field('mediaUrl',e.target.value)} placeholder="Ou collez un lien https://…"/><label>Texte alternatif<input aria-label="Description du média" value={form.imageAlt} maxLength={300} onChange={e=>field('imageAlt',e.target.value)} placeholder="Décrivez le média"/></label></>}
        {form.postKind==='POLL'&&<><div className="social-poll-options">{form.pollOptions.map((v,i)=><input key={i} aria-label={'Option '+(i+1)} placeholder={'Option '+(i+1)} required maxLength={80} value={v} onChange={e=>field('pollOptions',form.pollOptions.map((x,j)=>i===j?e.target.value:x))}/>)}</div>{form.pollOptions.length<4&&<button type="button" className="social-add-option" onClick={()=>field('pollOptions',[...form.pollOptions,''])}><Plus size={16}/>Ajouter une option</button>}{form.pollOptions.length>2&&<button type="button" onClick={()=>field('pollOptions',form.pollOptions.slice(0,-1))}>Retirer la dernière option</button>}<label>Durée<select aria-label="Durée du sondage" value={form.pollDuration} onChange={e=>field('pollDuration',e.target.value)}>{[['1','1 jour'],['3','3 jours'],['7','1 semaine'],['14','2 semaines']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></>}
        {form.postKind==='EVENT'&&<><label>Date et heure (Africa/Tunis)<input type="datetime-local" required value={form.eventAt} onChange={e=>field('eventAt',e.target.value)}/></label><label>Lieu<input value={form.eventLocation} onChange={e=>field('eventLocation',e.target.value)} maxLength={160}/></label></>}
        {form.postKind==='CELEBRATE'&&<label>Occasion<select value={form.celebration} onChange={e=>field('celebration',e.target.value)}>{[['NEW_JOB','Nouveau poste'],['GRADUATION','Diplôme'],['PROMOTION','Promotion'],['PROJECT','Projet'],['CERTIFICATE','Certification'],['ANNIVERSARY','Anniversaire professionnel']].map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>}
        {form.postKind==='JOB'&&<><label>Offre publiée de votre entreprise<select value={form.jobId} onChange={e=>field('jobId',e.target.value)}><option value="">Sélectionner une offre</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label><div className="cv-form-grid">{[['profession','Métier'],['contractType','Contrat'],['experience','Expérience'],['workMode','Mode de travail'],['location','Lieu'],['salaryMin','Salaire minimum'],['salaryMax','Salaire maximum'],['currency','Devise'],['education','Formation'],['skills','Compétences'],['responsibilities','Missions'],['deadline','Date limite'],['applicationUrl','Lien de candidature']].map(([k,l])=><label key={k}>{l}<input value={form.jobDetails[k]||''} onChange={e=>field('jobDetails',{...form.jobDetails,[k]:e.target.value})}/></label>)}</div></>}
        </div>}
        <div className="social-options"><label><span><MessageSquare size={18}/><span><strong>Commentaires</strong><small>Tout le monde peut commenter</small></span></span><input aria-label="Autoriser les commentaires" role="switch" type="checkbox" checked={form.commentsEnabled} onChange={e=>field('commentsEnabled',e.target.checked)}/></label><label><span><Pin size={18}/><span><strong>Épingler</strong><small>Afficher en haut du fil</small></span></span><input aria-label="Épingler en haut" role="switch" type="checkbox" checked={form.pinned} onChange={e=>field('pinned',e.target.checked)}/></label></div>
        <details className="social-more-options"><summary>Options supplémentaires</summary><label>Type de publication<select aria-label="Type de publication" value={form.postKind} onChange={e=>field('postKind',e.target.value)}>{kinds.filter(([k])=>k!=='JOB'||isCompany).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><label>Titre (facultatif)<input maxLength={200} value={form.title} onChange={e=>field('title',e.target.value)}/></label><label>Image de couverture HTTPS<input type="url" value={form.coverImageUrl} onChange={e=>field('coverImageUrl',e.target.value)}/></label><label>Lien source<input type="url" value={form.sourceUrl} onChange={e=>field('sourceUrl',e.target.value)}/></label><label className="post-check"><input type="checkbox" checked={form.urgent} onChange={e=>field('urgent',e.target.checked)}/>Publication urgente</label></details>
        {form.status==='scheduled'&&<label className="social-schedule">Date de publication (Africa/Tunis)<input aria-label="Date de publication" type="datetime-local" min={localDate(new Date().toISOString())} required value={form.scheduledAt} onChange={e=>field('scheduledAt',e.target.value)}/><button type="button" onClick={()=>field('status','published')}>Annuler la programmation</button></label>}
        {notice&&<p className="post-notice" role="status">{notice}</p>}
       </div>
       <footer className="social-composer-footer"><div><button type="button" aria-label="Emojis" aria-expanded={emojis} onClick={()=>setEmojis(!emojis)}><Smile size={20}/></button>{toolbar.map(([k,l,Icon])=><button type="button" key={k} aria-label={l} title={l} className={form.postKind===k?'selected':''} onClick={()=>field('postKind',k)}><Icon size={20}/></button>)}</div><div><button type="submit" name="intent" value="draft" formNoValidate disabled={busy||uploading} className="social-draft">Brouillon</button><button type="button" className="social-schedule-button" onClick={()=>field('status',form.status==='scheduled'?'published':'scheduled')}><CalendarDays size={15}/>Choisir date</button><button type="submit" name="intent" value="publish" disabled={busy||uploading} className="cv-button cv-button-primary">{busy?'Enregistrement…':form.status==='scheduled'?'Programmer':'Publier'}</button></div></footer>
      </fieldset></form>
    </section>;
}
