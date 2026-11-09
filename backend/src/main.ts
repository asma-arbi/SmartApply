import {connectDB,closeDB,mongoConfiguration} from '@smartapply/data';
import {GroqAi,unavailableAi} from './studio/ai.js';
import {MongoStudioService} from './mongo/studio.js';
import {createMongoApp,MongoRuntime} from './mongo/app.js';
async function main(){
 mongoConfiguration();
 if(process.env.NODE_ENV==='production'&&process.env.SMARTAPPLY_ISOLATED_TEST==='1')throw new Error('Isolated test identities are forbidden in production.');
 const port=Number(process.env.PORT??4100);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be a valid TCP port.');
 const connection=await connectDB();const studio=new MongoStudioService(connection,process.env.GROQ_API_KEY?.trim()?new GroqAi(process.env.GROQ_API_KEY,process.env.GROQ_MODEL?.trim()||undefined):unavailableAi);await studio.recoverInterrupted();const runtime=new MongoRuntime(connection,studio);await runtime.auth?.initialize();const app=await createMongoApp(runtime);app.enableShutdownHooks();await app.listen(port,process.env.HOST||(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'));studio.startWorker();
 for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{studio.onModuleDestroy();void app.close().finally(()=>closeDB());});
 console.log(`SmartApply API http://127.0.0.1:${port} — MongoDB; authentication integration configured when AUTH_SECRET is set.`);
}
main().catch(async(error)=>{const safe=/^MONGODB_|^MongoDB connection|^PORT |^Isolated test identities/.test(error.message)?error.message:'Backend startup failed. Check MongoDB configuration and required indexes; no database fallback.';console.error(safe);await closeDB();process.exitCode=1;});
