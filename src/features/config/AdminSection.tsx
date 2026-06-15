import type { ChangeEvent, CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InvalidAllowedUserEmailError,
  listAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  type AllowedUser,
} from '../../data/allowedUsers';
import { useIsAdmin } from '../../data/admins';
import { useAuthState } from '../../data/auth';
import { BUILTIN_DEFAULT_ROUTINE } from '../../data/defaultRoutine';
import {
  InvalidRoutineError,
  getDefaultRoutine,
  setDefaultRoutine,
} from '../../data/routine';
import { downloadRoutineJson, importRoutineFromJson } from '../../data/routineJson';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
};

export function AdminSection() {
  const { t } = useTranslation(['config', 'common']);
  const authState = useAuthState();
  const uid = authState.status === 'signed-in' ? authState.user.uid : null;
  const adminState = useIsAdmin(uid);

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[] | null>(null);
  const [whitelistLoading, setWhitelistLoading] = useState(true);
  const [whitelistError, setWhitelistError] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [whitelistBusy, setWhitelistBusy] = useState(false);
  const [whitelistActionError, setWhitelistActionError] = useState<string | null>(
    null,
  );

  const defaultRoutineFileRef = useRef<HTMLInputElement>(null);
  const [defaultRoutineBusy, setDefaultRoutineBusy] = useState(false);
  const [defaultRoutineError, setDefaultRoutineError] = useState<string | null>(
    null,
  );
  const [defaultRoutineSuccess, setDefaultRoutineSuccess] = useState<string | null>(
    null,
  );

  const reloadWhitelist = async () => {
    setWhitelistLoading(true);
    setWhitelistError(false);
    setWhitelistActionError(null);

    try {
      const users = await listAllowedUsers();
      setAllowedUsers(users);
    } catch {
      setWhitelistError(true);
      setAllowedUsers(null);
    } finally {
      setWhitelistLoading(false);
    }
  };

  useEffect(() => {
    if (adminState.status !== 'admin') {
      return;
    }

    let cancelled = false;

    void listAllowedUsers()
      .then((users) => {
        if (cancelled) {
          return;
        }
        setAllowedUsers(users);
        setWhitelistError(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setWhitelistError(true);
        setAllowedUsers(null);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setWhitelistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adminState.status]);

  if (adminState.status !== 'admin') {
    return null;
  }

  const handleAddUser = async () => {
    if (!uid || !newEmail.trim()) {
      return;
    }

    setWhitelistBusy(true);
    setWhitelistActionError(null);

    try {
      await addAllowedUser(newEmail, uid);
      setNewEmail('');
      await reloadWhitelist();
    } catch (error) {
      if (error instanceof InvalidAllowedUserEmailError) {
        setWhitelistActionError(t('config:admin.whitelist.invalidEmail'));
      } else {
        setWhitelistActionError(t('config:admin.whitelist.addError'));
      }
    } finally {
      setWhitelistBusy(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    if (!window.confirm(t('config:admin.whitelist.removeConfirm', { email }))) {
      return;
    }

    setWhitelistBusy(true);
    setWhitelistActionError(null);

    try {
      await removeAllowedUser(email);
      await reloadWhitelist();
    } catch {
      setWhitelistActionError(t('config:admin.whitelist.removeError'));
    } finally {
      setWhitelistBusy(false);
    }
  };

  const handleExportDefaultRoutine = async () => {
    setDefaultRoutineBusy(true);
    setDefaultRoutineError(null);
    setDefaultRoutineSuccess(null);

    try {
      const routine = await getDefaultRoutine();
      downloadRoutineJson(routine);
    } catch {
      setDefaultRoutineError(t('config:admin.defaultRoutine.exportError'));
    } finally {
      setDefaultRoutineBusy(false);
    }
  };

  const handleImportDefaultRoutineClick = () => {
    setDefaultRoutineError(null);
    setDefaultRoutineSuccess(null);
    defaultRoutineFileRef.current?.click();
  };

  const handleImportDefaultRoutineFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setDefaultRoutineBusy(true);
    setDefaultRoutineError(null);
    setDefaultRoutineSuccess(null);

    try {
      const text = await file.text();
      const parsed = importRoutineFromJson(text);
      await setDefaultRoutine(parsed);
      setDefaultRoutineSuccess(t('config:admin.defaultRoutine.importSuccess'));
    } catch (error) {
      if (error instanceof InvalidRoutineError) {
        setDefaultRoutineError(error.message);
      } else {
        setDefaultRoutineError(t('config:admin.defaultRoutine.importError'));
      }
    } finally {
      setDefaultRoutineBusy(false);
    }
  };

  const handleResetDefaultRoutine = async () => {
    if (!window.confirm(t('config:admin.defaultRoutine.resetConfirm'))) {
      return;
    }

    setDefaultRoutineBusy(true);
    setDefaultRoutineError(null);
    setDefaultRoutineSuccess(null);

    try {
      await setDefaultRoutine(BUILTIN_DEFAULT_ROUTINE);
      setDefaultRoutineSuccess(t('config:admin.defaultRoutine.resetSuccess'));
    } catch {
      setDefaultRoutineError(t('config:admin.defaultRoutine.resetError'));
    } finally {
      setDefaultRoutineBusy(false);
    }
  };

  return (
    <section style={{ marginTop: 32 }}>
      <h2>{t('config:admin.title')}</h2>

      <div style={{ marginTop: 24 }}>
        <h3>{t('config:admin.whitelist.title')}</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('config:admin.whitelist.description')}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={touchTarget}
              disabled={whitelistLoading || whitelistBusy}
              onClick={() => {
                void reloadWhitelist();
              }}
            >
              {t('config:admin.whitelist.reload')}
            </button>
            {whitelistLoading ? <span>{t('common:loading')}</span> : null}
          </div>

          {whitelistError ? (
            <p>{t('config:admin.whitelist.loadError')}</p>
          ) : null}

          {allowedUsers && allowedUsers.length === 0 && !whitelistLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>
              {t('config:admin.whitelist.empty')}
            </p>
          ) : null}

          {allowedUsers && allowedUsers.length > 0 ? (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {allowedUsers.map((user) => (
                <li
                  key={user.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{user.email}</span>
                  <button
                    type="button"
                    style={touchTarget}
                    disabled={whitelistBusy}
                    onClick={() => {
                      void handleRemoveUser(user.email);
                    }}
                  >
                    {t('config:admin.whitelist.remove')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email"
              value={newEmail}
              placeholder={t('config:admin.whitelist.emailPlaceholder')}
              disabled={whitelistBusy}
              onChange={(event) => {
                setNewEmail(event.target.value);
              }}
              style={{ flex: '1 1 200px', minHeight: 48 }}
            />
            <button
              type="button"
              data-variant="primary"
              style={touchTarget}
              disabled={whitelistBusy || !newEmail.trim()}
              onClick={() => {
                void handleAddUser();
              }}
            >
              {t('config:admin.whitelist.add')}
            </button>
          </div>

          {whitelistActionError ? <p>{whitelistActionError}</p> : null}
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3>{t('config:admin.defaultRoutine.title')}</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('config:admin.defaultRoutine.description')}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={touchTarget}
              disabled={defaultRoutineBusy}
              onClick={() => {
                void handleExportDefaultRoutine();
              }}
            >
              {t('config:admin.defaultRoutine.exportJson')}
            </button>
            <button
              type="button"
              style={touchTarget}
              disabled={defaultRoutineBusy}
              onClick={handleImportDefaultRoutineClick}
            >
              {t('config:admin.defaultRoutine.importJson')}
            </button>
            <button
              type="button"
              style={touchTarget}
              disabled={defaultRoutineBusy}
              onClick={() => {
                void handleResetDefaultRoutine();
              }}
            >
              {t('config:admin.defaultRoutine.resetBuiltin')}
            </button>
            <input
              ref={defaultRoutineFileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={(event) => {
                void handleImportDefaultRoutineFile(event);
              }}
            />
            {defaultRoutineBusy ? <span>{t('common:loading')}</span> : null}
          </div>

          {defaultRoutineError ? <p>{defaultRoutineError}</p> : null}
          {defaultRoutineSuccess ? (
            <p style={{ color: 'var(--complete)' }}>{defaultRoutineSuccess}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
