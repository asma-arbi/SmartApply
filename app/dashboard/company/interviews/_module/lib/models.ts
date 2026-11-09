import mongoose, { Schema } from 'mongoose';

const ParticipantSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: String,
    email: String,
    role: { type: String, enum: ['CANDIDATE', 'INTERVIEWER'], required: true },
    response: { type: String, enum: ['PENDING', 'ACCEPTED', 'DECLINED'], default: 'PENDING' },
    respondedAt: { type: Date, default: null },
  },
  { _id: false },
);

const InterviewSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    applicationId: { type: String, required: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    candidateTitle: { type: String, default: '' },
    companyId: { type: String, required: true },
    companyName: { type: String, required: true },
    candidateUserId: { type: String, required: true },
    roundNumber: { type: Number, default: 1 },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    mode: { type: String, enum: ['ONSITE', 'VIDEO', 'PHONE'], required: true },
    locationText: { type: String, default: null },
    meetingUrl: { type: String, default: null },
    status: { type: String, default: 'PROPOSED' },
    rescheduleCount: { type: Number, default: 0 },
    cancelReason: { type: String, default: null },
    createdBy: { type: String, required: true },
    idempotencyKey: { type: String, default: null },
    version: { type: Number, default: 1 },
    participants: { type: [ParticipantSchema], default: [] },
  },
  { collection: 'interviews', timestamps: true },
);

InterviewSchema.index({ companyId: 1, scheduledStart: 1 });
InterviewSchema.index({ candidateUserId: 1, scheduledStart: 1 });
InterviewSchema.index({ companyId: 1, idempotencyKey: 1 }, { sparse: true });

const EvaluationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    interviewId: { type: String, required: true },
    evaluatorUserId: { type: String, required: true },
    evaluatorName: { type: String, required: true },
    criteriaScores: { type: Object, required: true },
    overallRating: { type: Number, required: true },
    recommendation: { type: String, enum: ['ADVANCE', 'HOLD', 'REJECT'], required: true },
    privateComment: { type: String, default: null },
    submittedAt: { type: Date, required: true },
  },
  { collection: 'evaluations', timestamps: false },
);

EvaluationSchema.index({ interviewId: 1, evaluatorUserId: 1 }, { unique: true });

const ApplicationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    candidateUserId: { type: String, required: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    positionTitle: { type: String, required: true },
    companyId: { type: String, required: true },
    companyName: { type: String, required: true },
    status: { type: String, enum: ['SENT', 'PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'], required: true },
    matchScore: Number,
  },
  { collection: 'applications', timestamps: false },
);

const InterviewerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    email: { type: String, required: true },
    companyId: { type: String, required: true },
  },
  { collection: 'interviewers', timestamps: false },
);

export const InterviewModel = mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);
export const EvaluationModel = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);
export const ApplicationModel = mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
export const InterviewerModel = mongoose.models.Interviewer || mongoose.model('Interviewer', InterviewerSchema);
