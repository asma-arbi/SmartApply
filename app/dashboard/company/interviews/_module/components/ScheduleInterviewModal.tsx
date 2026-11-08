import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  AlertTriangle,
  X,
  Users,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import {
  ApplicationSummary,
  CurrentUser,
  Interviewer,
  InterviewMode
} from '../types/interview';
import { apiService, CreateInterviewPayload, ScheduleConflict } from '../services/api';
import { useTranslation } from '../translations/useTranslation';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  currentUser: CurrentUser;
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();

  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  // Default to tomorrow 10:00
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [startDateTime, setStartDateTime] = useState<string>(getDefaultDate());
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [mode, setMode] = useState<InterviewMode>('VIDEO');
  const [meetingUrl, setMeetingUrl] = useState<string>('https://meet.google.com/sma-tun-demo');
  const [locationText, setLocationText] = useState<string>('Les Berges du Lac 2, Tunis');
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>(['rec-01']);
  const [message, setMessage] = useState<string>(
    'Bonjour, nous avons le plaisir de vous convier à un premier entretien d\'échange technique.'
  );

  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load applications
  useEffect(() => {
    if (isOpen) {
      apiService.getApplications().then((apps) => {
        setApplications(apps);
        if (apps.length > 0 && !selectedAppId) {
          setSelectedAppId(apps[0].id);
        }
      }).catch((err) => setErrorMsg(err.message || 'Impossible de charger les candidatures'));
      apiService.getInterviewers(currentUser).then(setInterviewers).catch(() => setInterviewers([]));
    }
  }, [isOpen]);

  // Conflict detection whenever date, duration, candidate or interviewers change
  useEffect(() => {
    if (!startDateTime || !selectedAppId) return;

    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const selectedApp = applications.find((a) => a.id === selectedAppId);
    const candidateUserId = selectedApp?.candidateUserId || '';

    apiService
      .checkConflicts(currentUser, start.toISOString(), end.toISOString(), candidateUserId, selectedInterviewers)
      .then((c) => setConflicts(c))
      .catch((err) => console.error(err));
  }, [startDateTime, durationMinutes, selectedAppId, selectedInterviewers, applications, currentUser]);

  if (!isOpen) return null;

  const handleInterviewerToggle = (id: string) => {
    if (selectedInterviewers.includes(id)) {
      setSelectedInterviewers(selectedInterviewers.filter((item) => item !== id));
    } else {
      setSelectedInterviewers([...selectedInterviewers, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedAppId) {
      setErrorMsg('Veuillez sélectionner un candidat éligible.');
      return;
    }

    const startDate = new Date(startDateTime);
    if (startDate.getTime() < Date.now() + 25 * 60 * 1000) {
      setErrorMsg('L\'entretien doit être planifié au moins 30 minutes à l\'avance.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateInterviewPayload = {
        scheduledStart: startDate.toISOString(),
        durationMinutes,
        mode,
        meetingUrl: mode === 'VIDEO' ? meetingUrl : undefined,
        locationText: mode === 'ONSITE' ? locationText : undefined,
        interviewerUserIds: selectedInterviewers,
        message
      };

      await apiService.createInterview(currentUser, selectedAppId, payload);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Erreur lors de la planification');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>{t.scheduleTitle}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.scheduleSubtitle}</p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="conflict-alert" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <AlertTriangle size={18} color="#EF4444" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Candidate selection */}
            <div className="form-group">
              <label>{t.selectCandidate}</label>
              <select
                className="form-control"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.candidateName} — {app.positionTitle} ({app.companyName})
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Duration row */}
            <div className="form-row">
              <div className="form-group">
                <label>
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {t.dateTimeLabel}
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t.durationLabel}</label>
                <select
                  className="form-control"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 heure (Recommandé)</option>
                  <option value={90}>1 heure 30</option>
                  <option value={120}>2 heures</option>
                </select>
              </div>
            </div>

            {/* Conflict Banner if detected */}
            {conflicts.length > 0 && (
              <div className="conflict-alert">
                <AlertTriangle size={20} color="#F87171" />
                <div>
                  <strong>{t.conflictDetectedWarning}</strong>
                  <ul style={{ margin: '4px 0 0 16px', fontSize: '0.8rem' }}>
                    {conflicts.map((c, i) => (
                      <li key={i}>
                        {c.party === 'CANDIDATE' ? 'Candidat' : 'Interviewer'} ({c.name}) a déjà un entretien prévu sur ce créneau.
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Mode selection */}
            <div className="form-group">
              <label>{t.modeLabel}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn-secondary ${mode === 'VIDEO' ? 'nav-tab-btn active' : ''}`}
                  onClick={() => setMode('VIDEO')}
                  style={{ justifyContent: 'center', padding: '10px' }}
                >
                  <Video size={16} />
                  <span>{t.mode_VIDEO}</span>
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${mode === 'ONSITE' ? 'nav-tab-btn active' : ''}`}
                  onClick={() => setMode('ONSITE')}
                  style={{ justifyContent: 'center', padding: '10px' }}
                >
                  <MapPin size={16} />
                  <span>{t.mode_ONSITE}</span>
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${mode === 'PHONE' ? 'nav-tab-btn active' : ''}`}
                  onClick={() => setMode('PHONE')}
                  style={{ justifyContent: 'center', padding: '10px' }}
                >
                  <Phone size={16} />
                  <span>{t.mode_PHONE}</span>
                </button>
              </div>
            </div>

            {/* Conditional URL or Location */}
            {mode === 'VIDEO' && (
              <div className="form-group">
                <label>Lien Visioconférence (Google Meet, Microsoft Teams, Zoom)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://meet.google.com/..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                />
              </div>
            )}

            {mode === 'ONSITE' && (
              <div className="form-group">
                <label>Adresse des locaux de l'entreprise (en Tunisie)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Les Berges du Lac 2, Tunis"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />
              </div>
            )}

            {/* Interviewer team selection */}
            <div className="form-group">
              <label>
                <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {t.interviewersLabel}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {interviewers.map((interviewer) => (
                  <label
                    key={interviewer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--bg-main)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.84rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInterviewers.includes(interviewer.id)}
                      onChange={() => handleInterviewerToggle(interviewer.id)}
                    />
                    <span style={{ fontWeight: 600 }}>{interviewer.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({interviewer.title})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message to candidate */}
            <div className="form-group">
              <label>{t.invitationMessageLabel}</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder={t.invitationMessagePlaceholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              {t.cancel}
            </button>
            <button type="submit" className="primary-action-btn" disabled={isSubmitting}>
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? t.loading : t.scheduleButton}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
