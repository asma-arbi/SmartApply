'use server';
import {Buffer} from 'node:buffer';
import {DataError} from '@smartapply/data';
import {CvRepository} from '../models/cv.model';
import {connectDB} from '../lib/mongodb';
import {authenticated} from '../lib/action-result';
export async function listCvs(){return authenticated(async p=>new CvRepository(await connectDB()).list(p));}
export async function readCv(id:string){return authenticated(async p=>{const cv=await new CvRepository(await connectDB()).owned(p,id);return {id:cv.id,original_filename:cv.original_filename,mime_type:cv.mime_type,file_size:cv.file_size,processing_status:cv.processing_status,is_primary:cv.is_primary,created_at:cv.created_at,updated_at:cv.updated_at};});}
export async function uploadCv(form:FormData){return authenticated(async p=>{
 const file=form.get('file'),key=form.get('key'),replace=form.get('replaceId');
 if(!(file instanceof File)||file.size===0||file.size>5*1024*1024||typeof key!=='string'||(replace!==null&&typeof replace!=='string'))throw new DataError('VALIDATION','Choisissez un PDF ou DOCX de 5 Mo maximum.');
 return new CvRepository(await connectDB()).upload(p,Buffer.from(await file.arrayBuffer()),file.name,key,replace??undefined);
},['/dashboard/candidate/cv','/dashboard/candidate']);}
export async function setPrimaryCv(id:string){return authenticated(async p=>new CvRepository(await connectDB()).primary(p,id),['/dashboard/candidate/cv']);}
export async function removeCv(id:string){return authenticated(async p=>new CvRepository(await connectDB()).remove(p,id),['/dashboard/candidate/cv']);}
