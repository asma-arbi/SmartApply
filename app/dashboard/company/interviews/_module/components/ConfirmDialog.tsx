import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../translations/useTranslation';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = false,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color={isDanger ? '#EF4444' : '#F59E0B'} />
            {title}
          </h3>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText || t.cancel}
          </button>
          <button
            className={isDanger ? 'btn-danger' : 'primary-action-btn'}
            onClick={onConfirm}
          >
            {confirmText || t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
