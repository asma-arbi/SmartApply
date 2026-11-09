import {listCvs,readCv,setPrimaryCv,removeCv,uploadCv} from '../actions/cvActions';
import {readProfile,saveProfile} from '../actions/profileActions';
import {listLetters,readLetter,createLetter,updateLetter,listLetterVersions,saveLetterVersion,removeLetter} from '../actions/letterActions';
import {listApplications,readApplication,createApplication,editApplicationDraft,saveApplicationNote,transitionApplication,listJobs,listCompanies} from '../actions/applicationActions';
import type {ActionResult} from '../lib/action-result';
export type Cv={id:string;original_filename:string;mime_type:string;file_size:number;is_primary:boolean;processing_status:string;created_at:string};
export type Entry={id:string;title:string;organization:string;description:string;start?:string;end?:string;current:boolean;url:string;technologies:string[];source:'manual'|'extraction'};
export type Skill={id:string;name:string;category:string;proficiency:string;source:'manual'|'extraction'};
export type Profile={version:number;name:string;objective:string;city:string;education:Entry[];projects:Entry[];experience:Entry[];skills:Skill[]};
export type Application={id:string;type:'JOB'|'SPONTANEOUS';company_id:string;job_id?:string;cv_id:string;subject:string;body:string;company_name:string;job_title?:string;status:string;delivery:string;version:number;created_at:string;submitted_at?:string;recipient?:string;note?:string;cv?:Cv;history?:{id:string;status:string;origin:string;actor_role:string;note:string;created_at:string}[]};
export type Job={id:string;company_id:string;title:string;city:string;contract:string;state:string;route:string;source_url?:string;questions:{id:string;label:string;required:boolean}[]};
export type Company={id:string;name:string;city:string;technologies:string[];opted_out:boolean};
export const statusLabels:Record<string,string>={DRAFT:'Brouillon',SENT:'Envoyée / déposée',PENDING:'En revue',SHORTLISTED:'Présélectionnée',INTERVIEW:'Entretien',ACCEPTED:'Acceptée',REJECTED:'Refusée',WITHDRAWN:'Retirée'};
export class ApiError extends Error{constructor(message:string,public code:string,public status:number){super(message);}}
/** Resolve only named CRUD routes to explicit Server Functions. Workflow commands remain NestJS. */
export async function api<T>(path:string,method='GET',body?:unknown,key?:string):Promise<T>{
 let work:(()=>Promise<ActionResult<unknown>>)|undefined;
 const cv=/^cvs\/([^/]+)$/.exec(path),primary=/^cvs\/([^/]+)\/primary$/.exec(path);
 const letter=/^letters\/([^/]+)$/.exec(path),versions=/^letters\/([^/]+)\/versions$/.exec(path);
 const application=/^applications\/([^/]+)$/.exec(path),draft=/^applications\/([^/]+)\/draft$/.exec(path),note=/^applications\/([^/]+)\/note$/.exec(path);
 if(path==='cvs'&&method==='GET')work=listCvs;
 else if(cv&&method==='GET')work=()=>readCv(cv[1]);
 else if(cv&&method==='DELETE')work=()=>removeCv(cv[1]);
 else if(primary&&method==='POST')work=()=>setPrimaryCv(primary[1]);
 else if(path==='profile'&&method==='GET')work=readProfile;
 else if(path==='profile'&&method==='PATCH')work=()=>saveProfile(body);
 else if(path==='letters'&&method==='GET')work=listLetters;
 else if(path==='letters'&&method==='POST'){
  if(body&&typeof body==='object'&&'source'in body&&body.source==='template')path='letters/template';
  else work=()=>createLetter(body,key??'');
 }
 else if(letter&&method==='GET')work=()=>readLetter(letter[1]);
 else if(letter&&method==='PATCH')work=()=>updateLetter(letter[1],body);
 else if(letter&&method==='DELETE')work=()=>removeLetter(letter[1]);
 else if(versions&&method==='GET')work=()=>listLetterVersions(versions[1]);
 else if(versions&&method==='POST')work=()=>saveLetterVersion(versions[1],body as {version:number},key??'');
 else if(path==='applications'&&method==='GET')work=listApplications;
 else if(path==='applications'&&method==='POST')work=()=>createApplication(body,key??'');
 else if(application&&method==='GET')work=()=>readApplication(application[1]);
 else if(draft&&method==='PATCH')work=()=>editApplicationDraft(draft[1],body);
 else if(note&&method==='PATCH')work=()=>saveApplicationNote(note[1],body);
 else if(path==='jobs'&&method==='GET')work=listJobs;
 else if(path==='companies'&&method==='GET')work=listCompanies;
 const status=/^applications\/([^/]+)\/status$/.exec(path);
 if(status&&method==='POST')work=()=>transitionApplication(status[1],body,key??'');
 if(work)return invoke<T>(work);
 const response=await fetch(`/api/cv-module/${path}`,{method,credentials:'same-origin',cache:'no-store',headers:{'X-Smartapply-Request':'1',...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await response.json();}catch{throw new ApiError('Le service est momentanément indisponible. Réessayez.','API_UNAVAILABLE',response.status);}if(!response.ok)throw new ApiError(data.error?.message??'Le service est indisponible.',data.error?.code??'ERROR',response.status);return data;
}
async function invoke<T>(work:()=>Promise<ActionResult<unknown>>):Promise<T>{let result:ActionResult<unknown>;try{result=await work();}catch{throw new ApiError('Connexion interrompue. Réessayez.','ACTION_UNAVAILABLE',503);}if(!result.ok)throw new ApiError(result.error.message,result.error.code,result.error.status);return result.data as T;}
export async function upload(file:File,key:string,replaceId?:string,onProgress?:(n:number)=>void):Promise<Cv>{
 const form=new FormData();form.set('file',file);form.set('key',key);if(replaceId)form.set('replaceId',replaceId);onProgress?.(0);
 const cv=await invoke<Cv>(()=>uploadCv(form));onProgress?.(100);return cv;
}
