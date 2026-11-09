import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Actor, CurrentActor } from '../actor';
import { CreateInterviewDto, EvaluationDto, ListInterviewsQuery, RespondDto, UpdateInterviewDto } from './dto';
import { InterviewsService } from './interviews.service';

@Controller('api/v1')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get('health')
  health() {
    return { ok: true, database: 'mongodb-atlas' };
  }

  @Get('applications')
  applications() {
    return this.interviews.listApplications();
  }

  @Get('interviewers')
  interviewers(@CurrentActor() actor: Actor) {
    return this.interviews.listInterviewers(actor);
  }

  @Get('interviews')
  list(@CurrentActor() actor: Actor, @Query() query: ListInterviewsQuery) {
    return this.interviews.list(actor, query);
  }

  @Get('interviews/:id')
  get(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.interviews.get(actor, id);
  }

  @Post('applications/:applicationId/interviews')
  create(
    @CurrentActor() actor: Actor,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateInterviewDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.interviews.create(actor, applicationId, dto, idempotencyKey);
  }

  @Patch('interviews/:id')
  update(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.interviews.update(actor, id, dto);
  }

  @Post('interviews/:id/respond')
  @HttpCode(200)
  respond(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() dto: RespondDto) {
    return this.interviews.respond(actor, id, dto);
  }

  @Post('interviews/:id/evaluation')
  evaluate(@CurrentActor() actor: Actor, @Param('id') id: string, @Body() dto: EvaluationDto) {
    return this.interviews.evaluate(actor, id, dto);
  }

  @Get('interviews/:id/evaluations')
  evaluations(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.interviews.listEvaluations(actor, id);
  }

  @Delete('interviews/:id')
  @HttpCode(200)
  remove(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.interviews.remove(actor, id);
  }
}
