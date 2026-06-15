export const USER_PROFILE_SCHEMA_VERSION = 1;

export type AppLanguage = 'uk' | 'en';

export type UserProfile = {
  schemaVersion: typeof USER_PROFILE_SCHEMA_VERSION;
  email: string;
  displayName: string | null;
  timezone: string;
  language: AppLanguage;
  createdAt: string;
  lastSignInAt: string;
};
