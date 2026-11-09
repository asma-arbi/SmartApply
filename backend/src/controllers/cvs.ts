import {Controller,Get,Post,Delete,Param,Body,Req,Res,UseGuards,Inject,UploadedFile,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {Request,Response} from 'express';
import {AuthService,AuthGuard,type AuthRequest} from '../auth.js';
import {DomainError} from '../contracts.js';
import {ModuleService} from '../service.js';
import {docxText} from '../files.js';
@Controller('api') @UseGuards(AuthGuard)
export class CvsController{
 constructor(@Inject(ModuleService)private service:ModuleService,@Inject(AuthService)private auth:AuthService){}
 private key(req:Request){return String(req.headers['idempotency-key']??'');}
 @Get('cvs') cvs(@Req()r:AuthRequest){return this.service.cvs(r.actor);}
 @Post('cvs') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1,fields:1}})) upload(@Req()r:AuthRequest,@UploadedFile()f:{buffer:Buffer;originalname:string},@Body()body:any){if(!f)throw new DomainError('FILE_REQUIRED','Choisissez un CV.');return this.service.upload(r.actor,f.buffer,f.originalname,this.key(r),body.replaceId);}
 @Post('cvs/:id/primary') primary(@Req()r:AuthRequest,@Param('id')id:string){return this.service.primary(r.actor,id);}
 @Delete('cvs/:id') remove(@Req()r:AuthRequest,@Param('id')id:string){return this.service.deleteCv(r.actor,id);}
 @Post('cvs/:id/access') async access(@Req()r:AuthRequest,@Param('id')id:string){await this.service.getCv(r.actor,id);return this.auth.link(r.actor,id);}
 @Get('cvs/:id/file') async file(@Req()r:AuthRequest,@Param('id')id:string,@Res()res:Response){this.auth.verifyLink(r.actor,id,String(r.query.token??''));const cv=await this.service.getCv(r.actor,id);const bytes=await this.service.storage.read(cv.storage_path);
  res.set({'Content-Type':cv.mime_type,'Content-Disposition':`${r.query.download==='1'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(cv.original_filename)}`,'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});res.send(bytes);}
 @Get('cvs/:id/text') async text(@Req()r:AuthRequest,@Param('id')id:string){this.auth.verifyLink(r.actor,id,String(r.query.token??''));const cv=await this.service.getCv(r.actor,id);if(cv.mime_type==='application/pdf')throw new DomainError('PREVIEW_TYPE','Utilisez l’aperçu PDF.');return {text:await docxText(await this.service.storage.read(cv.storage_path))};}

}
