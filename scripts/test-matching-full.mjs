// Real Next + Nest + GridFS; fake AI and fictional identities, isolated local Mongo only.
import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import mongoose from 'mongoose';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {SignJWT} from 'jose';
import {chromium,expect} from '@playwright/test';
import {PrivateCvFiles} from '../packages/data/dist/files.js';
import {startMongoTestRuntime,stopOwnedChild,freePort} from './mongo-test-runtime.mjs';
const webPort=3044,apiPort=4344,base=`http://127.0.0.1:${webPort}`,secret=randomBytes(40).toString('hex');
const cvId='11111111-1111-4111-8111-111111111111',userId='fictional-candidate';
let mongo,db,web,browser,app,studio;
await freePort(webPort);await freePort(apiPort);
try{
 mongo=await startMongoTestRuntime();db=await mongoose.createConnection(mongo.uri,{dbName:'smartapply'}).asPromise();
 await db.db.collection('users').insertMany([{id:userId,role:'candidat',name:'Candidate Fixture',email:'candidate@example.test',active:true},{id:'fictional-company',role:'entreprise',name:'Company Fixture',email:'company@example.test',active:true}]);
 await db.db.collection('sessions').insertOne({id:'fixture-session',user_id:userId,revoked_at:null,expires_at:new Date(Date.now()+86400000).toISOString(),last_active_at:new Date().toISOString()});
 await db.db.collection('companies').insertOne({id:'fictional-company',name:'Company Fixture',status:'verified'});
 await db.db.collection('jobs').insertOne({id:'fictional-job',company_id:'fictional-company',status:'published',title:'Developpeur React',description:'Experience React requise. Connaissance Docker souhaitee.',skills:['React','Docker'],location:'Tunis',type:'Stage',created_at:new Date()});
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),sheet=pdf.addPage();
 sheet.drawText('Experience React et JavaScript sur un projet web accessible. Travail en equipe, documentation et tests pour une application professionnelle.',{x:40,y:720,size:10,font,maxWidth:500});
 const bytes=Buffer.from(await pdf.save()),hash=createHash('sha256').update(bytes).digest('hex'),now=new Date().toISOString();
 await db.db.collection('candidate_cvs').insertOne({id:cvId,user_id:userId,original_filename:'Fictional-CV.pdf',storage_path:cvId,mime_type:'application/pdf',file_size:bytes.length,file_hash:hash,is_primary:true,status:'ready',created_at:now,updated_at:now});
 await new PrivateCvFiles(db).put({userId,role:'candidate',emailVerified:true},cvId,bytes,'application/pdf');
 let aiCalls=0;const ai={available:true,model:'fictional-test-model',async extract(){throw Error('unused');},async letter(){throw Error('unused');},async match(reviewedCv,offers){aiCalls++;assert.match(reviewedCv,/Experience React et JavaScript/);assert.deepEqual(offers.map(o=>o.id),['fictional-job']);return {matches:[{jobId:'fictional-job',requirements:[{criterion:'React',jobEvidence:'Experience React requise',cvEvidence:'Experience React et JavaScript'},{criterion:'Docker',jobEvidence:'Connaissance Docker souhaitee',cvEvidence:null}]}]};}};
 Object.assign(process.env,{NODE_ENV:'development',MODULE_AUTH_PROVIDER:'asma',JWT_SECRET:secret,FRONTEND_ORIGINS:base,MODULE_PUBLIC_API_PREFIX:'/api/cv-module'});
 const {MongoStudioService}=await import('../backend/dist/mongo/studio.js'),{MongoRuntime,createMongoApp}=await import('../backend/dist/mongo/app.js');
 studio=new MongoStudioService(db,ai);app=await createMongoApp(new MongoRuntime(db,studio));await app.listen(apiPort,'127.0.0.1');studio.startWorker();
 const env={...process.env,MONGODB_URI:mongo.uri,MONGODB_DB:'smartapply',CV_MODULE_BACKEND_URL:`http://127.0.0.1:${apiPort}`,MODULE_NEXT_DIST_DIR:'.next-matching-test',NEXT_TELEMETRY_DISABLED:'1'};
 web=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(webPort)],{env,stdio:'ignore',windowsHide:true});
 const deadline=Date.now()+150000;while(true){try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(3000)})).ok)break;}catch{}if(Date.now()>deadline)throw Error('Fixture web server did not start');await new Promise(r=>setTimeout(r,500));}
 const token=await new SignJWT({sid:'fixture-session',role:'candidat',email:'candidate@example.test',name:'Candidate Fixture'}).setProtectedHeader({alg:'HS256'}).setSubject(userId).setExpirationTime('15m').sign(new TextEncoder().encode(secret));
 browser=await chromium.launch({channel:'msedge',headless:true});
 async function context(width){const c=await browser.newContext({baseURL:base,viewport:{width,height:950}});await c.addCookies([{name:'smartapply_access_token',value:token,url:base,httpOnly:true,sameSite:'Lax'}]);return c;}
 const desktop=await context(1440),page=await desktop.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/dashboard/candidate');await page.getByRole('link',{name:'Matching IA',exact:true}).click();await expect(page).toHaveURL(/dashboard\/candidate\/matching$/,{timeout:60000});
 await expect(page.getByLabel('CV sélectionné')).toHaveValue(cvId);
 await page.getByRole('button',{name:'Préparer le texte du CV'}).click();await expect(page.getByLabel('Texte du CV pour le matching')).toHaveValue(/Experience React/);
 const box=await page.locator('.match-consent input').boundingBox();assert(box.width<=24&&box.height<=24,'Consent checkbox should remain compact');
 assert.equal(await page.locator('.match-consent').evaluate(element=>getComputedStyle(element).display),'flex');
 await page.getByLabel('Je confirme ce texte et autorise son analyse par l’IA pour rechercher des offres.').check();await page.getByRole('button',{name:'Trouver mes correspondances'}).click();
 await page.getByRole('heading',{name:'Developpeur React',exact:true}).waitFor({timeout:60000});await page.getByText('Pourquoi cette offre ?').click();
 await page.getByText(/Experience React et JavaScript/).first().waitFor();await page.getByText('Non documenté dans le CV sélectionné.').waitFor();
 await page.getByRole('button',{name:'Enregistrer cette offre'}).click();await expect(page.getByRole('button',{name:'Retirer des favoris'})).toBeVisible();
 assert.equal(await db.db.collection('saved_jobs').countDocuments({user_id:userId,job_id:'fictional-job'}),1);assert.equal(aiCalls,1);
 const job=await db.db.collection('candidate_ai_jobs').findOne({user_id:userId,kind:'matching',status:'completed'});assert.equal(job.result.matches[0].score,50);assert.equal(job.result.matches[0].id,'fictional-job');
 await mkdir('output/matching-review',{recursive:true});
 const searchBox=await page.getByLabel('Rechercher une correspondance').boundingBox(),locationBox=await page.getByLabel('Localisation').boundingBox();assert(Math.abs(searchBox.y-locationBox.y)<20,'Desktop filters should share a row');
 await page.screenshot({path:'output/matching-review/full-desktop-results.png',fullPage:true});await page.locator('main').evaluate(element=>{element.scrollTop=0;});await page.screenshot({path:'output/matching-review/full-desktop.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const mobile=await context(390),mobilePage=await mobile.newPage();await mobilePage.goto('/dashboard/candidate/matching');await mobilePage.getByRole('heading',{name:'Developpeur React',exact:true}).waitFor({timeout:60000});
 await mobilePage.locator('main').evaluate(element=>{element.scrollTop=0;});await mobilePage.screenshot({path:'output/matching-review/full-mobile.png',fullPage:true});await mobilePage.getByRole('heading',{name:'Developpeur React',exact:true}).scrollIntoViewIfNeeded();await mobilePage.screenshot({path:'output/matching-review/full-mobile-results.png',fullPage:true});assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);await mobile.close();await desktop.close();console.log('Full matching workflow passed: real shell, private CV preview, Nest matching, persisted evidence and favorite, mobile/desktop.');
}finally{
 await browser?.close();stopOwnedChild(web);studio?.onModuleDestroy();await app?.close();await db?.close();await mongo?.stop();
 const config=await readFile('tsconfig.json','utf8');const cleaned=config.replace(/,\s*"\.next-matching-test\/types\/\*\*\/\*\.ts"/,'');if(cleaned!==config)await writeFile('tsconfig.json',cleaned);
}
