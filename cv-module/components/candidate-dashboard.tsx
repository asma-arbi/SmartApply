"use client";
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {ArrowRight,Briefcase,Buildings,Files,UserCircle,Sparkle} from '@phosphor-icons/react';
import {api,statusLabels,type Cv,type Application,type Job,type Company} from './api';
import {Notice,Skeleton} from './ui';

export function CandidateDashboard({name,cvs,applications,loading,error}:{name:string;cvs?:Cv[];applications?:Application[];loading:boolean;error?:string}){
 const jobs=useQuery({queryKey:['jobs'],queryFn:()=>api<Job[]>('jobs')});
 const companies=useQuery({queryKey:['companies'],queryFn:()=>api<Company[]>('companies')});
 const sent=applications?.filter(a=>a.status!=='DRAFT')??[];
 return <div className="candidate-home">
  <section className="candidate-hero">
   <p>Bonjour {name} !</p><h2>Votre prochaine opportunité<br/>vous attend en Tunisie.</h2>
   <p>Construisez votre profil, préparez vos candidatures et suivez votre parcours.</p>
   <div className="candidate-hero-actions"><Link className="primary" href="/dashboard/candidate/opportunities"><Briefcase size={18}/>Rechercher un emploi</Link><Link className="secondary" href="/dashboard/candidate/applications"><Files size={18}/>Voir mes candidatures</Link></div>
  </section>
  {error&&<Notice error>{error}</Notice>}
  {loading?<Skeleton/>:<section className="candidate-stat-grid" aria-label="Votre activité">
   {[['CV enregistrés',cvs?.length??0,UserCircle],['Candidatures déposées',sent.length,Files],['Brouillons',applications?.filter(a=>a.status==='DRAFT').length??0,Files],['Entreprises disponibles',companies.data?.length??'—',Buildings]].map(([label,value,Icon])=>{const I=Icon as typeof Files;return <div className="panel candidate-stat" key={String(label)}><span className="feature-icon blue"><I size={22}/></span><div><strong>{String(value)}</strong><p>{String(label)}</p></div></div>;})}
  </section>}
  <section className="candidate-module-grid" aria-label="Vos outils de candidature">
   {[['/dashboard/candidate/cv','Mon CV & analyse IA','Téléversez un CV, relisez son contenu et découvrez une analyse expliquée.',UserCircle],['/dashboard/candidate/professional-profile','Mon profil professionnel','Gérez vos expériences, formations, projets et compétences.',Briefcase],['/dashboard/candidate/letters','Mes lettres de motivation','Rédigez en français ou en anglais et conservez vos versions.',Sparkle],['/dashboard/posts?view=mine','Mes publications','Partagez un conseil, une réussite ou votre expérience professionnelle.',Files]].map(([href,title,description,Icon])=>{const I=Icon as typeof Files;return <Link href={String(href)} className="panel candidate-tool" key={String(href)}><span className="feature-icon purple"><I size={23}/></span><h2>{String(title)}</h2><p>{String(description)}</p><span className="text-link">Ouvrir <ArrowRight size={17}/></span></Link>;})}
  </section>
  <div className="candidate-two-columns">
   <section className="panel"><div className="section-heading"><h2>Offres disponibles</h2><Link href="/dashboard/candidate/opportunities">Voir toutes les offres →</Link></div>
    {jobs.isPending?<Skeleton/>:jobs.isError?<Notice error>{jobs.error.message}</Notice>:!jobs.data?.length?<p>Aucune offre disponible pour le moment.</p>:jobs.data.slice(0,3).map(job=><Link className="candidate-list-row" href="/dashboard/candidate/opportunities" key={job.id}><span className="feature-icon blue"><Briefcase size={20}/></span><span><strong>{job.title}</strong><small>{job.city} · {job.contract}</small></span><ArrowRight size={18}/></Link>)}
   </section>
   <section className="panel"><div className="section-heading"><h2>Mes candidatures</h2><Link href="/dashboard/candidate/applications">Voir tout →</Link></div>
    {!sent.length?<p>Vos candidatures déposées apparaîtront ici.</p>:sent.slice(0,3).map(a=><Link className="candidate-list-row" href={`/candidatures?id=${a.id}`} key={a.id}><span className="feature-icon green"><Files size={20}/></span><span><strong>{a.job_title??a.company_name??'Candidature spontanée'}</strong><small>{statusLabels[a.status]}</small></span><ArrowRight size={18}/></Link>)}
   </section>
  </div>
  <section className="panel"><div className="section-heading"><h2>Entreprises</h2><Link href="/entreprises">Voir toutes les entreprises →</Link></div>
   {companies.isPending?<Skeleton/>:companies.isError?<Notice error>{companies.error.message}</Notice>:!companies.data?.length?<p>Aucune entreprise disponible pour le moment.</p>:<div className="candidate-module-grid">{companies.data.slice(0,3).map(c=><Link href="/entreprises" className="candidate-company" key={c.id}><span className="feature-icon blue"><Buildings size={23}/></span><strong>{c.name}</strong><small>{c.city}</small></Link>)}</div>}
  </section>
  <section className="candidate-account-link"><UserCircle size={20}/><Link href="/dashboard/candidate/settings">Mon compte & paramètres</Link><span>Contact, préférences et sécurité de votre compte.</span></section>
 </div>;
}
