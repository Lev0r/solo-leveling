import type { ChangeEvent, CSSProperties } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from '../../data/auth';
import { AdminSection } from './AdminSection';
import {
  InvalidRoutineError,
  getDefaultRoutine,
  setUserRoutine,
  useUserRoutine,
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

export function ConfigPage() {
  const { t } = useTranslation(['config', 'common']);
  const navigate = useNavigate();
  const authState = useAuthState();
  const uid = authState.status === 'signed-in' ? authState.user.uid : '';
  const routineState = useUserRoutine(uid);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportError, setExportError] = useState(false);

  if (authState.status !== 'signed-in') {
    return null;
  }

  const hasRoutine =
    routineState.status === 'ready' && routineState.routine !== null;

  const handleUseDefault = async () => {
    setIsSaving(true);
    setSaveError(false);
    setImportError(null);
    setExportError(false);

    try {
      const routine = await getDefaultRoutine();
      await setUserRoutine(uid, routine);
      navigate('/', { replace: true });
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  };

  const handleExportJson = () => {
    if (routineState.status !== 'ready' || routineState.routine === null) {
      return;
    }

    setExportError(false);
    setImportError(null);
    setSaveError(false);

    try {
      downloadRoutineJson(routineState.routine);
    } catch {
      setExportError(true);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    setSaveError(false);
    setExportError(false);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsSaving(true);
    setImportError(null);
    setSaveError(false);
    setExportError(false);

    try {
      const text = await file.text();
      const parsed = importRoutineFromJson(text);
      await setUserRoutine(uid, parsed);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof InvalidRoutineError) {
        setImportError(error.message);
      } else {
        setImportError(t('config:routine.importError'));
      }
      setIsSaving(false);
    }
  };

  return (
    <section>
      <h2>{t('config:routine.title')}</h2>
      <p style={{ color: 'var(--text-muted)' }}>{t('config:routine.description')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            data-variant="primary"
            style={touchTarget}
            disabled={isSaving}
            onClick={() => {
              void handleUseDefault();
            }}
          >
            {t('config:routine.useDefault')}
          </button>
          <button
            type="button"
            style={touchTarget}
            disabled={isSaving || !hasRoutine}
            title={!hasRoutine ? t('config:routine.noRoutineToExport') : undefined}
            onClick={handleExportJson}
          >
            {t('config:routine.exportJson')}
          </button>
          <button
            type="button"
            style={touchTarget}
            disabled={isSaving}
            onClick={handleImportClick}
          >
            {t('config:routine.importJson')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(event) => {
              void handleImportFile(event);
            }}
          />
          {isSaving ? <span>{t('common:loading')}</span> : null}
        </div>
        {saveError ? <p>{t('common:error')}</p> : null}
        {exportError ? <p>{t('config:routine.exportError')}</p> : null}
        {importError ? <p>{importError}</p> : null}
      </div>
      <AdminSection />
    </section>
  );
}
