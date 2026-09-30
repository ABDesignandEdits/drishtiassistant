/**
 * Web Audio API Earcons for Drishti
 * Zero external audio files required. Instant, reliable offline synthesized tones.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a tone with frequency ramp
 */
function playTone(
  freq1: number,
  freq2: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.25
) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq1, ctx.currentTime);
    if (freq2 !== freq1) {
      osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio feedback failed:', e);
  }
}

/**
 * Ready: Rising pleasant two-note (440Hz -> 660Hz)
 */
export function playEarconReady() {
  playTone(440, 660, 0.22, 'sine', 0.2);
}

/**
 * Listening: Crisp blip (880Hz)
 */
export function playEarconListening() {
  playTone(880, 880, 0.08, 'sine', 0.25);
}

/**
 * Thinking: Gentle low rhythmic tick
 */
let thinkingOsc: { stop: () => void } | null = null;

export function startThinkingAudio() {
  stopThinkingAudio();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const interval = setInterval(() => {
      playTone(320, 280, 0.05, 'triangle', 0.1);
    }, 450);
    thinkingOsc = {
      stop: () => clearInterval(interval)
    };
  } catch (e) {}
}

export function stopThinkingAudio() {
  if (thinkingOsc) {
    thinkingOsc.stop();
    thinkingOsc = null;
  }
}

/**
 * Error: Descending two-note (550Hz -> 330Hz)
 */
export function playEarconError() {
  playTone(550, 330, 0.28, 'sawtooth', 0.18);
}

/**
 * Danger: Sharp urgent repeating 880 Hz square burst
 */
export function playEarconDanger() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        playTone(880, 880, 0.12, 'square', 0.35);
      }, i * 160);
    }
  } catch (e) {}
}

/**
 * Success / Camera capture click
 */
export function playEarconCapture() {
  playTone(600, 900, 0.12, 'sine', 0.25);
}
