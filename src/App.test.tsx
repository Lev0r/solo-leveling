import { render, screen } from '@testing-library/react';
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
      screen.queryByText('Loading…') ??
      screen.queryByRole('button', { name: 'Sign in with Google' });
    expect(loadingOrSignIn).toBeInTheDocument();
  });
});
