import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  AlertOctagon,
  Inbox
} from 'lucide-react';
import { Interview, InterviewMode, InterviewStatus, CurrentUser } from '../types/interview';
import { InterviewCard } from './InterviewCard';
import { useTranslation } from '../translations/useTranslation';

interface InterviewsListProps {
  interviews: Interview[];
  isLoading: boolean;
  error: string | null;
  currentUser: CurrentUser;
  onRetry: () => void;
  onSelectInterview: (interview: Interview) => void;
  onQuickRespond?: (interview: Interview, action: 'ACCEPT' | 'DECLINE') => void;
  onOpenEvaluation?: (interview: Interview) => void;
  onScheduleClick?: () => void;
}

export const InterviewsList: React.FC<InterviewsListProps> = ({
  interviews,
  isLoading,
  error,
  currentUser,
  onRetry,
  onSelectInterview,
  onQuickRespond,
  onOpenEvaluation,
  onScheduleClick
}) => {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'UPCOMING' | 'RECENT'>('UPCOMING');

  // Filter logic
  const filtered = interviews.filter((item) => {
    // Search
    const term = search.toLowerCase();
    const matchSearch =
      !search ||
      item.candidateName.toLowerCase().includes(term) ||
      item.candidateTitle.toLowerCase().includes(term) ||
      item.companyName.toLowerCase().includes(term) ||
      (item.locationText && item.locationText.toLowerCase().includes(term));

    // Status
    const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

    // Mode
    const matchMode = selectedMode === 'ALL' || item.mode === selectedMode;

    return matchSearch && matchStatus && matchMode;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'UPCOMING') {
      return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // 1. Error state
  if (error) {
    return (
      <div className="empty-state-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        <div className="empty-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
          <AlertOctagon size={32} />
        </div>
        <h3 style={{ color: 'var(--text-primary)' }}>{t.error}</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem' }}>
          {error}
        </p>
        <button className="primary-action-btn" onClick={onRetry}>
          <RefreshCw size={15} />
          <span>{t.retry}</span>
        </button>
      </div>
    );
  }

  // 2. Loading state
  if (isLoading) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon" style={{ animation: 'spin 1.5s linear infinite' }}>
          <RefreshCw size={28} />
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          {/* Status selector */}
          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">{t.filterAllStatuses}</option>
            <option value="PROPOSED">{t.status_PROPOSED}</option>
            <option value="CONFIRMED">{t.status_CONFIRMED}</option>
            <option value="RESCHEDULE_REQUESTED">{t.status_RESCHEDULE_REQUESTED}</option>
            <option value="COMPLETED">{t.status_COMPLETED}</option>
            <option value="DECLINED">{t.status_DECLINED}</option>
            <option value="CANCELLED">{t.status_CANCELLED}</option>
            <option value="NO_SHOW">{t.status_NO_SHOW}</option>
          </select>

          {/* Mode selector */}
          <select
            className="filter-select"
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
          >
            <option value="ALL">{t.filterAllModes}</option>
            <option value="VIDEO">{t.mode_VIDEO}</option>
            <option value="ONSITE">{t.mode_ONSITE}</option>
            <option value="PHONE">{t.mode_PHONE}</option>
          </select>

          {/* Sort selector */}
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'UPCOMING' | 'RECENT')}
          >
            <option value="UPCOMING">{t.sortUpcoming}</option>
            <option value="RECENT">{t.sortRecent}</option>
          </select>

          {(search || selectedStatus !== 'ALL' || selectedMode !== 'ALL') && (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearch('');
                setSelectedStatus('ALL');
                setSelectedMode('ALL');
              }}
              style={{ fontSize: '0.8rem', padding: '7px 10px' }}
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* 3. Empty state */}
      {sorted.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">
            <Inbox size={30} />
          </div>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
            {t.emptyInterviews}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: '400px' }}>
            {currentUser.role === 'ENTERPRISE'
              ? 'Planifiez un entretien avec les candidats ayant postulé ou réinitialisez vos filtres.'
              : 'Aucun entretien ne correspond à vos critères de recherche actuels.'}
          </p>
          {currentUser.role === 'ENTERPRISE' && onScheduleClick && (
            <button className="primary-action-btn" onClick={onScheduleClick}>
              <Calendar size={15} />
              <span>{t.navNewInterview}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="interviews-grid">
          {sorted.map((item) => (
            <InterviewCard
              key={item.id}
              interview={item}
              currentUser={currentUser}
              onOpenDetails={onSelectInterview}
              onQuickRespond={onQuickRespond}
              onOpenEvaluation={onOpenEvaluation}
            />
          ))}
        </div>
      )}
    </div>
  );
};
