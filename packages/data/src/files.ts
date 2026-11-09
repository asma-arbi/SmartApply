import mongoose,{type Connection} from 'mongoose';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {DataError,requireCandidate,type Principal} from './identity.js';
type Claim={_id:string;user_id:string;cv_id:string;file_id:mongoose.mongo.ObjectId;status:'uploading'|'ready'};
/** Byte storage. Domain services must validate content and enforce attachment retention. */
export class PrivateCvFiles {
 private bucket:mongoose.mongo.GridFSBucket;
 private claims:mongoose.mongo.Collection<Claim>;
 constructor(connection:Connection){if(!connection.db)throw new DataError('DATABASE_UNAVAILABLE','MongoDB doit être connecté.',503);this.bucket=new mongoose.mongo.GridFSBucket(connection.db,{bucketName:'private_cvs'});this.claims=connection.db.collection<Claim>('private_cv_claims');}
 private scope(principal:Principal,cvId:string){const user_id=requireCandidate(principal);if(!z.string().uuid().safeParse(cvId).success)throw new DataError('VALIDATION','Identifiant CV invalide.');return {_id:createHash('sha256').update(JSON.stringify([user_id,cvId])).digest('hex'),user_id,cv_id:cvId};}
 async put(principal:Principal,cvId:string,bytes:Buffer,mime:string){
  const scope=this.scope(principal,cvId);
  if(!bytes.length||bytes.length>5*1024*1024)throw new DataError('FILE_SIZE','Le fichier ne doit pas dépasser 5 Mo.');
  if(!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime))throw new DataError('FILE_TYPE','PDF ou DOCX requis.');
  const file_id=new mongoose.mongo.ObjectId();
  try{await this.claims.insertOne({...scope,file_id,status:'uploading'});}catch(error:any){if(error.code===11000)throw new DataError('FILE_EXISTS','Ce fichier existe déjà ou son téléversement est en cours.',409);throw new DataError('STORAGE_UNAVAILABLE','Le stockage privé est indisponible.',503);}
  const upload=this.bucket.openUploadStreamWithId(file_id,cvId,{metadata:{user_id:scope.user_id,cv_id:cvId,mime_type:mime}});
  try{await pipeline(Readable.from([bytes]),upload);await this.claims.updateOne({...scope,file_id},{$set:{status:'ready'}});return file_id.toHexString();}
  catch{await upload.abort().catch(()=>{});await this.bucket.delete(file_id).catch(()=>{});await this.claims.deleteOne({...scope,file_id}).catch(()=>{});throw new DataError('STORAGE_UNAVAILABLE','Le stockage privé est indisponible.',503);}
 }
 private async owned(principal:Principal,cvId:string){const scope=this.scope(principal,cvId);const claim=await this.claims.findOne({...scope,status:'ready'});if(!claim)throw new DataError('NOT_FOUND','Fichier privé introuvable.',404);return claim;}
 async read(principal:Principal,cvId:string){const claim=await this.owned(principal,cvId);const chunks:Buffer[]=[];let size=0;try{for await(const chunk of this.bucket.openDownloadStream(claim.file_id)){size+=chunk.length;if(size>5*1024*1024)throw new Error();chunks.push(Buffer.from(chunk));}return Buffer.concat(chunks);}catch{throw new DataError('STORAGE_UNAVAILABLE','La lecture privée est indisponible.',503);}}
 async remove(principal:Principal,cvId:string){const claim=await this.owned(principal,cvId);try{await this.bucket.delete(claim.file_id);}catch(error){if(await this.bucket.find({_id:claim.file_id}).hasNext())throw error;}await this.claims.deleteOne({_id:claim._id,file_id:claim.file_id});}
}
