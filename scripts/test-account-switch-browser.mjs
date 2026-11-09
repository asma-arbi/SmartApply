// Same browser/tab, disposable database and signed fictional sessions only.
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import mongoose from 'mongoose';
import {SignJWT} from 'jose';
import {chromium,expect} from '@playwright/test';
import {startMongoTestRuntime,stopOwnedChild,freePort} from './mongo-test-runtime.mjs';
const port=3043,base=`http://127.0.0.1:${port}`,secret=randomBytes(40).toString('hex');
const appA='11111111-1111-4111-8111-111111111111',appB='22222222-2222-4222-8222-222222222222';
let mongo,db,web,browser;
await freePort(port);
try{
 mongo=await startMongoTestRuntime();db=await mongoose.createConnection(mongo.uri,{dbName:'smartapply'}).asPromise();
 const users=[['candidate-a','candidat','Candidate Alpha'],['candidate-b','candidat','Candidate Beta'],['company-a','entreprise','Company Alpha'],['company-b','entreprise','Company Beta']];
 await db.db.collection('users').insertMany(users.map(([id,role,name])=>({id,role,name,email:`${id}@example.test`,active:true})));
 await db.db.collection('sessions').insertMany(users.map(([id])=>({id:`session-${id}`,user_id:id,revoked_at:null,expires_at:new Date(Date.now()+86400000).toISOString(),last_active_at:new Date().toISOString()})));
 await db.db.collection('companies').insertMany([{id:'company-a',name:'Company Alpha',status:'verified'},{id:'company-b',name:'Company Beta',status:'verified'}]);
 await db.db.collection('jobs').insertMany([{id:'job-a',company_id:'company-a',title:'Role Alpha',status:'published'},{id:'job-b',company_id:'company-b',title:'Role Beta',status:'published'}]);
 await db.db.collection('applications').insertMany([{id:appA,candidate_id:'candidate-a',company_id:'company-a',job_id:'job-a',cv_id:'cv-a',status:'SENT',type:'JOB',submitted_at:new Date(),version:1},{id:appB,candidate_id:'candidate-b',company_id:'company-b',job_id:'job-b',cv_id:'cv-b',status:'SENT',type:'JOB',submitted_at:new Date(),version:1}]);
 await db.db.collection('conversations').insertMany([{id:'conv-a',application_id:appA},{id:'conv-b',application_id:appB}]);
 await db.db.collection('direct_messages').insertMany([{id:'message-a',conversation_id:'conv-a',sender_id:'candidate-a',body:'Private Alpha message',created_at:new Date(),read_at:null},{id:'message-b',conversation_id:'conv-b',sender_id:'candidate-b',body:'Private Beta message',created_at:new Date(),read_at:null}]);
 const env={...process.env,NODE_ENV:'development',MONGODB_URI:mongo.uri,MONGODB_DB:'smartapply',JWT_SECRET:secret,MODULE_NEXT_DIST_DIR:'.next-account-test',NEXT_TELEMETRY_DISABLED:'1'};
 web=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{env,stdio:'ignore',windowsHide:true});
 const deadline=Date.now()+150000;while(true){try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(3000)})).ok)break;}catch{}if(Date.now()>deadline)throw Error('Fixture web server did not start');await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({baseURL:base});const page=await context.newPage();
 async function switchTo(id){const user=users.find(row=>row[0]===id);const token=await new SignJWT({sid:`session-${id}`,role:user[1],email:`${id}@example.test`,name:user[2]}).setProtectedHeader({alg:'HS256'}).setSubject(id).setExpirationTime('15m').sign(new TextEncoder().encode(secret));await context.clearCookies();await context.addCookies([{name:'smartapply_access_token',value:token,url:base,httpOnly:true,sameSite:'Lax'}]);}
 async function verify(id,path,application,own,other,roleLabel){
  await switchTo(id);await page.goto(path);await expect(page.getByText(roleLabel,{exact:true}).first()).toBeVisible();
  const header=page.locator('header').first();
  await expect(header.getByText(users.find(row=>row[0]===id)[2],{exact:true})).toBeVisible();
  await expect(header.getByText(id==='company-a'?'Candidate Beta':'Company Alpha',{exact:true})).toHaveCount(0);
  await page.goto(id==='company-a'?'/dashboard/candidate':'/dashboard/company');await expect(page).toHaveURL(/access-denied/);
  await page.goto(path);await expect(page).toHaveURL(new RegExp(path+'$'));
  await page.goto(`/dashboard/messages?application=${application}`);await expect(page.locator('.wf-bubble article').filter({hasText:own})).toBeVisible();
  await expect(page.getByText(other,{exact:false})).toHaveCount(0);
 }
 await verify('company-a','/dashboard/company',appA,'Private Alpha message','Private Beta message','Entreprise');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await verify('candidate-b','/dashboard/candidate',appB,'Private Beta message','Private Alpha message','Candidat');
 await verify('company-a','/dashboard/company',appA,'Private Alpha message','Private Beta message','Entreprise');
 await verify('candidate-b','/dashboard/candidate',appB,'Private Beta message','Private Alpha message','Candidat');
 const cached=await page.evaluate(async()=>{const names=await caches.keys();const entries=[];for(const name of names){const cache=await caches.open(name);for(const request of await cache.keys())entries.push(new URL(request.url).pathname);}return entries;});
 assert(cached.every(path=>['/offline.html','/manifest.json','/icon-192.png','/icon-512.png'].includes(path)));
 console.log('Same browser account switches passed in both directions with active service worker; private pages were not cached.');
}finally{
 await browser?.close();stopOwnedChild(web);await db?.close();await mongo?.stop();
 const config=await readFile('tsconfig.json','utf8');const cleaned=config.replace(/,\s*"\.next-account-test\/types\/\*\*\/\*\.ts"/,'');if(cleaned!==config)await writeFile('tsconfig.json',cleaned);
}
