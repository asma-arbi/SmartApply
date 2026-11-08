import {CompanyPosts} from '@/cv-module/components/company-posts';
import {requireIdentity} from '@/cv-module/lib/identity';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){const p=await requireIdentity().catch(()=>null);if(!p)redirect('/login?revoked=1');if(p.role!=='recruiter')redirect('/access-denied');return <CompanyPosts/>;}
