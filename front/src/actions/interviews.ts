'use server';

import type { CurrentUser } from '../types/interview';
import type {
  CreateInterviewPayload,
  EvaluationPayload,
  RespondPayload,
  UpdateInterviewPayload,
} from '../services/payloads';
import * as store from '../lib/interview-store';

export type ActionResult = { ok: true; data: unknown } | { ok: false; error: string };

async function run(work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    return { ok: true, data: JSON.parse(JSON.stringify(await work())) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erreur serveur' };
  }
}

export async function getApplications() {
  return run(() => store.listApplications());
}

export async function getInterviewers(actor: CurrentUser) {
  return run(() => store.listInterviewers(actor));
}

export async function listInterviews(actor: CurrentUser) {
  return run(() => store.listInterviews(actor));
}

export async function getInterview(actor: CurrentUser, id: string) {
  return run(() => store.getInterview(actor, id));
}

export async function createInterview(
  actor: CurrentUser,
  applicationId: string,
  payload: CreateInterviewPayload,
  idempotencyKey?: string,
) {
  return run(() => store.createInterview(actor, applicationId, payload, idempotencyKey));
}

export async function updateInterview(actor: CurrentUser, id: string, payload: UpdateInterviewPayload) {
  return run(() => store.updateInterview(actor, id, payload));
}

export async function respondInterview(actor: CurrentUser, id: string, payload: RespondPayload) {
  return run(() => store.respondInterview(actor, id, payload));
}

export async function evaluateInterview(actor: CurrentUser, id: string, payload: EvaluationPayload) {
  return run(() => store.evaluateInterview(actor, id, payload));
}

export async function getEvaluations(actor: CurrentUser, interviewId: string) {
  return run(() => store.listEvaluations(actor, interviewId));
}

export async function deleteInterview(actor: CurrentUser, id: string) {
  return run(() => store.deleteInterview(actor, id));
}
