import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  resetUserProfileSessionForTests,
  useUserProfile,
} from './userProfile';
import { USER_PROFILE_SCHEMA_VERSION } from './schema';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({
  getDb: vi.fn(() => ({})),
}));

const mockGetDoc = vi.mocked(getDoc);
const mockSetDoc = vi.mocked(setDoc);
const mockUpdateDoc = vi.mocked(updateDoc);

const uid = 'test-uid';
const email = 'user@example.com';
const displayName = 'Test User';

const existingProfile = {
  schemaVersion: USER_PROFILE_SCHEMA_VERSION,
  email,
  displayName,
  timezone: 'Europe/Warsaw',
  language: 'uk' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastSignInAt: '2026-01-01T00:00:00.000Z',
};

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUserProfileSessionForTests();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);

    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'uk-UA',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Europe/Kyiv',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates the profile when the document is missing', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    } as Awaited<ReturnType<typeof getDoc>>);

    const { result } = renderHook(() =>
      useUserProfile({ uid, email, displayName }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).not.toHaveBeenCalled();

    const writtenProfile = mockSetDoc.mock.calls[0]?.[1] as Record<string, unknown> | undefined;
    expect(writtenProfile).toMatchObject({
      schemaVersion: USER_PROFILE_SCHEMA_VERSION,
      email,
      displayName,
      timezone: 'Europe/Kyiv',
      language: 'uk',
    });
    expect(typeof writtenProfile?.createdAt).toBe('string');
    expect(typeof writtenProfile?.lastSignInAt).toBe('string');
    expect(writtenProfile?.createdAt).toBe(writtenProfile?.lastSignInAt);

    if (result.current.status === 'ready') {
      expect(result.current.profile.language).toBe('uk');
    }
  });

  it('updates lastSignInAt when the document exists', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => existingProfile,
    } as Awaited<ReturnType<typeof getDoc>>);

    const { result } = renderHook(() =>
      useUserProfile({ uid, email, displayName }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0]?.[1]).toEqual({
      lastSignInAt: expect.any(String),
    });

    if (result.current.status === 'ready') {
      expect(result.current.profile).toMatchObject({
        schemaVersion: existingProfile.schemaVersion,
        email: existingProfile.email,
        displayName: existingProfile.displayName,
        timezone: existingProfile.timezone,
        language: existingProfile.language,
        createdAt: existingProfile.createdAt,
      });
      expect(result.current.profile.lastSignInAt).not.toBe(existingProfile.lastSignInAt);
    }
  });

  it('does not double-write under React StrictMode', async () => {
    mockGetDoc.mockImplementation(async () => {
      if (mockSetDoc.mock.calls.length > 0) {
        return {
          exists: () => true,
          data: () => ({
            schemaVersion: USER_PROFILE_SCHEMA_VERSION,
            email,
            displayName,
            timezone: 'Europe/Kyiv',
            language: 'uk',
            createdAt: '2026-01-01T00:00:00.000Z',
            lastSignInAt: '2026-01-01T00:00:00.000Z',
          }),
        } as Awaited<ReturnType<typeof getDoc>>;
      }

      return {
        exists: () => false,
        data: () => undefined,
      } as Awaited<ReturnType<typeof getDoc>>;
    });

    renderHook(() => useUserProfile({ uid, email, displayName }), {
      wrapper: StrictMode,
    });

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('updates language via updateLanguage', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => existingProfile,
    } as Awaited<ReturnType<typeof getDoc>>);

    const { result } = renderHook(() =>
      useUserProfile({ uid, email, displayName }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      if (result.current.status === 'ready') {
        await result.current.updateLanguage('en');
      }
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), { language: 'en' });

    if (result.current.status === 'ready') {
      expect(result.current.profile.language).toBe('en');
    }
  });
});
