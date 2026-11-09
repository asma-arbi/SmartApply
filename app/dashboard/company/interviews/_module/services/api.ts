import {
  ApplicationSummary,
  CurrentUser,
  Evaluation,
  Interview,
  Interviewer,
} from '../types/interview';
import {
  type ActionResult,
  createInterview as createInterviewAction,
  deleteInterview as deleteInterviewAction,
  evaluateInterview as evaluateInterviewAction,
  getApplications,
  getEvaluations,
  getInterview,
  getInterviewers,
  listInterviews,
  respondInterview as respondInterviewAction,
  updateInterview as updateInterviewAction,
} from '../actions/interviews';
import {
  CreateInterviewPayload,
  EvaluationPayload,
  RespondPayload,
  ScheduleConflict,
  UpdateInterviewPayload,
} from './payloads';

export type {
  CreateInterviewPayload,
  EvaluationPayload,
  RespondPayload,
  ScheduleConflict,
  UpdateInterviewPayload,
};

async function unwrap(result: ActionResult): Promise<unknown> {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export class InterviewService {
  async getApplications(): Promise<ApplicationSummary[]> {
    return (await unwrap(await getApplications())) as ApplicationSummary[];
  }

  async getInterviewers(actor: CurrentUser): Promise<Interviewer[]> {
    return (await unwrap(await getInterviewers(actor))) as Interviewer[];
  }

  async checkConflicts(
    actor: CurrentUser,
    startIso: string,
    endIso: string,
    candidateUserId: string,
    interviewerIds: string[] = [],
    excludeInterviewId?: string,
  ): Promise<ScheduleConflict[]> {
    const interviews = await this.listInterviews(actor);
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const conflicts: ScheduleConflict[] = [];

    for (const item of interviews) {
      if (excludeInterviewId && item.id === excludeInterviewId) continue;
      if (['CANCELLED', 'DECLINED', 'NO_SHOW'].includes(item.status)) continue;
      const overlaps = start < new Date(item.scheduledEnd).getTime() && end > new Date(item.scheduledStart).getTime();
      if (!overlaps) continue;
      if (item.candidateUserId === candidateUserId) {
        conflicts.push({
          party: 'CANDIDATE',
          name: item.candidateName,
          start: item.scheduledStart,
          end: item.scheduledEnd,
          interviewId: item.id,
        });
      }
      for (const participant of item.participants || []) {
        if (participant.role === 'INTERVIEWER' && interviewerIds.includes(participant.userId)) {
          conflicts.push({
            party: 'INTERVIEWER',
            name: participant.name || 'Interviewer',
            start: item.scheduledStart,
            end: item.scheduledEnd,
            interviewId: item.id,
          });
        }
      }
    }
    return conflicts;
  }

  async listInterviews(actor: CurrentUser): Promise<Interview[]> {
    return (await unwrap(await listInterviews(actor))) as Interview[];
  }

  async getInterview(actor: CurrentUser, id: string): Promise<Interview> {
    return (await unwrap(await getInterview(actor, id))) as Interview;
  }

  async createInterview(actor: CurrentUser, applicationId: string, payload: CreateInterviewPayload): Promise<Interview> {
    return (await unwrap(await createInterviewAction(actor, applicationId, payload, `idem-${Date.now()}`))) as Interview;
  }

  async updateInterview(actor: CurrentUser, id: string, payload: UpdateInterviewPayload): Promise<Interview> {
    return (await unwrap(await updateInterviewAction(actor, id, payload))) as Interview;
  }

  async respondInterview(actor: CurrentUser, id: string, payload: RespondPayload): Promise<Interview> {
    return (await unwrap(await respondInterviewAction(actor, id, payload))) as Interview;
  }

  async evaluateInterview(actor: CurrentUser, id: string, payload: EvaluationPayload): Promise<Evaluation> {
    return (await unwrap(await evaluateInterviewAction(actor, id, payload))) as Evaluation;
  }

  async getEvaluations(actor: CurrentUser, interviewId: string): Promise<Evaluation[]> {
    if (actor.role === 'CANDIDATE') return [];
    return (await unwrap(await getEvaluations(actor, interviewId))) as Evaluation[];
  }

  async deleteInterview(actor: CurrentUser, id: string): Promise<void> {
    await unwrap(await deleteInterviewAction(actor, id));
  }
}

export const apiService = new InterviewService();
