import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { listReceivedApplications } from '@/cv-module/actions/applicationActions';
import InterviewWorkspace from '@/cv-module/components/interview-workspace';
import type {Received} from './ReceivedApplications';
export const dynamic='force-dynamic';
export default async function CompanyInterviewsPage(){
 const session=await getSessionUser();
 if(!session)redirect('/login');
 if(session.user.role!=='entreprise')redirect('/access-denied');
 const result=await listReceivedApplications();
 if(!result.ok)return <p role="alert" className="m-8 rounded-xl bg-red-50 p-4 text-red-700">{result.error.message}</p>;
 const applications=result.data as Received[];
 const items=applications.flatMap(a=>a.interview?.scheduledAt?[{title:a.jobTitle,person:a.candidateName,company:session.user.name,applicationStatus:a.status,...a.interview,id:a.id,scheduledAt:a.interview.scheduledAt}]:[]);
 return <InterviewWorkspace items={items} applications={applications} recruiter />;
}
