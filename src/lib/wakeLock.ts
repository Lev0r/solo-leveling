import { useEffect } from 'react';

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const wakeLock = navigator.wakeLock;
    if (!wakeLock) {
      return;
    }

    let lock: WakeLockSentinel | null = null;

    const release = (): void => {
      if (lock !== null) {
        void lock.release().catch(() => {});
        lock = null;
      }
    };

    const acquire = (): void => {
      void wakeLock
        .request('screen')
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch(() => {});
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        release();
      } else if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      release();
    };
  }, [enabled]);
}
