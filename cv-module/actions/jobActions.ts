
'use server';
import {authenticated} from '../lib/action-result';
import {connectDB} from '../lib/mongodb';
import {DataError,requireCandidate} from '@smartapply/data';
export async function saveOffer(jobId:string,save:boolean){return authenticated(async p=>{requireCandidate(p);if(typeof jobId!=='string'||jobId.length>300)throw new DataError('VALIDATION','Offre invalide.');const db=(await connectDB()).db!;if(!await db.collection('jobs').findOne({id:jobId,status:'published'}))throw new DataError('NOT_FOUND','Offre introuvable.',404);await db.collection('saved_jobs').createIndex({user_id:1,job_id:1},{unique:true});if(save)await db.collection('saved_jobs').updateOne({user_id:p.userId,job_id:jobId},{$setOnInsert:{user_id:p.userId,job_id:jobId,created_at:new Date()}},{upsert:true});else await db.collection('saved_jobs').deleteOne({user_id:p.userId,job_id:jobId});return {saved:save};},['/jobs','/dashboard/candidate/saved']);}
