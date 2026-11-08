import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewsController } from './interviews/interviews.controller';
import {
  Application,
  ApplicationSchema,
  Evaluation,
  EvaluationSchema,
  Interview,
  InterviewSchema,
  Interviewer,
  InterviewerSchema,
} from './interviews/schemas';
import { InterviewsService } from './interviews/interviews.service';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Interview.name, schema: InterviewSchema },
      { name: Evaluation.name, schema: EvaluationSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Interviewer.name, schema: InterviewerSchema },
    ]),
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService, SeedService],
})
export class AppModule {}
