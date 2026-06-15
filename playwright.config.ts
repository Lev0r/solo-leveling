import { defineConfig, devices } from '@playwright/test';

const pixel7 = {
  ...devices['Pixel 7'],
  locale: 'uk-UA',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command:
        'tsc --noEmit && vite build --outDir dist-e2e-unauth && vite preview --outDir dist-e2e-unauth --port 5001',
      port: 5001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        'tsc --noEmit && VITE_E2E_FIXTURES=true vite build --outDir dist-e2e-auth && vite preview --outDir dist-e2e-auth --port 5000',
      port: 5000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'unauthenticated',
      testMatch: '**/sign-in.spec.ts',
      use: {
        ...pixel7,
        baseURL: 'http://localhost:5001',
      },
    },
    {
      name: 'authenticated',
      testMatch: ['**/today.spec.ts', '**/config.spec.ts', '**/settings.spec.ts', '**/timer.spec.ts'],
      use: {
        ...pixel7,
        baseURL: 'http://localhost:5000',
      },
    },
  ],
});
