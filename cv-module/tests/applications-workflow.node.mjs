// Run after `npm run build:data`: node --test cv-module/tests/applications-workflow.node.mjs
// Uses only a disposable local Mongo replica set; no application environment or Atlas.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {startMongoTestRuntime} from '../../scripts/mongo-test-runtime.mjs';
import {ApplicationRepository} from '../../packages/data/dist/applications.js';
import {PrivateCvFiles} from '../../packages/data/dist/files.js';

const applicationId='11111111-1111-4111-8111-111111111111';
const draftId='22222222-2222-4222-8222-222222222222';
const cvId='33333333-3333-4333-8333-333333333333';
const letterId='44444444-4444-4444-8444-444444444444';
const foreignLetterId='55555555-5555-4555-8555-555555555555';
const candidate={userId:'candidate-a',role:'candidate',emailVerified:true};
const otherCandidate={userId:'candidate-b',role:'candidate',emailVerified:true};
const recruiter={userId:'company-a',role:'recruiter',emailVerified:true};
const outsider={userId:'company-b',role:'recruiter',emailVerified:true};
let mongo,connection,repo;

before(async()=>{
 mongo=await startMongoTestRuntime();
 connection=await mongoose.createConnection(mongo.uri,{dbName:'workflow_test'}).asPromise();
 repo=new ApplicationRepository(connection);
 const db=connection.db;
 await db.collection('users').insertMany([{id:'candidate-a',name:'Candidate',email:'candidate@example.test'},{id:'company-a'},{id:'company-b'}]);
 await db.collection('companies').insertMany([{id:'company-a',name:'Company A',status:'verified'},{id:'company-b',name:'Company B',status:'verified'}]);
 await db.collection('candidate_cvs').insertOne({id:cvId,user_id:'candidate-a',original_filename:'cv.pdf',mime_type:'application/pdf',file_size:12,status:'ready',file_hash:'private-hash',storage_path:'private-path'});
 await db.collection('jobs').insertOne({id:'job-b',company_id:'company-a',title:'Fixture job',status:'published'});
 await db.collection('candidate_letter_versions').insertMany([{id:letterId,user_id:'candidate-a',subject:'Submitted subject',body:'Submitted version'},{id:foreignLetterId,user_id:'candidate-b',subject:'Private',body:'Foreign version'}]);
 await db.collection('applications').insertMany([
  {id:applicationId,candidate_id:'candidate-a',company_id:'company-a',cv_id:cvId,type:'JOB',status:'SENT',version:1,active:true,submitted_at:new Date(),personal_note:'candidate private note'},
  {id:draftId,candidate_id:'candidate-a',company_id:'company-a',cv_id:cvId,type:'SPONTANEOUS',status:'DRAFT',version:1,active:true,submitted_at:null}
 ]);
});

test('application uses the candidate’s selected letter version and rejects another candidate’s version',async()=>{
 const input={companyId:'company-a',jobId:'job-b',cvId,type:'JOB',confirm:true};
 await assert.rejects(repo.create(candidate,{...input,letterVersionId:foreignLetterId},'foreign-letter-test'),{code:'LETTER_FORBIDDEN'});
 const created=await repo.create(candidate,{...input,letterVersionId:letterId},'owned-letter-test');
 assert.equal(created.subject,'Submitted subject');assert.equal(created.body,'Submitted version');
 assert.equal((await repo.detail(recruiter,created.id)).body,'Submitted version');
 await assert.rejects(repo.detail(outsider,created.id),{code:'FORBIDDEN'});
});
after(async()=>{if(connection)await connection.close();if(mongo)await mongo.stop();});

test('only the candidate and associated recruiter can open a submitted application',async()=>{
 assert.equal((await repo.owned(candidate,applicationId)).id,applicationId);
 assert.equal((await repo.owned(recruiter,applicationId)).id,applicationId);
 for(const principal of [otherCandidate,outsider])await assert.rejects(repo.owned(principal,applicationId),{code:'FORBIDDEN'});
 await assert.rejects(repo.owned(recruiter,draftId),{code:'FORBIDDEN'});
 assert.deepEqual((await repo.list(outsider)).map(row=>row.id),[]);
});

test('private CV bytes are scoped to the owner',async()=>{
 const files=new PrivateCvFiles(connection);
 const bytes=Buffer.from('%PDF-1.4 fictional test file');
 await files.put(candidate,cvId,bytes,'application/pdf');
 assert.deepEqual(await files.read(candidate,cvId),bytes);
 await assert.rejects(files.read(otherCandidate,cvId),{code:'NOT_FOUND'});
 await assert.rejects(files.read(recruiter,cvId),{code:'FORBIDDEN'});
});

test('candidate and recruiter notes remain private, and CV metadata excludes storage secrets',async()=>{
 await repo.addRecruiterNote(recruiter,applicationId,{text:'company private note'});
 await assert.rejects(repo.addRecruiterNote(outsider,applicationId,{text:'intrusion'}),{code:'FORBIDDEN'});
 await assert.rejects(repo.addRecruiterNote(candidate,applicationId,{text:'intrusion'}),{code:'FORBIDDEN'});
 const candidateView=await repo.detail(candidate,applicationId);
 const companyView=await repo.detail(recruiter,applicationId);
 assert.equal(candidateView.note,'candidate private note');
 assert.deepEqual(candidateView.recruiterNotes,[]);
 assert.equal(companyView.note,undefined);
 assert.equal(companyView.personal_note,undefined);
 assert.equal(companyView.recruiterNotes[0].text,'company private note');
 assert.deepEqual(Object.keys(companyView.cv).sort(),['file_size','id','mime_type','original_filename']);
 await assert.rejects(repo.detail(outsider,applicationId),{code:'FORBIDDEN'});
});

test('shortlisting requires the associated recruiter',async()=>{
 for(const status of ['PENDING','SHORTLISTED','INTERVIEW','ACCEPTED','REJECTED'])
  await assert.rejects(repo.transition(candidate,applicationId,{version:1,status},`candidate-${status}`),{code:'FORBIDDEN'});
 await assert.rejects(repo.transition(outsider,applicationId,{version:1,status:'SHORTLISTED'},'outsider-shortlist'),{code:'FORBIDDEN'});
 const updated=await repo.transition(recruiter,applicationId,{version:1,status:'SHORTLISTED'},'recruiter-shortlist');
 assert.equal(updated.status,'SHORTLISTED');
 assert.equal(updated.personal_note,undefined);
});
