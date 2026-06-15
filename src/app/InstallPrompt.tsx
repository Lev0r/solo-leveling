import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from './useInstallPrompt';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 16px',
};

export function InstallPrompt() {
  const { t } = useTranslation('common');
  const { canPrompt, prompt, dismiss } = useInstallPrompt();

  if (!canPrompt) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={t('install.title')}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--surface-1)',
        color: 'var(--text)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
      }}
    >
      <p style={{ margin: 0, flex: '1 1 200px' }}>{t('install.title')}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={touchTarget} onClick={() => void prompt()}>
          {t('install.cta')}
        </button>
        <button type="button" style={touchTarget} onClick={dismiss}>
          {t('install.dismiss')}
        </button>
      </div>
    </div>
  );
}
