import {Controller,Post,Get,Body,Req,Res,Inject} from '@nestjs/common';
import {ApiTags,ApiBody} from '@nestjs/swagger';
import type {Request,Response} from 'express';
import {DataError} from '@smartapply/data';
import {AuthService,ACCESS_COOKIE,REFRESH_COOKIE} from './auth-service.js';
export const AUTH=Symbol('AUTH');
function cookies(res:Response,s?:{accessToken:string;refreshToken:string}){const o={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};if(s){res.cookie(ACCESS_COOKIE,s.accessToken,{...o,maxAge:900000});res.cookie(REFRESH_COOKIE,s.refreshToken,{...o,maxAge:30*86400000});}else{res.clearCookie(ACCESS_COOKIE,o);res.clearCookie(REFRESH_COOKIE,o);}}
export async function captcha(token:unknown,action:string){const secret=process.env.RECAPTCHA_SECRET_KEY;if(!secret){if(process.env.NODE_ENV==='production')throw new DataError('CAPTCHA_UNAVAILABLE','Vérification de sécurité non configurée.',503);return;}if(typeof token!=='string'||!token)throw new DataError('CAPTCHA','Vérification de sécurité requise.',400);const result=await fetch('https://www.google.com/recaptcha/api/siteverify',{method:'POST',body:new URLSearchParams({secret,response:token}),signal:AbortSignal.timeout(8000)}).then(r=>r.json()) as any;const hosts=(process.env.RECAPTCHA_HOSTNAMES??'localhost,127.0.0.1').split(',');if(!result.success||result.action!==action||result.score<0.5||!hosts.includes(result.hostname))throw new DataError('CAPTCHA','Vérification de sécurité refusée.',403);}
@ApiTags('Authentication') @Controller('api/auth')
export class AuthController {
 constructor(@Inject(AUTH)private readonly auth:AuthService|undefined){}
 private service(){if(!this.auth)throw new DataError('AUTH_UNAVAILABLE','AUTH_SECRET doit être configuré dans backend/.env.',503);return this.auth;}
 @Get('session') async session(@Req()req:Request){const u=await this.service().current(req.cookies?.[ACCESS_COOKIE]??'');return {user:u};}
 @Get('sessions') async sessions(@Req()req:Request){return this.service().sessions(req.cookies?.[ACCESS_COOKIE]??'');}
 @Get('capabilities') capabilities(){return {google:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),smtp:!!(process.env.SMTP_HOST&&process.env.SMTP_FROM),captchaRequired:process.env.NODE_ENV==='production'||!!process.env.RECAPTCHA_SECRET_KEY};}
 @Post('registration-check') async registrationCheck(@Body()b:any,@Req()req:Request){await this.service().rate('register-ip:'+req.ip,8);await captcha(b.recaptcha_token,'register');return {ok:true};}
 @Post('login') @ApiBody({schema:{type:'object',properties:{email:{type:'string'},password:{type:'string'},recaptcha_token:{type:'string'}}}}) async login(@Body()b:any,@Req()req:Request,@Res({passthrough:true})res:Response){await this.service().rate('ip:'+req.ip,30);await captcha(b.recaptcha_token,'login');const s=await this.service().login(String(b.email??''),String(b.password??''),String(req.headers['user-agent']??''));cookies(res,s);return {user:s.user};}
 @Post('refresh') async refresh(@Req()req:Request,@Res({passthrough:true})res:Response){const s=await this.service().refresh(req.cookies?.[REFRESH_COOKIE]??'');cookies(res,s);return {user:s.user};}
 @Post('logout') async logout(@Req()req:Request,@Res({passthrough:true})res:Response){await this.service().logout(req.cookies?.[ACCESS_COOKIE],req.cookies?.[REFRESH_COOKIE]);cookies(res);return {message:'Déconnecté.'};}
 @Post('verification-email') async verification(@Body()b:any,@Req()req:Request){await this.service().rate('verify-ip:'+req.ip,10);const u=await this.service().current(req.cookies?.[ACCESS_COOKIE]??'');return this.service().requestEmail(u.email,'verify');}
 @Post('forgot-password') async forgot(@Body()b:any,@Req()req:Request){await this.service().rate('forgot-ip:'+req.ip,10);await captcha(b.recaptcha_token,'forgot_password');if(!process.env.SMTP_HOST||!process.env.SMTP_FROM)throw new DataError('EMAIL_UNAVAILABLE','SMTP non configuré : récupération indisponible.',503);return this.service().requestEmail(String(b.email??''),'reset');}
 @Post('verify-email') verify(@Body()b:any){return this.service().consumeToken('verify',String(b.token??''));}
 @Post('reset-password') reset(@Body()b:any){return this.service().consumeToken('reset',String(b.token??''),String(b.password??''));}
 @Post('password') password(@Body()b:any,@Req()req:Request){return this.service().password(req.cookies?.[ACCESS_COOKIE]??'',String(b.current??''),String(b.password??''));}
 @Post('sessions/revoke') async revoke(@Body()b:any,@Req()req:Request,@Res({passthrough:true})res:Response){await this.service().revoke(req.cookies?.[ACCESS_COOKIE]??'',String(b.id??''));if(b.id==='all')cookies(res);return {message:'Sessions révoquées.'};}
}
