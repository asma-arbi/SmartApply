'use client';

import { useEffect,useState } from 'react';

import {updateProfile} from '../actions/profileActions';

import { useForm } from 'react-hook-form';

import { useQuery,useQueryClient } from '@tanstack/react-query';

import { toast } from 'sonner';

import { Plus,PencilSimple,Trash,GraduationCap,Code,Briefcase,FolderSimple,ArrowRight,Buildings } from '@phosphor-icons/react';

import { api,Profile,Entry,Skill } from './api';

import { Dialog,Notice,Skeleton } from './ui';

type Section='education'|'skills'|'projects'|'experience';

const names:Record<Section,string>={education:'Formations',skills:'Compétences',projects:'Projets',experience:'Expériences professionnelles'};

const icons={education:GraduationCap,skills:Code,projects:FolderSimple,experience:Briefcase};

export function ProfileEditor({onDirty}:{onDirty:(d:boolean)=>void}){

 const qc=useQueryClient();const [basicsState,setBasicsState]=useState<Awaited<ReturnType<typeof updateProfile>>|null>(null);const [basicsPending,setBasicsPending]=useState(false);async function basicsAction(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBasicsPending(true);try{setBasicsState(await updateProfile(null,form));}finally{setBasicsPending(false);}}const q=useQuery({queryKey:['profile'],queryFn:()=>api<Profile>('profile')});

 const [editing,setEditing]=useState<{section:Section;entry?:Entry|Skill}>(),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false);

 const {register,reset,formState:{isDirty}}=useForm<{name:string;objective:string;city:string}>();

 useEffect(()=>{if(q.data&&!isDirty)reset({name:q.data.name,objective:q.data.objective,city:q.data.city});},[q.data,reset,isDirty]);

 useEffect(()=>{if(!basicsState)return;if(basicsState.ok){qc.setQueryData(['profile'],basicsState.data);reset({name:basicsState.data.name,city:basicsState.data.city,objective:basicsState.data.objective});setFailure('');toast.success('Profil enregistré.');}else setFailure(basicsState.error.message);},[basicsState,qc,reset]);

 useEffect(()=>{onDirty(isDirty);const warn=(e:BeforeUnloadEvent)=>{if(isDirty)e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>{window.removeEventListener('beforeunload',warn);onDirty(false);};},[isDirty,onDirty]);

 async function save(p:Profile){setBusy(true);setFailure('');try{const result=await api<Profile>('profile','PATCH',p);qc.setQueryData(['profile'],result);toast.success('Profil enregistré.');return true;}catch(e){setFailure((e as Error).message);return false;}finally{setBusy(false);}}

 if(q.isPending)return <Skeleton/>;if(!q.data)return <Notice error>{q.error?.message??'Profil indisponible.'}<button onClick={()=>q.refetch()}>Réessayer</button></Notice>;

 const p=q.data;const completion=[!!p.name,!!p.objective,!!p.education.length,!!p.skills.length,!!p.projects.length,!!p.experience.length].filter(Boolean).length;

 return <>{failure&&<Notice error>{failure}<button className="text-button" onClick={()=>{reset();q.refetch();}}>Actualiser le profil</button></Notice>}<section className="panel profile-overview"><div><h2>Votre profil professionnel</h2><p>Informations saisies et confirmées par vous. Aucun résultat IA n’est appliqué automatiquement.</p></div><span className="completion"><strong>{completion}/6</strong> sections renseignées</span><form className="profile-basics" onSubmit={basicsAction}><input type="hidden" name="version" value={p.version}/><label>Nom à afficher<input {...register('name',{maxLength:150})}/></label><label>Ville<input {...register('city',{maxLength:100})} placeholder="Tunis, Sfax, Sousse…"/></label><label className="wide">Objectif professionnel<input {...register('objective',{maxLength:300})} placeholder="Stage PFE en développement web"/></label><button className="primary" disabled={busy||basicsPending||!isDirty}>{basicsPending?'Enregistrement…':'Enregistrer mes informations'}</button>{isDirty&&<span className="muted">Modifications non enregistrées</span>}</form></section>

 <section className="panel profile-opportunities"><div><span className="feature-icon blue"><Buildings size={22}/></span><div><h2>Vous cherchez un poste ?</h2><p>Les offres d’emploi sont publiées par les entreprises. Parcourez les offres disponibles et envoyez votre candidature depuis l’espace candidat.</p></div></div><a className="primary" href="/dashboard/candidate/opportunities">Voir les offres d’emploi <ArrowRight size={17}/></a></section>

 <div className="profile-grid">{(Object.keys(names) as Section[]).map(section=>{const Icon=icons[section];return <section className="panel profile-section" key={section}><div className="section-heading"><h2><Icon size={23}/>{names[section]}</h2><button className="secondary" onClick={()=>setEditing({section})}><Plus size={17}/>Ajouter</button></div>{!p[section].length?<p className="muted">Aucune entrée. Ajoutez des informations qui décrivent votre parcours.</p>:section==='skills'?<div className="editable-skills">{p.skills.map(s=><div key={s.id}><span>{s.name}</span><button className="icon-button" aria-label={`Modifier ${s.name}`} onClick={()=>setEditing({section,entry:s})}><PencilSimple size={17}/></button><button className="icon-button" aria-label={`Supprimer ${s.name}`} disabled={busy} onClick={()=>{if(window.confirm(`Supprimer la compétence ${s.name} ?`))save({...p,skills:p.skills.filter(i=>i.id!==s.id)});}}><Trash size={17}/></button></div>)}</div>:<div className="entry-list">{(p[section] as Entry[]).map(e=><article key={e.id}><div><h3>{e.title}</h3><p>{e.organization}</p><small>{e.start??''} {e.start?'→':''} {e.current?'En cours':e.end??''}</small>{e.description&&<p className="entry-description">{e.description}</p>}{e.url&&<a href={e.url} target="_blank" rel="noopener noreferrer">Consulter le lien</a>}</div><div className="entry-actions"><button className="icon-button" aria-label={`Modifier ${e.title}`} onClick={()=>setEditing({section,entry:e})}><PencilSimple size={18}/></button><button className="icon-button danger" aria-label={`Supprimer ${e.title}`} disabled={busy} onClick={()=>{if(window.confirm(`Supprimer ${e.title} ?`))save({...p,[section]:(p[section] as Entry[]).filter(i=>i.id!==e.id)});}}><Trash size={18}/></button></div></article>)}</div>}</section>;})}</div>

 {editing&&<EntryEditor failure={failure} section={editing.section} entry={editing.entry} onClose={()=>setEditing(undefined)} onSave={async entry=>{const section=editing.section;const list=p[section] as (Entry|Skill)[];const next=editing.entry?list.map(e=>e.id===entry.id?entry:e):[...list,entry];if(await save({...p,[section]:next}))setEditing(undefined);}}/>}

 </>;

}

