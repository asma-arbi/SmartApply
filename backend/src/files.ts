import { PDFDocument,PDFDict,PDFArray,PDFName } from 'pdf-lib';
import { XMLValidator } from 'fast-xml-parser';
import { fromBuffer } from 'yauzl';
import { createHash, randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir,readFile,writeFile,unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { DomainError } from './contracts.js';
export type ValidFile={bytes:Buffer;name:string;mime:string;hash:string;size:number};
export async function validateFile(bytes:Buffer,name:string,limit=5*1024*1024):Promise<ValidFile>{
 if(!bytes.length||bytes.length>limit)throw new DomainError('FILE_SIZE',`Le fichier doit contenir des données et ne pas dépasser ${limit/1024/1024} Mo.`);
 if(!name||name.length>200||/[\\/\x00-\x1f]/.test(name)||name.includes('..'))throw new DomainError('FILENAME','Le nom du fichier est invalide.');
 let mime='';
 if(name.toLowerCase().endsWith('.pdf')&&bytes.subarray(0,5).toString()==='%PDF-'){
  try {const pdf=await PDFDocument.load(bytes);if(pdf.getPageCount()===0)throw new Error();
   const forbidden=new Set(['JS','JavaScript','Launch','EmbeddedFile','EmbeddedFiles','RichMedia','OpenAction','AA']);
   function inspect(value:unknown):boolean{if(value instanceof PDFName)return forbidden.has(value.decodeText());if(value instanceof PDFArray)return value.asArray().some(inspect);if(value instanceof PDFDict)return value.entries().some(([k,v])=>forbidden.has(k.decodeText())||inspect(v));return false;}
   if(pdf.context.enumerateIndirectObjects().some(([,v])=>inspect(v)))throw new DomainError('UNSAFE_PDF','Ce PDF contient des actions ou pièces jointes actives non autorisées.');
   mime='application/pdf';}catch(e){if(e instanceof DomainError)throw e;throw new DomainError('CORRUPT_PDF','Ce PDF est corrompu ou protégé et ne peut pas être utilisé.');}
 } else if(name.toLowerCase().endsWith('.docx')&&bytes[0]===0x50&&bytes[1]===0x4b){
  await new Promise<void>((res,rej)=>fromBuffer(bytes,{lazyEntries:true,validateEntrySizes:true},(err,zip)=>{
   if(err||!zip){rej(new DomainError('CORRUPT_DOCX','Ce document DOCX est invalide.'));return;}
   let count=0,total=0,document=false,types=false,done=false;
   const fail=()=>{if(done)return;done=true;zip.close();rej(new DomainError('CORRUPT_DOCX','Ce document DOCX est corrompu ou contient des éléments non autorisés.'));};
   zip.on('error',fail);zip.on('end',()=>{if(done)return;done=true;if(document&&types)res();else rej(new DomainError('CORRUPT_DOCX','Le document Word ne contient pas les éléments requis.'));});
   zip.on('entry',entry=>{
    count++;total+=entry.uncompressedSize;
    if(count>3000||total>20*1024*1024||entry.generalPurposeBitFlag&1||/\\|(^|\/)\.\.(\/|$)|^\//.test(entry.fileName)||/vbaProject|word\/embeddings/i.test(entry.fileName)){fail();return;}
    if(['word/document.xml','[Content_Types].xml'].includes(entry.fileName)){
     zip.openReadStream(entry,(e,stream)=>{if(e||!stream){fail();return;}const chunks:Buffer[]=[];let size=0;
      stream.on('data',(b:Buffer)=>{size+=b.length;if(size>10*1024*1024){stream.destroy();fail();}else chunks.push(b);});stream.on('error',fail);
      stream.on('end',()=>{if(done)return;const text=Buffer.concat(chunks).toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(text)||XMLValidator.validate(text)!==true){fail();return;}
       if(entry.fileName==='word/document.xml')document=/<(?:\w+:)?document\b/.test(text)&&/<\/(?:\w+:)?document>/.test(text);
       else types=text.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml');zip.readEntry();});
     });
    }else zip.readEntry();
   });zip.readEntry();
  }));mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 }else throw new DomainError('FILE_TYPE','Choisissez un fichier PDF ou DOCX valide.');
 return {bytes,name,mime,size:bytes.length,hash:createHash('sha256').update(bytes).digest('hex')};
}
export interface StoragePort { put(path:string,file:ValidFile):Promise<void>;read(path:string):Promise<Buffer>;remove(path:string):Promise<void>; }
export class LocalPrivateStorage implements StoragePort{
 private key!:Buffer;constructor(private directory:string){}
 async init(){await mkdir(this.directory,{recursive:true});const p=resolve(this.directory,'encryption.key');try{this.key=await readFile(p);}catch{this.key=randomBytes(32);await writeFile(p,this.key,{flag:'wx',mode:0o600});}}
 private file(path:string){if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(path))throw new DomainError('INVALID_PATH','Fichier indisponible.',404);return resolve(this.directory,path.replace('/','_')+'.bin');}
 async put(path:string,file:ValidFile){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);const data=Buffer.concat([cipher.update(file.bytes),cipher.final()]);await writeFile(this.file(path),Buffer.concat([iv,cipher.getAuthTag(),data]),{flag:'wx',mode:0o600});}
 async read(path:string){try{const b=await readFile(this.file(path)),d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]);}catch{throw new DomainError('STORAGE_UNAVAILABLE','Ce fichier est momentanément indisponible.',503);}}
 async remove(path:string){try{await unlink(this.file(path));}catch(e:any){if(e.code!=='ENOENT')throw new DomainError('STORAGE_UNAVAILABLE','Le fichier ne peut pas être supprimé pour le moment.',503);}}
}
export class SupabasePrivateStorage implements StoragePort{
 private client;constructor(url:string,key:string,private bucket:string){this.client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
 async put(path:string,file:ValidFile){const {error}=await this.client.storage.from(this.bucket).upload(path,file.bytes,{contentType:file.mime,upsert:false});if(error)throw new DomainError('STORAGE_UNAVAILABLE','Le stockage privé est indisponible.',503);}
 async read(path:string){const {data,error}=await this.client.storage.from(this.bucket).download(path);if(error||!data)throw new DomainError('STORAGE_UNAVAILABLE','Le fichier privé est indisponible.',503);return Buffer.from(await data.arrayBuffer());}
 async remove(path:string){const {error}=await this.client.storage.from(this.bucket).remove([path]);if(error)throw new DomainError('STORAGE_UNAVAILABLE','La suppression du fichier a échoué.',503);}
}
export function storagePath(userId:string){return `${userId}/${randomUUID()}`;}
export async function docxText(bytes:Buffer):Promise<string>{return new Promise((resolveText,reject)=>fromBuffer(bytes,{lazyEntries:true},(error,zip)=>{
 if(error||!zip){reject(new DomainError('PREVIEW_UNAVAILABLE','Aperçu Word indisponible.'));return;}let found=false;
 zip.on('error',()=>reject(new DomainError('PREVIEW_UNAVAILABLE','Aperçu Word indisponible.')));zip.on('end',()=>{if(!found)reject(new DomainError('PREVIEW_UNAVAILABLE','Aperçu Word indisponible.'));});
 zip.on('entry',entry=>{if(entry.fileName!=='word/document.xml'){zip.readEntry();return;}found=true;zip.openReadStream(entry,(err,stream)=>{if(err||!stream){zip.close();reject(new DomainError('PREVIEW_UNAVAILABLE','Aperçu Word indisponible.'));return;}const chunks:Buffer[]=[];stream.on('data',(b:Buffer)=>chunks.push(b));stream.on('error',reject);stream.on('end',()=>{zip.close();const xml=Buffer.concat(chunks).toString('utf8');const paragraphs=xml.split(/<\/w:p>/);const text=paragraphs.map(p=>[...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('')).join('\n');resolveText(text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&'));});});});zip.readEntry();
}));}
