// Disposable end-to-end workflow fixture. No Atlas or application environment files.
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
import mongoose from 'mongoose';
import {SignJWT} from 'jose';
import {chromium,expect} from '@playwright/test';
import {startMongoTestRuntime,stopOwnedChild,freePort} from './mongo-test-runtime.mjs';
import {PrivateCvFiles} from '../packages/data/dist/files.js';

const port=3042,base=`http://127.0.0.1:${port}`;
const appId='11111111-1111-4111-8111-111111111111',cvId='33333333-3333-4333-8333-333333333333';
const secret=randomBytes(40).toString('hex');
let mongo,db,web,browser;
await freePort(port);
try{
 mongo=await startMongoTestRuntime();
 db=await mongoose.createConnection(mongo.uri,{dbName:'smartapply'}).asPromise();
 const rows=[['candidate-a','candidat'],['company-a','entreprise'],['company-b','entreprise']];
 await db.db.collection('users').insertMany(rows.map(([id,role])=>({id,role,name:id,email:`${id}@example.test`,active:true})));
 await db.db.collection('sessions').insertMany(rows.map(([id])=>({id:`session-${id}`,user_id:id,revoked_at:null,expires_at:new Date(Date.now()+86400000).toISOString(),last_active_at:new Date().toISOString()})));
 await db.db.collection('companies').insertMany([{id:'company-a',name:'Fixture Company',status:'verified'},{id:'company-b',name:'Other Company',status:'verified'}]);
 await db.db.collection('jobs').insertMany([{id:'job-a',company_id:'company-a',title:'Fixture Engineer',description:'Fixture description',status:'published',created_at:new Date()},{id:'job-b',company_id:'company-a',title:'Fixture Designer',description:'Second fixture',status:'published',created_at:new Date()}]);
 await db.db.collection('candidate_cvs').insertOne({id:cvId,user_id:'candidate-a',original_filename:'fixture.pdf',mime_type:'application/pdf',file_size:12,status:'ready'});
 await new PrivateCvFiles(db).put({userId:'candidate-a',role:'candidate',emailVerified:true},cvId,Buffer.from('%PDF-1.4 fictional test file'),'application/pdf');
 await db.db.collection('applications').insertOne({id:appId,candidate_id:'candidate-a',company_id:'company-a',job_id:'job-a',cv_id:cvId,type:'JOB',status:'SENT',version:1,active:true,submitted_at:new Date(),history:[]});
 const env={...process.env,NODE_ENV:'development',MONGODB_URI:mongo.uri,MONGODB_DB:'smartapply',JWT_SECRET:secret,MODULE_NEXT_DIST_DIR:'.next-workflow-test',NEXT_TELEMETRY_DISABLED:'1'};
 web=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{env,stdio:'ignore',windowsHide:true});
 const deadline=Date.now()+150000;
 while(true){try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(3000)})).ok)break;}catch{}if(Date.now()>deadline)throw Error('Fixture web server did not start');await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 async function session(id,role,width=1440){
  const token=await new SignJWT({sid:`session-${id}`,role,email:`${id}@example.test`,name:id}).setProtectedHeader({alg:'HS256'}).setSubject(id).setExpirationTime('15m').sign(new TextEncoder().encode(secret));
  const context=await browser.newContext({baseURL:base,viewport:{width,height:950}});
  await context.addCookies([{name:'smartapply_access_token',value:token,url:base,httpOnly:true,sameSite:'Lax'}]);return context;
 }
 const candidate=await session('candidate-a','candidat'),recruiter=await session('company-a','entreprise'),outsider=await session('company-b','entreprise');
 const candidatePage=await candidate.newPage();await candidatePage.goto('/dashboard/candidate/applications');
 await candidatePage.getByRole('button',{name:/Fixture Engineer/}).click();
 await candidatePage.getByRole('button',{name:'CV',exact:true}).click();
 await candidatePage.getByTitle('CV soumis').waitFor();
 assert.equal((await candidate.request.get(`/api/applications/${appId}/cv`)).status(),200);
 assert.equal((await outsider.request.get(`/api/applications/${appId}/cv`)).status(),403);
 await candidatePage.getByRole('link',{name:"Offres d'emploi",exact:true}).click();await expect(candidatePage).toHaveURL(/\/jobs$/);await candidatePage.getByRole('link',{name:'Fixture Engineer'}).waitFor();await expect(candidatePage.getByRole('link',{name:"Offres d'emploi",exact:true})).toHaveAttribute('aria-current','page');
 await candidatePage.getByLabel('Rechercher un poste').fill('No such fixture');await candidatePage.getByRole('button',{name:'Rechercher',exact:true}).click();
 await candidatePage.getByText('Aucune offre pour ces critères.').waitFor();
 await candidatePage.goto('/jobs/job-b');await candidatePage.getByRole('button',{name:'Postuler maintenant'}).click();
 const dialog=candidatePage.getByRole('dialog',{name:'Postuler à cette offre'});
 await dialog.getByRole('button',{name:'Continuer →'}).click();
 await dialog.getByLabel('Votre CV').selectOption(cvId);
 await dialog.getByRole('button',{name:'Continuer →'}).click();await dialog.getByRole('button',{name:'Continuer →'}).click();
 await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Envoyer ma candidature'}).click();
 await dialog.getByRole('heading',{name:'Candidature envoyée !'}).waitFor();
 const page=await recruiter.newPage();await page.goto('/dashboard/company/applications');
 await page.getByRole('button',{name:/Fixture Engineer/}).click();
 await page.getByRole('button',{name:'Notes',exact:true}).click();
 await page.getByLabel('Note privée').fill('Unsent note for first applicant');
 await page.getByRole('button',{name:/Fixture Designer/}).click();await page.getByRole('button',{name:'Notes',exact:true}).click();
 assert.equal(await page.getByLabel('Note privée').inputValue(),'');
 await page.getByRole('button',{name:/Fixture Engineer/}).click();await page.getByRole('button',{name:'Notes',exact:true}).click();
 await page.getByLabel('Note privée').fill('Fixture private note');await page.getByRole('button',{name:'Ajouter une note'}).click();
 await page.getByText('Fixture private note',{exact:true}).waitFor();
 await page.getByRole('button',{name:/Présélectionner/}).click();
 await page.getByText(/Présélectionné/).first().waitFor();
 await page.getByRole('button',{name:'Planifier un entretien'}).click();
 await page.getByLabel('Date et heure').fill('2030-06-01T10:00');await page.getByLabel('Lien, adresse ou téléphone').fill('https://example.test/interview');
 await page.getByRole('button',{name:'Confirmer',exact:true}).click();
 await page.getByText(/Entretien ·/).waitFor();
 await candidatePage.goto('/dashboard/candidate/applications');await candidatePage.getByRole('button',{name:/Fixture Engineer/}).click();
 assert.equal(await candidatePage.getByText('Fixture private note',{exact:true}).count(),0);
 await candidatePage.getByRole('button',{name:'Gérer ma candidature et mes notes'}).click();
 const management=candidatePage.getByRole('dialog',{name:'Détail de la candidature'});
 await management.getByLabel('Note personnelle — invisible aux recruteurs').fill('Candidate private note');
 await management.getByRole('button',{name:'Enregistrer ma note'}).click();
 await expect(management.getByRole('button',{name:'Enregistrer ma note'})).toBeEnabled({timeout:60000});
 await management.getByRole('button',{name:'Fermer la fenêtre'}).click();
 await candidatePage.getByRole('button',{name:'Gérer ma candidature et mes notes'}).click();
 await expect(management.getByLabel('Note personnelle — invisible aux recruteurs')).toHaveValue('Candidate private note');
 await management.getByRole('button',{name:'Fermer la fenêtre'}).click();
 await candidatePage.goto(`/dashboard/messages?application=${appId}`);
 await candidatePage.getByLabel('Votre message').fill('Fixture message');await candidatePage.getByRole('button',{name:'Envoyer'}).click();
 await candidatePage.getByText('Fixture message',{exact:true}).waitFor();
 await page.goto(`/dashboard/messages?application=${appId}`);await page.getByText('Fixture message',{exact:true}).waitFor();
 await mkdir('output/workflow-review',{recursive:true});
 for(const width of [390,1440]){
  const view=await session('candidate-a','candidat',width),screen=await view.newPage();
  for(const [name,path] of [['jobs','/jobs'],['applications','/dashboard/candidate/applications'],['messages',`/dashboard/messages?application=${appId}`]]){
   await screen.goto(path);await screen.locator('main').first().waitFor();
   if(name==='messages')await screen.locator('.wf-bubble article').filter({hasText:'Fixture message'}).waitFor();
   if(name==='applications')await screen.getByRole('button',{name:/Fixture Engineer/}).waitFor();
   if(name==='applications')assert.equal(await screen.getByRole('link',{name:'Explorer les offres'}).evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
   await screen.screenshot({path:`output/workflow-review/${name}-${width}.png`,fullPage:true});
   assert.equal(await screen.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} overflow at ${width}px`);
  }
  await view.close();
 }
 console.log('Browser workflow passed: job search, application wizard, candidate/recruiter views, private CV access, note privacy, shortlist, messaging and viewport overflow.');
}finally{
 await browser?.close();stopOwnedChild(web);await db?.close();await mongo?.stop();
 // Next automatically appends its temporary type directory; preserve all other edits.
 const config=await readFile('tsconfig.json','utf8');
 const cleaned=config.replace(/,\s*"\.next-workflow-test\/types\/\*\*\/\*\.ts"/,'');
 if(cleaned!==config)await writeFile('tsconfig.json',cleaned);
}
