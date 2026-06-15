import { useTranslation } from 'react-i18next';

export function TimerPage() {
  const { t } = useTranslation('common');

  return (
    <section>
      <h2>{t('timer.title')}</h2>
      <p style={{ color: 'var(--text-muted)' }}>{t('timer.description')}</p>
    </section>
  );
}
