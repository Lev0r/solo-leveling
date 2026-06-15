import { useTranslation } from 'react-i18next';

export function UsersPage() {
  const { t } = useTranslation('admin');

  return (
    <section>
      <h2>{t('usersTitle')}</h2>
      <p>{t('usersDescription')}</p>
    </section>
  );
}
