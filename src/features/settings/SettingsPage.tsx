import { useTranslation } from 'react-i18next';

export function SettingsPage() {
  const { t } = useTranslation('settings');

  return (
    <section>
      <h2>{t('title')}</h2>
      <p>{t('description')}</p>
    </section>
  );
}
