import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InterviewStatus =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'RESCHEDULE_REQUESTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type InterviewMode = 'ONSITE' | 'VIDEO' | 'PHONE';
export type Recommendation = 'ADVANCE' | 'HOLD' | 'REJECT';

@Schema({ _id: false })
export class Participant {
  @Prop({ required: true })
  userId!: string;

  @Prop()
  name?: string;

  @Prop()
  email?: string;

  @Prop({ required: true, enum: ['CANDIDATE', 'INTERVIEWER'] })
  role!: 'CANDIDATE' | 'INTERVIEWER';

  @Prop({ required: true, enum: ['PENDING', 'ACCEPTED', 'DECLINED'], default: 'PENDING' })
  response!: 'PENDING' | 'ACCEPTED' | 'DECLINED';

  @Prop({ type: Date, default: null })
  respondedAt!: Date | null;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

@Schema({ collection: 'interviews', timestamps: true })
export class Interview {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  applicationId!: string;

  @Prop({ required: true })
  candidateName!: string;

  @Prop({ required: true })
  candidateEmail!: string;

  @Prop({ default: '' })
  candidateTitle!: string;

  @Prop({ required: true })
  companyId!: string;

  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: true })
  candidateUserId!: string;

  @Prop({ required: true, default: 1 })
  roundNumber!: number;

  @Prop({ type: Date, required: true })
  scheduledStart!: Date;

  @Prop({ type: Date, required: true })
  scheduledEnd!: Date;

  @Prop({ required: true, enum: ['ONSITE', 'VIDEO', 'PHONE'] })
  mode!: InterviewMode;

  @Prop({ type: String, default: null })
  locationText!: string | null;

  @Prop({ type: String, default: null })
  meetingUrl!: string | null;

  @Prop({ required: true, default: 'PROPOSED' })
  status!: InterviewStatus;

  @Prop({ default: 0 })
  rescheduleCount!: number;

  @Prop({ type: String, default: null })
  cancelReason!: string | null;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ type: String, default: null })
  idempotencyKey!: string | null;

  @Prop({ default: 1 })
  version!: number;

  @Prop({ type: [ParticipantSchema], default: [] })
  participants!: Participant[];
}

export type InterviewDocument = HydratedDocument<Interview>;
export const InterviewSchema = SchemaFactory.createForClass(Interview);
InterviewSchema.index({ companyId: 1, scheduledStart: 1 });
InterviewSchema.index({ candidateUserId: 1, scheduledStart: 1 });
InterviewSchema.index({ companyId: 1, idempotencyKey: 1 }, { sparse: true });

@Schema({ collection: 'evaluations', timestamps: false })
export class Evaluation {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  interviewId!: string;

  @Prop({ required: true })
  evaluatorUserId!: string;

  @Prop({ required: true })
  evaluatorName!: string;

  @Prop({ type: Object, required: true })
  criteriaScores!: Record<string, number>;

  @Prop({ required: true })
  overallRating!: number;

  @Prop({ required: true, enum: ['ADVANCE', 'HOLD', 'REJECT'] })
  recommendation!: Recommendation;

  @Prop({ type: String, default: null })
  privateComment!: string | null;

  @Prop({ type: Date, required: true })
  submittedAt!: Date;
}

export type EvaluationDocument = HydratedDocument<Evaluation>;
export const EvaluationSchema = SchemaFactory.createForClass(Evaluation);
EvaluationSchema.index({ interviewId: 1, evaluatorUserId: 1 }, { unique: true });

@Schema({ collection: 'applications', timestamps: false })
export class Application {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  candidateUserId!: string;

  @Prop({ required: true })
  candidateName!: string;

  @Prop({ required: true })
  candidateEmail!: string;

  @Prop({ required: true })
  positionTitle!: string;

  @Prop({ required: true })
  companyId!: string;

  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: true, enum: ['SENT', 'PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'] })
  status!: 'SENT' | 'PENDING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';

  @Prop()
  matchScore?: number;
}

export type ApplicationDocument = HydratedDocument<Application>;
export const ApplicationSchema = SchemaFactory.createForClass(Application);

@Schema({ collection: 'interviewers', timestamps: false })
export class Interviewer {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  companyId!: string;
}

export type InterviewerDocument = HydratedDocument<Interviewer>;
export const InterviewerSchema = SchemaFactory.createForClass(Interviewer);
