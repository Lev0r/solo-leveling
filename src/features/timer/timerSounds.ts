let audioContext: AudioContext | null = null;
let unlocked = false;

export function unlockTimerAudio(): void {
  if (unlocked) {
    return;
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  audioContext = new AudioContextCtor();
  void audioContext.resume();
  unlocked = true;
}

export function playTimerTick(variant: 'soft' | 'loud'): void {
  if (!unlocked || audioContext === null) {
    return;
  }

  const ctx = audioContext;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = variant === 'soft' ? 880 : 988;

  const now = ctx.currentTime;
  const peakGain = variant === 'soft' ? 0.12 : 0.32;
  const durationSec = variant === 'soft' ? 0.1 : 0.14;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + durationSec + 0.02);
}

export function resetTimerAudioForTests(): void {
  void audioContext?.close();
  audioContext = null;
  unlocked = false;
}
