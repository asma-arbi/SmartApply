import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {connectDB,closeDB,CvRepository,ProfileRepository,profileModel,LetterRepository,type Principal} from '@smartapply/data';
import {GroqAi,unavailableAi} from '../backend/src/studio/ai.js';
import {MongoStudioService} from '../backend/src/mongo/studio.js';
if(process.env.VERIFY_LIVE_MONGO!=='1')throw Error('Set VERIFY_LIVE_MONGO=1 explicitly to verify fictional records against the configured database.');
const p:Principal={userId:'verification|'+randomUUID(),role:'candidate',emailVerified:false,authenticatedSession:true};
const report:any={verifiedAt:new Date().toISOString(),mongodb:false,privateFiles:false,profile:false,letterVersions:false,analysis:null,generation:{fr:null,en:null},cleanup:false};
async function waitForJob(service:MongoStudioService,id:string){const deadline=Date.now()+120000;while(Date.now()<deadline){await service.processNext(id);const job=await service.job(p,id);if(job.status==='completed'||job.status==='failed')return job;await new Promise(resolve=>setTimeout(resolve,250));}throw Error('Live verification job timeout.');}
let studio:MongoStudioService|undefined;let cvId:string|undefined;const letterIds:string[]=[];
const connection=await connectDB();const cvs=new CvRepository(connection);const profiles=new ProfileRepository(profileModel(connection));const letters=new LetterRepository(connection);
try{
 await connection.db!.command({ping:1});report.mongodb=true;const initial=await profiles.get(p);await profiles.save(p,{...initial,name:'Fictional verification candidate',objective:'React internship',skills:[{id:randomUUID(),name:'React',category:'Web',proficiency:'',source:'manual'}]});report.profile=(await profiles.get(p)).skills[0].name==='React';
 const text='Fictional verification candidate\nOBJECTIVE\nReact internship\nSKILLS\nReact, TypeScript, Git\nEDUCATION\nComputer science coursework and software development exercises.\nPROJECTS\nReact portfolio: built an accessible interface with reusable components and tests.\nEXPERIENCE\nPersonal learning projects with documented implementation decisions.';
 const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);pdf.addPage().drawText(text,{x:30,y:750,size:11,font});const bytes=Buffer.from(await pdf.save());const uploaded=await cvs.upload(p,bytes,'Fictional-verification.pdf',randomUUID());cvId=uploaded.id;
 report.privateFiles=bytes.equals(await cvs.files.read(p,cvId));try{await cvs.files.read({...p,userId:'verification|other'},cvId);throw Error('Private file isolation failed');}catch(error:any){if(error.code!=='NOT_FOUND')throw error;}
 const manual=await letters.create(p,{title:'Verification manual',language:'fr',body:'Original fictional draft'},randomUUID());letterIds.push(manual.id);const edited=await letters.patch(p,manual.id,{version:1,body:'Updated fictional draft'});await letters.saveVersion(p,manual.id,{version:edited.version},randomUUID());const versions=await letters.versions(p,manual.id);await letters.restore(p,manual.id,{version:edited.version,versionId:versions[versions.length-1].id},randomUUID());report.letterVersions=(await letters.get(p,manual.id)).body==='Original fictional draft';
 const ai=process.env.GROQ_API_KEY?.trim()?new GroqAi(process.env.GROQ_API_KEY,process.env.GROQ_MODEL?.trim()||undefined):unavailableAi;
 if(!ai.available)throw Error('GROQ_API_KEY missing: Atlas CRUD checked but live AI not verified.');
 const modelResponse=await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY},signal:AbortSignal.timeout(15000)});if(!modelResponse.ok)throw Error('Groq model-access verification failed with HTTP '+modelResponse.status);const models:any=await modelResponse.json();if(!models.data?.some((m:any)=>m.id===ai.model))throw Error('Configured Groq model is not accessible to this account.');report.model=ai.model;
 studio=new MongoStudioService(connection,ai);await studio.init();const preview=await studio.preview(p,cvId);const job=await studio.createAnalysis(p,cvId,{approvedText:preview.text,sourceHash:preview.sourceHash,consent:true,targetDescription:'React TypeScript Docker',language:'en'},randomUUID());const analyzed=await waitForJob(studio,job.id);report.analysis={status:analyzed.status,quality:analyzed.result?.score?.quality,missing:analyzed.result?.score?.missing,errorCode:analyzed.error_code};
 for(const language of ['fr','en'] as const){const letter=await letters.create(p,{title:'Live verification '+language,company:'Fictional company',role:'React intern',language,cvId},randomUUID());letterIds.push(letter.id);const generation=await studio.generate(p,letter.id,{version:1,consent:true,approvedText:preview.text,sourceHash:preview.sourceHash},randomUUID());const result=await waitForJob(studio,generation.id);report.generation[language]={status:result.status,errorCode:result.error_code,errorMessage:result.error_message,source:(await letters.get(p,letter.id)).source};}
 if(report.analysis.status!=='completed'||Object.values(report.generation).some((g:any)=>g.status!=='completed'))process.exitCode=1;
}catch(error:any){report.error=error.code??(/^(GROQ_|Groq |Configured Groq|Frontend and backend)/.test(error.message)?error.message:'Live verification could not complete. Inspect configuration and safe provider error codes.');process.exitCode=1;}
finally{
 studio?.onModuleDestroy();
 // Exact generated principal only; never touch existing application accounts or records.
 try{for(const id of letterIds)await letters.remove(p,id);if(cvId)await cvs.remove(p,cvId);for(const collection of ['candidate_ai_jobs','candidate_profiles','module_operations'])await connection.db!.collection(collection).deleteMany({user_id:p.userId});await connection.db!.collection<{_id:string}>('module_owner_locks').deleteOne({_id:p.userId});report.cleanup=true;}catch{report.cleanup=false;process.exitCode=1;}
 await mkdir('output',{recursive:true});await writeFile('output/module-live-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await closeDB();
}
