import {Injectable,Inject,CanActivate,ExecutionContext,Controller,Get,Post,Body,Res,Req,UseGuards} from '@nestjs/common';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {Request,Response} from 'express';
import {z} from 'zod';
import {Actor,DomainError,fixtureIds,parse} from './contracts.js';
import {StudioService} from './studio/service.js';
export type AuthRequest=Request&{actor:Actor};
@Injectable()
export class AuthService{
 private sessions=new Map<string,{actor:Actor;expires:number}>();
 private signingKey=randomBytes(32);
 private supabase;
 constructor(public local:boolean,private ttl=120){
  if(!local){if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)throw new Error('Supabase Auth configuration is required.');this.supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
 }
 devLogin(name:string){if(!this.local)throw new DomainError('NOT_FOUND','Page introuvable.',404);
  const role=name==='candidate'||name==='otherCandidate'?'candidate':'recruiter';
  if(!['candidate','otherCandidate','recruiter','otherRecruiter','unverified'].includes(name))throw new DomainError('VALIDATION','Compte de démonstration invalide.');
  const actor:Actor={id:fixtureIds[name as keyof typeof fixtureIds],role,verifiedEmail:true};const token=randomBytes(32).toString('base64url');this.sessions.set(token,{actor,expires:Date.now()+3600000});return {token,actor};
 }
 async passwordLogin(email:string,password:string){if(!this.supabase)throw new DomainError('AUTH_UNAVAILABLE','Utilisez un compte local de démonstration.');const {data,error}=await this.supabase.auth.signInWithPassword({email,password});if(error||!data.session)throw new DomainError('AUTH_FAILED','Connexion impossible. Vérifiez vos identifiants.',401);return data.session.access_token;}
 logout(token:string){this.sessions.delete(token);}
 async actor(req:Request):Promise<Actor>{const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):req.cookies?.smartapply_session;
  if(!token)throw new DomainError('UNAUTHENTICATED','Connectez-vous pour continuer.',401);
  if(this.local){const s=this.sessions.get(token);if(!s||s.expires<Date.now())throw new DomainError('UNAUTHENTICATED','Votre session a expiré.',401);return s.actor;}
  const {data,error}=await this.supabase!.auth.getUser(token);if(error||!data.user)throw new DomainError('UNAUTHENTICATED','Votre session a expiré.',401);
  const role=data.user.app_metadata.role;if(!['candidate','recruiter'].includes(role))throw new DomainError('FORBIDDEN','Votre rôle ne permet pas cet accès.',403);
  if(!data.user.email_confirmed_at)throw new DomainError('EMAIL_UNVERIFIED','Vérifiez votre email avant de continuer.',403);
  return {id:data.user.id,role,verifiedEmail:true};
 }
 link(a:Actor,cvId:string){const expires=Date.now()+this.ttl*1000;const payload=Buffer.from(JSON.stringify({cvId,userId:a.id,expires})).toString('base64url');const signature=createHmac('sha256',this.signingKey).update(payload).digest('base64url');const token=`${payload}.${signature}`;return {url:`/api/cvs/${cvId}/file?token=${token}`,expiresAt:new Date(expires).toISOString()};}
 verifyLink(a:Actor,cvId:string,token:string){try{const [payload,sig]=token.split('.');const expected=createHmac('sha256',this.signingKey).update(payload).digest();const supplied=Buffer.from(sig,'base64url');if(supplied.length!==expected.length||!timingSafeEqual(expected,supplied))throw new Error();const l=JSON.parse(Buffer.from(payload,'base64url').toString());if(l.cvId!==cvId||l.userId!==a.id||l.expires<Date.now())throw new Error();}catch{throw new DomainError('LINK_EXPIRED','Ce lien privé a expiré. Renouvelez votre accès.',403);}}
}
@Injectable()
export class AuthGuard implements CanActivate{
 constructor(@Inject(AuthService)private auth:AuthService){}
 async canActivate(context:ExecutionContext){const req=context.switchToHttp().getRequest<AuthRequest>();req.actor=await this.auth.actor(req);return true;}
}
@Controller('api')
export class SessionController{
 constructor(@Inject(AuthService)private auth:AuthService,@Inject(StudioService)private studio:StudioService){}
 private cookie(res:Response,token:string){res.cookie('smartapply_session',token,{httpOnly:true,sameSite:'lax',secure:!this.auth.local,path:'/',maxAge:3600000});}
 @Get('health') health(){return {status:'ok',mode:this.auth.local?'local-fixtures':'supabase',ai:this.studio.ai.available?'configured-unverified':'unavailable',gmail:'unavailable'};}
 @Post('auth/dev-login') login(@Body()body:unknown,@Res({passthrough:true})res:Response){const p=parse(z.object({account:z.string()}).strict(),body);const {token,actor}=this.auth.devLogin(p.account);this.cookie(res,token);return {actor,mode:'local-fixtures'};}
 @Post('auth/login') async password(@Body()body:unknown,@Res({passthrough:true})res:Response){const p=parse(z.object({email:z.email(),password:z.string().min(1).max(200)}).strict(),body);this.cookie(res,await this.auth.passwordLogin(p.email,p.password));return {message:'Connecté.'};}
 @Get('auth/me') @UseGuards(AuthGuard) me(@Req()req:AuthRequest){return {actor:req.actor,local:this.auth.local};}
 @Post('auth/logout') logout(@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.logout(req.cookies?.smartapply_session??'');res.clearCookie('smartapply_session',{path:'/'});return {message:'Déconnecté.'};}
}
