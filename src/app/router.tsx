import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { TodayPage } from '../features/today/TodayPage';
import { ConfigPage } from '../features/config/ConfigPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TimerPage } from '../features/timer/TimerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'config', element: <ConfigPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'timer', element: <TimerPage /> },
      { path: 'welcome', element: <Navigate to="/config" replace /> },
    ],
  },
]);
