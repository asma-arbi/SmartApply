'use server';
import {LetterRepository} from '../models/letter.model';
import {ProfileRepository} from '@smartapply/data';
import ProfileModel from '../models/profile.model';
import {connectDB} from '../lib/mongodb';
import {authenticated} from '../lib/action-result';
export async function listLetters(){return authenticated(async p=>new LetterRepository(await connectDB()).list(p));}
export async function readLetter(id:string){return authenticated(async p=>new LetterRepository(await connectDB()).get(p,id));}
export async function createLetter(input:unknown,key:string){return authenticated(async p=>{const c=await connectDB();return new LetterRepository(c).create(p,input,key,await new ProfileRepository(ProfileModel(c)).get(p));},['/dashboard/candidate/letters']);}
export async function updateLetter(id:string,input:unknown){return authenticated(async p=>new LetterRepository(await connectDB()).patch(p,id,input),['/dashboard/candidate/letters']);}
export async function listLetterVersions(id:string){return authenticated(async p=>new LetterRepository(await connectDB()).versions(p,id));}
export async function saveLetterVersion(id:string,input:{version:number},key:string){return authenticated(async p=>{const c=await connectDB();return new LetterRepository(c).saveVersion(p,id,input,key,await new ProfileRepository(ProfileModel(c)).get(p));},['/dashboard/candidate/letters']);}
export async function removeLetter(id:string){return authenticated(async p=>new LetterRepository(await connectDB()).remove(p,id),['/dashboard/candidate/letters']);}
