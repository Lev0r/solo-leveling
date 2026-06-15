import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createArchive,
  currentYearInTimezone,
  deleteRawLogsForYear,
  getPendingArchiveYear,
  useArchivePrompt,
} from '../../data/archive';
import { useAuthState } from '../../data/auth';
import { useUserProfileContext } from '../../data/userProfile';
import type { AppLanguage } from '../../data/schema';

const touchTarget = {
  minHeight: 48,
  minWidth: 48,
  padding: '0 12px',
} as const;

function formatSummarizedAt(iso: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'uk' ? 'uk-UA' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function ArchivesSection({ uid, timezone, language }: { uid: string; timezone: string; language: AppLanguage }) {
  const { t } = useTranslation('archive');
  const archiveState = useArchivePrompt({ uid, timezone });
  const [selectedYear, setSelectedYear] = useState<number>(() => currentYearInTimezone(timezone) - 1);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const manualYears = useMemo(() => {
    const currentYear = currentYearInTimezone(timezone);
    return [currentYear - 1, currentYear - 2, currentYear - 3];
  }, [timezone]);

  if (archiveState.status === 'loading') {
    return <p>{t('working')}</p>;
  }

  if (archiveState.status === 'error') {
    return <p>{t('error')}</p>;
  }

  const { archives, reload } = archiveState;
  const pendingYear = getPendingArchiveYear(timezone, archives);
  const archiveByYear = new Map(archives.map((archive) => [archive.year, archive]));

  const runAction = async (action: () => Promise<void>) => {
    setWorking(true);
    setError(false);
    setSuccessMessage(null);

    try {
      await action();
      reload();
    } catch {
      setError(true);
    } finally {
      setWorking(false);
    }
  };

  const handleCreate = (year: number) => {
    void runAction(async () => {
      await createArchive(uid, year, timezone);
    });
  };

  const handleDeleteRawLogs = (year: number) => {
    if (!window.confirm(t('deleteRawLogsConfirm', { year }))) {
      return;
    }

    void runAction(async () => {
      await deleteRawLogsForYear(uid, year);
      setSuccessMessage(t('rawLogsDeleted'));
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ margin: '0 0 8px' }}>{t('listHeading')}</h3>
        {archives.length === 0 ? (
          <p style={{ margin: 0 }}>{t('empty')}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {archives.map((archive) => (
              <li key={archive.year}>
                <p style={{ margin: '0 0 4px' }}>{archive.year}</p>
                <p style={{ margin: '0 0 8px', color: 'var(--text-muted)' }}>
                  {t('summarizedAt', {
                    date: formatSummarizedAt(archive.summarizedAt, language),
                  })}
                </p>
                {archive.rawLogsDeletedAt === null ? (
                  <button
                    type="button"
                    style={touchTarget}
                    disabled={working}
                    onClick={() => {
                      handleDeleteRawLogs(archive.year);
                    }}
                  >
                    {t('deleteRawLogs')}
                  </button>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('rawLogsDeleted')}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingYear !== null && !archiveByYear.has(pendingYear) ? (
        <button
          type="button"
          style={touchTarget}
          data-variant="primary"
          disabled={working}
          onClick={() => {
            handleCreate(pendingYear);
          }}
        >
          {t('createPreviousYear', { year: pendingYear })}
        </button>
      ) : null}

      <div>
        <label htmlFor="archive-year-select" style={{ display: 'block', marginBottom: 8 }}>
          {t('archiveYearLabel')}
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            id="archive-year-select"
            value={selectedYear}
            disabled={working}
            style={{ minHeight: 48, padding: '0 12px' }}
            onChange={(event) => {
              setSelectedYear(Number.parseInt(event.target.value, 10));
            }}
          >
            {manualYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            type="button"
            style={touchTarget}
            disabled={working || archiveByYear.has(selectedYear)}
            onClick={() => {
              handleCreate(selectedYear);
            }}
          >
            {t('archiveYearAction')}
          </button>
        </div>
      </div>

      {working ? <p style={{ margin: 0 }}>{t('working')}</p> : null}
      {error ? <p style={{ margin: 0 }}>{t('error')}</p> : null}
      {successMessage ? <p style={{ margin: 0 }}>{successMessage}</p> : null}
    </div>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation(['settings', 'archive']);
  const authState = useAuthState();
  const { profile, updateLanguage } = useUserProfileContext();

  if (authState.status !== 'signed-in') {
    return null;
  }

  const uid = authState.user.uid;

  const handleLanguageChange = (lang: AppLanguage) => {
    if (lang === profile.language) {
      return;
    }

    void (async () => {
      await updateLanguage(lang);
      await i18n.changeLanguage(lang);
      localStorage.setItem('lang', lang);
    })();
  };

  return (
    <section>
      <h2>{t('settings:title')}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
        <div>
          <p style={{ margin: '0 0 8px' }}>{t('settings:language.label')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={touchTarget}
              aria-pressed={profile.language === 'uk'}
              onClick={() => handleLanguageChange('uk')}
            >
              {t('settings:language.uk')}
            </button>
            <button
              type="button"
              style={touchTarget}
              aria-pressed={profile.language === 'en'}
              onClick={() => handleLanguageChange('en')}
            >
              {t('settings:language.en')}
            </button>
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', color: 'var(--text-muted)' }}>{t('settings:timezone')}</p>
          <p style={{ margin: 0 }}>{profile.timezone}</p>
        </div>

        <div>
          <h3 style={{ margin: '0 0 8px' }}>{t('archive:title')}</h3>
          <ArchivesSection
            uid={uid}
            timezone={profile.timezone}
            language={profile.language}
          />
        </div>
      </div>
    </section>
  );
}
