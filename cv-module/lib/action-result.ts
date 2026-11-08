import 'server-only';
import {DataError,type Principal} from '@smartapply/data';
import {revalidatePath} from 'next/cache';
import {requireIdentity} from './identity';
export type ActionResult<T>={ok:true;data:T}|{ok:false;error:{message:string;code:string;status:number}};
/** Internal helper, never exported as a Server Function or client-controlled dispatcher. */
export async function authenticated<T>(work:(principal:Principal)=>Promise<T>,paths:string[]=[]):Promise<ActionResult<T>>{
 try{const principal=await requireIdentity();const data=await work(principal);for(const path of paths)revalidatePath(path);return {ok:true,data};}
 catch(e){return {ok:false,error:e instanceof DataError?{message:e.message,code:e.code,status:e.status}:{message:'Le service de données est momentanément indisponible. Réessayez.',code:'DATABASE_UNAVAILABLE',status:503}};}
}
