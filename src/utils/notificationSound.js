let audioContext = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
};

const playTone = (ctx, { frequency, startTime, duration, peakGain = 0.22 }) => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
};

// BigStar's notification chime: a short two-note "ding" synthesized via the
// Web Audio API so new posts/reallocation requests don't need a bundled audio file.
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    playTone(ctx, { frequency: 987.77, startTime: now, duration: 0.16 }); // B5
    playTone(ctx, { frequency: 1479.98, startTime: now + 0.1, duration: 0.26 }); // F#6
  } catch {
    // Sound is a nice-to-have; never let it break the notification flow.
  }
};
