import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  Download,
  ExternalLink,
  Award,
  CheckCircle,
  XCircle,
  RotateCcw,
  Users,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { Interview, CurrentUser } from '../types/interview';
import { apiService } from '../services/api';
import { downloadIcsFile } from '../services/ics';
import { useTranslation } from '../translations/useTranslation';
import { ConfirmDialog } from './ConfirmDialog';

interface InterviewDetailModalProps {
  interview: Interview | null;
  currentUser: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onOpenEvaluation: (interview: Interview) => void;
}

export const InterviewDetailModal: React.FC<InterviewDetailModalProps> = ({
  interview,
  currentUser,
  isOpen,
  onClose,
  onUpdated,
  onOpenEvaluation
}) => {
  const { t } = useTranslation();

  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [candidateNote, setCandidateNote] = useState<string>('');
  const [isRequestingReschedule, setIsRequestingReschedule] = useState<boolean>(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !interview) return null;

  const startDate = new Date(interview.scheduledStart);
  const endDate = new Date(interview.scheduledEnd);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000));

  const formatTunisDateTime = (d: Date) => {
    return d.toLocaleString('fr-TN', {
      timeZone: 'Africa/Tunis',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCandidate = currentUser.role === 'CANDIDATE';
  const isEnterprise = currentUser.role === 'ENTERPRISE';

  // Candidate Actions
  const handleCandidateRespond = async (action: 'ACCEPT' | 'DECLINE' | 'REQUEST_RESCHEDULE') => {
    try {
      setLoadingAction(true);
      setErrorMsg(null);
      await apiService.respondInterview(currentUser, interview.id, {
        action,
        note: candidateNote || undefined
      });
      setLoadingAction(false);
      setIsRequestingReschedule(false);
      onUpdated();
      onClose();
    } catch (err: any) {
      setLoadingAction(false);
      setErrorMsg(err.message || 'Erreur lors de la réponse');
    }
  };

  // Enterprise Lifecycle Actions
  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate) {
      setErrorMsg('Veuillez sélectionner une nouvelle date.');
      return;
    }
    try {
      setLoadingAction(true);
      setErrorMsg(null);
      await apiService.updateInterview(currentUser, interview.id, {
        version: interview.version,
        action: 'RESCHEDULE',
        scheduledStart: new Date(rescheduleDate).toISOString(),
        durationMinutes
      });
      setLoadingAction(false);
      setIsRescheduling(false);
      onUpdated();
      onClose();
    } catch (err: any) {
      setLoadingAction(false);
      setErrorMsg(err.message || 'Erreur lors du report');
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      setErrorMsg('Veuillez spécifier le motif d\'annulation.');
      return;
    }
    try {
      setLoadingAction(true);
      setErrorMsg(null);
      await apiService.updateInterview(currentUser, interview.id, {
        version: interview.version,
        action: 'CANCEL',
        cancelReason: cancelReason.trim()
      });
      setLoadingAction(false);
      setIsCancelling(false);
      onUpdated();
      onClose();
    } catch (err: any) {
      setLoadingAction(false);
      setErrorMsg(err.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleStatusChange = async (action: 'COMPLETE' | 'NO_SHOW') => {
    try {
      setLoadingAction(true);
      setErrorMsg(null);
      await apiService.updateInterview(currentUser, interview.id, {
        version: interview.version,
        action
      });
      setLoadingAction(false);
      onUpdated();
      onClose();
    } catch (err: any) {
      setLoadingAction(false);
      setErrorMsg(err.message || 'Erreur');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-badge ${interview.status}`}>
                {t[`status_${interview.status}`]}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tour #{interview.roundNumber} • v{interview.version}
              </span>
            </div>
            <h3 style={{ marginTop: '6px' }}>
              {interview.candidateName} — {interview.candidateTitle}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Entreprise : <strong>{interview.companyName}</strong>
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && (
            <div className="conflict-alert" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={18} color="#EF4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Details Card */}
          <div className="card-timing">
            <div className="timing-row">
              <Calendar size={16} color="var(--primary)" />
              <span>
                <strong>{formatTunisDateTime(startDate)}</strong> ({durationMinutes} min)
              </span>
            </div>
            <div className="timing-row">
              {interview.mode === 'VIDEO' && <Video size={16} color="#2563EB" />}
              {interview.mode === 'ONSITE' && <MapPin size={16} color="#10B981" />}
              {interview.mode === 'PHONE' && <Phone size={16} color="#F59E0B" />}
              <span>{t[`mode_${interview.mode}`]}</span>
            </div>
            {interview.meetingUrl && (
              <div className="timing-row">
                <ExternalLink size={16} color="#2563EB" />
                <a
                  href={interview.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}
                >
                  {interview.meetingUrl}
                </a>
              </div>
            )}
            {interview.locationText && (
              <div className="timing-row">
                <MapPin size={16} color="#10B981" />
                <span>{interview.locationText}</span>
              </div>
            )}
            {interview.cancelReason && (
              <div className="timing-row" style={{ color: '#EF4444' }}>
                <AlertTriangle size={16} />
                <span>Motif d'annulation : {interview.cancelReason}</span>
              </div>
            )}
          </div>

          {/* Participants list (Enterprise only per spec) */}
          {isEnterprise && interview.participants && interview.participants.length > 0 && (
            <div className="criteria-item">
              <div className="criteria-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> Participants & Réponses
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {interview.participants.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                      padding: '4px 0',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <strong>{p.name || p.userId}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({p.role === 'CANDIDATE' ? 'Candidat' : 'Interviewer'})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color:
                          p.response === 'ACCEPTED'
                            ? '#10B981'
                            : p.response === 'DECLINED'
                            ? '#EF4444'
                            : '#F59E0B'
                      }}
                    >
                      {p.response}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reschedule sub-form (for Enterprise) */}
          {isRescheduling && (
            <div className="criteria-item" style={{ borderColor: 'var(--primary)' }}>
              <div className="criteria-header">
                <span>{t.actionReschedule}</span>
                <button
                  className="btn-icon"
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => setIsRescheduling(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="form-group">
                <label>Nouveau créneau proposé (Heure de Tunis)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <button
                className="primary-action-btn"
                onClick={handleRescheduleSubmit}
                disabled={loadingAction}
              >
                Confirmer la replanification
              </button>
            </div>
          )}

          {/* Cancel sub-form (for Enterprise) */}
          {isCancelling && (
            <div className="criteria-item" style={{ borderColor: '#EF4444' }}>
              <div className="criteria-header">
                <span style={{ color: '#EF4444' }}>{t.actionCancel}</span>
                <button
                  className="btn-icon"
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => setIsCancelling(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="form-group">
                <label>{t.cancelReasonLabel}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={t.cancelReasonPlaceholder}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              <button
                className="btn-danger"
                onClick={handleCancelSubmit}
                disabled={loadingAction}
              >
                Confirmer l'annulation définitive
              </button>
            </div>
          )}

          {/* Candidate Reschedule Request sub-form */}
          {isRequestingReschedule && (
            <div className="criteria-item" style={{ borderColor: '#F97316' }}>
              <div className="criteria-header">
                <span style={{ color: '#F97316' }}>{t.requestReschedule}</span>
                <button
                  className="btn-icon"
                  style={{ width: '24px', height: '24px' }}
                  onClick={() => setIsRequestingReschedule(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="form-group">
                <label>{t.responseNoteLabel}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Ex: Indisponible mardi matin, possible mercredi après-midi ?"
                  value={candidateNote}
                  onChange={(e) => setCandidateNote(e.target.value)}
                />
              </div>
              <button
                className="primary-action-btn"
                onClick={() => handleCandidateRespond('REQUEST_RESCHEDULE')}
                disabled={loadingAction}
              >
                Envoyer ma demande de report
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => downloadIcsFile(interview)}
            title={t.exportIcs}
          >
            <Download size={14} />
            <span>{t.exportIcs}</span>
          </button>

          {/* Candidate response buttons */}
          {isCandidate && (interview.status === 'PROPOSED' || interview.status === 'RESCHEDULE_REQUESTED') && (
            <>
              <button
                className="btn-success"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Confirmer l\'entretien',
                    message: 'Confirmez-vous votre présence à cet entretien ?',
                    onConfirm: () => {
                      setConfirmDialog((c) => ({ ...c, isOpen: false }));
                      handleCandidateRespond('ACCEPT');
                    }
                  })
                }
                disabled={loadingAction}
              >
                <CheckCircle size={14} />
                <span>{t.acceptInvitation}</span>
              </button>

              <button
                className="btn-secondary"
                onClick={() => setIsRequestingReschedule(true)}
                disabled={loadingAction}
              >
                <RotateCcw size={14} />
                <span>{t.requestReschedule}</span>
              </button>

              <button
                className="btn-danger"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Décliner l\'entretien',
                    message: 'Êtes-vous sûr de vouloir décliner cet entretien ?',
                    isDanger: true,
                    onConfirm: () => {
                      setConfirmDialog((c) => ({ ...c, isOpen: false }));
                      handleCandidateRespond('DECLINE');
                    }
                  })
                }
                disabled={loadingAction}
              >
                <XCircle size={14} />
                <span>{t.declineInvitation}</span>
              </button>
            </>
          )}

          {/* Enterprise Lifecycle buttons */}
          {isEnterprise && interview.status !== 'CANCELLED' && (
            <>
              {!isRescheduling && !isCancelling && (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsRescheduling(true)}
                  >
                    <RotateCcw size={14} />
                    <span>{t.actionReschedule}</span>
                  </button>

                  <button
                    className="btn-danger"
                    onClick={() => setIsCancelling(true)}
                  >
                    <XCircle size={14} />
                    <span>{t.actionCancel}</span>
                  </button>

                  {interview.status !== 'COMPLETED' && (
                    <button
                      className="btn-success"
                      onClick={() => handleStatusChange('COMPLETE')}
                    >
                      <CheckCircle size={14} />
                      <span>{t.actionComplete}</span>
                    </button>
                  )}

                  <button
                    className="primary-action-btn"
                    onClick={() => {
                      onClose();
                      onOpenEvaluation(interview);
                    }}
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
                  >
                    <Award size={15} />
                    <span>{t.actionEvaluate}</span>
                  </button>
                </>
              )}
            </>
          )}

          <button className="btn-secondary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDanger={confirmDialog.isDanger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((c) => ({ ...c, isOpen: false }))}
      />
    </div>
  );
};
