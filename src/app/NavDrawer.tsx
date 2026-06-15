import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signOutCurrentUser } from '../data/auth';

function CloseIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function NavDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const previouslyFocused = previouslyFocusedRef.current;
    if (
      previouslyFocused instanceof HTMLElement &&
      document.contains(previouslyFocused)
    ) {
      previouslyFocused.focus();
    }
  }, [isOpen]);

  return (
    <>
      <div
        className={`nav-drawer-backdrop${isOpen ? ' nav-drawer-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="primary-nav"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menuLabel')}
        aria-hidden={!isOpen}
        className={`nav-drawer${isOpen ? ' nav-drawer--open' : ''}`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="nav-drawer__close"
          aria-label={t('nav.close')}
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <nav className="nav-drawer__links">
          <NavLink to="/" end onClick={onClose}>
            {t('nav.today')}
          </NavLink>
          <NavLink to="/config" onClick={onClose}>
            {t('nav.config')}
          </NavLink>
          <NavLink to="/settings" onClick={onClose}>
            {t('nav.settings')}
          </NavLink>
        </nav>

        <hr className="nav-drawer__divider" />

        <button
          type="button"
          className="nav-drawer__sign-out"
          onClick={() => void signOutCurrentUser()}
        >
          {t('signOut')}
        </button>
      </aside>
    </>
  );
}
