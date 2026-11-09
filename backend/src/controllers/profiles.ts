import {Controller,Get,Patch,Body,Req,UseGuards,Inject} from '@nestjs/common';

import {Request} from 'express';
import {AuthService,AuthGuard,type AuthRequest} from '../auth.js';

import {ModuleService} from '../service.js';

@Controller('api') @UseGuards(AuthGuard)
export class ProfilesController{
 constructor(@Inject(ModuleService)private service:ModuleService,@Inject(AuthService)private auth:AuthService){}
 private key(req:Request){return String(req.headers['idempotency-key']??'');}
 @Get('profile') profile(@Req()r:AuthRequest){return this.service.profile(r.actor);}
 @Patch('profile') updateProfile(@Req()r:AuthRequest,@Body()body:unknown){return this.service.saveProfile(r.actor,body);}

}
