import {ObjectId} from 'mongodb';
import {NextResponse} from 'next/server';
import {getDb} from '@/lib/mongodb';
import {requireIdentity} from '@/cv-module/lib/identity';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(_request:Request,{params}:{params:{id:string}}){
 if(!/^[a-f0-9]{24}$/i.test(params.id))return new NextResponse('Fichier introuvable.',{status:404});
 const db=await getDb();const file=await db.collection('post_media').findOne({_id:new ObjectId(params.id)});
 if(!file||!file.data)return new NextResponse('Fichier introuvable.',{status:404});
 const identity=await requireIdentity().catch(()=>null);
 if(file.owner_id!==identity?.userId){
  const publicPost=await db.collection('posts').findOne({status:'published',...(identity?{}:{visibility:{$ne:'members'}}),$or:[{media_url:`/api/posts/media/${params.id}`},{cover_image_url:`/api/posts/media/${params.id}`}]},{projection:{_id:1}});
  if(!publicPost)return new NextResponse('Fichier introuvable.',{status:404});
 }
 const bytes=Buffer.from(file.data.buffer??file.data);
 return new NextResponse(bytes,{headers:{'Content-Type':file.mime||'application/octet-stream','Content-Length':String(bytes.length),'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
}
