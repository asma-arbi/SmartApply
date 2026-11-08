import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, Evaluation, Interview, Interviewer } from '../interviews/schemas';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Application.name) private readonly applications: Model<Application>,
    @InjectModel(Interviewer.name) private readonly interviewers: Model<Interviewer>,
    @InjectModel(Interview.name) private readonly interviews: Model<Interview>,
    @InjectModel(Evaluation.name) private readonly evaluations: Model<Evaluation>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED === 'false') return;
    const existing = await this.applications.countDocuments();
    if (existing > 0) return;

    const at = (days: number, hours: number, minutes = 0) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    await this.applications.insertMany([
      {
        id: 'app-101',
        candidateUserId: 'user-candidat-1',
        candidateName: 'Mohamed Trabelsi',
        candidateEmail: 'mohamed.trabelsi@insat.u-carthage.tn',
        positionTitle: 'Ingénieur Full-Stack React / NestJS (Stage PFE)',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        status: 'INTERVIEW',
        matchScore: 94,
      },
      {
        id: 'app-102',
        candidateUserId: 'user-candidat-sarra-karray',
        candidateName: 'Sarra Karray',
        candidateEmail: 'sarra.karray@esprit.tn',
        positionTitle: 'Machine Learning / NLP Engineer',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        status: 'INTERVIEW',
        matchScore: 91,
      },
      {
        id: 'app-103',
        candidateUserId: 'user-candidat-yassine-ben-amor',
        candidateName: 'Yassine Ben Amor',
        candidateEmail: 'yassine.ba@enetcom.u-sfax.tn',
        positionTitle: 'DevOps & Cloud Engineer',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        status: 'PENDING',
        matchScore: 88,
      },
      {
        id: 'app-104',
        candidateUserId: 'user-candidat-nour-mezni',
        candidateName: 'Nour Mezni',
        candidateEmail: 'nour.mezni@supcom.tn',
        positionTitle: 'Développeuse Frontend Vue / React',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        status: 'SENT',
        matchScore: 85,
      },
    ]);

    await this.interviewers.insertMany([
      { id: 'rec-01', name: 'Ines Ben Salem', title: 'Responsable Recrutement IT', email: 'ines.bensalem@expensya.com', companyId: 'comp-expensya' },
      { id: 'rec-02', name: 'Karim Dakhli', title: 'Tech Lead Fullstack', email: 'karim.dakhli@expensya.com', companyId: 'comp-expensya' },
      { id: 'rec-03', name: 'Amine Trabelsi', title: 'Engineering Manager', email: 'a.trabelsi@expensya.com', companyId: 'comp-expensya' },
    ]);

    await this.interviews.insertMany([
      {
        id: 'int-001',
        applicationId: 'app-101',
        candidateName: 'Mohamed Trabelsi',
        candidateEmail: 'mohamed.trabelsi@insat.u-carthage.tn',
        candidateTitle: 'Ingénieur Full-Stack React / NestJS (Stage PFE)',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        candidateUserId: 'user-candidat-1',
        roundNumber: 1,
        scheduledStart: at(1, 10),
        scheduledEnd: at(1, 11),
        mode: 'VIDEO',
        locationText: null,
        meetingUrl: 'https://meet.google.com/exy-smrt-tun',
        status: 'CONFIRMED',
        rescheduleCount: 0,
        cancelReason: null,
        createdBy: 'user-recruteur-expensya',
        idempotencyKey: null,
        version: 1,
        participants: [
          { userId: 'user-candidat-1', name: 'Mohamed Trabelsi', email: 'mohamed.trabelsi@insat.u-carthage.tn', role: 'CANDIDATE', response: 'ACCEPTED', respondedAt: at(-1, 16) },
          { userId: 'rec-01', name: 'Ines Ben Salem', email: 'ines.bensalem@expensya.com', role: 'INTERVIEWER', response: 'ACCEPTED', respondedAt: at(-2, 14) },
          { userId: 'rec-02', name: 'Karim Dakhli', email: 'karim.dakhli@expensya.com', role: 'INTERVIEWER', response: 'ACCEPTED', respondedAt: at(-2, 15) },
        ],
      },
      {
        id: 'int-002',
        applicationId: 'app-102',
        candidateName: 'Sarra Karray',
        candidateEmail: 'sarra.karray@esprit.tn',
        candidateTitle: 'Machine Learning / NLP Engineer',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        candidateUserId: 'user-candidat-sarra-karray',
        roundNumber: 1,
        scheduledStart: at(2, 14),
        scheduledEnd: at(2, 15),
        mode: 'ONSITE',
        locationText: 'Les Berges du Lac 2, Tunis',
        meetingUrl: null,
        status: 'PROPOSED',
        rescheduleCount: 0,
        cancelReason: null,
        createdBy: 'user-recruteur-expensya',
        idempotencyKey: null,
        version: 1,
        participants: [
          { userId: 'user-candidat-sarra-karray', name: 'Sarra Karray', email: 'sarra.karray@esprit.tn', role: 'CANDIDATE', response: 'PENDING', respondedAt: null },
          { userId: 'rec-01', name: 'Ines Ben Salem', email: 'ines.bensalem@expensya.com', role: 'INTERVIEWER', response: 'ACCEPTED', respondedAt: at(-1, 9) },
        ],
      },
      {
        id: 'int-003',
        applicationId: 'app-103',
        candidateName: 'Yassine Ben Amor',
        candidateEmail: 'yassine.ba@enetcom.u-sfax.tn',
        candidateTitle: 'DevOps & Cloud Engineer',
        companyId: 'comp-expensya',
        companyName: 'Expensya Tunisia',
        candidateUserId: 'user-candidat-yassine-ben-amor',
        roundNumber: 1,
        scheduledStart: at(-3, 11),
        scheduledEnd: at(-3, 12),
        mode: 'VIDEO',
        locationText: null,
        meetingUrl: 'https://meet.google.com/exy-devops-demo',
        status: 'COMPLETED',
        rescheduleCount: 0,
        cancelReason: null,
        createdBy: 'user-recruteur-expensya',
        idempotencyKey: null,
        version: 2,
        participants: [
          { userId: 'user-candidat-yassine-ben-amor', name: 'Yassine Ben Amor', email: 'yassine.ba@enetcom.u-sfax.tn', role: 'CANDIDATE', response: 'ACCEPTED', respondedAt: at(-4, 10) },
          { userId: 'rec-03', name: 'Amine Trabelsi', email: 'a.trabelsi@expensya.com', role: 'INTERVIEWER', response: 'ACCEPTED', respondedAt: at(-5, 9) },
        ],
      },
    ]);

    await this.evaluations.create({
      id: 'eval-001',
      interviewId: 'int-003',
      evaluatorUserId: 'user-recruteur-expensya',
      evaluatorName: 'Ines Ben Salem',
      criteriaScores: {
        'Compétences techniques': 4,
        'Communication & Clarté': 5,
        'Résolution de problèmes': 4,
        'Adéquation culturelle': 5,
      },
      overallRating: 4,
      recommendation: 'ADVANCE',
      privateComment: 'Bon niveau cloud, à avancer au tour technique.',
      submittedAt: at(-3, 13),
    });

    this.logger.log('Jeu de démonstration inséré dans MongoDB');
  }
}
