'use server';
import {ApplicationRepository} from '../models/application.model';
import {connectDB} from '../lib/mongodb';
import {authenticated} from '../lib/action-result';
export async function listApplications(){return authenticated(async p=>new ApplicationRepository(await connectDB()).list(p));}
export async function listMessagingContacts(){return authenticated(async p=>new ApplicationRepository(await connectDB()).messagingContacts(p));}
export async function readApplication(id:string){return authenticated(async p=>new ApplicationRepository(await connectDB()).detail(p,id));}
export async function createApplication(input:unknown,key:string){return authenticated(async p=>new ApplicationRepository(await connectDB()).create(p,input,key),['/dashboard/candidate/applications','/dashboard/candidate']);}
export async function editApplicationDraft(id:string,input:unknown){return authenticated(async p=>new ApplicationRepository(await connectDB()).editDraft(p,id,input),['/dashboard/candidate/applications']);}
export async function saveApplicationNote(id:string,input:unknown){return authenticated(async p=>new ApplicationRepository(await connectDB()).saveNote(p,id,input),['/dashboard/candidate/applications']);}
export async function listJobs(){return authenticated(async _p=>new ApplicationRepository(await connectDB()).jobs());}
export async function listCompanies(){return authenticated(async _p=>new ApplicationRepository(await connectDB()).companies());}
