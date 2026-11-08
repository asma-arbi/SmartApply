// Isolated Server Action regression tests. No environment files or network/database access.
const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
const ts=require('typescript');
class DataError extends Error{constructor(code,message,status=400){super(message);this.code=code;this.status=status;}}
let principal,collections;
function matches(row,filter){return Object.entries(filter).every(([key,v])=>{
 if(key==='$or')return v.some(f=>matches(row,f));if(key==='$and')return v.every(f=>matches(row,f));
 const actual=row[key];if(v&&typeof v==='object'&&!(v instanceof Date))return Object.entries(v).every(([op,value])=>op==='$ne'?actual!==value:op==='$in'?value.includes(actual):op==='$nin'?!value.includes(actual):op==='$lte'?actual<=value:op==='$regex'?new RegExp(value,v.$options).test(Array.isArray(actual)?actual.join(' '):actual||''):op==='$options');
 return Array.isArray(actual)?actual.includes(v):actual===v;
});}
function collection(name){const data=collections[name]??=[];return {
 createIndex:async()=>{},findOne:async f=>data.find(r=>matches(r,f))||null,
 countDocuments:async f=>data.filter(r=>matches(r,f)).length,
 insertOne:async r=>{data.push({...r,_id:r.id});return {insertedId:r.id};},
 updateOne:async(f,u,o={})=>{let r=data.find(r=>matches(r,f));const existed=!!r;if(!r&&o.upsert){r={...f,...u.$setOnInsert};data.push(r);}if(r)Object.assign(r,u.$set);return {matchedCount:Number(existed)};},
 updateMany:async(f,u)=>data.filter(r=>matches(r,f)).forEach(r=>Object.assign(r,u.$set)),
 deleteOne:async f=>{const i=data.findIndex(r=>matches(r,f));if(i>=0)data.splice(i,1);return {deletedCount:i>=0?1:0};},
 deleteMany:async f=>{for(let i=data.length-1;i>=0;i--)if(matches(data[i],f))data.splice(i,1);},
 find:f=>{let result=data.filter(r=>matches(r,f));const cursor={sort(spec){const entries=Object.entries(spec);result.sort((a,b)=>{for(const [key,dir]of entries){if(a[key]>b[key])return dir;if(a[key]<b[key])return -dir;}return 0;});return cursor;},skip(n){result=result.slice(n);return cursor;},limit(n){result=result.slice(0,n);return cursor;},project(){return cursor;},async toArray(){return result.map(r=>({...r}));}};return cursor;}
};}
const db={collection};
const identity=async()=>{if(!principal)throw new DataError('UNAUTHENTICATED','Connexion requise',401);return principal;};
const filename=require('node:path').resolve(__dirname,'../actions/postActions.ts');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;
mod.require=id=>id==='server-only'?{}:id==='@smartapply/data'?{DataError}:id==='../lib/identity'?{requireIdentity:identity}:id==='../lib/mongodb'?{connectDB:async()=>({db})}:id==='../lib/action-result'?{authenticated:async fn=>{try{return {ok:true,data:await fn(await identity())};}catch(e){return {ok:false,error:{message:e.message,status:e.status||503}};}}}:require(id);
mod._compile(compiled,filename);const api=mod.exports;
const input=(extra={})=>({title:'Publication de test',content:'Un contenu professionnel de test.',category:'Conseil carrière',...extra});
beforeEach(()=>{principal={userId:'candidate-1',role:'candidate'};collections={users:[{id:'candidate-1',name:'Candidate'},{id:'company-1',name:'Recruteur'},{id:'company-2',name:'Autre entreprise'}],companies:[{id:'company-1',name:'Entreprise A'},{id:'company-2',name:'Entreprise B'}],jobs:[{id:'job-1',company_id:'company-1',status:'published',title:'Développeur'},{id:'job-2',company_id:'company-2',status:'published',title:'Autre offre'}]};});
test('session required for writes, optional title derived from content',async()=>{
 principal=null;assert.equal((await api.savePost(input())).error.status,401);principal={userId:'candidate-1',role:'candidate'};
 const r=await api.savePost(input({title:''}));assert.equal(r.ok,true);assert.equal(collections.posts[0].title,'Un contenu professionnel de test.');
});
test('another author cannot edit, delete, publish or pin a post',async()=>{
 const {data:id}=await api.savePost(input());principal={userId:'company-1',role:'recruiter'};
 for(const r of [await api.savePost(input(),id),await api.deletePost(id),await api.managePost(id,'publish'),await api.managePost(id,'pin')])assert.equal(r.ok,false);
 assert.equal(collections.posts[0].author_id,'candidate-1');
});
test('company can link own published job, other company and candidate cannot',async()=>{
 assert.equal((await api.savePost(input({jobId:'job-1'}))).ok,false);
 principal={userId:'company-1',role:'recruiter'};
 assert.equal((await api.savePost(input({postKind:'JOB',jobId:'job-2'}))).ok,false);
 assert.equal((await api.savePost(input({postKind:'JOB',jobId:'job-1'}))).ok,true);
 assert.equal(collections.posts[0].company_name,'Entreprise A');assert.equal(collections.posts[0].job_id,'job-1');
});
test('public feed and comments exclude drafts, scheduled and members-only posts',async()=>{
 await api.savePost(input({status:'draft'}));await api.savePost(input({status:'scheduled',scheduledAt:new Date(Date.now()+3600000).toISOString()}));
 const {data:privateId}=await api.savePost(input({visibility:'members'}));await api.savePost(input());principal=null;
 const r=await api.listPosts();assert.equal(r.data.length,1);assert.equal((await api.getComments(privateId)).ok,false);
});
test('due posts publish on request; scheduled posts can archive',async()=>{
 const {data:id}=await api.savePost(input({status:'scheduled',scheduledAt:new Date(Date.now()+3600000).toISOString()}));
 assert.equal((await api.archivePost(id)).ok,true);assert.equal(collections.posts[0].status,'archived');
 await api.archivePost(id,true);assert.equal(collections.posts[0].status,'draft');
 collections.posts[0].status='scheduled';collections.posts[0].scheduled_at=new Date(Date.now()-1000);
 assert.equal((await api.listPosts()).data.length,1);assert.equal(collections.posts[0].status,'published');
});
test('reaction changes and bookmark toggles preserve one entry per user',async()=>{
 const {data:id}=await api.savePost(input());await api.postInteraction(id,'like','LOVE');await api.postInteraction(id,'like','CELEBRATE');
 assert.equal(collections.post_reactions.length,1);assert.equal(collections.post_reactions[0].type,'CELEBRATE');
 await api.postInteraction(id,'save');assert.equal((await api.listPosts({saved:true})).data.length,1);await api.postInteraction(id,'save');assert.equal((await api.listPosts({saved:true})).data.length,0);
});
test('poll validates options, saves one vote, prevents edits after voting and expires',async()=>{
 assert.equal((await api.savePost(input({postKind:'POLL',pollOptions:['Identique','identique']}))).ok,false);
 const {data:id}=await api.savePost(input({postKind:'POLL',pollOptions:['Oui','Non']}));
 await api.postInteraction(id,'vote','0');await api.postInteraction(id,'vote','1');assert.equal(collections.post_votes.length,1);
 const r=await api.listPosts();assert.equal(r.data[0].poll_results.total,1);assert.equal(r.data[0].poll_results.myOption,1);
 assert.equal((await api.savePost(input({postKind:'POLL',pollOptions:['Autre','Non']}),id)).ok,false);
 collections.posts[0].poll.closes_at=new Date(Date.now()-1000);assert.equal((await api.postInteraction(id,'vote','0')).ok,false);
});
test('disabled comments reject writes; hiding does not delete shared post',async()=>{
 const {data:id}=await api.savePost(input({commentsEnabled:false}));assert.equal((await api.postInteraction(id,'comment','Bonjour')).ok,false);
 await api.postInteraction(id,'hide');assert.equal((await api.listPosts()).data.length,0);principal={userId:'company-1',role:'recruiter'};assert.equal((await api.listPosts()).data.length,1);
});
test('moderation requires existing admin and includes reported content',async()=>{
 const {data:id}=await api.savePost(input());await api.postInteraction(id,'report','Spam détecté');assert.equal((await api.listReports()).ok,false);
 principal={userId:'admin-1',role:'admin'};collections.users.push({id:'admin-1',name:'Admin'});
 const r=await api.listReports();assert.equal(r.data[0].post_content,'Un contenu professionnel de test.');
 assert.equal((await api.moderateReport(r.data[0].id,'remove')).ok,true);assert.equal((await api.listPosts()).data.length,0);
});
test('comment replies remain on same post, reactions toggle, editing/deletion require owner',async()=>{
 const {data:id}=await api.savePost(input());const {data:other}=await api.savePost(input());
 await api.postInteraction(id,'comment','Commentaire initial');const comment=collections.post_comments[0];
 assert.equal((await api.postInteraction(other,'comment','Réponse à un autre post',comment.id)).ok,false);
 assert.equal((await api.postInteraction(id,'comment','Ma réponse',comment.id)).ok,true);
 assert.equal((await api.getComments(id)).data[1].parent_id,comment.id);
 principal={userId:'company-1',role:'recruiter'};
 assert.equal((await api.commentAction(comment.id,'edit','Modification interdite')).ok,false);
 assert.equal((await api.commentAction(comment.id,'delete')).ok,false);
 await api.commentAction(comment.id,'react','LOVE');await api.commentAction(comment.id,'react','SUPPORT');assert.equal(collections.post_comment_reactions.length,1);
 principal={userId:'candidate-1',role:'candidate'};
 assert.equal((await api.commentAction(comment.id,'edit','Commentaire corrigé')).ok,true);
 assert.equal((await api.commentAction(comment.id,'delete')).ok,true);
 const rows=(await api.getComments(id)).data;assert.equal(rows[0].deleted,true);assert.equal(rows[1].content,'Ma réponse');
});
test('uploads reject unauthenticated requests, unsupported MIME, bad signatures and oversized files',async()=>{
 const data=new FormData();data.set('file',new File(['<svg/>'],'image.svg',{type:'image/svg+xml'}));
 assert.equal((await api.uploadPostMedia(data)).ok,false);
 data.set('file',new File(['not an image'],'image.png',{type:'image/png'}));assert.equal((await api.uploadPostMedia(data)).ok,false);
 data.set('file',new File([new Uint8Array(4*1024*1024+1)],'large.pdf',{type:'application/pdf'}));assert.equal((await api.uploadPostMedia(data)).ok,false);
 principal=null;assert.equal((await api.uploadPostMedia(data)).error.status,401);
});
