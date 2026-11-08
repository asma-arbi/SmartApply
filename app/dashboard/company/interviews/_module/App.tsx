'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Sparkles,
  PlusCircle,
  RotateCcw
} from 'lucide-react';
import { CurrentUser, Interview } from './types/interview';
import { apiService } from './services/api';
import { TranslationProvider, useTranslation } from './translations/useTranslation';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { InterviewsList } from './components/InterviewsList';
import { CalendarView } from './components/CalendarView';
import { ScheduleInterviewModal } from './components/ScheduleInterviewModal';
import { InterviewDetailModal } from './components/InterviewDetailModal';
import { EvaluationModal } from './components/EvaluationModal';
import { AiSimulatorModal } from './components/AiSimulatorModal';

type ActiveTab = 'DASHBOARD' | 'INTERVIEWS' | 'CALENDAR';

interface AppProps {
  sessionUser: CurrentUser;
}

function MainApp({ sessionUser }: AppProps) {
  const { t } = useTranslation();

  // Utilisateur authentifié (fourni par la session, plus de sélecteur de rôle)
  const [currentUser] = useState<CurrentUser>(sessionUser);
  const [backendMode] = useState<'mock' | 'live'>('live');
  const [isDark, setIsDark] = useState<boolean>(true);

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');

  // Data
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [evaluatingInterview, setEvaluatingInterview] = useState<Interview | null>(null);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState<boolean>(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState<boolean>(false);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch interviews
  const loadInterviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.listInterviews(currentUser);
      setInterviews(data);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Erreur lors du chargement des entretiens');
    }
  }, [currentUser]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  // Theme switch effect
  const handleToggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  };

  const handleBackendModeToggle = () => {
    showToast('Les données viennent des server actions et de MongoDB Atlas.');
    loadInterviews();
  };

  // Quick candidate respond
  const handleQuickRespond = async (interview: Interview, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await apiService.respondInterview(currentUser, interview.id, { action });
      showToast(action === 'ACCEPT' ? 'Entretien confirmé avec succès !' : 'Entretien décliné.');
      loadInterviews();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la réponse');
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        backendMode={backendMode}
        onBackendModeToggle={handleBackendModeToggle}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Sub Navigation Bar */}
      <div className="subnav-container">
        <div className="subnav-inner">
          <div className="nav-tabs">
            <button
              className={`nav-tab-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
              onClick={() => setActiveTab('DASHBOARD')}
            >
              <LayoutDashboard size={16} />
              <span>{t.navDashboard}</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'INTERVIEWS' ? 'active' : ''}`}
              onClick={() => setActiveTab('INTERVIEWS')}
            >
              <Calendar size={16} />
              <span>{t.navInterviews}</span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}
              >
                {interviews.length}
              </span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'CALENDAR' ? 'active' : ''}`}
              onClick={() => setActiveTab('CALENDAR')}
            >
              <CalendarDays size={16} />
              <span>{t.navCalendar}</span>
            </button>

            <button
              className="nav-tab-btn"
              onClick={() => setIsAiCoachOpen(true)}
              style={{ color: '#A78BFA' }}
            >
              <Sparkles size={16} color="#3B82F6" />
              <span>{t.navAiCoach}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUser.role === 'ENTERPRISE' && (
              <button
                className="primary-action-btn"
                onClick={() => setIsScheduleOpen(true)}
              >
                <PlusCircle size={16} />
                <span>{t.navNewInterview}</span>
              </button>
            )}

            <button
              className="btn-icon"
              onClick={loadInterviews}
              title="Rafraîchir les données"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Content */}
      <main className="main-content">
        {/* Toast Feedback */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 999,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              fontWeight: 600,
              fontSize: '0.9rem',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'DASHBOARD' && (
          <div>
            <DashboardStats
              interviews={interviews}
              currentUser={currentUser}
              onSelectInterview={(item) => {
                setSelectedInterview(item);
                setIsDetailOpen(true);
              }}
              onScheduleClick={() => setIsScheduleOpen(true)}
            />

            <div style={{ marginTop: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}
              >
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>
                  {t.navInterviews}
                </h3>
              </div>

              <InterviewsList
                interviews={interviews}
                isLoading={isLoading}
                error={error}
                currentUser={currentUser}
                onRetry={loadInterviews}
                onSelectInterview={(item) => {
                  setSelectedInterview(item);
                  setIsDetailOpen(true);
                }}
                onQuickRespond={handleQuickRespond}
                onOpenEvaluation={(item) => {
                  setEvaluatingInterview(item);
                  setIsEvaluationOpen(true);
                }}
                onScheduleClick={() => setIsScheduleOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Interviews List & Search */}
        {activeTab === 'INTERVIEWS' && (
          <div>
            <InterviewsList
              interviews={interviews}
              isLoading={isLoading}
              error={error}
              currentUser={currentUser}
              onRetry={loadInterviews}
              onSelectInterview={(item) => {
                setSelectedInterview(item);
                setIsDetailOpen(true);
              }}
              onQuickRespond={handleQuickRespond}
              onOpenEvaluation={(item) => {
                setEvaluatingInterview(item);
                setIsEvaluationOpen(true);
              }}
              onScheduleClick={() => setIsScheduleOpen(true)}
            />
          </div>
        )}

        {/* Tab 3: Calendar Slots */}
        {activeTab === 'CALENDAR' && (
          <div>
            <CalendarView
              interviews={interviews}
              currentUser={currentUser}
              onSelectInterview={(item) => {
                setSelectedInterview(item);
                setIsDetailOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        currentUser={currentUser}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={() => {
          showToast('Entretien planifié avec succès ! Notification envoyée.');
          loadInterviews();
        }}
      />

      <InterviewDetailModal
        isOpen={isDetailOpen}
        interview={selectedInterview}
        currentUser={currentUser}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedInterview(null);
        }}
        onUpdated={() => {
          showToast('Statut de l\'entretien mis à jour.');
          loadInterviews();
        }}
        onOpenEvaluation={(item) => {
          setEvaluatingInterview(item);
          setIsEvaluationOpen(true);
        }}
      />

      <EvaluationModal
        isOpen={isEvaluationOpen}
        interview={evaluatingInterview}
        currentUser={currentUser}
        onClose={() => {
          setIsEvaluationOpen(false);
          setEvaluatingInterview(null);
        }}
        onSuccess={() => {
          showToast('Grille d\'évaluation enregistrée avec succès.');
          loadInterviews();
        }}
      />

      <AiSimulatorModal
        isOpen={isAiCoachOpen}
        onClose={() => setIsAiCoachOpen(false)}
      />
    </div>
  );
}

export function App({ sessionUser }: AppProps) {
  return (
    <TranslationProvider>
      <MainApp sessionUser={sessionUser} />
    </TranslationProvider>
  );
}

export default App;