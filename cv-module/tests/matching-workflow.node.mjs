// Build packages/data and backend first. Uses a disposable local replica set and fake AI only.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {startMongoTestRuntime} from '../../scripts/mongo-test-runtime.mjs';
import {MongoStudioService} from '../../backend/dist/mongo/studio.js';
import {groundMatches,shortlistOffers} from '../../backend/dist/studio/matching.js';

const owner={userId:'matching-owner',role:'candidate',emailVerified:true};
const outsider={userId:'matching-outsider',role:'candidate',emailVerified:true};
const cvId='11111111-1111-4111-8111-111111111111',foreignCvId='22222222-2222-4222-8222-222222222222';
const hash='a'.repeat(64),cvText='Développement JavaScript avec React et travail en équipe sur une application accessible, documentée et maintenue en collaboration.';
let mongo,connection,service,aiCalls,aiResponse;
const ai={available:true,model:'matching-fixture',async extract(){throw Error('unused');},async letter(){throw Error('unused');},async match(...args){aiCalls.push(args);if(aiResponse instanceof Error)throw aiResponse;return aiResponse;}};
before(async()=>{
 mongo=await startMongoTestRuntime();connection=await mongoose.createConnection(mongo.uri,{dbName:'matching_test'}).asPromise();service=new MongoStudioService(connection,ai);
 const db=connection.db,now=new Date().toISOString(),row=(id,user_id)=>({id,user_id,original_filename:'fixture.pdf',storage_path:id,mime_type:'application/pdf',file_size:100,file_hash:hash,is_primary:true,status:'ready',created_at:now,updated_at:now});
 await db.collection('candidate_cvs').insertMany([row(cvId,owner.userId),row(foreignCvId,outsider.userId)]);
 await db.collection('companies').insertMany([{id:'verified',name:'Verified employer',status:'verified'},{id:'unverified',name:'Unverified employer',status:'pending'}]);
 const base={company_id:'verified',status:'published',title:'Développeur React',description:'Maîtrise JavaScript et React, communication en équipe.',route:'internal',created_at:now};
 await db.collection('jobs').insertMany([
  {...base,id:'eligible'}, {...base,id:'draft',status:'draft'}, {...base,id:'external',route:'external'},
  {...base,id:'expired',application_deadline:'2020-01-01'}, {...base,id:'unverified',company_id:'unverified'}, {...base,id:'archived',archived:true}
 ]);
 await db.collection('integration_company_refs').insertOne({id:'legacy-company',name:'Legacy employer',verified:true});
 await db.collection('integration_job_refs').insertOne({id:'legacy-job',company_id:'legacy-company',title:'Legacy React',description:'JavaScript et React',state:'published',route:'internal'});
 aiCalls=[];
});
after(async()=>{service?.onModuleDestroy();await connection?.close();await mongo?.stop();});

const valid={jobId:'eligible',requirements:[
 {criterion:'React',jobEvidence:'JavaScript et React',cvEvidence:'JavaScript avec React'},
 {criterion:'communication',jobEvidence:'communication en équipe',cvEvidence:'invention absente du CV'},
 {criterion:'React',jobEvidence:'JavaScript et React',cvEvidence:'JavaScript avec React'},
 {criterion:'React expertise',jobEvidence:'JavaScript et React',cvEvidence:'JavaScript avec React'},
 {criterion:'travail collectif',jobEvidence:'communication en équipe',cvEvidence:'JavaScript avec React'},
 {criterion:'Docker',jobEvidence:'Docker requis',cvEvidence:'JavaScript avec React'}
]};
const input={approvedText:cvText,sourceHash:hash,consent:true};

