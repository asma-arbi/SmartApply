// Real React/Edge with fake API and action responses. No real accounts or AI provider.
const http=require('node:http');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
async function main(){
 const api=`
 const scenario=new URLSearchParams(location.search).get('scenario');window.testCalls=[];let generation=0,polls=0;
 const match={id:'job-1',companyName:'Entreprise Exemple',title:'Développeur React',skills:['React'],location:'Tunis',contract:'Stage',workMode:'hybrid',score:50,matchedCount:1,totalCriteria:2,saved:false,publishedAt:'2026-11-01T00:00:00Z',criteria:[{criterion:'React',jobEvidence:'Expérience React',cvEvidence:'Projet React confirmé',matched:true},{criterion:'Docker',jobEvidence:'Connaissance Docker',cvEvidence:null,matched:false}]};
 const result={matches:[match],totalOffers:1,analyzedOffers:1,generatedAt:'2026-11-01T00:00:00Z',cvId:'cv-two'};
 export async function api(path,method='GET',body,key){window.testCalls.push({path,method,body,key});
  if(path==='cvs')return scenario==='empty'?[]:[{id:'cv-one',original_filename:'primary.pdf',is_primary:true},{id:'cv-two',original_filename:'selected.pdf',is_primary:false}];
  if(path==='matching/cv-one'&&method==='GET')return null;
  if(path==='matching/cv-two'&&method==='GET'){if(scenario==='late-latest')await new Promise(resolve=>setTimeout(resolve,2500));return {id:'old',status:'completed',result};}
  if(path==='cvs/cv-two/analysis/preview')return {sourceHash:'b'.repeat(64),text:'Texte du CV sélectionné : projet React documenté et travail collaboratif sur des applications web accessibles avec une équipe.'};
  if(path==='matching/cv-two'&&method==='POST'){generation++;return {id:scenario==='poll-error'?'job-recover':'job-'+generation,status:'queued'};}
  if(path==='ai-jobs/job-recover'){polls++;if(polls===1)throw Error('Panne réseau fictive');return {id:'job-recover',status:'completed',result};}
  if(path==='ai-jobs/job-1'&&scenario==='late-latest')return {id:'job-1',status:'completed',result:{...result,matches:[{...match,title:'Correspondance fraîche'}]}};
  if(path==='ai-jobs/job-1')return {id:'job-1',status:'failed',error_message:'Erreur IA fictive, résultats antérieurs conservés.'};
  if(path==='ai-jobs/job-2')return {id:'job-2',status:'completed',result};
  throw Error('Unexpected mock '+method+' '+path);
 }
 `;
 const mocks={api,link:`import React from 'react';export default function Link({href,children,...rest}){return React.createElement('a',{href,...rest},children)}`,
 job:`export async function saveOffer(id,saved){window.testCalls.push({path:'saveOffer',id,saved});return {ok:true,data:{saved}}}`};
 const built=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {MatchingPage} from './cv-module/components/matching';createRoot(document.getElementById('root')).render(<MatchingPage/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'matching-harness.js',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixtures',setup(build){
  build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/api$/},()=>({path:'api',namespace:'fixture'}));
  build.onResolve({filter:/actions\/jobActions$/},()=>({path:'job',namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js',resolveDir:process.cwd()}));
 }}]});
 const js=built.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=built.outputFiles.find(f=>f.path.endsWith('.css'))?.contents||'';
 const server=http.createServer((req,res)=>{const url=req.url.split('?')[0];res.setHeader('Content-Type',url==='/bundle.js'?'text/javascript':url==='/bundle.css'?'text/css':'text/html');res.end(url==='/bundle.js'?js:url==='/bundle.css'?css:'<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}button,input,select,textarea{font:inherit}</style><link rel="stylesheet" href="/bundle.css"><div id="root"></div><script src="/bundle.js"></script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const base=`http://127.0.0.1:${server.address().port}`;
  const empty=await browser.newPage();await empty.goto(base+'/?scenario=empty');await empty.getByRole('link',{name:/Ajouter mon CV/}).waitFor();await empty.close();
  const failedPoll=await browser.newPage();await failedPoll.goto(base+'/?scenario=poll-error');await failedPoll.getByLabel('CV sélectionné').selectOption('cv-two');await failedPoll.getByRole('heading',{name:'Développeur React'}).waitFor();
  await failedPoll.getByRole('button',{name:'Préparer le texte du CV'}).click();await failedPoll.getByLabel('Je confirme ce texte et autorise son analyse par l’IA pour rechercher des offres.').check();await failedPoll.getByRole('button',{name:'Trouver mes correspondances'}).click();
  await failedPoll.getByText('Panne réseau fictive').waitFor();assert.equal(await failedPoll.getByLabel('CV sélectionné').isEnabled(),true);await failedPoll.getByRole('heading',{name:'Développeur React'}).waitFor();
  await failedPoll.getByRole('button',{name:'Trouver mes correspondances'}).click();await failedPoll.waitForFunction(()=>window.testCalls.filter(c=>c.path==='ai-jobs/job-recover').length===2);await failedPoll.close();
  const late=await browser.newPage();await late.goto(base+'/?scenario=late-latest');await late.getByLabel('CV sélectionné').selectOption('cv-two');await late.getByRole('button',{name:'Préparer le texte du CV'}).click();await late.getByLabel('Je confirme ce texte et autorise son analyse par l’IA pour rechercher des offres.').check();await late.getByRole('button',{name:'Trouver mes correspondances'}).click();await late.getByRole('heading',{name:'Correspondance fraîche'}).waitFor();await late.waitForTimeout(3000);assert.equal(await late.getByRole('heading',{name:'Développeur React'}).count(),0);await late.close();
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.getByLabel('CV sélectionné').selectOption('cv-two');await page.getByRole('heading',{name:'Développeur React'}).waitFor();
  await page.getByText('Pourquoi cette offre ?').click();await page.getByText(/Projet React confirmé/).waitFor();await page.getByText('Non documenté dans le CV sélectionné.').waitFor();
  await page.getByRole('button',{name:'Enregistrer cette offre'}).click();await page.getByRole('button',{name:'Favoris',exact:true}).click();await page.getByRole('heading',{name:'Développeur React'}).waitFor();
  await page.getByLabel('Rechercher une correspondance').fill('introuvable');await page.getByRole('heading',{name:'Aucune correspondance pour ces critères'}).waitFor();await page.getByLabel('Rechercher une correspondance').fill('');
  await page.getByRole('button',{name:'Recommandations IA'}).click();await page.getByLabel('Localisation').selectOption('Tunis');await page.getByLabel('Couverture minimum').selectOption('75');await page.getByRole('heading',{name:'Aucune correspondance pour ces critères'}).waitFor();await page.getByLabel('Couverture minimum').selectOption('0');
  await page.getByRole('button',{name:'Préparer le texte du CV'}).click();await page.getByLabel('Je confirme ce texte et autorise son analyse par l’IA pour rechercher des offres.').check();await page.getByRole('button',{name:'Trouver mes correspondances'}).click();
  await page.getByText('Erreur IA fictive, résultats antérieurs conservés.').waitFor();await page.getByRole('heading',{name:'Développeur React'}).waitFor();
  await page.getByRole('button',{name:'Trouver mes correspondances'}).click();await page.waitForFunction(()=>window.testCalls.filter(c=>c.path==='matching/cv-two'&&c.method==='POST').length===2);
  const calls=await page.evaluate(()=>window.testCalls.filter(c=>c.path==='matching/cv-two'&&c.method==='POST'));assert.equal(calls[0].body.sourceHash,'b'.repeat(64));assert.match(calls[0].body.approvedText,/CV sélectionné/);assert.equal(calls[0].body.consent,true);assert.notEqual(calls[0].key,calls[1].key);
  await fs.mkdir('output/matching-review',{recursive:true});for(const width of [390,1440]){await page.setViewportSize({width,height:950});await page.screenshot({path:`output/matching-review/matching-${width}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);}
  assert.deepEqual(errors,[]);console.log('Matching UI passed: CV selection, consent, evidence, filters, favorites, failed refresh preservation, retry and responsive overflow.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
