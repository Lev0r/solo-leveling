import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return (
    'prompt' in event &&
    typeof event.prompt === 'function' &&
    'userChoice' in event &&
    event.userChoice instanceof Promise
  );
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isDismissedRecently(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (dismissedAt === null) {
    return false;
  }

  const elapsed = Date.now() - Number(dismissedAt);
  return elapsed < DISMISS_MS;
}

export function useInstallPrompt(): {
  canPrompt: boolean;
  prompt: () => Promise<void>;
  dismiss: () => void;
} {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event): void => {
      event.preventDefault();
      if (isBeforeInstallPromptEvent(event)) {
        setInstallEvent(event);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const canPrompt =
    installEvent !== null && !dismissed && !isDismissedRecently() && !isStandalone();

  const prompt = useCallback(async (): Promise<void> => {
    if (installEvent === null) {
      return;
    }

    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  const dismiss = useCallback((): void => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  return { canPrompt, prompt, dismiss };
}
