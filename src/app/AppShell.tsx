import { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';
import { InstallPrompt } from './InstallPrompt';
import { NavDrawer } from './NavDrawer';
import { UpdatePrompt } from './UpdatePrompt';

export { BRAND_NAME } from './BrandLogo';

function HamburgerIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function AppShell() {
  const { t } = useTranslation('common');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const openDrawer = () => {
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <header className="app-top-bar">
        <button
          ref={hamburgerRef}
          type="button"
          className="app-top-bar__menu"
          aria-expanded={isDrawerOpen}
          aria-controls="primary-nav"
          aria-label={t('nav.openMenu')}
          onClick={openDrawer}
        >
          <HamburgerIcon />
        </button>
        <div className="app-top-bar__brand">
          <BrandLogo />
        </div>
        <div className="app-top-bar__spacer" aria-hidden="true" />
      </header>

      <NavDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />

      <main style={{ flex: 1, padding: '16px' }}>
        <Outlet />
      </main>

      <InstallPrompt />
      <UpdatePrompt />
    </div>
  );
}
