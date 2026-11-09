import {Controller,Get,Post,Patch,Delete,Param,Body,Req,UseGuards,Inject,HttpCode} from '@nestjs/common';
import {ApiTags,ApiBearerAuth,ApiHeader,ApiBody,ApiOperation} from '@nestjs/swagger';
import {AuthGuard,type AuthRequest} from '../auth.js';
import {StudioService} from './service.js';
const objectBody={schema:{type:'object' as const,additionalProperties:true}};
@ApiTags('CV analysis') @ApiBearerAuth() @ApiHeader({name:'X-Smartapply-Request',example:'1'})
@Controller('api') @UseGuards(AuthGuard)
export class AnalysisController{
 constructor(@Inject(StudioService)private studio:StudioService){}
 @Post('cvs/:id/analysis/preview') @ApiOperation({summary:'Extraire localement le texte et préparer sa suppression des données personnelles'})
 preview(@Req()r:AuthRequest,@Param('id')id:string){return this.studio.preview(r.actor,id);}
 @Post('cvs/:id/analysis') @HttpCode(202) @ApiBody({schema:{type:'object',required:['approvedText','sourceHash','consent'],properties:{approvedText:{type:'string'},sourceHash:{type:'string'},consent:{type:'boolean',enum:[true]},targetDescription:{type:'string'},language:{type:'string',enum:['fr','en']}}}})
 analyze(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.studio.createAnalysis(r.actor,id,body,String(r.headers['idempotency-key']??''));}
 @Get('cvs/:id/analyses') analyses(@Req()r:AuthRequest,@Param('id')id:string){return this.studio.analyses(r.actor,id);}
 @Get('ai-jobs/:id') job(@Req()r:AuthRequest,@Param('id')id:string){return this.studio.job(r.actor,id);}
 @Post('ai-jobs/:id/import') @ApiBody(objectBody) import(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.studio.importProfile(r.actor,id,body);}
}
@ApiTags('Letters and versions') @ApiBearerAuth() @ApiHeader({name:'X-Smartapply-Request',example:'1'})
@Controller('api/letters') @UseGuards(AuthGuard)
export class LettersController{
 constructor(@Inject(StudioService)private studio:StudioService){}
 @Get() list(@Req()r:AuthRequest){return this.studio.letters(r.actor);}
 @Post() @ApiBody({schema:{type:'object',required:['title','language'],properties:{title:{type:'string'},language:{type:'string',enum:['fr','en']},company:{type:'string'},role:{type:'string'},source:{type:'string',enum:['manual','template']}}}})
 create(@Req()r:AuthRequest,@Body()body:unknown){return this.studio.createLetter(r.actor,body,String(r.headers['idempotency-key']??''));}
 @Get(':id') get(@Req()r:AuthRequest,@Param('id')id:string){return this.studio.letter(r.actor,id);}
 @Patch(':id') @ApiBody(objectBody) patch(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.studio.patchLetter(r.actor,id,body);}
 @Delete(':id') remove(@Req()r:AuthRequest,@Param('id')id:string){return this.studio.removeLetter(r.actor,id);}
 @Get(':id/versions') versions(@Req()r:AuthRequest,@Param('id')id:string){return this.studio.versions(r.actor,id);}
 @Post(':id/versions') @ApiBody(objectBody) save(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.studio.saveVersion(r.actor,id,body,String(r.headers['idempotency-key']??''));}
 @Post(':id/restore') @ApiBody(objectBody) restore(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.studio.restore(r.actor,id,body,String(r.headers['idempotency-key']??''));}
 @Post(':id/generate') @HttpCode(202) @ApiBody({schema:{type:'object',required:['version','consent'],properties:{version:{type:'integer'},consent:{type:'boolean',enum:[true]}}}})
 generate(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.studio.generate(r.actor,id,body,String(r.headers['idempotency-key']??''));}
}
