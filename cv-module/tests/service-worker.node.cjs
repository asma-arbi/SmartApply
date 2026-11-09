// Isolated service worker tests: no browser state, network, or real accounts.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const vm=require('node:vm');

function worker(){
 const handlers={},stores=new Map(),calls=[];let offline=false;
 const key=x=>typeof x==='string'?new URL(x,'https://fixture.test').href:x.url;
 function store(name){if(!stores.has(name))stores.set(name,new Map());const rows=stores.get(name);return {
  async addAll(paths){for(const path of paths){calls.push(['add',key(path)]);rows.set(key(path),new Response(path==='/offline.html'?'GENERIC OFFLINE':'STATIC'));}},
  async match(req){calls.push(['match',key(req)]);return rows.get(key(req))?.clone();},
  async put(req,response){calls.push(['put',key(req)]);rows.set(key(req),response.clone());}
 };}
 const caches={async open(name){return store(name);},async keys(){return [...stores.keys()];},async delete(name){calls.push(['delete',name]);return stores.delete(name);},async match(req){calls.push(['match',key(req)]);for(const rows of stores.values())if(rows.has(key(req)))return rows.get(key(req)).clone();}};
 const self={location:{origin:'https://fixture.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn};
 const network=async()=>{if(offline)throw Error('offline');return new Response('NETWORK CURRENT USER');};
 vm.runInNewContext(readFileSync(process.env.SW_TEST_SOURCE||resolve(__dirname,'../../public/sw.js'),'utf8'),{self,caches,fetch:network,URL,Request,Response,Headers,Promise,console});
 async function lifecycle(name){let promise;handlers[name]({waitUntil(p){promise=p;}});await promise;}
 async function request(path,{mode='cors',headers={}}={}){let response;const req={url:new URL(path,self.location.origin).href,method:'GET',mode,headers:new Headers(headers)};handlers.fetch({request:req,respondWith(p){response=Promise.resolve(p);},waitUntil(){}});return response;}
 return {stores,calls,lifecycle,request,setOffline(value){offline=value;}};
}

test('installation caches only public static assets, and activation removes the old identity cache',async()=>{
 const w=worker();w.stores.set('smartapply-cache-v2',new Map([['https://fixture.test/dashboard/messages',new Response('OLD IDENTITY')]]));
 await w.lifecycle('install');
 assert(!w.calls.some(([op,path])=>op==='add'&&path==='https://fixture.test/'));
 assert(w.calls.some(([op,path])=>op==='add'&&path==='https://fixture.test/offline.html'));
 await w.lifecycle('activate');assert(!w.stores.has('smartapply-cache-v2'));
});

test('private navigation, RSC and API requests never read or store cached account data',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');
 for(const [path,options] of [['/',{mode:'navigate'}],['/dashboard/messages',{mode:'navigate'}],['/dashboard/company',{mode:'navigate'}],['/dashboard/candidate',{headers:{RSC:'1'}}],['/jobs?_rsc=fixture',{}],['/jobs',{headers:{'Next-Router-Prefetch':'1'}}],['/api/applications/private',{mode:'cors'}]]){
  w.calls.length=0;const result=await w.request(path,options);if(result)assert.equal(await result.text(),'NETWORK CURRENT USER');
  assert(!w.calls.some(([op,key])=>['match','put'].includes(op)&&key===new URL(path,'https://fixture.test').href),`${path} touched cache`);
 }
});

test('offline private navigation falls back only to the generic offline document',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');
 for(const rows of w.stores.values())rows.set('https://fixture.test/dashboard/messages',new Response('OLD IDENTITY'));
 w.setOffline(true);const result=await w.request('/dashboard/messages',{mode:'navigate'});
 assert(result);assert.equal(await result.text(),'GENERIC OFFLINE');
});

test('public static assets may be served from cache offline',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');w.setOffline(true);
 const result=await w.request('/manifest.json');assert(result);assert.equal(await result.text(),'STATIC');
});
