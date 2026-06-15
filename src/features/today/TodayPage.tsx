import { useTranslation } from 'react-i18next';
import { useAuthState } from '../../data/auth';

export function TodayPage() {
  const { t } = useTranslation(['common', 'auth']);
  const authState = useAuthState();

  const name =
    authState.status === 'signed-in'
      ? (authState.user.displayName ?? authState.user.email)
      : '';

  return (
    <section>
      <h2>{t('common:nav.today')}</h2>
      {authState.status === 'signed-in' ? (
        <p>{t('auth:welcomeBack', { name })}</p>
      ) : null}
    </section>
  );
}
