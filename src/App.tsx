import { signInWithGoogle, signOutCurrentUser, useAuthState } from './data/auth';
import { useIsWhitelisted } from './data/allowedUsers';

function BrandHeading() {
  return <h1>SoloLeveling</h1>;
}

export default function App() {
  const authState = useAuthState();
  const email = authState.status === 'signed-in' ? authState.user.email : null;
  const whitelistState = useIsWhitelisted(email);

  if (authState.status === 'loading') {
    return (
      <>
        <BrandHeading />
        <p>Loading…</p>
      </>
    );
  }

  if (authState.status === 'signed-out') {
    return (
      <>
        <BrandHeading />
        <button type="button" onClick={() => void signInWithGoogle()}>
          Sign in with Google
        </button>
      </>
    );
  }

  if (whitelistState.status === 'loading') {
    return (
      <>
        <BrandHeading />
        <p>Loading…</p>
      </>
    );
  }

  if (whitelistState.status === 'not-whitelisted') {
    return (
      <>
        <BrandHeading />
        <p>Not invited yet.</p>
        <button type="button" onClick={() => void signOutCurrentUser()}>
          Sign out
        </button>
      </>
    );
  }

  const { uid, email: userEmail, displayName } = authState.user;

  return (
    <>
      <BrandHeading />
      <p>Welcome, {displayName ?? userEmail}</p>
      <p>
        Your UID: <code>{uid}</code>
      </p>
      <button type="button" onClick={() => void signOutCurrentUser()}>
        Sign out
      </button>
    </>
  );
}
