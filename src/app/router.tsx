import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { TodayPage } from '../features/today/TodayPage';
import { WelcomePage } from '../features/welcome/WelcomePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { UsersPage } from '../features/admin/UsersPage';
import { TimerPage } from '../features/timer/TimerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'welcome', element: <WelcomePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin/users', element: <UsersPage /> },
      { path: 'timer', element: <TimerPage /> },
    ],
  },
]);
