import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
};

export function WelcomePage() {
  const { t } = useTranslation('welcome');

  return (
    <section>
      <h2>{t('title')}</h2>
      <p>{t('description')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          style={touchTarget}
          onClick={() => console.log('welcome:useDefault')}
        >
          {t('useDefault')}
        </button>
        <button
          type="button"
          style={touchTarget}
          onClick={() => console.log('welcome:importJson')}
        >
          {t('importJson')}
        </button>
      </div>
    </section>
  );
}
