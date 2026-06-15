import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createArchive,
  deleteRawLogsForYear,
  useArchivePrompt,
} from '../../data/archive';

const touchTarget = {
  minHeight: 48,
  minWidth: 48,
  padding: '0 12px',
} as const;

type BannerPhase = 'prompt' | 'created' | 'working';

export function ArchiveBanner({ uid, timezone }: { uid: string; timezone: string }) {
  const { t } = useTranslation('archive');
  const promptState = useArchivePrompt({ uid, timezone });
  const [phase, setPhase] = useState<BannerPhase>('prompt');
  const [createdYear, setCreatedYear] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const showCreatedPhase = phase === 'created' && createdYear !== null;

  if (promptState.status !== 'ready' || (promptState.pendingYear === null && !showCreatedPhase)) {
    return null;
  }

  const pendingYear = showCreatedPhase ? createdYear : promptState.pendingYear;

  if (pendingYear === null) {
    return null;
  }

  const reload = promptState.status === 'ready' ? promptState.reload : () => {};

  const handleCreate = async () => {
    setError(false);
    setPhase('working');

    try {
      await createArchive(uid, pendingYear, timezone);
      setCreatedYear(pendingYear);
      setPhase('created');
      reload();
    } catch {
      setError(true);
      setPhase('prompt');
    }
  };

  const handleDeleteRawLogs = async () => {
    if (!window.confirm(t('deleteRawLogsConfirm', { year: pendingYear }))) {
      return;
    }

    setError(false);
    setPhase('working');

    try {
      await deleteRawLogsForYear(uid, pendingYear);
      reload();
      setPhase('prompt');
      setCreatedYear(null);
    } catch {
      setError(true);
      setPhase('created');
    }
  };

  const handleDismiss = () => {
    setPhase('prompt');
    setCreatedYear(null);
  };

  return (
    <aside
      className="today-completed-banner"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}
      aria-live="polite"
    >
      {phase === 'prompt' ? (
        <>
          <p style={{ margin: 0 }}>{t('banner.prompt', { year: pendingYear })}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={touchTarget}
              data-variant="primary"
              onClick={() => {
                void handleCreate();
              }}
            >
              {t('banner.create')}
            </button>
          </div>
        </>
      ) : null}

      {phase === 'created' ? (
        <>
          <p style={{ margin: 0 }}>{t('banner.created', { year: pendingYear })}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={touchTarget}
              data-variant="primary"
              onClick={() => {
                void handleDeleteRawLogs();
              }}
            >
              {t('banner.deleteRawLogs')}
            </button>
            <button type="button" style={touchTarget} onClick={handleDismiss}>
              {t('banner.keepRawLogs')}
            </button>
          </div>
        </>
      ) : null}

      {phase === 'working' ? <p style={{ margin: 0 }}>{t('banner.working')}</p> : null}
      {error ? <p style={{ margin: 0 }}>{t('banner.error')}</p> : null}
    </aside>
  );
}
