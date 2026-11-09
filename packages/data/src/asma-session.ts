import {jwtVerify} from 'jose';
import {createHash} from 'node:crypto';
import type {Connection} from 'mongoose';
import {DataError,type Principal} from './identity.js';
export async function asmaSession(connection:Connection,cookie:string,secret:string):Promise<Principal>{
 if(!secret)throw new DataError('AUTH_UNAVAILABLE','JWT_SECRET Asma doit être configuré côté serveur.',503);
 const values=new Map(cookie.split(';').map(part=>{const i=part.indexOf('=');return [part.slice(0,i).trim(),part.slice(i+1).trim()];}));
 const db=connection.db!,access=values.get('smartapply_access_token'),refresh=values.get('smartapply_refresh_token');let session:any;
 if(access)try{const {payload}=await jwtVerify(access,new TextEncoder().encode(secret),{algorithms:['HS256']});if(typeof payload.sub==='string'&&typeof payload.sid==='string')session=await db.collection('sessions').findOne({id:payload.sid,user_id:payload.sub,revoked_at:null});}catch{}
 if(!session&&refresh)session=await db.collection('sessions').findOne({refresh_token_hash:createHash('sha256').update(refresh).digest('hex'),revoked_at:null});
 const now=Date.now();if(!session||!(Date.parse(session.expires_at)>now)||!(Date.parse(session.last_active_at)+7*86400000>now))throw new DataError('UNAUTHENTICATED','Connectez-vous dans SmartApply.',401);
 const user=await db.collection('users').findOne({id:session.user_id});if(!user||user.active===false)throw new DataError('UNAUTHENTICATED','Compte indisponible.',401);
 const role=user.role==='candidat'?'candidate':user.role==='entreprise'?'recruiter':user.role==='admin'?'admin':null;if(!role)throw new DataError('FORBIDDEN','Rôle non reconnu.',403);
 // A validated Asma session is not evidence of email verification. Keep these facts separate.
 return {userId:user.id,role,emailVerified:user.email_verified===true,authenticatedSession:true};
}
