import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { InterviewMode, InterviewStatus, Recommendation } from './schemas';

const MODES: InterviewMode[] = ['ONSITE', 'VIDEO', 'PHONE'];
const STATUSES: InterviewStatus[] = [
  'PROPOSED',
  'CONFIRMED',
  'DECLINED',
  'RESCHEDULE_REQUESTED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
];

export class CreateInterviewDto {
  @IsISO8601()
  scheduledStart!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsISO8601()
  scheduledEnd?: string;

  @IsIn(MODES)
  mode!: InterviewMode;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  locationText?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(2000)
  meetingUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  interviewerUserIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class UpdateInterviewDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsIn(['RESCHEDULE', 'CANCEL', 'COMPLETE', 'NO_SHOW'])
  action?: 'RESCHEDULE' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW';

  @IsOptional()
  @IsISO8601()
  scheduledStart?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsISO8601()
  scheduledEnd?: string;

  @IsOptional()
  @IsIn(MODES)
  mode?: InterviewMode;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  locationText?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(2000)
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancelReason?: string;
}

export class RespondDto {
  @IsIn(['ACCEPT', 'DECLINE', 'REQUEST_RESCHEDULE'])
  action!: 'ACCEPT' | 'DECLINE' | 'REQUEST_RESCHEDULE';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class EvaluationDto {
  @IsObject()
  criteriaScores!: Record<string, number>;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @IsIn(['ADVANCE', 'HOLD', 'REJECT'])
  recommendation!: Recommendation;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  privateComment?: string;
}

export class ListInterviewsQuery {
  @IsOptional()
  @IsIn(STATUSES)
  status?: InterviewStatus;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 50;
}
