import {NextRequest,NextResponse} from 'next/server';
import {requireIdentity} from '@/cv-module/lib/identity';
import {connectDB} from '@/cv-module/lib/mongodb';
import {ApplicationRepository,PrivateCvFiles,DataError} from '@smartapply/data';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:{id:string}}){
 try{
  const p=await requireIdentity(),connection=await connectDB();
  const application=await new ApplicationRepository(connection).owned(p,params.id);
  const cv=await connection.db!.collection('candidate_cvs').findOne({id:application.cv_id,user_id:application.candidate_id,status:'ready'});
  if(!cv)throw new DataError('NOT_FOUND','Document indisponible.',404);
  const bytes=await new PrivateCvFiles(connection).read({...p,userId:application.candidate_id,role:'candidate'},cv.id);
  const filename=encodeURIComponent(cv.original_filename);
  return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':cv.mime_type,'Cache-Control':'private, no-store','X-Frame-Options':'SAMEORIGIN','Content-Disposition':`${request.nextUrl.searchParams.has('download')?'attachment':'inline'}; filename*=UTF-8''${filename}`}});
 }catch(e){return NextResponse.json({error:e instanceof DataError?e.message:'Document indisponible.'},{status:e instanceof DataError?e.status:503});}
}
