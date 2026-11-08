import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { Actor } from '../actor';
import { CreateInterviewDto, EvaluationDto, ListInterviewsQuery, RespondDto, UpdateInterviewDto } from './dto';
import {
  Application,
  Evaluation,
  Interview,
  Interviewer,
  InterviewStatus,
  Participant,
} from './schemas';

const CLOSED: InterviewStatus[] = ['CANCELLED', 'DECLINED', 'NO_SHOW'];

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(Interview.name) private readonly interviews: Model<Interview>,
    @InjectModel(Evaluation.name) private readonly evaluations: Model<Evaluation>,
    @InjectModel(Application.name) private readonly applications: Model<Application>,
    @InjectModel(Interviewer.name) private readonly interviewers: Model<Interviewer>,
  ) {}

  async listApplications() {
    const items = await this.applications.find({ status: { $in: ['SENT', 'PENDING', 'INTERVIEW'] } }).lean();
    return items.map(stripMongo);
  }

  async listInterviewers(actor: Actor) {
    const filter = actor.companyId ? { companyId: actor.companyId } : {};
    const items = await this.interviewers.find(filter).lean();
    return items.map(stripMongo);
  }

  async list(actor: Actor, q: ListInterviewsQuery) {
    const filter: Record<string, unknown> = {};
    if (actor.role === 'CANDIDATE') {
      filter.$or = [{ candidateUserId: actor.userId }, { candidateEmail: actor.email }];
    } else if (actor.role === 'ENTERPRISE' && actor.companyId) {
      filter.companyId = actor.companyId;
    }
    if (q.status) filter.status = q.status;
    if (q.applicationId) filter.applicationId = q.applicationId;
    if (q.from || q.to) {
      filter.scheduledStart = {
        ...(q.from ? { $gte: new Date(q.from) } : {}),
        ...(q.to ? { $lte: new Date(q.to) } : {}),
      };
    }
    const page = q.page || 1;
    const pageSize = q.pageSize || 50;
    const total = await this.interviews.countDocuments(filter);
    const items = await this.interviews
      .find(filter)
      .sort({ scheduledStart: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
    return { items: items.map((item) => this.viewOf(item, actor)), total, page, pageSize };
  }

  async get(actor: Actor, id: string) {
    const interview = await this.requireVisible(actor, id);
    return this.viewOf(interview, actor);
  }

  async create(actor: Actor, applicationId: string, dto: CreateInterviewDto, idempotencyKey?: string) {
    this.assertEnterprise(actor);
    if (idempotencyKey && actor.companyId) {
      const existing = await this.interviews.findOne({ companyId: actor.companyId, idempotencyKey }).lean();
      if (existing) return this.viewOf(existing, actor);
    }

    const application = await this.applications.findOne({ id: applicationId }).lean();
    if (!application) throw new NotFoundException('Candidature non trouvée');
    if (!['SENT', 'PENDING', 'INTERVIEW'].includes(application.status)) {
      throw new ConflictException('Cette candidature n’est pas éligible à un entretien');
    }

    const start = new Date(dto.scheduledStart);
    const end = dto.scheduledEnd
      ? new Date(dto.scheduledEnd)
      : new Date(start.getTime() + (dto.durationMinutes ?? 60) * 60_000);
    if (Number.isNaN(start.getTime()) || end <= start) {
      throw new ConflictException('Créneau horaire invalide');
    }
    if (start.getTime() < Date.now() + 30 * 60_000) {
      throw new ConflictException('L’entretien doit être planifié au moins 30 minutes à l’avance');
    }

    const interviewerIds = dto.interviewerUserIds ?? [];
    const people = await this.interviewers.find({ id: { $in: interviewerIds } }).lean();
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

    await this.assertNoOverlap(
      [application.candidateUserId, ...interviewerIds],
      start,
      end,
    );

    const now = new Date();
    const created = await this.interviews.create({
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
      createdBy: actor.userId,
      idempotencyKey: idempotencyKey ?? null,
      version: 1,
      participants,
      createdAt: now,
      updatedAt: now,
    });

    if (application.status !== 'INTERVIEW') {
      await this.applications.updateOne({ id: application.id }, { $set: { status: 'INTERVIEW' } });
    }
    return this.viewOf(created.toObject(), actor);
  }

  async update(actor: Actor, id: string, dto: UpdateInterviewDto) {
    this.assertEnterprise(actor);
    const current = await this.requireVisible(actor, id);
    if (current.version !== dto.version) {
      throw new ConflictException('Cet entretien a été modifié entre-temps. Rechargez la page.');
    }

    const patch: Record<string, unknown> = {};
    if (dto.action === 'RESCHEDULE') {
      if (!dto.scheduledStart) throw new ConflictException('Nouvelle date obligatoire pour un report');
      const start = new Date(dto.scheduledStart);
      const end = dto.scheduledEnd
        ? new Date(dto.scheduledEnd)
        : new Date(start.getTime() + (dto.durationMinutes ?? 60) * 60_000);
      const userIds = (current.participants ?? []).map((p) => p.userId);
      await this.assertNoOverlap(userIds, start, end, id);
      patch.scheduledStart = start;
      patch.scheduledEnd = end;
      patch.status = 'PROPOSED';
      patch.rescheduleCount = (current.rescheduleCount || 0) + 1;
      patch.participants = (current.participants ?? []).map((p) =>
        p.role === 'CANDIDATE' ? { ...p, response: 'PENDING', respondedAt: null } : p,
      );
    } else if (dto.action === 'CANCEL') {
      if (!dto.cancelReason?.trim()) throw new ConflictException('Motif d’annulation obligatoire');
      patch.status = 'CANCELLED';
      patch.cancelReason = dto.cancelReason.trim();
    } else if (dto.action === 'COMPLETE') {
      patch.status = 'COMPLETED';
    } else if (dto.action === 'NO_SHOW') {
      patch.status = 'NO_SHOW';
    }

    if (dto.mode) patch.mode = dto.mode;
    if (dto.locationText !== undefined) patch.locationText = dto.locationText;
    if (dto.meetingUrl !== undefined) patch.meetingUrl = dto.meetingUrl;

    const updated = await this.interviews
      .findOneAndUpdate(
        { id, version: dto.version },
        { $set: patch, $inc: { version: 1 } },
        { new: true },
      )
      .lean();
    if (!updated) throw new ConflictException('Cet entretien a été modifié entre-temps. Rechargez la page.');
    return this.viewOf(updated, actor);
  }

  async respond(actor: Actor, id: string, dto: RespondDto) {
    if (actor.role !== 'CANDIDATE') throw new ForbiddenException('Seul le candidat peut répondre à l’invitation');
    const current = await this.requireVisible(actor, id);
    const next: InterviewStatus =
      dto.action === 'ACCEPT' ? 'CONFIRMED' : dto.action === 'DECLINE' ? 'DECLINED' : 'RESCHEDULE_REQUESTED';
    const response = dto.action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    const participants = (current.participants ?? []).map((p) =>
      p.role === 'CANDIDATE' ? { ...p, response, respondedAt: new Date() } : p,
    );
    const updated = await this.interviews
      .findOneAndUpdate({ id }, { $set: { status: next, participants }, $inc: { version: 1 } }, { new: true })
      .lean();
    return this.viewOf(updated!, actor);
  }

  async evaluate(actor: Actor, id: string, dto: EvaluationDto) {
    this.assertEnterprise(actor);
    await this.requireVisible(actor, id);
    const existing = await this.evaluations.findOne({ interviewId: id, evaluatorUserId: actor.userId }).lean();
    if (existing) throw new ConflictException('Vous avez déjà évalué cet entretien');

    const created = await this.evaluations.create({
      id: randomUUID(),
      interviewId: id,
      evaluatorUserId: actor.userId,
      evaluatorName: actor.name,
      criteriaScores: dto.criteriaScores,
      overallRating: dto.overallRating,
      recommendation: dto.recommendation,
      privateComment: dto.privateComment ?? null,
      submittedAt: new Date(),
    });
    await this.interviews.updateOne({ id, status: { $ne: 'COMPLETED' } }, { $set: { status: 'COMPLETED' }, $inc: { version: 1 } });
    return stripMongo(created.toObject());
  }

  async listEvaluations(actor: Actor, id: string) {
    if (actor.role === 'CANDIDATE') throw new ForbiddenException('Les évaluations ne sont pas visibles par le candidat');
    await this.requireVisible(actor, id);
    const items = await this.evaluations.find({ interviewId: id }).sort({ submittedAt: -1 }).lean();
    return items.map(stripMongo);
  }

  async remove(actor: Actor, id: string) {
    this.assertEnterprise(actor);
    await this.requireVisible(actor, id);
    await this.interviews.deleteOne({ id });
    await this.evaluations.deleteMany({ interviewId: id });
    return { deleted: true, id };
  }

  private assertEnterprise(actor: Actor) {
    if (actor.role === 'CANDIDATE') throw new ForbiddenException('Action réservée à l’entreprise');
  }

  private async requireVisible(actor: Actor, id: string) {
    const interview = await this.interviews.findOne({ id }).lean();
    if (!interview) throw new NotFoundException('Entretien introuvable');
    if (actor.role === 'CANDIDATE' && interview.candidateUserId !== actor.userId && interview.candidateEmail !== actor.email) {
      throw new NotFoundException('Entretien introuvable');
    }
    if (actor.role === 'ENTERPRISE' && actor.companyId && interview.companyId !== actor.companyId) {
      throw new NotFoundException('Entretien introuvable');
    }
    return interview;
  }

  private async assertNoOverlap(userIds: string[], start: Date, end: Date, excludeId?: string) {
    if (!userIds.length) return;
    const hit = await this.interviews
      .findOne({
        ...(excludeId ? { id: { $ne: excludeId } } : {}),
        status: { $nin: CLOSED },
        scheduledStart: { $lt: end },
        scheduledEnd: { $gt: start },
        $or: [{ candidateUserId: { $in: userIds } }, { 'participants.userId': { $in: userIds } }],
      })
      .lean();
    if (hit) {
      throw new ConflictException(
        `Conflit d’agenda avec l’entretien de ${hit.candidateName} (${hit.scheduledStart.toISOString()})`,
      );
    }
  }

  private viewOf(doc: unknown, actor: Actor) {
    return this.toView(doc as Interview & { createdAt?: Date; updatedAt?: Date }, actor);
  }

  private toView(interview: Interview & { createdAt?: Date; updatedAt?: Date }, actor: Actor) {
    const view = stripMongo({
      ...interview,
      scheduledStart: interview.scheduledStart,
      scheduledEnd: interview.scheduledEnd,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    });
    if (actor.role === 'CANDIDATE') {
      const { participants, ...rest } = view as unknown as Interview & { participants?: Participant[] };
      void participants;
      return rest;
    }
    return view;
  }
}

function stripMongo(doc: object) {
  const { _id, __v, ...rest } = doc as Record<string, unknown>;
  void _id;
  void __v;
  return rest;
}
