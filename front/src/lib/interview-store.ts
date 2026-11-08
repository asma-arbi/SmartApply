import { randomUUID } from 'crypto';
import type { CurrentUser } from '../types/interview';
import type {
  CreateInterviewPayload,
  EvaluationPayload,
  RespondPayload,
  UpdateInterviewPayload,
} from '../services/payloads';
import { connectDb } from './mongodb';
import { ApplicationModel, EvaluationModel, InterviewModel, InterviewerModel } from './models';

type Role = CurrentUser['role'];
type InterviewStatus =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'RESCHEDULE_REQUESTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

interface Participant {
  userId: string;
  name?: string;
  email?: string;
  role: 'CANDIDATE' | 'INTERVIEWER';
  response: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  respondedAt: Date | null;
}

interface InterviewRecord {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  candidateTitle: string;
  companyId: string;
  companyName: string;
  candidateUserId: string;
  roundNumber: number;
  scheduledStart: Date;
  scheduledEnd: Date;
  mode: string;
  locationText: string | null;
  meetingUrl: string | null;
  status: InterviewStatus;
  rescheduleCount: number;
  cancelReason: string | null;
  createdBy: string;
  idempotencyKey: string | null;
  version: number;
  participants: Participant[];
  createdAt?: Date;
  updatedAt?: Date;
}

const CLOSED: InterviewStatus[] = ['CANCELLED', 'DECLINED', 'NO_SHOW'];
const MODES = ['ONSITE', 'VIDEO', 'PHONE'];

function fail(message: string): never {
  throw new Error(message);
}

function stripMongo<T extends object>(doc: T) {
  const { _id, __v, ...rest } = doc as T & { _id?: unknown; __v?: unknown };
  void _id;
  void __v;
  return rest;
}

function toView(interview: InterviewRecord, actor: CurrentUser) {
  const view = stripMongo(interview);
  if (actor.role === 'CANDIDATE') {
    const { participants, ...rest } = view;
    void participants;
    return rest;
  }
  return view;
}

function assertEnterprise(actor: CurrentUser) {
  if (actor.role === 'CANDIDATE') fail('Action réservée à l’entreprise');
}

async function requireVisible(actor: CurrentUser, id: string) {
  const interview = await InterviewModel.findOne({ id }).lean<InterviewRecord | null>();
  if (!interview) fail('Entretien introuvable');
  if (
    actor.role === 'CANDIDATE' &&
    interview.candidateUserId !== actor.id &&
    interview.candidateEmail !== actor.email
  ) {
    fail('Entretien introuvable');
  }
  if (actor.role === 'ENTERPRISE' && actor.companyId && interview.companyId !== actor.companyId) {
    fail('Entretien introuvable');
  }
  return interview;
}

async function assertNoOverlap(userIds: string[], start: Date, end: Date, excludeId?: string) {
  if (!userIds.length) return;
  const hit = await InterviewModel.findOne({
    ...(excludeId ? { id: { $ne: excludeId } } : {}),
    status: { $nin: CLOSED },
    scheduledStart: { $lt: end },
    scheduledEnd: { $gt: start },
    $or: [{ candidateUserId: { $in: userIds } }, { 'participants.userId': { $in: userIds } }],
  }).lean<InterviewRecord | null>();
  if (hit) {
    fail(`Conflit d’agenda avec l’entretien de ${hit.candidateName} (${hit.scheduledStart.toISOString()})`);
  }
}

function assertActor(actor: CurrentUser) {
  const roles: Role[] = ['ENTERPRISE', 'CANDIDATE', 'ADMIN'];
  if (!actor?.id || !actor.email || !roles.includes(actor.role)) {
    fail('Utilisateur invalide');
  }
}

export async function listApplications() {
  await connectDb();
  const items = await ApplicationModel.find({ status: { $in: ['SENT', 'PENDING', 'INTERVIEW'] } }).lean();
  return items.map((item) => stripMongo(item));
}

export async function listInterviewers(actor: CurrentUser) {
  assertActor(actor);
  await connectDb();
  const filter = actor.companyId ? { companyId: actor.companyId } : {};
  const items = await InterviewerModel.find(filter).lean();
  return items.map((item) => stripMongo(item));
}

export async function listInterviews(actor: CurrentUser) {
  assertActor(actor);
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (actor.role === 'CANDIDATE') {
    filter.$or = [{ candidateUserId: actor.id }, { candidateEmail: actor.email }];
  } else if (actor.role === 'ENTERPRISE' && actor.companyId) {
    filter.companyId = actor.companyId;
  }
  const items = await InterviewModel.find(filter).sort({ scheduledStart: 1 }).limit(100).lean<InterviewRecord[]>();
  return items.map((item) => toView(item, actor));
}

