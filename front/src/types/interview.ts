export type InterviewStatus =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'RESCHEDULE_REQUESTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type InterviewMode = 'ONSITE' | 'VIDEO' | 'PHONE';

export type ParticipantRole = 'CANDIDATE' | 'INTERVIEWER';
export type ParticipantResponse = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type Recommendation = 'ADVANCE' | 'HOLD' | 'REJECT';

export interface Participant {
  interviewId: string;
  userId: string;
  name?: string;
  email?: string;
  role: ParticipantRole;
  response: ParticipantResponse;
  respondedAt: string | null;
}

export interface Interview {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  candidateTitle: string;
  companyId: string;
  companyName: string;
  candidateUserId: string;
  roundNumber: number;
  scheduledStart: string; // ISO 8601 UTC
  scheduledEnd: string;   // ISO 8601 UTC
  mode: InterviewMode;
  locationText: string | null;
  meetingUrl: string | null;
  status: InterviewStatus;
  rescheduleCount: number;
  cancelReason: string | null;
  createdBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  participants?: Participant[];
}

export interface Evaluation {
  id: string;
  interviewId: string;
  evaluatorUserId: string;
  evaluatorName: string;
  criteriaScores: Record<string, number>;
  overallRating: number;
  recommendation: Recommendation;
  privateComment: string | null;
  submittedAt: string;
}

export interface ApplicationSummary {
  id: string;
  candidateUserId?: string;
  candidateName: string;
  candidateEmail: string;
  positionTitle: string;
  companyId?: string;
  companyName: string;
  status: 'SENT' | 'PENDING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
  cvUrl?: string;
  matchScore?: number;
}

export interface Interviewer {
  id: string;
  name: string;
  title: string;
  email: string;
  companyId?: string;
}

export type UserRole = 'ENTERPRISE' | 'CANDIDATE' | 'ADMIN';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}
