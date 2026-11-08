import { createHash,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Actor,DomainError,requireCandidate,parse,id,profileInput,applicationInput,status,Status,SendingPort,unavailableSender,QuotaPolicyPort,fixtureQuotaPolicy } from './contracts.js';
import { Database,Sql } from './database.js';
import { StoragePort,validateFile,storagePath } from './files.js';

export class ModuleService {
 constructor(public db:Database,public storage:StoragePort,public sender:SendingPort=unavailableSender,private uploadLimit=5*1024*1024,private quotaPolicy:QuotaPolicyPort=fixtureQuotaPolicy){}
 private async operation<T>(tx:Sql,a:Actor,key:string,operation:string,input:unknown,work:()=>Promise<T>):Promise<{value:T;created:boolean}>{
  if(!/^[a-zA-Z0-9-]{8,100}$/.test(key))throw new DomainError('IDEMPOTENCY_REQUIRED',"Une clé d'opération valide est requise.");
  const fp=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const prior=(await tx.query('select * from module_operations where user_id=$1 and key=$2',[a.id,key])).rows[0];
  if(prior){if(prior.operation!==operation||prior.fingerprint!==fp)throw new DomainError('IDEMPOTENCY_CONFLICT','Cette clé a déjà été utilisée pour une autre demande.',409);return {value:prior.result as T,created:false};}
  const value=await work();await tx.query('insert into module_operations(user_id,key,operation,fingerprint,result) values($1,$2,$3,$4,$5)',[a.id,key,operation,fp,JSON.stringify(value)]);return {value,created:true};
 }
 private safeCv(c:any){const {storage_path:_path,user_id:_owner,file_hash:_hash,...safe}=c;return safe;}
 async cvs(a:Actor){requireCandidate(a);return (await this.db.query('select * from candidate_cvs where user_id=$1 order by created_at desc',[a.id])).rows.map(c=>this.safeCv(c));}
 async getCv(a:Actor,cvId:string,tx:Sql=this.db){parse(id,cvId);const c=(await tx.query('select * from candidate_cvs where id=$1',[cvId])).rows[0];if(!c)throw new DomainError('NOT_FOUND','CV introuvable.',404);
  if(c.user_id===a.id&&a.role==='candidate')return c;
  if(a.role==='recruiter') {const allowed=(await tx.query(`select a.id from applications a join integration_membership_refs m on m.company_id=a.company_id join integration_company_refs c on c.id=a.company_id
   where a.cv_id=$1 and a.submitted_at is not null and m.user_id=$2 and m.verified and c.verified limit 1`,[cvId,a.id])).rows.length;if(allowed)return c;}
  throw new DomainError('FORBIDDEN','Vous ne pouvez pas consulter ce CV.',403);
 }
 async upload(a:Actor,bytes:Buffer,name:string,key:string,replaceId?:string){requireCandidate(a);if(replaceId)parse(id,replaceId);const file=await validateFile(bytes,name,this.uploadLimit);
  return this.db.transaction(a,async tx=>(await this.operation(tx,a,key,'upload',{hash:file.hash,name,replaceId},async()=>{
   let primary=false;if(replaceId){const old=await this.getCv(a,replaceId,tx);primary=old.is_primary;}
   const exists=(await tx.query('select id from candidate_cvs where user_id=$1 and is_primary',[a.id])).rows.length;primary=primary||!exists;
   const cvId=randomUUID(),path=storagePath(a.id);await this.storage.put(path,file);
   try{
    if(primary)await tx.query('update candidate_cvs set is_primary=false where user_id=$1 and is_primary',[a.id]);
    const c=(await tx.query(`insert into candidate_cvs(id,user_id,original_filename,storage_path,mime_type,file_size,file_hash,is_primary) values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,[cvId,a.id,file.name,path,file.mime,file.size,file.hash,primary])).rows[0];return this.safeCv(c);
   }catch(e){await this.storage.remove(path);throw e;}
  })).value);
 }
 async primary(a:Actor,cvId:string){requireCandidate(a);return this.db.transaction(a,async tx=>{await this.getCv(a,cvId,tx);await tx.query('update candidate_cvs set is_primary=false where user_id=$1',[a.id]);await tx.query('update candidate_cvs set is_primary=true where id=$1 and user_id=$2',[cvId,a.id]);return {message:'CV principal mis à jour.'};});}
 async deleteCv(a:Actor,cvId:string){requireCandidate(a);return this.db.transaction(a,async tx=>{
  const c=await this.getCv(a,cvId,tx);const refs=(await tx.query('select id from applications where cv_id=$1',[cvId])).rows;
  if(refs.length)throw new DomainError('CV_REFERENCED',"Ce CV est utilisé par une candidature. La politique de conservation protège le document original : sa suppression est bloquée. Aucun fichier n'a été supprimé.",409);
  await this.storage.remove(c.storage_path);await tx.query('delete from candidate_cvs where id=$1',[cvId]);
  if(c.is_primary){const next=(await tx.query('select id from candidate_cvs where user_id=$1 order by created_at desc limit 1',[a.id])).rows[0];if(next)await tx.query('update candidate_cvs set is_primary=true where id=$1',[next.id]);}
  return {message:'CV et fichier privé supprimés.'};
 });}
 async profile(a:Actor){requireCandidate(a);const p=(await this.db.query('select * from candidate_profiles where user_id=$1',[a.id])).rows[0];return p?{...p.data,version:p.version}:{name:'',objective:'',city:'',education:[],skills:[],projects:[],experience:[],version:1};}
 async saveProfile(a:Actor,input:unknown){requireCandidate(a);const p=parse(profileInput,input),{version,...data}=p;
  return this.db.transaction(a,async tx=>{const prior=(await tx.query('select version from candidate_profiles where user_id=$1',[a.id])).rows[0];if(prior&&prior.version!==version)throw new DomainError('VERSION_CONFLICT','Votre profil a été modifié ailleurs. Actualisez avant de continuer.',409);
   const result=(await tx.query('insert into candidate_profiles(user_id,data,version) values($1,$2,2) on conflict(user_id) do update set data=$2,version=candidate_profiles.version+1,updated_at=now() returning version',[a.id,JSON.stringify(data)])).rows[0];return {...data,version:result.version};
  });
 }
 async directory(){return (await this.db.query('select id,name,city,technologies,opted_out from integration_company_refs order by name')).rows;}
 async jobs(){return (await this.db.query('select * from integration_job_refs order by title')).rows;}
 async applications(a:Actor){if(a.role==='candidate')return (await this.db.query('select a.*,c.name company_name,j.title job_title from applications a join integration_company_refs c on c.id=a.company_id left join integration_job_refs j on j.id=a.job_id where a.candidate_id=$1 order by a.created_at desc',[a.id])).rows;
  if(a.role==='recruiter')return (await this.db.query(`select a.*,c.name company_name,j.title job_title from applications a join integration_company_refs c on c.id=a.company_id
   join integration_membership_refs m on m.company_id=a.company_id left join integration_job_refs j on j.id=a.job_id where m.user_id=$1 and m.verified and c.verified and a.submitted_at is not null order by a.created_at desc`,[a.id])).rows;
  throw new DomainError('FORBIDDEN','Ce module est réservé aux candidats et recruteurs autorisés.',403);
 }
 async getApplication(a:Actor,appId:string,tx:Sql=this.db){parse(id,appId);const lock=tx===this.db?'':' for update of a';const record=(await tx.query('select a.*,c.name company_name,j.title job_title from applications a join integration_company_refs c on c.id=a.company_id left join integration_job_refs j on j.id=a.job_id where a.id=$1'+lock,[appId])).rows[0];if(!record)throw new DomainError('NOT_FOUND','Candidature introuvable.',404);
  if(a.role==='candidate'&&record.candidate_id===a.id)return record;
  if(a.role==='recruiter'&&record.submitted_at){const m=(await tx.query('select m.user_id from integration_membership_refs m join integration_company_refs c on c.id=m.company_id where m.user_id=$1 and m.company_id=$2 and m.verified and c.verified',[a.id,record.company_id])).rows[0];if(m)return record;}
  throw new DomainError('FORBIDDEN','Vous ne pouvez pas consulter cette candidature.',403);
 }
 private async event(tx:Sql,a:Actor,appId:string,previous:Status|null,next:Status,note='',origin:string=a.role==='recruiter'?'recruiter':'candidate'){
  await tx.query('insert into application_status_history(id,application_id,previous_status,status,actor_id,actor_role,origin,note) values($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),appId,previous,next,a.id,a.role,origin,note]);
  await tx.query('insert into module_outbox(id,kind,application_id) values($1,$2,$3)',[randomUUID(),'application.status.changed',appId]);
 }
 async createApplication(a:Actor,input:unknown,key:string){requireCandidate(a);const p=parse(applicationInput,input);
  return this.db.transaction(a,async tx=>(await this.operation(tx,a,key,'createApplication',p,async()=>{
   await this.getCv(a,p.cvId,tx);if(p.letterVersionId){const letter=(await tx.query('select * from candidate_letter_versions where id=$1 and user_id=$2',[p.letterVersionId,a.id])).rows[0];if(!letter)throw new DomainError('LETTER_FORBIDDEN','Cette version de lettre ne vous appartient pas.',403);p.subject=letter.subject;p.body=letter.body;}const company=(await tx.query('select * from integration_company_refs where id=$1',[p.companyId])).rows[0];if(!company)throw new DomainError('COMPANY_NOT_FOUND','Entreprise introuvable.',404);
   const appId=randomUUID();let submission=null,delivery='NONE',state:Status='DRAFT';
   if(p.type==='JOB'){
    if(!p.jobId||!p.confirm)throw new DomainError('CONFIRM_REQUIRED','Vérifiez et confirmez votre candidature.');
    const job=(await tx.query('select * from integration_job_refs where id=$1 for share',[p.jobId])).rows[0];
    if(!job||job.company_id!==p.companyId)throw new DomainError('JOB_NOT_FOUND','Offre introuvable.',404);
    if(job.route==='external')throw new DomainError('EXTERNAL_ONLY','Cette offre reçoit les candidatures sur son site source. Aucune candidature interne créée.');
    if(job.state!=='published'||job.deadline&&new Date(job.deadline)<new Date())throw new DomainError('JOB_CLOSED',"Cette offre n'accepte plus de candidatures.",409);
    for(const q of job.questions)if(q.required&&!p.answers[q.id]?.trim())throw new DomainError('ANSWERS_REQUIRED',`Répondez à la question : ${q.label}`);
    if((await tx.query("select id from applications where candidate_id=$1 and job_id=$2 and status<>'WITHDRAWN'",[a.id,p.jobId])).rows.length)throw new DomainError('ALREADY_APPLIED','Vous avez déjà une candidature active pour cette offre.',409);
    submission=new Date().toISOString();delivery='SUBMITTED';state='SENT';
   }else if(p.jobId)throw new DomainError('APPLICATION_TYPE','Une candidature spontanée ne doit pas être liée à une offre.');
   const result=(await tx.query(`insert into applications(id,candidate_id,company_id,job_id,cv_id,type,subject,body,recipient,answers,status,delivery,submitted_at,letter_version_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning *`,[appId,a.id,p.companyId,p.jobId??null,p.cvId,p.type,p.subject,p.body,company.recipient,JSON.stringify(p.answers),state,delivery,submission,p.letterVersionId??null])).rows[0];
   await this.event(tx,a,appId,null,state);return result;
  })).value);
 }
 async detail(a:Actor,appId:string){const app=await this.getApplication(a,appId);const history=(await this.db.query('select id,previous_status,status,actor_role,origin,note,created_at from application_status_history where application_id=$1 order by created_at,id',[appId])).rows;
  const note=a.role==='candidate'?(await this.db.query('select text from application_notes where application_id=$1 and user_id=$2',[appId,a.id])).rows[0]?.text??'':undefined;
  return {...app,history,note,cv:this.safeCv(await this.getCv(a,app.cv_id))};
 }
 async editDraft(a:Actor,appId:string,input:unknown){requireCandidate(a);const p=parse(z.object({version:z.number().int(),subject:z.string().trim().min(1).max(200),body:z.string().trim().min(1).max(15000),cvId:id}).strict(),input);
  return this.db.transaction(a,async tx=>{const app=await this.getApplication(a,appId,tx);if(app.status!=='DRAFT'||app.delivery==='SENDING'||app.delivery==='UNCERTAIN'||app.delivery==='ACCEPTED')throw new DomainError('NOT_DRAFT','Cette candidature ne peut plus être modifiée.',409);if(app.version!==p.version)throw new DomainError('VERSION_CONFLICT','Le brouillon a été modifié ailleurs.',409);await this.getCv(a,p.cvId,tx);
   return (await tx.query('update applications set subject=$2,body=$3,cv_id=$4,letter_version_id=null,version=version+1 where id=$1 returning *',[appId,p.subject,p.body,p.cvId])).rows[0];});
 }
 async send(a:Actor,appId:string,input:unknown,key:string){requireCandidate(a);const p=parse(z.object({confirm:z.literal(true),version:z.number().int()}).strict(),input);
  const started=await this.db.transaction(a,async tx=>this.operation(tx,a,key,'send',{appId,...p},async()=>{
   const app=await this.getApplication(a,appId,tx);
   if(app.type!=='SPONTANEOUS'||app.status!=='DRAFT'||!['NONE','FAILED','UNAVAILABLE'].includes(app.delivery))throw new DomainError('SEND_BLOCKED',"Cet envoi ne peut pas être relancé. Vérifiez son résultat.",409);
   if(app.version!==p.version)throw new DomainError('VERSION_CONFLICT','Le brouillon a changé. Relisez-le avant de confirmer.',409);
   if(!app.subject.trim()||!app.body.trim())throw new DomainError('LETTER_REQUIRED','Ajoutez un objet et une lettre avant de confirmer.');
   const company=(await tx.query('select * from integration_company_refs where id=$1 for update',[app.company_id])).rows[0];
   if(company.opted_out)throw new DomainError('OPTED_OUT','Cette entreprise ne reçoit pas de candidatures spontanées.',409);
   if(!z.email().safeParse(company.recipient).success)throw new DomainError('CONTACT_INVALID',"L'adresse de contact n'est pas valide.");
   const recent=(await tx.query("select id from applications where candidate_id=$1 and company_id=$2 and type='SPONTANEOUS' and submitted_at>now()-interval '90 days' and delivery in ('ACCEPTED','SENDING','UNCERTAIN')",[a.id,app.company_id])).rows.length;
   if(recent)throw new DomainError('CONTACT_COOLDOWN','Cette entreprise a déjà été contactée au cours des 90 derniers jours.',409);
   const count=(await tx.query(`select count(*) filter(where (submitted_at at time zone 'Africa/Tunis')::date=(now() at time zone 'Africa/Tunis')::date)::int as daily,
    count(*) filter(where submitted_at>=date_trunc('week',now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis')::int as weekly
    from applications where candidate_id=$1 and type='SPONTANEOUS' and delivery in ('ACCEPTED','SENDING','UNCERTAIN')`,[a.id])).rows[0];
   const limits=await this.quotaPolicy.getPolicy(a);
   if(!Number.isInteger(limits.daily)||!Number.isInteger(limits.weekly)||limits.daily<1||limits.weekly<1)throw new DomainError('QUOTA_SERVICE_UNAVAILABLE','Les limites d’abonnement sont indisponibles.',503);
   if(count.daily>=limits.daily||count.weekly>=limits.weekly)throw new DomainError('QUOTA_REACHED',`Votre quota d'envoi est atteint : ${limits.daily} par jour ou ${limits.weekly} par semaine.`,429);
   if(!this.sender.available)throw new DomainError('SENDING_UNAVAILABLE',"L'envoi Gmail n'est pas configuré. Votre brouillon est conservé.",503);
   await this.getCv(a,app.cv_id,tx);
   return (await tx.query("update applications set delivery='SENDING',recipient=$2,submitted_at=now(),version=version+1 where id=$1 returning *",[appId,company.recipient])).rows[0];
  }));
  if(!started.created)return this.getApplication(a,appId);
  const app=started.value;const cv=await this.getCv(a,app.cv_id);
  let outcome:{state:'ACCEPTED'|'FAILED'|'UNCERTAIN';providerId?:string};
  try{outcome=await this.sender.send({applicationId:appId,recipient:app.recipient,subject:app.subject,body:app.body,attachment:await this.storage.read(cv.storage_path),filename:cv.original_filename,idempotencyKey:key});}catch{outcome={state:'UNCERTAIN'};}
  return this.db.transaction(a,async tx=>{const current=await this.getApplication(a,appId,tx);const next:Status=outcome.state==='ACCEPTED'?'SENT':'DRAFT';
   const result=(await tx.query('update applications set delivery=$2,provider_id=$3,status=$4,version=version+1 where id=$1 returning *',[appId,outcome.state,outcome.providerId??null,next])).rows[0];
   if(next!==current.status)await this.event(tx,a,appId,current.status,next,'Acceptation confirmée par le fournisseur.','system');return result;});
 }
 async updateStatus(a:Actor,appId:string,input:unknown,key:string){const p=parse(z.object({status,version:z.number().int(),note:z.string().max(500).default('')}).strict(),input);
  return this.db.transaction(a,async tx=>(await this.operation(tx,a,key,'status',{appId,...p},async()=>{
   const app=await this.getApplication(a,appId,tx);if(app.version!==p.version)throw new DomainError('VERSION_CONFLICT','Cette candidature a été modifiée ailleurs.',409);
   const allowed:Record<Status,Status[]>={DRAFT:[],SENT:['PENDING','INTERVIEW','ACCEPTED','REJECTED','WITHDRAWN'],PENDING:['INTERVIEW','ACCEPTED','REJECTED','WITHDRAWN'],INTERVIEW:['ACCEPTED','REJECTED','WITHDRAWN'],ACCEPTED:[],REJECTED:[],WITHDRAWN:[]};
   if(!allowed[app.status as Status].includes(p.status)||p.status==='WITHDRAWN'&&a.role!=='candidate')throw new DomainError('INVALID_TRANSITION','Ce changement de statut n’est pas autorisé.',409);
   await this.event(tx,a,appId,app.status,p.status,p.note);return (await tx.query('update applications set status=$2,version=version+1 where id=$1 returning *',[appId,p.status])).rows[0];
  })).value);
 }
 async saveNote(a:Actor,appId:string,input:unknown){requireCandidate(a);const p=parse(z.object({text:z.string().max(5000)}).strict(),input);await this.getApplication(a,appId);
  await this.db.query('insert into application_notes(application_id,user_id,text) values($1,$2,$3) on conflict(application_id) do update set text=$3,updated_at=now()',[appId,a.id,p.text]);return {message:'Note personnelle enregistrée.'};}
}
