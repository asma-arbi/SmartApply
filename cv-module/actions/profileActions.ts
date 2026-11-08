'use server';
import {ProfileRepository,type Profile,DataError} from '@smartapply/data';
import {connectDB} from '../lib/mongodb';
import ProfileModel from '../models/profile.model';
import {authenticated,type ActionResult} from '../lib/action-result';
export async function readProfile(){return authenticated(async p=>new ProfileRepository(ProfileModel(await connectDB())).get(p));}
export async function saveProfile(input:unknown){return authenticated(async p=>new ProfileRepository(ProfileModel(await connectDB())).save(p,input),['/dashboard/candidate/professional-profile','/dashboard/candidate/cv']);}
export async function updateProfile(_previous:ActionResult<Profile>|null,form:FormData):Promise<ActionResult<Profile>>{
 return authenticated(async p=>{
  const repo=new ProfileRepository(ProfileModel(await connectDB()));const current=await repo.get(p);
  const version=Number(form.get('version'));if(!Number.isInteger(version)||version!==current.version)throw new DataError('VERSION_CONFLICT','Le profil a changé. Actualisez avant de continuer.',409);
  return repo.save(p,{...current,name:form.get('name'),city:form.get('city'),objective:form.get('objective'),version});
 },['/dashboard/candidate/professional-profile','/dashboard/candidate/cv']);
}
