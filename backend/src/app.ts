import 'reflect-metadata';
import {Module,Catch,ExceptionFilter,ArgumentsHost,HttpException} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {SwaggerModule,DocumentBuilder} from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {Request,Response} from 'express';
import {DomainError} from './contracts.js';
import {ModuleService} from './service.js';
import {AuthService,AuthGuard,SessionController} from './auth.js';
import {CvsController} from './controllers/cvs.js';
import {ProfilesController} from './controllers/profiles.js';
import {ApplicationsController} from './controllers/applications.js';
import {StudioService} from './studio/service.js';
import {AnalysisController,LettersController} from './studio/controllers.js';
export {AuthService} from './auth.js';
@Catch()
class ApiFilter implements ExceptionFilter{catch(error:unknown,host:ArgumentsHost){const res=host.switchToHttp().getResponse<Response>();
 const code=error instanceof DomainError?error.code:error instanceof HttpException?'REQUEST_ERROR':'INTERNAL_ERROR';
 const status=error instanceof DomainError?error.httpStatus:error instanceof HttpException?error.getStatus():500;
 const message=error instanceof DomainError?error.message:status===413?'Le fichier dépasse la taille autorisée.':status===400?'La demande est invalide.':"Le service est momentanément indisponible. Réessayez.";
 res.status(status).json({error:{code,message}});
}}
export async function createApp(service:ModuleService,auth:AuthService,studio=new StudioService(service)){
 @Module({controllers:[SessionController,CvsController,ProfilesController,ApplicationsController,AnalysisController,LettersController],providers:[{provide:ModuleService,useValue:service},{provide:AuthService,useValue:auth},{provide:StudioService,useValue:studio},AuthGuard]})class AppModule{}
 const app=await NestFactory.create(AppModule,{logger:false});app.use(helmet());app.use(cookieParser());
 const origins=(process.env.FRONTEND_ORIGINS??'http://127.0.0.1:3000,http://localhost:3000').split(',').map(v=>v.trim());
 origins.push('http://127.0.0.1:4100','http://localhost:4100');
 const limits=new Map<string,{count:number;time:number}>();
 app.use((req:Request,res:Response,next:()=>void)=>{
  res.setHeader('Cache-Control','no-store, private');const who=req.ip??'unknown';let rate=limits.get(who);if(!rate||Date.now()-rate.time>60000){rate={count:0,time:Date.now()};limits.set(who,rate);}rate.count++;
  if(rate.count>180)return res.status(429).json({error:{code:'RATE_LIMIT',message:'Trop de demandes. Réessayez dans une minute.'}});
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&(req.headers['x-smartapply-request']!=='1'||req.headers.origin&&!origins.includes(req.headers.origin)))return res.status(403).json({error:{code:'CSRF',message:'Cette demande ne peut pas être validée.'}});
  next();
 });app.useGlobalFilters(new ApiFilter());
 const document=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('SmartApply Tunisie — CV & lettres').setDescription('API protégée. Connectez-vous par /api/auth/login, ou utilisez un JWT Supabase dans Authorize. Les mutations exigent X-Smartapply-Request: 1. Les clés privilégiées ne doivent jamais être saisies ici.').setVersion('1.0').addBearerAuth().build());
 SwaggerModule.setup('docs',app,document,{swaggerOptions:{persistAuthorization:false,requestInterceptor:(request:any)=>{request.headers['X-Smartapply-Request']='1';return request;}}});
 await app.init();studio.startWorker();return app;
}
