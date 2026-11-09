import type { InterviewMode, Recommendation } from '../types/interview';

export interface CreateInterviewPayload {
  scheduledStart: string;
  durationMinutes: number;
  mode: InterviewMode;
  locationText?: string;
  meetingUrl?: string;
  interviewerUserIds?: string[];
  message?: string;
}

export interface UpdateInterviewPayload {
  version: number;
  action?: 'RESCHEDULE' | 'CANCEL' | 'COMPLETE' | 'NO_SHOW';
  scheduledStart?: string;
  durationMinutes?: number;
  mode?: InterviewMode;
  locationText?: string;
  meetingUrl?: string;
  cancelReason?: string;
}

export interface RespondPayload {
  action: 'ACCEPT' | 'DECLINE' | 'REQUEST_RESCHEDULE';
  note?: string;
}

export interface EvaluationPayload {
  criteriaScores: Record<string, number>;
  overallRating: number;
  recommendation: Recommendation;
  privateComment?: string;
}

export interface ScheduleConflict {
  party: 'CANDIDATE' | 'INTERVIEWER';
  name: string;
  start: string;
  end: string;
  interviewId: string;
}
