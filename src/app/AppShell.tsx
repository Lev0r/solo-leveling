import type { CSSProperties } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signOutCurrentUser, useAuthState } from '../data/auth';
import { InstallPrompt } from './InstallPrompt';
import { UpdatePrompt } from './UpdatePrompt';

export const BRAND_NAME = 'SoloLeveling';

const touchTarget: CSSProperties = {
  minHeight: 48,
  minWidth: 48,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
};

const navLinkStyle: CSSProperties = {
  ...touchTarget,
};

export function AppShell() {
  const { t } = useTranslation('common');
  const authState = useAuthState();
  const uid = authState.status === 'signed-in' ? authState.user.uid : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '12px 16px',
          paddingTop: 'calc(12px + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{BRAND_NAME}</h1>
          <button type="button" style={touchTarget} onClick={() => void signOutCurrentUser()}>
            {t('signOut')}
          </button>
        </div>
        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          <NavLink to="/" style={navLinkStyle} end>
            {t('nav.today')}
          </NavLink>
          <NavLink to="/welcome" style={navLinkStyle}>
            {t('nav.welcome')}
          </NavLink>
          <NavLink to="/settings" style={navLinkStyle}>
            {t('nav.settings')}
          </NavLink>
          <NavLink to="/admin/users" style={navLinkStyle}>
            {t('nav.admin')}
          </NavLink>
          <NavLink to="/timer" style={navLinkStyle}>
            {t('nav.timer')}
          </NavLink>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '16px' }}>
        <Outlet />
      </main>

      {uid ? (
        <footer
          style={{
            padding: '8px 16px',
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
            borderTop: '1px solid var(--border)',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}
        >
          <code>{t('debug.uid', { uid })}</code>
        </footer>
      ) : null}

      <InstallPrompt />
      <UpdatePrompt />
    </div>
  );
}
