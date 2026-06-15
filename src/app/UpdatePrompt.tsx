import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 16px',
};

export function UpdatePrompt() {
  const { t } = useTranslation('common');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {},
    onRegisterError() {},
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={t('update.title')}
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
        backgroundColor: '#1B1D26',
        color: '#E8E9EE',
        borderTop: '1px solid #2E3142',
        zIndex: 101,
      }}
    >
      <p style={{ margin: 0, flex: '1 1 200px' }}>{t('update.title')}</p>
      <button
        type="button"
        style={touchTarget}
        onClick={() => {
          void updateServiceWorker(true);
        }}
      >
        {t('update.cta')}
      </button>
    </div>
  );
}
