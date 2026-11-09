import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Award,
  ChevronRight,
  X
} from 'lucide-react';
import { useTranslation } from '../translations/useTranslation';

interface QuestionItem {
  id: number;
  question: string;
  role: string;
  sampleExpected: string;
}

const QUESTIONS_POOL: Record<string, QuestionItem[]> = {
  Fullstack: [
    {
      id: 1,
      question: 'Pouvez-vous expliquer la différence entre un Server Component et un Client Component dans Next.js / React, et comment optimiser le rendu ?',
      role: 'Fullstack',
      sampleExpected: 'SSR, hydratation, directive use client, réduction du bundle JavaScript client.'
    },
    {
      id: 2,
      question: 'Dans une architecture NestJS, comment garantir l\'idempotence des requêtes critiques comme la planification d\'un entretien ou un paiement ?',
      role: 'Fullstack',
      sampleExpected: 'Idempotency-Key en en-tête, table des requêtes avec statut de verrou, transactions ACID.'
    },
    {
      id: 3,
      question: 'Comment gérez-vous les conflits d\'agenda concurrents dans une base PostgreSQL lors de réservations simultanées ?',
      role: 'Fullstack',
      sampleExpected: 'SELECT FOR UPDATE, contraintes d\'exclusion (EXCLUDE USING gist), ou serializable isolation level.'
    }
  ],
  DataAI: [
    {
      id: 1,
      question: 'Comment fonctionne la recherche vectorielle (ANN) avec pgvector pour le matching de profils et d\'entreprises en Tunisie ?',
      role: 'DataAI',
      sampleExpected: 'Embeddings avec Sentence-Transformers, distance cosinus, index HNSW ou IVFFlat.'
    },
    {
      id: 2,
      question: 'Quelles techniques mettez-vous en place pour éviter les hallucinations d\'un LLM lors de la rédaction automatique d\'une lettre de motivation ?',
      role: 'DataAI',
      sampleExpected: 'Fact-grounding, vérification d\'ancrage par rapport aux champs validés du CV, température basse.'
    }
  ],
  DevOps: [
    {
      id: 1,
      question: 'Comment orchestrer des files de messages asynchrones avec Redis et BullMQ pour des tâches longues comme le parsing de CV ?',
      role: 'DevOps',
      sampleExpected: 'Workers dédiés, exponential backoff, dead-letter queues, limitation de débit.'
    },
    {
      id: 2,
      question: 'Comment sécuriser les variables d\'environnement et les clés API dans un pipeline CI/CD GitHub Actions ?',
      role: 'DevOps',
      sampleExpected: 'GitHub Secrets, injection sécurisée au runtime Docker, scan de vulnérabilités.'
    }
  ]
};

export const AiSimulatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  const [selectedTrack, setSelectedTrack] = useState<string>('Fullstack');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [candidateAnswer, setCandidateAnswer] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    strengths: string[];
    improvements: string[];
    summary: string;
  } | null>(null);

  if (!isOpen) return null;

  const questions = QUESTIONS_POOL[selectedTrack] || QUESTIONS_POOL['Fullstack'];
  const currentQuestion = questions[currentIndex];

  const handleEvaluateAnswer = () => {
    if (!candidateAnswer.trim()) return;

    setIsEvaluating(true);

    // Simulated AI semantic analysis evaluation
    setTimeout(() => {
      const lengthScore = Math.min(candidateAnswer.length / 5, 40);
      const randomVariance = Math.floor(Math.random() * 20) + 35;
      const finalScore = Math.min(Math.round(lengthScore + randomVariance), 96);

      setEvaluationResult({
        score: finalScore,
        strengths: [
          'Bonne structure d\'explication et vocabulaire technique précis.',
          'Compréhension des contraintes réelles de scalabilité et de production en Tunisie.'
        ],
        improvements: [
          'Approfondir la gestion des erreurs et des cas limites (edge cases).',
          'Mentionner des exemples vécus lors de vos projets universitaires ou stages.'
        ],
        summary:
          finalScore >= 80
            ? 'Excellente réponse ! Le jury technique appréciera votre précision et votre assurance.'
            : 'Bonne base conceptuelle, enrichissez avec des détails sur l\'implémentation concrète.'
      });
      setIsEvaluating(false);
    }, 1200);
  };

  const handleNextQuestion = () => {
    setEvaluationResult(null);
    setCandidateAnswer('');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleTrackChange = (track: string) => {
    setSelectedTrack(track);
    setCurrentIndex(0);
    setCandidateAnswer('');
    setEvaluationResult(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={22} color="#3B82F6" />
              {t.simulatorTitle}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t.simulatorSubtitle}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Track selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t.targetRole} :
            </span>
            {['Fullstack', 'DataAI', 'DevOps'].map((track) => (
              <button
                key={track}
                type="button"
                className={`btn-secondary ${selectedTrack === track ? 'nav-tab-btn active' : ''}`}
                onClick={() => handleTrackChange(track)}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                {track === 'Fullstack' && 'Ingénieur Full-Stack (Web)'}
                {track === 'DataAI' && 'Data Science & IA'}
                {track === 'DevOps' && 'DevOps & Cloud'}
              </button>
            ))}
          </div>

          {/* Current Question Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.15))',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.84rem' }}>
                <Bot size={18} />
                Question #{currentIndex + 1} / {questions.length}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {selectedTrack}
              </span>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentQuestion?.question}
            </p>
          </div>

          {/* Answer Input */}
          <div className="form-group">
            <label>{t.answerPlaceholder}</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Expliquez votre raisonnement comme lors d'un vrai entretien d'embauche..."
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              disabled={isEvaluating}
            />
          </div>

          {/* Feedback Card if evaluated */}
          {evaluationResult && (
            <div
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-hover)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} color="#10B981" />
                  <strong style={{ fontSize: '0.96rem' }}>{t.aiFeedbackTitle}</strong>
                </div>
                <span
                  style={{
                    background: evaluationResult.score >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: evaluationResult.score >= 80 ? '#10B981' : '#F59E0B',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                >
                  Score : {evaluationResult.score} / 100
                </span>
              </div>

              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
                « {evaluationResult.summary} »
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.82rem' }}>
                <div>
                  <strong style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Points forts
                  </strong>
                  <ul style={{ margin: '4px 0 0 16px', color: 'var(--text-secondary)' }}>
                    {evaluationResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={14} /> Pistes d’amélioration
                  </strong>
                  <ul style={{ margin: '4px 0 0 16px', color: 'var(--text-secondary)' }}>
                    {evaluationResult.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {evaluationResult ? (
            <button className="primary-action-btn" onClick={handleNextQuestion}>
              <span>{t.nextQuestion}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className="primary-action-btn"
              onClick={handleEvaluateAnswer}
              disabled={isEvaluating || !candidateAnswer.trim()}
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
            >
              <Send size={15} />
              <span>{isEvaluating ? t.loading : t.submitAnswer}</span>
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
