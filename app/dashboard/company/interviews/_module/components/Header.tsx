import React from 'react';
import {
  Calendar,
  Globe,
  Moon,
  Sun,
  Layers,
  Bell
} from 'lucide-react';
import { CurrentUser } from '../types/interview';
import { useTranslation } from '../translations/useTranslation';

interface HeaderProps {
  currentUser: CurrentUser;
  backendMode: 'mock' | 'live';
  onBackendModeToggle: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendMode,
  onBackendModeToggle,
  isDark,
  onToggleTheme
}) => {
  const { t, lang, setLang } = useTranslation();

  return (
    <header className="app-header">
      <div className="header-inner">
        {/* Logo and App Title */}
        <div className="logo-group">
          <div className="logo-badge">
            <Calendar size={22} />
          </div>
          <div className="logo-text">
            <h1>
              {t.appName}
              <span className="module-pill">{t.moduleName}</span>
            </h1>
            <p>{t.appTagline}</p>
          </div>
        </div>

        {/* Right side controls: Backend switch, Lang switch, Theme */}
        <div className="header-actions">
          {/* Backend Mode Switcher */}
          <button
            className={`btn-secondary ${backendMode === 'live' ? 'btn-live-active' : ''}`}
            onClick={onBackendModeToggle}
            title={backendMode === 'mock' ? 'Passer sur les server actions' : 'Passer sur simulateur local'}
            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
          >
            <Layers size={14} />
            <span>{backendMode === 'mock' ? t.modeMock : t.modeLive}</span>
          </button>

          {/* Language Switch */}
          <button
            className="btn-icon"
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            title="Changer de langue (FR / EN)"
          >
            <Globe size={16} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: '3px' }}>
              {lang.toUpperCase()}
            </span>
          </button>

          {/* Theme Switch */}
          <button
            className="btn-icon"
            onClick={onToggleTheme}
            title="Basculer thème sombre / clair"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notifications button */}
          <button className="btn-icon" title="Notifications">
            <Bell size={17} />
          </button>
        </div>
      </div>
    </header>
  );
};