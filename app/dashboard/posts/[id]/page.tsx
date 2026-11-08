import {PostsFeed} from '@/cv-module/components/posts';
import {requireIdentity} from '@/cv-module/lib/identity';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:{id:string}}){const p=await requireIdentity();return <PostsFeed postId={params.id} canPublish={p.role==='candidate'||p.role==='recruiter'}/>;}