export async function getInterview(actor: CurrentUser, id: string) {
  assertActor(actor);
  await connectDb();
  const interview = await requireVisible(actor, id);
  return toView(interview, actor);
}

export async function createInterview(
  actor: CurrentUser,
  applicationId: string,
  dto: CreateInterviewPayload,
  idempotencyKey?: string,
) {
  assertActor(actor);
  assertEnterprise(actor);
  if (!MODES.includes(dto.mode)) fail('Mode d’entretien invalide');
  await connectDb();

  if (idempotencyKey && actor.companyId) {
    const existing = await InterviewModel.findOne({ companyId: actor.companyId, idempotencyKey }).lean<InterviewRecord | null>();
    if (existing) return toView(existing, actor);
  }

  const application = await ApplicationModel.findOne({ id: applicationId }).lean<{
    id: string;
    status: string;
    candidateUserId: string;
    candidateName: string;
    candidateEmail: string;
    positionTitle: string;
    companyId: string;
    companyName: string;
  } | null>();
  if (!application) fail('Candidature non trouvée');
  if (!['SENT', 'PENDING', 'INTERVIEW'].includes(application.status)) {
    fail('Cette candidature n’est pas éligible à un entretien');
  }

  const start = new Date(dto.scheduledStart);
  const end = new Date(start.getTime() + (dto.durationMinutes ?? 60) * 60_000);
  if (Number.isNaN(start.getTime()) || end <= start) fail('Créneau horaire invalide');
  if (start.getTime() < Date.now() + 30 * 60_000) {
    fail('L’entretien doit être planifié au moins 30 minutes à l’avance');
  }
  if (dto.meetingUrl && !/^https?:\/\/\S+$/i.test(dto.meetingUrl)) fail('URL de réunion invalide');

  const interviewerIds = dto.interviewerUserIds ?? [];
  const people = await InterviewerModel.find({ id: { $in: interviewerIds } }).lean<
    { id: string; name: string; email: string }[]
  >();
  const participants: Participant[] = [
    {
      userId: application.candidateUserId,
      name: application.candidateName,
      email: application.candidateEmail,
      role: 'CANDIDATE',
      response: 'PENDING',
      respondedAt: null,
    },
    ...people.map((person) => ({
      userId: person.id,
      name: person.name,
      email: person.email,
      role: 'INTERVIEWER' as const,
      response: 'ACCEPTED' as const,
      respondedAt: new Date(),
    })),
  ];

  await assertNoOverlap([application.candidateUserId, ...interviewerIds], start, end);

  const created = await InterviewModel.create({
    id: randomUUID(),
    applicationId: application.id,
    candidateName: application.candidateName,
    candidateEmail: application.candidateEmail,
    candidateTitle: application.positionTitle,
    companyId: actor.companyId || application.companyId,
    companyName: actor.companyName || application.companyName,
    candidateUserId: application.candidateUserId,
    roundNumber: 1,
    scheduledStart: start,
    scheduledEnd: end,
    mode: dto.mode,
    locationText: dto.locationText ?? null,
    meetingUrl: dto.meetingUrl ?? null,
    status: 'PROPOSED',
    rescheduleCount: 0,
    cancelReason: null,
    createdBy: actor.id,
    idempotencyKey: idempotencyKey ?? null,
    version: 1,
    participants,
  });

  if (application.status !== 'INTERVIEW') {
    await ApplicationModel.updateOne({ id: application.id }, { $set: { status: 'INTERVIEW' } });
  }
  return toView(created.toObject() as InterviewRecord, actor);
}

