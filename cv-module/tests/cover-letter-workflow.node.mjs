// Build packages/data and backend first; this fixture uses only a temporary local MongoDB replica set.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {startMongoTestRuntime} from '../../scripts/mongo-test-runtime.mjs';
import {MongoStudioService} from '../../backend/dist/mongo/studio.js';
import {validateTechnologies,validateGroundedLetter,finalizeLetterBody} from '../../backend/dist/studio/letter-quality.js';
import {COVER_LETTER_PROMPT_VERSION,COVER_LETTER_SYSTEM_PROMPT,buildLetterPrompt} from '../../backend/dist/studio/cover-letter-prompt.js';

const principal={userId:'fictional-candidate',role:'candidate',emailVerified:true};
const selected='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const hash='a'.repeat(64),otherHash='b'.repeat(64);
const cvText='Reviewed selected CV: built a practical JavaScript and TypeScript web project, worked collaboratively, and documented the results for the team.';
let mongo,connection,service,calls,outputs;
const ai={available:true,model:'fictional-test-model',async extract(){throw Error('unused');},async letter(...args){calls.push(args);const reply=outputs.shift();if(!reply)throw Error('unexpected request');return {subject:'Candidature développeur',body:reply};}};
before(async()=>{
 mongo=await startMongoTestRuntime();connection=await mongoose.createConnection(mongo.uri,{dbName:'cover_letter_test'}).asPromise();
 const now=new Date().toISOString();await connection.db.collection('candidate_cvs').insertMany([
  {id:selected,user_id:principal.userId,original_filename:'selected.pdf',storage_path:selected,mime_type:'application/pdf',file_size:100,file_hash:hash,is_primary:false,status:'ready',created_at:now,updated_at:now},
  {id:other,user_id:principal.userId,original_filename:'primary.pdf',storage_path:other,mime_type:'application/pdf',file_size:100,file_hash:otherHash,is_primary:true,status:'ready',created_at:now,updated_at:now}
 ]);service=new MongoStudioService(connection,ai);
});
after(async()=>{service?.onModuleDestroy();await connection?.close();await mongo?.stop();});
async function draft(suffix){return service.letters.create(principal,{title:'Développeur web',language:'fr',role:'Développeur web',company:'',emphasis:'Disponible en septembre',jobDescription:'Docker is requested by the employer.',cvId:selected,subject:'Existing subject',body:'Existing user draft.'},`create-letter-${suffix}`);}
async function generate(letter,key){return service.generate(principal,letter.id,{version:letter.version,consent:true,approvedText:cvText,sourceHash:hash},key);}

test('JS and TS aliases are grounded while an employer-only technology is not',()=>{
 assert.doesNotThrow(()=>validateTechnologies('JavaScript and TypeScript', 'JS, TS'));
 assert.doesNotThrow(()=>validateTechnologies('JS and TS', 'JavaScript, TypeScript'));
 assert.throws(()=>validateTechnologies('Docker experience', 'JavaScript and TypeScript'),{code:'AI_UNGROUNDED'});
});

test('local signature fills a known name or removes an unknown name, while other placeholders remain invalid',()=>{
 const signature='Madame, Monsieur,\nJe vous remercie de considérer ma candidature.\n\nCordialement,\n[Nom du Candidat]';
 assert.equal(finalizeLetterBody(signature,'Amira Test'),signature.replace('[Nom du Candidat]','Amira Test'));
 assert.equal(finalizeLetterBody(signature,''),'Madame, Monsieur,\nJe vous remercie de considérer ma candidature.\n\nCordialement,');
 assert.throws(()=>validateGroundedLetter('Candidature',finalizeLetterBody('Madame [entreprise], merci de lire ma candidature.','Amira Test'),cvText),{code:'AI_INVALID_RESPONSE'});
});

