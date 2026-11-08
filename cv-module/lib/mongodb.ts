import 'server-only';
import {connectDB as sharedConnect} from '@smartapply/data';
import {getDb} from '@/lib/mongodb';
export async function connectDB(){const db=await getDb();return sharedConnect({...process.env,MONGODB_DB:db.databaseName});}
