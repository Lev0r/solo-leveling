import { renderHook } from '@testing-library/react';
import { useWakeLock } from './wakeLock';

describe('useWakeLock', () => {
  it('does nothing when navigator.wakeLock is absent', () => {
    const originalWakeLock = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');

    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: undefined,
    });

    expect(() => {
      renderHook(() => useWakeLock(true));
    }).not.toThrow();

    if (originalWakeLock) {
      Object.defineProperty(navigator, 'wakeLock', originalWakeLock);
    } else {
      Reflect.deleteProperty(navigator, 'wakeLock');
    }
  });
});
