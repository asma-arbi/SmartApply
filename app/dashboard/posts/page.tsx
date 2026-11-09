import {PostsFeed} from '@/cv-module/components/posts';
import {MyPosts} from '@/cv-module/components/posts';
import {requireIdentity} from '@/cv-module/lib/identity';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:{view?:string;edit?:string;kind?:string}}){const p=await requireIdentity().catch(()=>null);if(!p)redirect('/login?revoked=1');if(p.role==='admin')redirect('/dashboard/admin/posts');if(p.role==='recruiter'&&searchParams.view==='mine')redirect('/dashboard/company/posts');return searchParams.view==='mine'?<MyPosts editId={searchParams.edit} initialKind={searchParams.kind}/>:<PostsFeed/>;}
