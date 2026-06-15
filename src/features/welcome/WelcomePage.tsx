import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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

export function WelcomePage() {
  const { t } = useTranslation(['welcome', 'common']);
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
      <h2>{t('welcome:title')}</h2>
      <p>{t('welcome:description')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={touchTarget}
            disabled={isSaving}
            onClick={() => {
              void handleUseDefault();
            }}
          >
            {t('welcome:useDefault')}
          </button>
          <button
            type="button"
            style={touchTarget}
            disabled={isSaving}
            onClick={() => console.log('welcome:importJson')}
          >
            {t('welcome:importJson')}
          </button>
          {isSaving ? <span>{t('common:loading')}</span> : null}
        </div>
        {saveError ? <p>{t('common:error')}</p> : null}
      </div>
    </section>
  );
}
