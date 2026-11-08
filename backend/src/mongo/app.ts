import 'reflect-metadata';
import {AuthService,ACCESS_COOKIE} from './auth-service.js';
import {AuthController,AUTH} from './auth-controller.js';
import {GoogleController} from './google.js';
import {sendAuthMail} from './mail.js';
import {Module,Controller,Get,Post,Param,Body,Req,Res,Inject,Injectable,UseGuards,CanActivate,ExecutionContext,Catch,ExceptionFilter,ArgumentsHost,HttpException} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {SwaggerModule,DocumentBuilder,ApiTags,ApiBearerAuth,ApiBody,ApiOperation} from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type {Request,Response} from 'express';
import type {Connection} from 'mongoose';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {asmaSession,resolveConfiguredIdentity,DataError,CatalogRepository,CvRepository,PrivateCvFiles,ApplicationRepository,docxText,type Principal} from '@smartapply/data';
import {DomainError} from '../contracts.js';
import {MongoStudioService} from './studio.js';
type AuthRequest=Request&{principal:Principal};
const bodySchema={schema:{type:'object' as const,additionalProperties:true}};
export class MongoRuntime {
 readonly auth:AuthService|undefined;readonly cvs:CvRepository;readonly applications:ApplicationRepository;private key=randomBytes(32);
 constructor(public connection:Connection,public studio:MongoStudioService){this.auth=process.env.MODULE_AUTH_PROVIDER!=='asma'&&process.env.AUTH_SECRET&&process.env.SMARTAPPLY_ISOLATED_TEST!=='1'?new AuthService(connection,{secret:process.env.AUTH_SECRET,origin:process.env.PUBLIC_ORIGIN??'http://localhost:3000',send:sendAuthMail}):undefined;this.cvs=new CvRepository(connection);this.applications=new ApplicationRepository(connection);}
 link(p:Principal,cvId:string){const expires=Date.now()+120000;const payload=Buffer.from(JSON.stringify({userId:p.userId,cvId,expires})).toString('base64url');const signature=createHmac('sha256',this.key).update(payload).digest('base64url');return {url:`${process.env.MODULE_PUBLIC_API_PREFIX??'/api'}/cvs/${cvId}/file?token=${payload}.${signature}`,expiresAt:new Date(expires).toISOString()};}
 verify(p:Principal,id:string,token:string){try{const [payload,sig]=token.split('.');const expected=createHmac('sha256',this.key).update(payload).digest();const actual=Buffer.from(sig,'base64url');if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw Error();const value=JSON.parse(Buffer.from(payload,'base64url').toString());if(value.userId!==p.userId||value.cvId!==id||value.expires<Date.now())throw Error();}catch{throw new DataError('LINK_EXPIRED','Ce lien privé a expiré.',403);}}
 async readable(p:Principal,id:string){if(p.role==='candidate'){const cv=await this.cvs.owned(p,id);return {cv,owner:p};}
  if(p.role==='recruiter'){const db=this.connection.db!;const companies=await new CatalogRepository(this.connection).recruiterCompanies(p.userId);const app=await db.collection('applications').findOne({cv_id:id,company_id:{$in:companies.map(c=>c.id)},submitted_at:{$ne:null}});if(app){const owner:Principal={userId:app.candidate_id,role:'candidate',emailVerified:true};return {cv:await this.cvs.owned(owner,id),owner};}}
  throw new DataError('FORBIDDEN','Accès privé non autorisé.',403);
 }
}
@Injectable()
class MongoGuard implements CanActivate{constructor(@Inject(MongoRuntime)private runtime:MongoRuntime){} async canActivate(context:ExecutionContext){const req=context.switchToHttp().getRequest<AuthRequest>();if(this.runtime.auth){const u=await this.runtime.auth.current(req.cookies?.[ACCESS_COOKIE]??'');if(!u.emailVerified)throw new DataError('EMAIL_UNVERIFIED','Vérifiez votre adresse email.',403);req.principal={userId:u.id,role:u.role,emailVerified:true};}else req.principal=process.env.MODULE_AUTH_PROVIDER==='asma'?await asmaSession(this.runtime.connection,req.headers.cookie??'',process.env.JWT_SECRET??''):await resolveConfiguredIdentity({authorization:req.headers.authorization,cookie:req.headers.cookie});return true;}}
@ApiTags('Session integration') @Controller('api')
class MongoSessionController {
 constructor(@Inject(MongoRuntime)private runtime:MongoRuntime){}
 @Get('health') health(){return {status:'ok',mode:'mongodb',authentication:process.env.MODULE_AUTH_PROVIDER==='asma'?'asma-session':process.env.SMARTAPPLY_ISOLATED_TEST==='1'?'isolated-tests':this.runtime.auth?'integrated':'teammate-integration-required',ai:this.runtime.studio.ai.available?'configured-unverified':'unavailable',gmail:'unavailable'};}
 @Get('auth/me') @UseGuards(MongoGuard) async me(@Req()req:AuthRequest){const p=req.principal;const u=this.runtime.auth?await this.runtime.auth.current(req.cookies?.[ACCESS_COOKIE]??''):process.env.MODULE_AUTH_PROVIDER==='asma'?await this.runtime.connection.db!.collection('users').findOne({id:p.userId}):undefined;return {actor:{id:p.userId,role:p.role,verifiedEmail:p.emailVerified,name:u?.name,email:u?.email},local:false};}
 // User management, login/logout and password recovery belong exclusively to the teammate module.
}
@ApiTags('Private CV files') @ApiBearerAuth() @Controller('api/cvs') @UseGuards(MongoGuard)
class MongoFilesController {
 constructor(@Inject(MongoRuntime)private runtime:MongoRuntime){}
 @Post(':id/access') async access(@Req()req:AuthRequest,@Param('id')id:string){await this.runtime.readable(req.principal,id);return this.runtime.link(req.principal,id);}
 @Get(':id/file') async file(@Req()req:AuthRequest,@Param('id')id:string,@Res()res:Response){this.runtime.verify(req.principal,id,String(req.query.token??''));const {cv,owner}=await this.runtime.readable(req.principal,id);const bytes=await new PrivateCvFiles(this.runtime.connection).read(owner,id);res.set({'Content-Type':cv.mime_type,'Content-Disposition':`${req.query.download==='1'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(cv.original_filename)}`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});res.send(bytes);}
 @Get(':id/text') async text(@Req()req:AuthRequest,@Param('id')id:string){this.runtime.verify(req.principal,id,String(req.query.token??''));const {cv,owner}=await this.runtime.readable(req.principal,id);if(cv.mime_type==='application/pdf')throw new DataError('PREVIEW_TYPE','Utilisez l’aperçu PDF.');return {text:await docxText(await new PrivateCvFiles(this.runtime.connection).read(owner,id))};}
}
@ApiTags('AI analysis and generation') @ApiBearerAuth() @Controller('api') @UseGuards(MongoGuard)
class MongoAiController {
 constructor(@Inject(MongoRuntime)private runtime:MongoRuntime){}
 private key(req:Request){return String(req.headers['idempotency-key']??'');}
 @Post('cvs/:id/analysis/preview') preview(@Req()req:AuthRequest,@Param('id')id:string){return this.runtime.studio.preview(req.principal,id);}
 @Post('cvs/:id/analysis') @ApiBody(bodySchema) analyze(@Req()req:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.runtime.studio.createAnalysis(req.principal,id,body,this.key(req));}
 @Get('cvs/:id/analyses') analyses(@Req()req:AuthRequest,@Param('id')id:string){return this.runtime.studio.analyses(req.principal,id);}
 @Get('ai-jobs/:id') job(@Req()req:AuthRequest,@Param('id')id:string){return this.runtime.studio.job(req.principal,id);}
 @Post('ai-jobs/:id/import') @ApiBody(bodySchema) import(@Req()req:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.runtime.studio.importProfile(req.principal,id,body);}
 @Post('letters/template') @ApiBody(bodySchema) @ApiOperation({summary:'Créer une lettre à partir du modèle FR/EN étiqueté'}) template(@Req()req:AuthRequest,@Body()body:unknown){return this.runtime.studio.createTemplate(req.principal,body,this.key(req));}
 @Post('letters/:id/generate') @ApiBody(bodySchema) generate(@Req()req:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.runtime.studio.generate(req.principal,id,body,this.key(req));}
 @Post('letters/:id/restore') @ApiBody(bodySchema) restore(@Req()req:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.runtime.studio.restore(req.principal,id,body,this.key(req));}
 @Post('applications/:id/status') @ApiBody(bodySchema) status(@Req()req:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.runtime.applications.transition(req.principal,id,body,this.key(req));}
 @Post('applications/:id/send') send(){throw new DataError('SENDING_UNAVAILABLE','Gmail et les quotas d’envoi ne sont pas intégrés. Le brouillon est conservé.',503);}
}
@Catch()
class MongoApiFilter implements ExceptionFilter {catch(error:unknown,host:ArgumentsHost){const res=host.switchToHttp().getResponse<Response>();const status=error instanceof DataError?error.status:error instanceof DomainError?error.httpStatus:error instanceof HttpException?error.getStatus():500;const code=error instanceof DataError||error instanceof DomainError?error.code:'REQUEST_ERROR';const message=error instanceof DataError||error instanceof DomainError?error.message:status===413?'La demande dépasse la taille autorisée.':'Le service est indisponible. Réessayez.';res.status(status).json({error:{code,message}});}}
export async function createMongoApp(runtime:MongoRuntime){
 if(process.env.NODE_ENV==='production'&&process.env.SMARTAPPLY_ISOLATED_TEST==='1')throw new Error('Isolated test identities are forbidden in production.');
 @Module({controllers:[...(process.env.MODULE_AUTH_PROVIDER==='asma'?[]:[GoogleController,AuthController]),MongoSessionController,MongoFilesController,MongoAiController],providers:[{provide:AUTH,useValue:runtime.auth??null},{provide:MongoRuntime,useValue:runtime},MongoGuard]})class AppModule{}
 const app=await NestFactory.create(AppModule,{logger:false});app.use(helmet());app.use(cookieParser());
 const origins=(process.env.FRONTEND_ORIGINS??'http://127.0.0.1:3000,http://localhost:3000').split(',').map(v=>v.trim());origins.push('http://127.0.0.1:4100','http://localhost:4100');const limits=new Map<string,{time:number;count:number}>();
 app.use((req:Request,res:Response,next:()=>void)=>{res.setHeader('Cache-Control','no-store, private');const who=req.ip??'unknown';let counter=limits.get(who);if(!counter||Date.now()-counter.time>60000){counter={time:Date.now(),count:0};limits.set(who,counter);}if(++counter.count>180)return res.status(429).json({error:{code:'RATE_LIMIT',message:'Trop de demandes.'}});if(limits.size>10000)for(const [key,value]of limits)if(Date.now()-value.time>60000)limits.delete(key);
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&(req.headers['x-smartapply-request']!=='1'||req.headers.origin&&!origins.includes(req.headers.origin)))return res.status(403).json({error:{code:'CSRF',message:'Origine non autorisée.'}});next();});
 app.useGlobalFilters(new MongoApiFilter());const document=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('SmartApply — services NestJS').setDescription('MongoDB. CRUD via Next.js Server Actions. Authentification intégrée : sessions, vérification email et récupération. Inscription et CRUD via Next.js Server Actions.').setVersion('2.0').addBearerAuth().build());SwaggerModule.setup('docs',app,document,{swaggerOptions:{persistAuthorization:false,requestInterceptor:(req:any)=>{req.headers['X-Smartapply-Request']='1';return req;}}});await app.init();return app;
}
