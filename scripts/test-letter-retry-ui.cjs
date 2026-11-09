// Real React/browser interaction with a fake API. No external accounts, AI calls or database.
const http=require('node:http');
const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
async function main(){
 const mock=`
 const cvId='11111111-1111-4111-8111-111111111111';
 const letter={id:'letter-fixture',title:'Développeur web',language:'fr',company:'',role:'Développeur web',job_description:'',tone:'professional',emphasis:'',subject:'Ancien objet',body:'Brouillon original conservé.',source:'manual',version:1,cv_id:cvId,updated_at:new Date().toISOString()};
 window.testCalls=[];
 export async function api(path,method='GET',body,key){
  if(path==='letters')return [letter];if(path==='letters/letter-fixture'&&method==='GET')return letter;
  if(path==='letters/letter-fixture/versions')return [];
  if(path==='cvs')return [{id:cvId,original_filename:'selected.pdf'}];
  if(path==='cvs/'+cvId+'/analysis/preview')return {sourceHash:'a'.repeat(64),text:'CV vérifié : projet JavaScript et TypeScript documenté, expérience collaborative et communication claire avec une équipe professionnelle.'};
  if(path==='letters/letter-fixture/generate'){window.testCalls.push({key,body});return {id:'job-'+window.testCalls.length,status:'queued'};}
  if(path==='ai-jobs/job-1')return {id:'job-1',status:'failed',error_message:'Test : génération échouée.'};
  if(path==='ai-jobs/job-2')return {id:'job-2',status:'completed',result:{...letter,version:2,source:'ai',body:'Nouvelle lettre générée après correction.'}};
  throw Error('Unexpected mocked path '+path);
 }
 `;
 const built=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {Letters} from './cv-module/components/letters';createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><Letters initialId="letter-fixture" onDirty={()=>{}}/></QueryClientProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixture-api',setup(build){build.onResolve({filter:/^\.\/api$/},()=>({path:'api',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:mock,loader:'js'}));}}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?built.outputFiles[0].contents:'<!doctype html><div id="root"></div><script src="/bundle.js"></script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:'Préparer le texte du CV'}).click();
  await page.getByLabel('Je confirme le texte du CV, mon profil et les informations complémentaires, et autorise leur traitement IA.').check();
  const generate=page.getByRole('button',{name:'Générer avec l’IA'});await generate.click();
  await page.getByText('Test : génération échouée.').waitFor();
  assert.equal(await page.getByLabel('Texte de la lettre').inputValue(),'Brouillon original conservé.');
  await generate.click();await page.getByLabel('Texte de la lettre').waitFor();
  await page.waitForFunction(()=>document.querySelector('textarea.letter-paper')?.value==='Nouvelle lettre générée après correction.');
  const calls=await page.evaluate(()=>window.testCalls);assert.equal(calls.length,2);assert.notEqual(calls[0].key,calls[1].key);assert.deepEqual(calls[0].body,calls[1].body);
  console.log('Letter retry UI passed: failed draft preserved and retry used a fresh idempotency key.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
