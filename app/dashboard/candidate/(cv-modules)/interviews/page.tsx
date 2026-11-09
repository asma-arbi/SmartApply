import { listApplications,readInterview } from '@/cv-module/actions/applicationActions';
import InterviewWorkspace from '@/cv-module/components/interview-workspace';
import type {InterviewEntry} from '@/cv-module/components/interview-utils';
export const dynamic='force-dynamic';
export default async function CandidateInterviewsPage(){
 const apps=await listApplications();
 if(!apps.ok)return <p role="alert" className="m-8 rounded-xl bg-red-50 p-4 text-red-700">{apps.error.message}</p>;
 const rows=await Promise.all((apps.data as {id:string;job_title?:string;company_name?:string;status:string}[]).filter(a=>a.status!=='DRAFT').map(async a=>{
  const result=await readInterview(a.id);
  if(!result.ok)throw new Error(result.error.message);
  const i=result.data;
  return i?.scheduledAt?{title:a.job_title||'Candidature spontanée',person:a.company_name||'Entreprise',company:a.company_name||'Entreprise',applicationStatus:a.status,...i,id:a.id,scheduledAt:i.scheduledAt} as InterviewEntry:null;
 }));
 return <InterviewWorkspace items={rows.filter((i):i is InterviewEntry=>i!==null)} />;
}
