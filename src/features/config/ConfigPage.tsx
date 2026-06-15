import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '../../data/admins';
import { useAuthState } from '../../data/auth';
import { getDefaultRoutine, setUserRoutine } from '../../data/routine';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
};

function AdminSection() {
  const { t } = useTranslation('config');
  const authState = useAuthState();
  const uid = authState.status === 'signed-in' ? authState.user.uid : null;
  const adminState = useIsAdmin(uid);

  if (adminState.status !== 'admin') {
    return null;
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>{t('admin.title')}</h2>
      <p style={{ color: 'var(--text-muted)' }}>{t('admin.placeholder')}</p>
    </section>
  );
}

export function ConfigPage() {
  const { t } = useTranslation(['config', 'common']);
  const navigate = useNavigate();
  const authState = useAuthState();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  if (authState.status !== 'signed-in') {
    return null;
  }

  const uid = authState.user.uid;

  const handleUseDefault = async () => {
    setIsSaving(true);
    setSaveError(false);

    try {
      const routine = await getDefaultRoutine();
      await setUserRoutine(uid, routine);
      navigate('/', { replace: true });
    } catch {
      setSaveError(true);
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
            disabled={isSaving}
            onClick={() => console.log('welcome:importJson')}
          >
            {t('config:routine.importJson')}
          </button>
          {isSaving ? <span>{t('common:loading')}</span> : null}
        </div>
        {saveError ? <p>{t('common:error')}</p> : null}
      </div>
      <AdminSection />
    </section>
  );
}
