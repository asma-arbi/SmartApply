import 'server-only';
import {cookies} from 'next/headers';
import {getSessionUser} from '@/lib/auth/session';
import {asmaSession,DataError} from '@smartapply/data';
import {connectDB} from './mongodb';
export async function requireIdentity(){if(!await getSessionUser())throw new DataError('UNAUTHENTICATED','Connectez-vous dans SmartApply.',401);return asmaSession(await connectDB(),cookies().getAll().map(c=>c.name+'='+c.value).join('; '),process.env.JWT_SECRET??'');}
