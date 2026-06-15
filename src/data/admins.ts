import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getDb } from './firebase';

export type AdminState =
  | { status: 'loading' }
  | { status: 'admin' }
  | { status: 'not-admin' };

type ResolvedAdmin = {
  uid: string;
  state: Exclude<AdminState, { status: 'loading' }>;
};

export function useIsAdmin(uid: string | null): AdminState {
  const [resolved, setResolved] = useState<ResolvedAdmin | null>(null);

  useEffect(() => {
    if (!uid) {
      return;
    }

    let cancelled = false;
    const ref = doc(getDb(), 'admins', uid);

    void getDoc(ref)
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setResolved({
          uid,
          state: snapshot.exists() ? { status: 'admin' } : { status: 'not-admin' },
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setResolved({ uid, state: { status: 'not-admin' } });
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (!uid || resolved?.uid !== uid) {
    return { status: 'loading' };
  }

  return resolved.state;
}
