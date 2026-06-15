import { render, screen } from '@testing-library/react';
import i18n from './i18n';
import App from './App';

vi.mock('./data/auth', () => ({
  useAuthState: () => ({ status: 'loading' as const }),
  signInWithGoogle: vi.fn(),
  signOutCurrentUser: vi.fn(),
}));

vi.mock('./data/allowedUsers', () => ({
  useIsWhitelisted: () => ({ status: 'loading' as const }),
}));

describe('App', () => {
  it('renders the heading and loading or sign-in state', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SoloLeveling' })).toBeInTheDocument();

    const loadingOrSignIn =
      screen.queryByText(i18n.t('common:loading')) ??
      screen.queryByRole('button', { name: i18n.t('auth:signInWithGoogle') });
    expect(loadingOrSignIn).toBeInTheDocument();
  });
});
