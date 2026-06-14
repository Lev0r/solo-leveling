import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getDb } from './firebase';

export type WhitelistState =
  | { status: 'loading' }
  | { status: 'whitelisted' }
  | { status: 'not-whitelisted' };

type ResolvedWhitelist = {
  email: string;
  state: Exclude<WhitelistState, { status: 'loading' }>;
};

export function useIsWhitelisted(email: string | null): WhitelistState {
  const [resolved, setResolved] = useState<ResolvedWhitelist | null>(null);

  useEffect(() => {
    if (!email) {
      return;
    }

    let cancelled = false;
    const ref = doc(getDb(), 'allowedUsers', email);

    void getDoc(ref)
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setResolved({
          email,
          state: snapshot.exists()
            ? { status: 'whitelisted' }
            : { status: 'not-whitelisted' },
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setResolved({ email, state: { status: 'not-whitelisted' } });
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!email || resolved?.email !== email) {
    return { status: 'loading' };
  }

  return resolved.state;
}
