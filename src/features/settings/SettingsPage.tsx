import { useTranslation } from 'react-i18next';
import { useUserProfileContext } from '../../data/userProfile';
import type { AppLanguage } from '../../data/schema';

const touchTarget = {
  minHeight: 48,
  minWidth: 48,
  padding: '0 12px',
} as const;

export function SettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const { profile, updateLanguage } = useUserProfileContext();

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
      <h2>{t('title')}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <div>
          <p style={{ margin: '0 0 8px' }}>{t('language.label')}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={{
                ...touchTarget,
                fontWeight: profile.language === 'uk' ? 700 : 400,
              }}
              aria-pressed={profile.language === 'uk'}
              onClick={() => handleLanguageChange('uk')}
            >
              {t('language.uk')}
            </button>
            <button
              type="button"
              style={{
                ...touchTarget,
                fontWeight: profile.language === 'en' ? 700 : 400,
              }}
              aria-pressed={profile.language === 'en'}
              onClick={() => handleLanguageChange('en')}
            >
              {t('language.en')}
            </button>
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 8px' }}>{t('timezone')}</p>
          <p style={{ margin: 0 }}>{profile.timezone}</p>
        </div>
      </div>
    </section>
  );
}
