import {PostsFeed} from '@/cv-module/components/posts';
import {requireIdentity} from '@/cv-module/lib/identity';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:{id:string}}){const p=await requireIdentity().catch(()=>null);return <main className="posts-public-container"><PostsFeed postId={params.id} canInteract={!!p} canPublish={p?.role==='candidate'||p?.role==='recruiter'}/></main>;}
