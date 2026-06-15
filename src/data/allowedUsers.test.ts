import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import {
  ALLOWED_USER_SCHEMA_VERSION,
  InvalidAllowedUserEmailError,
  addAllowedUser,
  isValidAllowedUserEmail,
  listAllowedUsers,
  removeAllowedUser,
} from './allowedUsers';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({
  getDb: vi.fn(() => ({})),
}));

const mockGetDocs = vi.mocked(getDocs);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockCollection = vi.mocked(collection);
const mockDoc = vi.mocked(doc);

describe('isValidAllowedUserEmail', () => {
  it('accepts emails containing @ and .', () => {
    expect(isValidAllowedUserEmail('user@example.com')).toBe(true);
  });

  it('rejects strings missing @ or .', () => {
    expect(isValidAllowedUserEmail('not-an-email')).toBe(false);
    expect(isValidAllowedUserEmail('user@domain')).toBe(false);
  });
});

describe('listAllowedUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed schemaVersion 1 documents sorted by email', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'z@example.com',
          data: () => ({
            schemaVersion: 1,
            email: 'z@example.com',
            addedAt: '2026-01-02T00:00:00.000Z',
            addedBy: 'admin-uid',
          }),
        },
        {
          id: 'a@example.com',
          data: () => ({
            schemaVersion: 1,
            email: 'a@example.com',
            addedAt: '2026-01-01T00:00:00.000Z',
            addedBy: 'admin-uid',
          }),
        },
        {
          id: 'bad@example.com',
          data: () => ({ schemaVersion: 2, email: 'bad@example.com' }),
        },
      ],
    } as Awaited<ReturnType<typeof getDocs>>);

    await expect(listAllowedUsers()).resolves.toEqual([
      {
        email: 'a@example.com',
        addedAt: '2026-01-01T00:00:00.000Z',
        addedBy: 'admin-uid',
      },
      {
        email: 'z@example.com',
        addedAt: '2026-01-02T00:00:00.000Z',
        addedBy: 'admin-uid',
      },
    ]);

    expect(mockCollection).toHaveBeenCalledWith({}, 'allowedUsers');
  });
});

describe('addAllowedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes a normalized document with schemaVersion 1', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);

    await addAllowedUser('  User@Example.COM ', 'admin-uid');

    expect(mockDoc).toHaveBeenCalledWith({}, 'allowedUsers', 'user@example.com');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'allowedUsers/user@example.com' },
      expect.objectContaining({
        schemaVersion: ALLOWED_USER_SCHEMA_VERSION,
        email: 'user@example.com',
        addedBy: 'admin-uid',
      }),
    );

    const payload = mockSetDoc.mock.calls[0]?.[1] as { addedAt: string };
    expect(payload.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects invalid email', async () => {
    await expect(addAllowedUser('invalid', 'admin-uid')).rejects.toBeInstanceOf(
      InvalidAllowedUserEmailError,
    );
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('removeAllowedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the normalized email document', async () => {
    mockDeleteDoc.mockResolvedValueOnce(undefined);

    await removeAllowedUser('User@Example.COM');

    expect(mockDoc).toHaveBeenCalledWith({}, 'allowedUsers', 'user@example.com');
    expect(mockDeleteDoc).toHaveBeenCalledWith({
      path: 'allowedUsers/user@example.com',
    });
  });
});
