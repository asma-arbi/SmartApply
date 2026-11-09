// Tests production auth boundaries with in-memory fixtures; no real database or network.
const {test,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const originalEnv={...process.env},originalFetch=global.fetch;let writes,sessions,reads,missingUser;
class Redirect extends Error{constructor(url){super('fixture redirect');this.url=String(url);}}
function load(relative,mocks){const filename=path.resolve(__dirname,'../..',relative),source=fs.readFileSync(filename,'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod.require=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);mod._compile(compiled,filename);return mod.exports;}
const db={collection(name){return {async findOne(filter){reads++;return name==='users'&&!missingUser&&filter?.email!=='new@example.test'?{id:'fictional-user',email:'fixture@example.test',role:'candidat',password_hash:'fictional-hash'}:null;},async insertOne(row){writes.push({collection:name,kind:'insert',row});},async updateOne(filter,update){writes.push({collection:name,kind:'update',filter,update});}};}};
const mocks={
 'next/navigation':{redirect:url=>{throw new Redirect(url);}},'next/cache':{revalidatePath(){}},
 '@/lib/mongodb':{initDatabase:async()=>{},getDb:async()=>db},
 '@/lib/auth/session':{getSessionUser:async()=>({user:{id:'fictional-user',email:'fixture@example.test',role:'candidat'},sessionId:'fictional-session'}),createSession:async()=>{sessions++;return {accessToken:'fixture-access',refreshToken:'fixture-refresh'};},invalidateAllUserSessions:async()=>{}},
 '@/lib/recaptcha':{verifyRecaptchaToken:async()=>({success:true})},
 'bcryptjs':{hash:async()=>'<fictional-hash>',compare:async()=>false}
};
function form(data){const fd=new FormData();for(const [key,value]of Object.entries(data))fd.set(key,value);return fd;}
async function outcome(work){try{await work();return '';}catch(e){if(e instanceof Redirect)return e.url;return 'rejected';}}
beforeEach(()=>{process.env.NODE_ENV='production';delete process.env.RECAPTCHA_SECRET_KEY;delete process.env.GOOGLE_CLIENT_ID;delete process.env.GOOGLE_CLIENT_SECRET;delete process.env.NEXT_PUBLIC_SITE_URL;global.fetch=originalFetch;writes=[];sessions=0;reads=0;missingUser=false;});
after(()=>{global.fetch=originalFetch;process.env=originalEnv;});

test('production registration cannot create an administrator',async()=>{
 const api=load('app/actions.ts',mocks);const fd=form({email:'new@example.test',password:'Fictional123!',name:'Fictional',role:'admin',tos:'on',recaptcha_verified:'1'});
 await outcome(()=>api.register(fd));assert(!writes.some(w=>w.row?.role==='admin'));assert.equal(sessions,0);
});
test('production login cannot bootstrap a missing legacy administrator',async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../app/actions.ts'),'utf8');const legacyEmail=source.match(/email\s*===\s*"([^"@]+@[^"@]+)"/)?.[1];
 if(!legacyEmail)return;missingUser=true;const api=load('app/actions.ts',mocks);
 const warn=console.warn;console.warn=()=>{};try{await outcome(()=>api.login(form({email:legacyEmail,password:'Fictional123!',recaptcha_verified:'1'})));}finally{console.warn=warn;}
 assert(!writes.some(w=>w.row?.role==='admin'));assert.equal(sessions,0);
});
test('production self-promotion cannot grant administrator rights',async()=>{
 const api=load('app/actions.ts',mocks);await outcome(()=>api.promoteSelfToAdmin());
 assert(!writes.some(w=>w.update?.$set?.role==='admin'));assert.equal(sessions,0);
});
test('production forgot-password response never exposes a reset token',async()=>{
 const api=load('app/actions.ts',mocks),url=await outcome(()=>api.forgotPassword(form({email:'fixture@example.test',recaptcha_verified:'1'})));
 assert(!/[?&](token|reset_token)=/i.test(url));
});
test('production tokenless reset cannot change a password even for a signed-in session',async()=>{
 const api=load('app/actions.ts',mocks);await outcome(()=>api.resetPassword(form({password:'Fictional456!'})));
 assert(!writes.some(w=>w.update?.$set?.password_hash));
});

test('production CAPTCHA fails closed when missing and rejects a mismatched action',async()=>{
 const api=load('lib/recaptcha.ts',{});assert.equal((await api.verifyRecaptchaToken('fixture','login')).success,false);
 process.env.RECAPTCHA_SECRET_KEY='fictional-secret';global.fetch=async()=>({json:async()=>({success:true,score:0.9,action:'register'})});
 assert.equal((await api.verifyRecaptchaToken('fixture','login')).success,false);
});

test('production middleware and session module require a sufficiently long JWT secret',()=>{
 const envMocks={'jose':{},'next/server':{},'next/headers':{},'@/lib/mongodb':mocks['@/lib/mongodb']};
 for(const file of ['middleware.ts','lib/auth/session.ts']){
  delete process.env.JWT_SECRET;assert.throws(()=>load(file,envMocks),/JWT_SECRET/);
  process.env.JWT_SECRET='x'.repeat(31);assert.throws(()=>load(file,envMocks),/JWT_SECRET/);
  process.env.JWT_SECRET='x'.repeat(32);assert.doesNotThrow(()=>load(file,envMocks));
 }
});

function googleMocks(){
 class NextResponse{constructor(url){this.url=String(url);this.values={};this.cookies={set:(name,value,options)=>{this.values[name]={value,options};}};}static redirect(url){return new NextResponse(url);}}
 return {...mocks,'next/server':{NextResponse}};
}
function googleRequest(url,state){return {url,cookies:{get:name=>name==='smartapply_oauth_state'&&state?{value:state}:undefined}};}
test('production direct-email Google route cannot create a session, and real OAuth starts with protected state',async()=>{
 const api=load('app/api/auth/google/route.ts',googleMocks());
 const missing=await api.GET(googleRequest('https://fixture.test/api/auth/google?email=fixture@example.test'));
 assert.match(missing.url,/login\?error=/);assert.equal(writes.length,0);assert.equal(sessions,0);
 process.env.GOOGLE_CLIENT_ID='fictional-client';process.env.GOOGLE_CLIENT_SECRET='fictional-secret';
 const oauth=await api.GET(googleRequest('https://fixture.test/api/auth/google?email=fixture@example.test'));
 const dest=new URL(oauth.url);assert.equal(dest.hostname,'accounts.google.com');assert(dest.searchParams.get('state'));
 const cookie=oauth.values.smartapply_oauth_state;assert.equal(cookie.value,dest.searchParams.get('state'));assert.equal(cookie.options.httpOnly,true);assert.equal(cookie.options.secure,true);assert.equal(sessions,0);
});
test('Google callback rejects missing/mismatched state before network and rejects unverified Google email',async()=>{
 const api=load('app/api/auth/google/callback/route.ts',googleMocks());let calls=0;
 global.fetch=async()=>{calls++;return calls===1?{ok:true,json:async()=>({access_token:'fictional'})}:{ok:true,json:async()=>({email:'fixture@example.test',verified_email:false})};};
 const noState=await api.GET(googleRequest('https://fixture.test/api/auth/google/callback?code=fixture'));assert.match(noState.url,/login\?error=/);assert.equal(calls,0);
 const mismatch=await api.GET(googleRequest('https://fixture.test/api/auth/google/callback?code=fixture&state=wrong','right'));assert.match(mismatch.url,/login\?error=/);assert.equal(calls,0);
 const state='a'.repeat(64);const unverified=await api.GET(googleRequest('https://fixture.test/api/auth/google/callback?code=fixture&state='+state,state));assert.match(unverified.url,/login\?error=/);assert.equal(calls,2);assert.equal(reads,0);assert.equal(sessions,0);
});
test('Google callback accepts only a verified profile after valid state and sets secure session cookies',async()=>{
 const api=load('app/api/auth/google/callback/route.ts',googleMocks());let calls=0;
 global.fetch=async()=>{calls++;return calls===1?{ok:true,json:async()=>({access_token:'fictional'})}:{ok:true,json:async()=>({email:'fixture@example.test',verified_email:true,id:'fictional-google-id'})};};
 const state='b'.repeat(64),response=await api.GET(googleRequest('https://fixture.test/api/auth/google/callback?code=fixture&state='+state,state));
 assert.match(response.url,/dashboard\/candidate/);assert.equal(sessions,1);assert.equal(response.values.smartapply_access_token.options.secure,true);assert.equal(response.values.smartapply_refresh_token.options.httpOnly,true);
});
