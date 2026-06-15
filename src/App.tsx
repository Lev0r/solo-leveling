import { RouterProvider } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle, signOutCurrentUser, useAuthState } from './data/auth';
import { useIsWhitelisted } from './data/allowedUsers';
import { router } from './app/router';
import { BRAND_NAME } from './app/AppShell';

function BrandHeading() {
  return <h1>{BRAND_NAME}</h1>;
}

export default function App() {
  const { t } = useTranslation(['common', 'auth']);
  const authState = useAuthState();
  const email = authState.status === 'signed-in' ? authState.user.email : null;
  const whitelistState = useIsWhitelisted(email);

  if (authState.status === 'loading') {
    return (
      <>
        <BrandHeading />
        <p>{t('common:loading')}</p>
      </>
    );
  }

  if (authState.status === 'signed-out') {
    return (
      <>
        <BrandHeading />
        <button type="button" onClick={() => void signInWithGoogle()}>
          {t('auth:signInWithGoogle')}
        </button>
      </>
    );
  }

  if (whitelistState.status === 'loading') {
    return (
      <>
        <BrandHeading />
        <p>{t('common:loading')}</p>
      </>
    );
  }

  if (whitelistState.status === 'not-whitelisted') {
    return (
      <>
        <BrandHeading />
        <p>{t('auth:notInvited')}</p>
        <button type="button" onClick={() => void signOutCurrentUser()}>
          {t('common:signOut')}
        </button>
      </>
    );
  }

  return <RouterProvider router={router} />;
}
