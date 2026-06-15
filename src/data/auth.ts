import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { E2E_USER, isE2EFixturesEnabled } from '../e2e/fixtures';
import { getAuthClient } from './firebase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | {
      status: 'signed-in';
      user: { uid: string; email: string; displayName: string | null };
    };

export async function signInWithGoogle(): Promise<void> {
  const auth = getAuthClient();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getAuthClient();
  await signOut(auth);
}

export function useAuthState(): AuthState {
  const fixturesEnabled = isE2EFixturesEnabled();
  const fixtureAuthState = useMemo(
    (): AuthState => ({ status: 'signed-in', user: E2E_USER }),
    [],
  );
  const [state, setState] = useState<AuthState>(() =>
    fixturesEnabled ? fixtureAuthState : { status: 'loading' },
  );

  useEffect(() => {
    if (fixturesEnabled) {
      return;
    }

    const auth = getAuthClient();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user?.email) {
        setState({ status: 'signed-out' });
        return;
      }

      setState({
        status: 'signed-in',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
      });
    });

    return unsubscribe;
  }, [fixturesEnabled]);

  if (fixturesEnabled) {
    return fixtureAuthState;
  }

  return state;
}
