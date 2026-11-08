import mongoose,{type Connection} from 'mongoose';
export function mongoConfiguration(env:Record<string,string|undefined>=process.env){
 const uri=env.MONGODB_URI?.trim();
 if(!uri)throw new Error('MONGODB_URI is required in the server environment.');
 if(!/^mongodb(?:\+srv)?:\/\//.test(uri))throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://.');
 const dbName=env.MONGODB_DB?.trim();
 if(!dbName||! /^[a-zA-Z0-9_-]{1,63}$/.test(dbName))throw new Error('MONGODB_DB must be an explicit database name (letters, digits, underscores or hyphens).');
 return {uri,dbName};
}
// Module instance is shared by Node imports; Next's adapter adds hot-reload caching.
let pending:Promise<Connection>|undefined;
let active:Connection|undefined;
let activeConfig:{uri:string;dbName:string}|undefined;
export async function connectDB(env:Record<string,string|undefined>=process.env):Promise<Connection>{
 const cfg=mongoConfiguration(env);
 if(activeConfig&&(activeConfig.uri!==cfg.uri||activeConfig.dbName!==cfg.dbName))throw new Error('MongoDB configuration changed. Restart this server.');
 if(active){if(active.readyState===1)return active;throw new Error('MongoDB connection interrupted. Retry after reconnection; restart if unavailable.');}
 if(pending)return pending;
 activeConfig=cfg;
 const connection=mongoose.createConnection(cfg.uri,{dbName:cfg.dbName,maxPoolSize:5,minPoolSize:0,serverSelectionTimeoutMS:10000,bufferCommands:false,autoIndex:false});
 pending=connection.asPromise().then(c=>{active=c;return c;}).catch(async()=>{await connection.close().catch(()=>{});activeConfig=undefined;throw new Error('MongoDB connection failed. Check Atlas credentials, network access and TLS configuration.');}).finally(()=>{pending=undefined;});
 return pending;
}
export async function closeDB(){if(pending)await pending.catch(()=>{});await active?.close();active=undefined;activeConfig=undefined;}
