import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldAlert,
  Star,
  CheckCircle2,
  X,
  UserCheck,
  FileText
} from 'lucide-react';
import { Evaluation, Interview, Recommendation, CurrentUser } from '../types/interview';
import { apiService, EvaluationPayload } from '../services/api';
import { useTranslation } from '../translations/useTranslation';

interface EvaluationModalProps {
  interview: Interview | null;
  currentUser: CurrentUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  interview,
  currentUser,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();

  const [criteria, setCriteria] = useState<Record<string, number>>({
    'Compétences techniques': 4.0,
    'Communication & Clarté': 4.0,
    'Résolution de problèmes': 3.5,
    'Adéquation culturelle': 4.5
  });

  const [overallRating, setOverallRating] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<Recommendation>('ADVANCE');
  const [privateComment, setPrivateComment] = useState<string>('');

  const [pastEvaluations, setPastEvaluations] = useState<Evaluation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && interview) {
      apiService.getEvaluations(currentUser, interview.id).then((evals) => {
        setPastEvaluations(evals);
      });
    }
  }, [isOpen, interview]);

  if (!isOpen || !interview) return null;

  const handleScoreChange = (key: string, val: number) => {
    setCriteria((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload: EvaluationPayload = {
        criteriaScores: criteria,
        overallRating,
        recommendation,
        privateComment: privateComment.trim() || undefined
      };

      await apiService.evaluateInterview(currentUser, interview.id, payload);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Erreur lors de l\'évaluation');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={22} color="#3B82F6" />
              {t.evaluationTitle}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Candidat : <strong>{interview.candidateName}</strong> • {interview.candidateTitle}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Confidential notice */}
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#A5B4FC',
                fontSize: '0.82rem'
              }}
            >
              <ShieldAlert size={18} />
              <span>{t.evaluationConfidentialNotice}</span>
            </div>

            {errorMsg && (
              <div className="conflict-alert">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Criteria Scores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Grille d’évaluation multi-critères (1 à 5)
              </label>

              {Object.entries(criteria).map(([key, score]) => (
                <div key={key} className="criteria-item">
                  <div className="criteria-header">
                    <span>{key}</span>
                    <span className="criteria-score-badge">{score.toFixed(1)} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    className="range-slider"
                    value={score}
                    onChange={(e) => handleScoreChange(key, parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </div>

            {/* Overall Rating (Stars) */}
            <div className="form-group">
              <label>{t.overallRatingLabel}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <Star
                      size={26}
                      color={star <= overallRating ? '#F59E0B' : '#475569'}
                      fill={star <= overallRating ? '#F59E0B' : 'none'}
                    />
                  </button>
                ))}
                <span style={{ fontWeight: 700, fontSize: '1rem', marginLeft: '8px' }}>
                  {overallRating} / 5
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="form-group">
              <label>{t.recommendationLabel}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn-secondary ${recommendation === 'ADVANCE' ? 'btn-success' : ''}`}
                  onClick={() => setRecommendation('ADVANCE')}
                  style={{ justifyContent: 'center', padding: '10px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{t.rec_ADVANCE}</span>
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${recommendation === 'HOLD' ? 'nav-tab-btn active' : ''}`}
                  onClick={() => setRecommendation('HOLD')}
                  style={{ justifyContent: 'center', padding: '10px' }}
                >
                  <span>{t.rec_HOLD}</span>
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${recommendation === 'REJECT' ? 'btn-danger' : ''}`}
                  onClick={() => setRecommendation('REJECT')}
                  style={{ justifyContent: 'center', padding: '10px' }}
                >
                  <span>{t.rec_REJECT}</span>
                </button>
              </div>
            </div>

            {/* Private Comments */}
            <div className="form-group">
              <label>{t.privateCommentsLabel}</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Points techniques forts, axes d'amélioration, impression générale..."
                value={privateComment}
                onChange={(e) => setPrivateComment(e.target.value)}
              />
            </div>

            {/* History of past evaluations */}
            {pastEvaluations.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <h4 style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {t.evaluationsListTitle} ({pastEvaluations.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pastEvaluations.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>{ev.evaluatorName}</strong>
                        <span style={{ color: ev.recommendation === 'ADVANCE' ? '#10B981' : '#F59E0B' }}>
                          {ev.recommendation} • {ev.overallRating}/5 ★
                        </span>
                      </div>
                      {ev.privateComment && (
                        <p style={{ color: 'var(--text-secondary)' }}>« {ev.privateComment} »</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              {t.cancel}
            </button>
            <button
              type="submit"
              className="primary-action-btn"
              disabled={isSubmitting}
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
            >
              <Award size={16} />
              <span>{isSubmitting ? t.loading : t.submitEvaluationBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