function EntryEditor({section,entry,onClose,onSave,failure}:{failure:string;section:Section;entry?:Entry|Skill;onClose:()=>void;onSave:(e:Entry|Skill)=>Promise<void>}){

 const skill=section==='skills';const {register,handleSubmit,watch,formState:{errors}}=useForm<any>({defaultValues:entry?{...entry,technologiesText:'technologies'in entry?entry.technologies.join(', '):''}:(skill?{name:'',category:'',proficiency:'',source:'manual'}:{title:'',organization:'',description:'',start:'',end:'',current:false,url:'',source:'manual'})});const [busy,setBusy]=useState(false);const current=watch('current');

 return <Dialog title={`${entry?'Modifier':'Ajouter'} — ${names[section]}`} onClose={onClose}><>{failure&&<Notice error>{failure}</Notice>}<form onSubmit={handleSubmit(async values=>{setBusy(true);const value=skill?{id:entry?.id??crypto.randomUUID(),name:values.name,category:values.category??'',proficiency:values.proficiency??'',source:'manual' as const}:{id:entry?.id??crypto.randomUUID(),title:values.title,organization:values.organization??'',description:values.description??'',start:values.start||undefined,end:values.current?undefined:values.end||undefined,current:!!values.current,url:values.url??'',technologies:values.technologiesText?values.technologiesText.split(',').map((v:string)=>v.trim()).filter(Boolean):entry&&'technologies'in entry?entry.technologies:[],source:'manual' as const};await onSave(value);setBusy(false);})}>

 {skill?<><label>Nom de compétence<input {...register('name',{required:'Indiquez le nom de la compétence.',maxLength:80})} autoFocus placeholder="React, Python, PostgreSQL…"/>{errors.name&&<span className="field-error">{String(errors.name.message)}</span>}</label><label>Catégorie<input {...register('category')}/></label><label>Niveau — facultatif<input {...register('proficiency')} placeholder="Débutant, intermédiaire…"/></label></>:<><label>{section==='education'?'Diplôme / formation':section==='experience'?'Poste occupé':'Nom du projet'}<input {...register('title',{required:'Ce champ est requis.',maxLength:200})} autoFocus/>{errors.title&&<span className="field-error">{String(errors.title.message)}</span>}</label><label>{section==='education'?'Établissement':section==='experience'?'Entreprise':'Organisation / rôle'}<input {...register('organization')}/></label><div className="form-grid"><label>Date de début<input type="month" {...register('start')}/></label><label>Date de fin<input type="month" {...register('end',{validate:(end:string)=>!end||!watch('start')||end>=watch('start')||'La fin doit suivre le début.'})} disabled={current}/>{errors.end&&<span className="field-error">{String(errors.end.message)}</span>}</label></div><label className="checkbox"><input type="checkbox" {...register('current')}/>En cours</label><label>Description / contribution<textarea rows={4} {...register('description',{maxLength:5000})}/></label><label>Lien — facultatif<input type="url" {...register('url',{validate:(v:string)=>!v||/^https?:\/\//i.test(v)||'Utilisez un lien http ou https.'})}/>{errors.url&&<span className="field-error">{String(errors.url.message)}</span>}</label></>}

 <div className="dialog-footer"><button type="button" className="secondary" onClick={onClose}>Annuler</button><button className="primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer cette entrée'}</button></div></form></></Dialog>;

}

