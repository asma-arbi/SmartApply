import {Controller,Get,Post,Patch,Param,Body,Req,UseGuards,Inject} from '@nestjs/common';

import {Request} from 'express';
import {AuthService,AuthGuard,type AuthRequest} from '../auth.js';

import {ModuleService} from '../service.js';

@Controller('api') @UseGuards(AuthGuard)
export class ApplicationsController{
 constructor(@Inject(ModuleService)private service:ModuleService,@Inject(AuthService)private auth:AuthService){}
 private key(req:Request){return String(req.headers['idempotency-key']??'');}
 @Get('jobs') jobs(){return this.service.jobs();}
 @Get('companies') companies(){return this.service.directory();}
 @Get('applications') applications(@Req()r:AuthRequest){return this.service.applications(r.actor);}
 @Post('applications') create(@Req()r:AuthRequest,@Body()body:unknown){return this.service.createApplication(r.actor,body,this.key(r));}
 @Get('applications/:id') detail(@Req()r:AuthRequest,@Param('id')id:string){return this.service.detail(r.actor,id);}
 @Patch('applications/:id/draft') draft(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.service.editDraft(r.actor,id,body);}
 @Post('applications/:id/send') send(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.service.send(r.actor,id,body,this.key(r));}
 @Post('applications/:id/status') status(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.service.updateStatus(r.actor,id,body,this.key(r));}
 @Patch('applications/:id/note') note(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.service.saveNote(r.actor,id,body);}
}
