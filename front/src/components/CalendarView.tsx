import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  MapPin,
  Phone
} from 'lucide-react';
import { Interview, CurrentUser } from '../types/interview';
import { useTranslation } from '../translations/useTranslation';

interface CalendarViewProps {
  interviews: Interview[];
  currentUser: CurrentUser;
  onSelectInterview: (interview: Interview) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  interviews,
  currentUser,
  onSelectInterview
}) => {
  const { t } = useTranslation();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Calculate 7 days for the selected week
  const getDaysOfWeek = (offset: number) => {
    const today = new Date();
    // Monday as start of week
    const currentDay = today.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday + offset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getDaysOfWeek(currentWeekOffset);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatHeaderDate = (d: Date) => {
    return d.toLocaleDateString('fr-TN', {
      timeZone: 'Africa/Tunis',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('fr-TN', {
      timeZone: 'Africa/Tunis',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="calendar-view-container">
      {/* Calendar Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarIcon size={20} color="var(--primary)" />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
            {t.navCalendar}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            (Fuseau Tunis UTC+1)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => setCurrentWeekOffset((o) => o - 1)}
            title="Semaine précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="btn-secondary"
            onClick={() => setCurrentWeekOffset(0)}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Aujourd'hui
          </button>
          <button
            className="btn-icon"
            onClick={() => setCurrentWeekOffset((o) => o + 1)}
            title="Semaine suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid of 7 days */}
      <div className="calendar-days-grid">
        {weekDays.map((day, idx) => {
          const dayInterviews = interviews.filter((item) =>
            isSameDay(new Date(item.scheduledStart), day)
          );

          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className="calendar-day-col"
              style={{
                borderColor: isToday ? 'var(--primary)' : 'var(--border-subtle)',
                background: isToday ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-surface)'
              }}
            >
              <div
                className="calendar-day-header"
                style={{ color: isToday ? 'var(--primary)' : 'var(--text-secondary)' }}
              >
                {formatHeaderDate(day)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {dayInterviews.length === 0 ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      marginTop: '20px'
                    }}
                  >
                    Aucun créneau
                  </span>
                ) : (
                  dayInterviews.map((item) => (
                    <div
                      key={item.id}
                      className="calendar-event-chip"
                      onClick={() => onSelectInterview(item)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px'
                        }}
                      >
                        <strong style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>
                          {formatTime(item.scheduledStart)}
                        </strong>
                        <span
                          className={`status-badge ${item.status}`}
                          style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                        >
                          {t[`status_${item.status}`]}
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {currentUser.role === 'ENTERPRISE' ? item.candidateName : item.companyName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {item.mode === 'VIDEO' && 'Visio'}
                        {item.mode === 'ONSITE' && 'Présentiel'}
                        {item.mode === 'PHONE' && 'Téléphone'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
