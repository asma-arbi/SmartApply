'use server';

import { getSessionUser } from '@/lib/auth/session';
import { getDb } from '@/lib/mongodb';
import type { CurrentUser } from '../types/interview';
import type {
  CreateInterviewPayload,
  EvaluationPayload,
  RespondPayload,
  UpdateInterviewPayload,
} from '../services/payloads';
import * as store from '../lib/interview-store';

export type ActionResult = { ok: true; data: unknown } | { ok: false; error: string };

const ROLE_MAP: Record<string, CurrentUser['role']> = {
  entreprise: 'ENTERPRISE',
  candidat: 'CANDIDATE',
  admin: 'ADMIN',
};

/**
 * L'utilisateur est toujours déterminé côté serveur à partir de la session.
 * L'argument "actor" envoyé par le navigateur est ignoré (impossible à falsifier).
 */
async function resolveActor(): Promise<CurrentUser> {
  const session = await getSessionUser();
  if (!session) throw new Error('Non authentifié');

  const { user } = session;
  const role = ROLE_MAP[user.role] ?? 'CANDIDATE';

  let companyName: string | undefined;
  if (role === 'ENTERPRISE') {
    const db = await getDb();
    const company = await db.collection('companies').findOne({ id: user.id });
    companyName = (company as { name?: string } | null)?.name;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    companyId: role === 'ENTERPRISE' ? user.id : undefined,
    companyName,
  };
}

async function run(work: (actor: CurrentUser) => Promise<unknown>): Promise<ActionResult> {
  try {
    const actor = await resolveActor();
    return { ok: true, data: JSON.parse(JSON.stringify(await work(actor))) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erreur serveur' };
  }
}

export async function getApplications() {
  return run(() => store.listApplications());
}

export async function getInterviewers(_actor?: CurrentUser) {
  return run((actor) => store.listInterviewers(actor));
}

export async function listInterviews(_actor?: CurrentUser) {
  return run((actor) => store.listInterviews(actor));
}

export async function getInterview(_actor: CurrentUser | undefined, id: string) {
  return run((actor) => store.getInterview(actor, id));
}

export async function createInterview(
  _actor: CurrentUser | undefined,
  applicationId: string,
  payload: CreateInterviewPayload,
  idempotencyKey?: string,
) {
  return run((actor) => store.createInterview(actor, applicationId, payload, idempotencyKey));
}

export async function updateInterview(
  _actor: CurrentUser | undefined,
  id: string,
  payload: UpdateInterviewPayload,
) {
  return run((actor) => store.updateInterview(actor, id, payload));
}

export async function respondInterview(
  _actor: CurrentUser | undefined,
  id: string,
  payload: RespondPayload,
) {
  return run((actor) => store.respondInterview(actor, id, payload));
}

export async function evaluateInterview(
  _actor: CurrentUser | undefined,
  id: string,
  payload: EvaluationPayload,
) {
  return run((actor) => store.evaluateInterview(actor, id, payload));
}

export async function getEvaluations(_actor: CurrentUser | undefined, interviewId: string) {
  return run((actor) => store.listEvaluations(actor, interviewId));
}

export async function deleteInterview(_actor: CurrentUser | undefined, id: string) {
  return run((actor) => store.deleteInterview(actor, id));
}