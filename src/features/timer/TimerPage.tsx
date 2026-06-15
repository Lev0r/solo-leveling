import { useTranslation } from 'react-i18next';

export function TimerPage() {
  const { t } = useTranslation('common');

  return (
    <section>
      <h2>{t('nav.timer')}</h2>
      <p>{t('timer.description')}</p>
    </section>
  );
}
