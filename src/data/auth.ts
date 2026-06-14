import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
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
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
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
  }, []);

  return state;
}
