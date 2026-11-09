// Real React/browser UI with explicitly mocked Server Actions. Never connects to Atlas.
const fs=require('node:fs/promises');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
async function main(){
 const out=path.resolve('output/posts-review');await fs.mkdir(out,{recursive:true});
 const mocks=`
 const role=new URLSearchParams(location.search).get('role')||'candidate';
 const post={id:'fixture-post',author_name:'Amira Ben Ali',author_id:'fixture-user',company_name:null,category:'Conseil carrière',title:'Construire son avenir professionnel',content:'Un projet, une rencontre, une nouvelle compétence : chaque expérience compte. Partageons nos conseils pour préparer les prochaines étapes de notre parcours.',published_at:'2026-11-08T10:00:00Z',post_kind:'POLL',visibility:'public',comments_enabled:true,tags:['carriere','stage'],likes:12,comments:1,saved:false,poll:{options:['Un stage en entreprise','Un projet personnel'],closes_at:'2099-12-01'},poll_results:{counts:{0:3,1:2},total:5,myOption:null}};
 window.calls=[];const ok=data=>({ok:true,data});
 export async function postsViewer(){return ok({role,name:role==='recruiter'?'Entreprise SmartApply':'Amira'});}
 export async function listPosts(filters={}){return ok(new URLSearchParams(location.search).has('empty')||filters.saved&&!post.saved?[]:[post]);}
 export async function listMine(){return ok([]);}
 export async function listJobs(){return ok(role==='recruiter'?[{id:'owned-job',title:'Développeur web',city:'Tunis'}]:[]);}
 export async function getComments(){return ok([{id:'comment',user_name:'Yassine',content:'Merci pour ces conseils !',can_manage:true,created_at:'2026-11-08'}]);}
 export async function postInteraction(id,kind,value){window.calls.push({id,kind,value});if(kind==='save')post.saved=!post.saved;return ok(true);}
 export async function savePost(input,id){window.calls.push({input,id});return ok('created-post');}
 export async function commentAction(id,action,value){window.calls.push({id,action,value});return ok(true);}export async function archivePost(){return ok(true);}export async function deletePost(){return ok(true);}export async function managePost(){return ok(true);}export async function uploadPostMedia(){return ok('/api/posts/media/000000000000000000000001');}
 `;
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {PostsFeed} from './cv-module/components/posts';import {CompanyPosts} from './cv-module/components/company-posts';window.WebSocket=class{close(){}};createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).has('workspace')?<CompanyPosts/>:<PostsFeed/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'browser',jsx:'automatic',outfile:path.join(out,'harness.js'),define:{'process.env.NEXT_PUBLIC_POSTS_WS_URL':'""','process.env.NEXT_PUBLIC_POSTS_WS_PORT':'"4300"','process.env.NODE_ENV':'"development"'},plugins:[{name:'mock-server-actions',setup(build){build.onResolve({filter:/actions\/postActions$/},()=>({path:'actions',namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mocks,loader:'js'}));}}]});
 const css=(await fs.readFile('cv-module/module.css','utf8')).replace(/@import[^;]+;/g,'');
 await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;font-family:Arial,sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}button{background:transparent;border:0}h1,h2,h3,p{margin:0 0 10px}${css}.posts-workspace{padding:24px;max-width:1250px;margin:auto}</style><div id="root"></div><script src="/harness.js"></script></html>`);
 const server=http.createServer(async(req,res)=>{try{res.setHeader('Content-Type',req.url.startsWith('/harness.js')?'text/javascript':'text/html');res.end(await fs.readFile(path.join(out,req.url.startsWith('/harness.js')?'harness.js':'index.html')));}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}`;
 await page.goto(url);await page.getByRole('button',{name:'Commencer un post'}).waitFor();await page.getByText('Construire son avenir professionnel',{exact:true}).waitFor();
 await page.screenshot({path:path.join(out,'feed-desktop.png'),fullPage:true});
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Feed overflow at ${width}`);}
 await page.getByRole('button',{name:'Commencer un post'}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 assert.equal(await dialog.getByRole('button',{name:'Offre détaillée',exact:true}).count(),0,'Candidate must not see company job composer');
 await dialog.getByLabel('Contenu',{exact:true}).fill('Mon premier conseil professionnel pour la communauté.');
 await dialog.getByRole('button',{name:'Sondage',exact:true}).click();await dialog.getByLabel('Option 1',{exact:true}).fill('Oui');await dialog.getByLabel('Option 2',{exact:true}).fill('Non');
 await dialog.getByRole('button',{name:'Ajouter une option'}).click();await dialog.getByLabel('Option 3',{exact:true}).fill('Peut-être');await dialog.getByRole('button',{name:'Retirer la dernière option'}).click();
 await dialog.getByRole('button',{name:'Paramètres',exact:true}).click();await dialog.getByLabel('Publication',{exact:true}).selectOption('draft');
 await dialog.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await dialog.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>window.calls.find(c=>c.input)?.input.pollOptions.length),2);
 await page.getByRole('button',{name:'☏ Commenter',exact:true}).click();await page.getByRole('button',{name:'Répondre',exact:true}).click();await page.getByLabel('Votre commentaire').fill('Une réponse de test.');await page.getByRole('button',{name:'Envoyer',exact:true}).click();await page.getByRole('button',{name:'Un stage en entreprise',exact:false}).click();assert.equal(await page.evaluate(()=>window.calls.some(c=>c.kind==='vote')),true);
 await page.goto(url+'?role=recruiter');await page.getByText('Faites rayonner votre entreprise.',{exact:true}).waitFor();await page.getByText('Construire son avenir professionnel',{exact:true}).waitFor();await page.screenshot({path:path.join(out,'company-feed-redesign.png'),fullPage:true});await page.getByRole('button',{name:'Commencer un post'}).click();await dialog.getByRole('button',{name:'Offre détaillée',exact:true}).click();await dialog.getByLabel('Offre publiée de votre entreprise').selectOption('owned-job');await dialog.getByLabel('Métier',{exact:true}).fill('Développeur');
 await dialog.getByRole('button',{name:'Contenu',exact:true}).click();await dialog.getByLabel('Contenu',{exact:true}).fill('Nous recrutons un développeur web pour notre équipe.');await dialog.getByRole('button',{name:'Paramètres',exact:true}).click();
 assert.equal(await dialog.getByLabel('Publier en tant que').inputValue(),'company');await dialog.getByLabel('Publication',{exact:true}).selectOption('scheduled');await dialog.getByLabel('Date de publication',{exact:true}).fill('2099-12-01T10:30');
 await page.setViewportSize({width:390,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Composer mobile overflow');await page.screenshot({path:path.join(out,'company-composer-mobile.png'),fullPage:true});
 await dialog.getByRole('button',{name:'Programmer',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const submitted=await page.evaluate(()=>window.calls.find(c=>c.input)?.input);assert.equal(submitted.jobId,'owned-job');assert.equal(submitted.status,'scheduled');assert.deepEqual(submitted.pollOptions,[]);
 await page.getByRole('button',{name:'Commencer un post'}).click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.goto(url+'?role=recruiter&workspace=1');await page.getByRole('heading',{name:'Publications de l’entreprise'}).waitFor();await page.getByRole('button',{name:'Créer une publication',exact:true}).click();await dialog.getByRole('button',{name:'Offre détaillée',exact:true}).waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.getByRole('button',{name:'Brouillons · 0',exact:true}).click();await page.getByText('Aucune publication dans cette vue',{exact:true}).waitFor();await page.goto(url+'?role=recruiter&empty=1');await page.getByText('Aucune publication pour le moment',{exact:true}).waitFor();for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Enterprise feed overflow');}await page.screenshot({path:path.join(out,'company-feed-empty.png'),fullPage:true});await page.getByText('Affiner les résultats',{exact:false}).click();await page.getByLabel('Entreprise',{exact:true}).fill('Entreprise test');assert.deepEqual(errors,[]);
 console.log('Posts UI passed: candidate/company forms, poll options/vote, draft/schedule, modal dismissal, responsive 320/390/768/1440. Mocked actions; no DB/session integration claim.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
