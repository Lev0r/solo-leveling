import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getDb } from './firebase';

export const ALLOWED_USER_SCHEMA_VERSION = 1;

export type AllowedUser = {
  email: string;
  addedAt: string;
  addedBy: string;
};

export type WhitelistState =
  | { status: 'loading' }
  | { status: 'whitelisted' }
  | { status: 'not-whitelisted' };

type ResolvedWhitelist = {
  email: string;
  state: Exclude<WhitelistState, { status: 'loading' }>;
};

export class InvalidAllowedUserEmailError extends Error {
  constructor() {
    super('Invalid email');
    this.name = 'InvalidAllowedUserEmailError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isValidAllowedUserEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.includes('@') && trimmed.includes('.');
}

function normalizeAllowedUserEmail(email: string): string {
  return email.trim().toLowerCase();
}

function allowedUsersCollectionRef() {
  return collection(getDb(), 'allowedUsers');
}

function allowedUserDocRef(email: string) {
  return doc(getDb(), 'allowedUsers', normalizeAllowedUserEmail(email));
}

function parseAllowedUserDoc(value: unknown): AllowedUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const schemaVersion = value.schemaVersion;
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion > ALLOWED_USER_SCHEMA_VERSION
  ) {
    return null;
  }

  const docEmail = value.email;
  const addedAt = value.addedAt;
  const addedBy = value.addedBy;

  if (typeof docEmail !== 'string' || docEmail.length === 0) {
    return null;
  }

  if (typeof addedAt !== 'string' || addedAt.length === 0) {
    return null;
  }

  if (typeof addedBy !== 'string' || addedBy.length === 0) {
    return null;
  }

  return { email: docEmail, addedAt, addedBy };
}

export async function listAllowedUsers(): Promise<AllowedUser[]> {
  const snapshot = await getDocs(allowedUsersCollectionRef());
  const users: AllowedUser[] = [];

  for (const docSnapshot of snapshot.docs) {
    const parsed = parseAllowedUserDoc(docSnapshot.data());
    if (parsed) {
      users.push(parsed);
    }
  }

  users.sort((a, b) => a.email.localeCompare(b.email));
  return users;
}

export async function addAllowedUser(
  email: string,
  addedByUid: string,
): Promise<void> {
  if (!isValidAllowedUserEmail(email)) {
    throw new InvalidAllowedUserEmailError();
  }

  const normalizedEmail = normalizeAllowedUserEmail(email);

  await setDoc(allowedUserDocRef(normalizedEmail), {
    schemaVersion: ALLOWED_USER_SCHEMA_VERSION,
    email: normalizedEmail,
    addedAt: new Date().toISOString(),
    addedBy: addedByUid,
  });
}

export async function removeAllowedUser(email: string): Promise<void> {
  await deleteDoc(allowedUserDocRef(email));
}

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
