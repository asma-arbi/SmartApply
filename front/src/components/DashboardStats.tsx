import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Video,
  MapPin,
  ExternalLink,
  Download,
  CalendarDays
} from 'lucide-react';
import { Interview, CurrentUser } from '../types/interview';
import { useTranslation } from '../translations/useTranslation';
import { downloadIcsFile } from '../services/ics';

interface DashboardStatsProps {
  interviews: Interview[];
  currentUser: CurrentUser;
  onSelectInterview: (interview: Interview) => void;
  onScheduleClick?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  interviews,
  currentUser,
  onSelectInterview,
  onScheduleClick
}) => {
  const { t } = useTranslation();

  const total = interviews.length;
  const upcoming = interviews.filter((i) =>
    ['PROPOSED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(i.status) &&
    new Date(i.scheduledStart).getTime() >= Date.now() - 3600000
  ).length;

  const pending = interviews.filter((i) => i.status === 'PROPOSED' || i.status === 'RESCHEDULE_REQUESTED').length;
  const completed = interviews.filter((i) => i.status === 'COMPLETED').length;

  const confirmedCount = interviews.filter((i) => i.status === 'CONFIRMED' || i.status === 'COMPLETED').length;
  const acceptanceRate = total > 0 ? Math.round((confirmedCount / total) * 100) : 0;

  // Find next upcoming interview
  const sortedUpcoming = [...interviews]
    .filter((i) => !['CANCELLED', 'DECLINED'].includes(i.status) && new Date(i.scheduledStart).getTime() >= Date.now() - 3600000)
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

  const nextInterview = sortedUpcoming[0] || null;

  const formatTunisDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-TN', {
      timeZone: 'Africa/Tunis',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {/* Next Up Hero Card */}
      {nextInterview ? (
        <div className="next-up-hero">
          <div className="hero-content">
            <div className="hero-tag">
              <Clock size={15} />
              <span>{t.nextUpTitle}</span>
            </div>
            <h2 className="hero-title">
              {currentUser.role === 'ENTERPRISE'
                ? `${nextInterview.candidateName} • ${nextInterview.candidateTitle}`
                : `${nextInterview.companyName} • ${nextInterview.candidateTitle}`}
            </h2>
            <div className="hero-meta">
              <span>
                <CalendarDays size={16} />
                <strong>{formatTunisDate(nextInterview.scheduledStart)}</strong>
              </span>
              <span>
                {nextInterview.mode === 'VIDEO' && <Video size={16} color="#2563EB" />}
                {nextInterview.mode === 'ONSITE' && <MapPin size={16} color="#10B981" />}
                {t[`mode_${nextInterview.mode}`]}
              </span>
              <span className={`status-badge ${nextInterview.status}`}>
                {t[`status_${nextInterview.status}`]}
              </span>
            </div>
          </div>

          <div className="hero-actions">
            {nextInterview.meetingUrl && (
              <a
                href={nextInterview.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-success"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={15} />
                <span>{t.joinMeeting}</span>
              </a>
            )}
            <button
              className="btn-secondary"
              onClick={() => downloadIcsFile(nextInterview)}
              title={t.exportIcs}
            >
              <Download size={15} />
              <span>{t.exportIcs}</span>
            </button>
            <button
              className="primary-action-btn"
              onClick={() => onSelectInterview(nextInterview)}
            >
              <span>{t.viewDetails}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="next-up-hero" style={{ background: 'var(--bg-card)' }}>
          <div className="hero-content">
            <h2 className="hero-title" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              {t.nextUpEmpty}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              {t.timezoneNotice}
            </p>
          </div>
          {currentUser.role === 'ENTERPRISE' && onScheduleClick && (
            <button className="primary-action-btn" onClick={onScheduleClick}>
              <Calendar size={16} />
              <span>{t.navNewInterview}</span>
            </button>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563EB' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-info">
            <h3>{total}</h3>
            <p>{t.statTotal}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
            <Clock size={22} />
          </div>
          <div className="stat-info">
            <h3>{upcoming}</h3>
            <p>{t.statUpcoming}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
            <AlertCircle size={22} />
          </div>
          <div className="stat-info">
            <h3>{pending}</h3>
            <p>{t.statPending}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-info">
            <h3>{completed}</h3>
            <p>{t.statCompleted}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <h3>{acceptanceRate}%</h3>
            <p>{t.statAcceptanceRate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
