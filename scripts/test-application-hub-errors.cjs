// Real React/Edge with mocked Server Actions; no external services or data.
const http=require('node:http');
const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
async function main(){
 const actions=`
 const scenario=new URLSearchParams(location.search).get('scenario');let lists=0,reads=0;
 const row={id:'application-1',candidate_name:'Candidate Fixture',company_name:'Company Fixture',job_title:'Fixture Role',status:'SENT',version:1,submitted_at:'2026-11-01T12:00:00Z'};
 const second={...row,id:'application-2',candidate_name:'Candidate Second',job_title:'Second Role'};
 const detail={...row,candidate:{name:'Candidate Fixture',email:'fixture@example.test',profile:{}},history:[],answers:{},recruiterNotes:[]};
 export async function listApplications(){lists++;if(scenario==='list-undefined'&&lists===1)return undefined;return {ok:true,data:scenario==='stale-selection'?[row,second]:[row]};}
 export async function readApplication(id){reads++;if(reads===1&&scenario==='read-undefined')return undefined;if(reads===1&&scenario==='read-rejection')throw Error('fixture rejected');if(scenario==='stale-selection'&&id==='application-1')await new Promise(resolve=>setTimeout(resolve,800));return {ok:true,data:id==='application-2'?{...detail,...second,candidate:{...detail.candidate,name:'Candidate Second'}}:detail};}
 export async function transitionApplication(){return undefined;}
 export async function addRecruiterNote(){return undefined;}
 export async function scheduleInterview(){return undefined;}
 `;
 const mocks={actions,link:`import React from 'react';export default function Link({href,children,...rest}){return React.createElement('a',{href,...rest},children)}`,
 navigation:`export function useSearchParams(){return new URLSearchParams(location.search)}`,
 api:`export const statusLabels={DRAFT:'Brouillon',SENT:'Envoyée',PENDING:'En revue',SHORTLISTED:'Présélectionnée',INTERVIEW:'Entretien',REJECTED:'Refusée'};`,
 applications:`export function ApplicationDetail(){return null}`};
 const built=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {ApplicationHub} from './cv-module/components/application-hub';createRoot(document.getElementById('root')).render(<ApplicationHub recruiter/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixtures',setup(build){
  build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));
  build.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
  build.onResolve({filter:/actions\/applicationActions$/},()=>({path:'actions',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/api$/},()=>({path:'api',namespace:'fixture'}));
  build.onResolve({filter:/^\.\/applications$/},()=>({path:'applications',namespace:'fixture'}));
  build.onResolve({filter:/\.css$/},()=>({path:'style',namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path]||'',loader:'js',resolveDir:process.cwd()}));
 }}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?built.outputFiles[0].contents:'<!doctype html><div id="root"></div><script src="/bundle.js"></script>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const base=`http://127.0.0.1:${server.address().port}`;
  for(const scenario of ['list-undefined','read-undefined','read-rejection','mutation-undefined','stale-selection']){
   const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`${base}/?scenario=${scenario}`);
   if(scenario==='list-undefined'){
    await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Chargement…',{exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Recharger la page'}).count(),1);
    await page.getByRole('alert').getByRole('button',{name:'Actualiser'}).click();
   }
   await page.getByRole('button',{name:/Candidate Fixture/}).click();
   if(scenario==='stale-selection'){
    await page.getByRole('button',{name:/Candidate Second/}).click();
    await page.getByRole('heading',{name:'Candidate Second',exact:true}).waitFor();
    await page.waitForTimeout(1100);assert.equal(await page.getByRole('heading',{name:'Candidate Fixture',exact:true}).count(),0);
    assert.deepEqual(errors,[]);await page.close();continue;
   }
   if(scenario==='read-undefined'||scenario==='read-rejection'){
    await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Chargement du dossier…').count(),0);
    await page.getByRole('button',{name:/réessayer|actualiser/i}).first().click();
   }
   await page.getByRole('heading',{name:'Candidate Fixture',exact:true}).waitFor();
   if(scenario==='mutation-undefined'){
    await page.getByRole('button',{name:/Présélectionner/}).click();await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button',{name:/Présélectionner/}).isEnabled(),true);
   }
   assert.deepEqual(errors,[],`${scenario}: uncaught browser errors`);await page.close();
  }
  console.log('Application hub handles undefined/rejected list, detail and mutation responses; retry succeeds.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