test('fabricated and weak evidence cannot manufacture an offer match',()=>{
 const offer={id:'eligible',companyId:'verified',companyName:'Verified employer',title:'Développeur React',description:'Maîtrise JavaScript et React, communication en équipe.',skills:[],location:'',contract:'',workMode:'',publishedAt:'2026-01-01T00:00:00.000Z'};
 assert.throws(()=>groundMatches({matches:[{jobId:'made-up',requirements:[valid.requirements[0]]}]},cvText,[offer]),{code:'AI_INVALID_RESPONSE'});
 assert.deepEqual(groundMatches({matches:[{jobId:'eligible',requirements:[{criterion:'React',jobEvidence:'JavaScript et React',cvEvidence:'React'}]}]},cvText,[offer]),[]);
 assert.equal(shortlistOffers(cvText,Array.from({length:15},(_,i)=>({...offer,id:String(i)}))).length,12);
});

test('matching requires consent, an owned CV and its current source hash',async()=>{
 await assert.rejects(service.createMatching(owner,cvId,{...input,consent:false},'missing-consent'),{code:'VALIDATION'});
 await assert.rejects(service.createMatching(owner,foreignCvId,input,'foreign-cv-test'),{code:'NOT_FOUND'});
 await assert.rejects(service.createMatching(owner,cvId,{...input,sourceHash:'b'.repeat(64)},'incorrect-hash'),{code:'CV_CHANGED'});
});

test('matching includes only eligible internal published offers and computes score from verified evidence',async()=>{
 aiCalls=[];aiResponse={matches:[valid,{jobId:'invented-job',requirements:[valid.requirements[0]]},{jobId:'eligible',requirements:[valid.requirements[0]]}]};
 const queued=await service.createMatching(owner,cvId,input,'matching-initial');
 const duplicate=await service.createMatching(owner,cvId,input,'matching-duplicate');assert.equal(duplicate.id,queued.id);
 await service.processNext(queued.id);
 const job=await service.job(owner,queued.id);assert.equal(job.status,'completed');assert.equal(aiCalls.length,1);
 const offered=aiCalls[0][1].map(o=>o.id);assert.deepEqual(offered,['eligible']);
 assert.equal(job.result.matches.length,1);const match=job.result.matches[0];assert.equal(match.id,'eligible');assert.equal(match.totalCriteria,2);assert.equal(match.matchedCount,1);assert.equal(match.score,50);
 assert.equal(match.criteria.find(c=>c.criterion==='communication').cvEvidence,null);
 await assert.rejects(service.job(outsider,queued.id),{code:'NOT_FOUND'});
 await assert.rejects(service.latestMatching(outsider,cvId),{code:'NOT_FOUND'});
 assert.equal(await service.latestMatching(owner,foreignCvId).then(()=>false,error=>error.code==='NOT_FOUND'),true);
});

test('changed offer text is not presented as current evidence and queued matching uses current offer content',async()=>{
 await connection.db.collection('jobs').updateOne({id:'eligible'},{$set:{description:'Maîtrise JavaScript et React, communication en équipe. Une responsabilité ajoutée.'}});
 const prior=await service.latestMatching(owner,cvId);assert.equal(prior.stale,true);assert.deepEqual(prior.result.matches,[]);
 aiCalls=[];aiResponse={matches:[valid]};const queued=await service.createMatching(owner,cvId,input,'matching-fresh-offer');assert.notEqual(queued.id,prior.id);
 await connection.db.collection('jobs').updateOne({id:'eligible'},{$set:{description:'Maîtrise JavaScript et React, communication en équipe. Contenu mis à jour avant analyse.'}});
 await service.processNext(queued.id);assert.match(aiCalls[0][1][0].description,/Contenu mis à jour avant analyse/);
 assert.equal((await service.job(owner,queued.id)).status,'completed');
});

test('failed refresh preserves prior completed results, and withdrawn offers disappear from saved results',async()=>{
 const previous=await service.latestMatching(owner,cvId);assert.equal(previous.status,'completed');
 aiResponse=new Error('fictional provider failure');const queued=await service.createMatching(owner,cvId,input,'matching-failure');await service.processNext(queued.id);
 assert.equal((await service.job(owner,queued.id)).status,'failed');assert.equal((await service.latestMatching(owner,cvId)).id,previous.id);
 await connection.db.collection('jobs').updateOne({id:'eligible'},{$set:{status:'draft'}});
 assert.deepEqual((await service.latestMatching(owner,cvId)).result.matches,[]);
});
