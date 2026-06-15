import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getDb } from './firebase';
import {
  USER_PROFILE_SCHEMA_VERSION,
  type AppLanguage,
  type UserProfile,
} from './schema';

export type UserProfileState =
  | { status: 'loading' }
  | {
      status: 'ready';
      profile: UserProfile;
      updateLanguage: (lang: AppLanguage) => Promise<void>;
    }
  | { status: 'error'; error: Error };

type UserProfileContextValue = {
  profile: UserProfile;
  updateLanguage: (lang: AppLanguage) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

const sessionProfileInitialized = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'uk' || value === 'en';
}

function parseUserProfile(data: unknown): UserProfile {
  if (!isRecord(data)) {
    throw new Error('Invalid profile document');
  }

  const schemaVersion = data.schemaVersion;
  const email = data.email;
  const displayName = data.displayName;
  const timezone = data.timezone;
  const language = data.language;
  const createdAt = data.createdAt;
  const lastSignInAt = data.lastSignInAt;

  if (
    schemaVersion !== USER_PROFILE_SCHEMA_VERSION ||
    typeof email !== 'string' ||
    (typeof displayName !== 'string' && displayName !== null) ||
    typeof timezone !== 'string' ||
    !isAppLanguage(language) ||
    typeof createdAt !== 'string' ||
    typeof lastSignInAt !== 'string'
  ) {
    throw new Error('Invalid profile document');
  }

  return {
    schemaVersion: USER_PROFILE_SCHEMA_VERSION,
    email,
    displayName,
    timezone,
    language,
    createdAt,
    lastSignInAt,
  };
}

function userProfileDocRef(uid: string) {
  return doc(getDb(), 'users', uid);
}

function buildNewProfile(email: string, displayName: string | null): UserProfile {
  const now = new Date().toISOString();
  return {
    schemaVersion: USER_PROFILE_SCHEMA_VERSION,
    email,
    displayName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'uk',
    createdAt: now,
    lastSignInAt: now,
  };
}

async function loadOrCreateProfile(
  uid: string,
  email: string,
  displayName: string | null,
): Promise<UserProfile> {
  const ref = userProfileDocRef(uid);
  const snapshot = await getDoc(ref);
  const shouldWrite = !sessionProfileInitialized.has(uid);

  if (shouldWrite) {
    sessionProfileInitialized.add(uid);
  }

  if (!snapshot.exists()) {
    if (shouldWrite) {
      const profile = buildNewProfile(email, displayName);
      await setDoc(ref, profile);
      return profile;
    }

    const retrySnapshot = await getDoc(ref);
    if (!retrySnapshot.exists()) {
      throw new Error('Profile document missing after create');
    }

    return parseUserProfile(retrySnapshot.data());
  }

  const profile = parseUserProfile(snapshot.data());

  if (shouldWrite) {
    const now = new Date().toISOString();
    await updateDoc(ref, { lastSignInAt: now });
    return { ...profile, lastSignInAt: now };
  }

  return profile;
}

export function useUserProfile(args: {
  uid: string;
  email: string;
  displayName: string | null;
}): UserProfileState {
  const { uid, email, displayName } = args;
  const [state, setState] = useState<UserProfileState>({ status: 'loading' });

  const updateLanguage = useCallback(async (lang: AppLanguage) => {
    const ref = userProfileDocRef(uid);
    await updateDoc(ref, { language: lang });
    setState((prev) => {
      if (prev.status !== 'ready') {
        return prev;
      }

      return {
        ...prev,
        profile: { ...prev.profile, language: lang },
      };
    });
  }, [uid]);

  useEffect(() => {
    let cancelled = false;

    void loadOrCreateProfile(uid, email, displayName)
      .then((profile) => {
        if (cancelled) {
          return;
        }

        setState({ status: 'ready', profile, updateLanguage });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [uid, email, displayName, updateLanguage]);

  return state;
}

export function UserProfileProvider({
  profile,
  updateLanguage,
  children,
}: {
  profile: UserProfile;
  updateLanguage: (lang: AppLanguage) => Promise<void>;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ profile, updateLanguage }),
    [profile, updateLanguage],
  );

  return createElement(UserProfileContext.Provider, { value }, children);
}

export function useUserProfileContext(): UserProfileContextValue {
  const context = useContext(UserProfileContext);

  if (!context) {
    throw new Error('useUserProfileContext must be used within UserProfileProvider');
  }

  return context;
}

/** Clears per-session write guards — test-only. */
export function resetUserProfileSessionForTests(): void {
  sessionProfileInitialized.clear();
}