export async function updateInterview(actor: CurrentUser, id: string, dto: UpdateInterviewPayload) {
  assertActor(actor);
  assertEnterprise(actor);
  if (!dto.version || dto.version < 1) fail('Version obligatoire');
  await connectDb();
  const current = await requireVisible(actor, id);
  if (current.version !== dto.version) {
    fail('Cet entretien a été modifié entre-temps. Rechargez la page.');
  }

  const patch: Record<string, unknown> = {};
  if (dto.action === 'RESCHEDULE') {
    if (!dto.scheduledStart) fail('Nouvelle date obligatoire pour un report');
    const start = new Date(dto.scheduledStart);
    const end = new Date(start.getTime() + (dto.durationMinutes ?? 60) * 60_000);
    if (Number.isNaN(start.getTime()) || end <= start) fail('Créneau horaire invalide');
    const userIds = (current.participants ?? []).map((p) => p.userId);
    await assertNoOverlap(userIds, start, end, id);
    patch.scheduledStart = start;
    patch.scheduledEnd = end;
    patch.status = 'PROPOSED';
    patch.rescheduleCount = (current.rescheduleCount || 0) + 1;
    patch.participants = (current.participants ?? []).map((p) =>
      p.role === 'CANDIDATE' ? { ...p, response: 'PENDING', respondedAt: null } : p,
    );
  } else if (dto.action === 'CANCEL') {
    if (!dto.cancelReason?.trim()) fail('Motif d’annulation obligatoire');
    patch.status = 'CANCELLED';
    patch.cancelReason = dto.cancelReason.trim();
  } else if (dto.action === 'COMPLETE') {
    patch.status = 'COMPLETED';
  } else if (dto.action === 'NO_SHOW') {
    patch.status = 'NO_SHOW';
  }

  if (dto.mode) {
    if (!MODES.includes(dto.mode)) fail('Mode d’entretien invalide');
    patch.mode = dto.mode;
  }
  if (dto.locationText !== undefined) patch.locationText = dto.locationText;
  if (dto.meetingUrl !== undefined) {
    if (dto.meetingUrl && !/^https?:\/\/\S+$/i.test(dto.meetingUrl)) fail('URL de réunion invalide');
    patch.meetingUrl = dto.meetingUrl;
  }

  const updated = await InterviewModel.findOneAndUpdate(
    { id, version: dto.version },
    { $set: patch, $inc: { version: 1 } },
    { new: true },
  ).lean<InterviewRecord | null>();
  if (!updated) fail('Cet entretien a été modifié entre-temps. Rechargez la page.');
  return toView(updated, actor);
}

export async function respondInterview(actor: CurrentUser, id: string, dto: RespondPayload) {
  assertActor(actor);
  if (actor.role !== 'CANDIDATE') fail('Seul le candidat peut répondre à l’invitation');
  await connectDb();
  const current = await requireVisible(actor, id);
  const next: InterviewStatus =
    dto.action === 'ACCEPT' ? 'CONFIRMED' : dto.action === 'DECLINE' ? 'DECLINED' : 'RESCHEDULE_REQUESTED';
  const response = dto.action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const participants = (current.participants ?? []).map((p) =>
    p.role === 'CANDIDATE' ? { ...p, response, respondedAt: new Date() } : p,
  );
  const updated = await InterviewModel.findOneAndUpdate(
    { id },
    { $set: { status: next, participants }, $inc: { version: 1 } },
    { new: true },
  ).lean<InterviewRecord | null>();
  if (!updated) fail('Entretien introuvable');
  return toView(updated, actor);
}

export async function evaluateInterview(actor: CurrentUser, id: string, dto: EvaluationPayload) {
  assertActor(actor);
  assertEnterprise(actor);
  if (!dto.overallRating || dto.overallRating < 1 || dto.overallRating > 5) fail('Note globale invalide');
  if (!['ADVANCE', 'HOLD', 'REJECT'].includes(dto.recommendation)) fail('Recommandation invalide');
  await connectDb();
  await requireVisible(actor, id);
  const existing = await EvaluationModel.findOne({ interviewId: id, evaluatorUserId: actor.id }).lean();
  if (existing) fail('Vous avez déjà évalué cet entretien');

  const created = await EvaluationModel.create({
    id: randomUUID(),
    interviewId: id,
    evaluatorUserId: actor.id,
    evaluatorName: actor.name,
    criteriaScores: dto.criteriaScores,
    overallRating: dto.overallRating,
    recommendation: dto.recommendation,
    privateComment: dto.privateComment ?? null,
    submittedAt: new Date(),
  });
  await InterviewModel.updateOne(
    { id, status: { $ne: 'COMPLETED' } },
    { $set: { status: 'COMPLETED' }, $inc: { version: 1 } },
  );
  return stripMongo(created.toObject());
}

export async function listEvaluations(actor: CurrentUser, id: string) {
  assertActor(actor);
  if (actor.role === 'CANDIDATE') return [];
  await connectDb();
  await requireVisible(actor, id);
  const items = await EvaluationModel.find({ interviewId: id }).sort({ submittedAt: -1 }).lean();
  return items.map((item) => stripMongo(item));
}

export async function deleteInterview(actor: CurrentUser, id: string) {
  assertActor(actor);
  assertEnterprise(actor);
  await connectDb();
  await requireVisible(actor, id);
  await InterviewModel.deleteOne({ id });
  await EvaluationModel.deleteMany({ interviewId: id });
  return { deleted: true, id };
}