test('ordinary French vue and net are not technologies, while unsupported .NET is rejected',()=>{
 assert.doesNotThrow(()=>validateTechnologies('Une vue d’ensemble claire et un résultat net.',cvText));
 assert.throws(()=>validateTechnologies('Je maîtrise .NET pour les applications.',cvText),{code:'AI_UNGROUNDED'});
 assert.doesNotThrow(()=>validateTechnologies('Je maîtrise .NET pour les applications.','Projet ASP.NET confirmé'));
});

test('persistent prompt separates candidate evidence from an optional employer and retains confirmed extra information',()=>{
 const facts={reviewedCv:'Developed with JS and TS',profile:{skills:[]},additionalInformation:'Available in September'};
 const payload=JSON.parse(buildLetterPrompt(facts,{company:'',role:'Developer',jobDescription:'Docker required'},'en','Remove Docker'));
 assert.equal(payload.promptVersion,COVER_LETTER_PROMPT_VERSION);assert.equal(payload.applicationTarget.company,'');
 assert.equal(payload.candidateEvidence.additionalInformation,'Available in September');assert.equal(payload.correctionRequired,'Remove Docker');
 assert(payload.supportedTechnologies.includes('JavaScript'));assert(payload.supportedTechnologies.includes('TypeScript'));assert(!payload.supportedTechnologies.includes('Docker'));
 assert.match(COVER_LETTER_SYSTEM_PROMPT,/generic hiring-manager salutation/i);assert.match(COVER_LETTER_SYSTEM_PROMPT,/not a source of candidate facts/i);
});

test('unsupported technologies and numbers in either letter field are rejected',()=>{
 assert.throws(()=>validateGroundedLetter('Docker engineer','A professional letter about my relevant experience.',cvText),{code:'AI_UNGROUNDED'});
 assert.throws(()=>validateGroundedLetter('900 projects','A professional letter about my relevant experience.',cvText),{code:'AI_UNGROUNDED'});
});

test('selected CV is used even when a different CV is primary, with retry on an unsupported number',async()=>{
 calls=[];outputs=['J’ai réalisé 900 projets et travaillé avec une équipe sur des applications web.','J’ai réalisé un projet JavaScript et TypeScript avec une équipe et documenté mon travail.'];
 const letter=await draft('numeric');
 await assert.rejects(service.generate(principal,letter.id,{version:letter.version,consent:true,approvedText:cvText,sourceHash:otherHash},'wrong-cv-source'),{code:'CV_CHANGED'});
 const receipt=await generate(letter,'numeric-retry-job');await service.processNext(receipt.id);
 const job=await service.job(principal,receipt.id);assert.equal(job.status,'completed');assert.equal(calls.length,2);
 assert.equal(calls[1][3],true);assert.match(calls[1][4],/chiffre|nombre|number|métrique/i);
 assert.match(JSON.stringify(calls[0][0]),/Reviewed selected CV/);assert.doesNotMatch(JSON.stringify(calls[0][0]),/primary\.pdf/);
 assert.equal(calls[0][0].additionalInformation,'Disponible en septembre');
 assert.doesNotMatch(job.result.body,/900/);
});

test('unsupported employer-only technology fails safely and keeps the user draft; a new request can retry',async()=>{
 calls=[];outputs=['Mon expérience Docker accompagne mes projets et ma pratique professionnelle.','Mon expérience Docker accompagne mes projets et ma pratique professionnelle.'];
 const letter=await draft('unsupported');const receipt=await generate(letter,'unsupported-job-1');await service.processNext(receipt.id);
 const job=await service.job(principal,receipt.id);assert.equal(job.status,'failed');assert.equal(job.error_code,'AI_UNGROUNDED');
 const preserved=await service.letters.get(principal,letter.id);assert.equal(preserved.body,'Existing user draft.');assert.equal(preserved.version,letter.version);
 calls=[];outputs=['J’ai développé un projet JavaScript et TypeScript avec une équipe et documenté mon travail.'];
 const retry=await generate(preserved,'unsupported-job-2');assert.notEqual(retry.id,receipt.id);await service.processNext(retry.id);
 assert.equal((await service.job(principal,retry.id)).status,'completed');
});
