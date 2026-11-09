import React from 'react';
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
  Users
} from 'lucide-react';
import { Interview, CurrentUser } from '../types/interview';
import { useTranslation } from '../translations/useTranslation';
import { downloadIcsFile } from '../services/ics';

interface InterviewCardProps {
  interview: Interview;
  currentUser: CurrentUser;
  onOpenDetails: (interview: Interview) => void;
  onQuickRespond?: (interview: Interview, action: 'ACCEPT' | 'DECLINE') => void;
  onOpenEvaluation?: (interview: Interview) => void;
}

export const InterviewCard: React.FC<InterviewCardProps> = ({
  interview,
  currentUser,
  onOpenDetails,
  onQuickRespond,
  onOpenEvaluation
}) => {
  const { t } = useTranslation();

  const startDate = new Date(interview.scheduledStart);
  const endDate = new Date(interview.scheduledEnd);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (60 * 1000));

  const formatTunisDateTime = (d: Date) => {
    return d.toLocaleString('fr-TN', {
      timeZone: 'Africa/Tunis',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModeIcon = () => {
    switch (interview.mode) {
      case 'VIDEO':
        return <Video size={16} color="#2563EB" />;
      case 'ONSITE':
        return <MapPin size={16} color="#10B981" />;
      case 'PHONE':
        return <Phone size={16} color="#F59E0B" />;
    }
  };

  const isCandidate = currentUser.role === 'CANDIDATE';
  const isEnterprise = currentUser.role === 'ENTERPRISE';
  const canCandidateRespond =
    isCandidate && (interview.status === 'PROPOSED' || interview.status === 'RESCHEDULE_REQUESTED');

  const initials = (currentUser.role === 'ENTERPRISE' ? interview.candidateName : interview.companyName)
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="interview-card">
      <div>
        {/* Top Header */}
        <div className="card-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="candidate-avatar">{initials}</div>
            <div className="card-title-group">
              <h4>
                {currentUser.role === 'ENTERPRISE'
                  ? interview.candidateName
                  : interview.companyName}
              </h4>
              <p>{interview.candidateTitle}</p>
            </div>
          </div>
          <span className={`status-badge ${interview.status}`}>
            {t[`status_${interview.status}`]}
          </span>
        </div>

        {/* Timing and Location */}
        <div className="card-timing" style={{ marginTop: '14px' }}>
          <div className="timing-row">
            <Calendar size={15} color="var(--primary)" />
            <span>
              <strong>{formatTunisDateTime(startDate)}</strong> ({durationMinutes} min)
            </span>
          </div>
          <div className="timing-row">
            {getModeIcon()}
            <span>
              {t[`mode_${interview.mode}`]}
              {interview.locationText && ` • ${interview.locationText}`}
            </span>
          </div>

          {interview.meetingUrl && (
            <div className="timing-row" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <ExternalLink size={14} color="#2563EB" />
              <a
                href={interview.meetingUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563EB', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                {interview.meetingUrl}
              </a>
            </div>
          )}

          {/* Reschedule counter */}
          {interview.rescheduleCount > 0 && (
            <div className="timing-row" style={{ color: '#F97316', fontSize: '0.78rem' }}>
              <RotateCcw size={13} />
              <span>Reporté {interview.rescheduleCount} fois</span>
            </div>
          )}
        </div>

        {/* Participants count for Enterprise */}
        {isEnterprise && interview.participants && interview.participants.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginTop: '10px'
            }}
          >
            <Users size={14} />
            <span>
              Jury : {interview.participants.filter((p) => p.role === 'INTERVIEWER').length} examinateur(s)
            </span>
          </div>
        )}
      </div>

      {/* Card Action Buttons */}
      <div className="card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-secondary"
            onClick={() => downloadIcsFile(interview)}
            title={t.exportIcs}
            style={{ padding: '6px 8px' }}
          >
            <Download size={14} />
          </button>

          {interview.meetingUrl && (
            <a
              href={interview.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              title={t.joinMeeting}
              style={{ padding: '6px 8px', textDecoration: 'none' }}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Quick candidate response actions */}
          {canCandidateRespond && onQuickRespond && (
            <>
              <button
                className="btn-success"
                onClick={() => onQuickRespond(interview, 'ACCEPT')}
                title={t.acceptInvitation}
              >
                <CheckCircle size={14} />
                <span>{t.acceptInvitation.split(' ')[0]}</span>
              </button>
              <button
                className="btn-danger"
                onClick={() => onQuickRespond(interview, 'DECLINE')}
                title={t.declineInvitation}
              >
                <XCircle size={14} />
              </button>
            </>
          )}

          {/* Enterprise evaluation button */}
          {isEnterprise && onOpenEvaluation && (
            <button
              className="btn-secondary"
              onClick={() => onOpenEvaluation(interview)}
              title={t.actionEvaluate}
              style={{ color: '#3B82F6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
            >
              <Award size={14} />
              <span>{t.actionEvaluate.split(' ')[0]}</span>
            </button>
          )}

          {/* Full details view */}
          <button
            className="btn-secondary"
            onClick={() => onOpenDetails(interview)}
          >
            {t.viewDetails}
          </button>
        </div>
      </div>
    </div>
  );
};
