import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithGoogle, signOutCurrentUser, useAuthState } from './data/auth';
import { useIsWhitelisted } from './data/allowedUsers';
import {
  UserProfileProvider,
  useUserProfile,
} from './data/userProfile';
import { router } from './app/router';
import { BRAND_NAME, BrandLogo } from './app/BrandLogo';

function BrandHeading() {
  return (
    <h1 aria-label={BRAND_NAME}>
      <BrandLogo />
    </h1>
  );
}

function FallbackPage({ children }: { children: React.ReactNode }) {
  return <div className="centered-page">{children}</div>;
}

function AuthenticatedApp({
  user,
}: {
  user: { uid: string; email: string; displayName: string | null };
}) {
  const { t, i18n } = useTranslation(['common', 'auth']);
  const profileState = useUserProfile(user);

  useEffect(() => {
    if (profileState.status !== 'ready') {
      return;
    }

    void i18n.changeLanguage(profileState.profile.language);
    localStorage.setItem('lang', profileState.profile.language);
  }, [profileState, i18n]);

  if (profileState.status === 'loading') {
    return (
      <FallbackPage>
        <BrandHeading />
        <p>{t('common:loading')}</p>
      </FallbackPage>
    );
  }

  if (profileState.status === 'error') {
    return (
      <FallbackPage>
        <BrandHeading />
        <p>{t('common:error')}</p>
      </FallbackPage>
    );
  }

  return (
    <UserProfileProvider
      profile={profileState.profile}
      updateLanguage={profileState.updateLanguage}
    >
      <RouterProvider router={router} />
    </UserProfileProvider>
  );
}

export default function App() {
  const { t } = useTranslation(['common', 'auth']);
  const authState = useAuthState();
  const email = authState.status === 'signed-in' ? authState.user.email : null;
  const whitelistState = useIsWhitelisted(email);

  if (authState.status === 'loading') {
    return (
      <FallbackPage>
        <BrandHeading />
        <p>{t('common:loading')}</p>
      </FallbackPage>
    );
  }

  if (authState.status === 'signed-out') {
    return (
      <FallbackPage>
        <BrandHeading />
        <button type="button" onClick={() => void signInWithGoogle()}>
          {t('auth:signInWithGoogle')}
        </button>
      </FallbackPage>
    );
  }

  if (whitelistState.status === 'loading') {
    return (
      <FallbackPage>
        <BrandHeading />
        <p>{t('common:loading')}</p>
      </FallbackPage>
    );
  }

  if (whitelistState.status === 'not-whitelisted') {
    return (
      <FallbackPage>
        <BrandHeading />
        <p>{t('auth:notInvited')}</p>
        <button type="button" onClick={() => void signOutCurrentUser()}>
          {t('common:signOut')}
        </button>
      </FallbackPage>
    );
  }

  return <AuthenticatedApp user={authState.user} />;
}
