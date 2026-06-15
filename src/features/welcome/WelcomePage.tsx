import { useTranslation } from 'react-i18next';

export function WelcomePage() {
  const { t } = useTranslation('welcome');

  return (
    <section>
      <h2>{t('title')}</h2>
      <p>{t('description')}</p>
    </section>
  );
}
