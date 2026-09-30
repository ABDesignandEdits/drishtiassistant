/**
 * Text-to-Speech Service for Drishti
 * Features:
 * 1. Dual-Engine Speech:
 *    - Native Hindi Speech Synthesis via Google हिन्दी / Microsoft Kalpana / Lekha
 *    - Native English Speech Synthesis via Indian English / US English
 *    - Google Studio-Grade Neural TTS playback (playAudioBase64)
 * 2. Guaranteed zero "KANNA / KANA" artifacts:
 *    - Cleans punctuation (danda '।' -> '.') and glyphs before synthesis
 *    - Never allows an English voice to speak raw Devanagari text
 *    - Fallback phonetic transliteration when no native Hindi voice exists on device
 */

import { playEarconDanger } from '../audio/earcons';
import { Haptics } from '../audio/haptics';

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  priority?: 'normal' | 'urgent';
  englishFallback?: string;
  phoneticText?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

// Common Hindi phrases transliteration map for devices with zero Indic TTS engines
const PHONETIC_MAP: Record<string, string> = {
  'हाँ, मैं आपकी क्या मदद करूँ?': 'Haan, main aapki kya madad karun?',
  'दृष्टि तैयार है। बोलिए "सामने क्या है" या दृश्य देखने के लिए टैप करें।': 'Drishti taiyaar hai. Boliye saamne kya hai ya dekhne ke liye tap karein.',
  'सामने क्या है?': 'Saamne kya hai?',
  'सावधान! आगे खतरा!': 'Saavdhaan! Aage khatra!',
  'आपातकालीन मोड सक्रिय हो गया है।': 'Aapatkaaleen mode sakriy ho gaya hai.',
  'नमस्ते, मैं दृष्टि हूँ। आपकी आँखें।': 'Namaste, main Drishti hoon. Aapki aankhein.',
  'दृश्य का विश्लेषण हो रहा है...': 'Scene ka vishleshan ho raha hai...',
  'आवाज़ की गति बदल दी गई है': 'Aawaaz ki gati badal di gayi hai',
  'कैमरा बदल दिया गया है': 'Camera badal diya gaya hai',
  'कृपया कैमरे को सामने रखें और दोबारा पूछें।': 'Kripya camera ko saamne rakhein aur dobara poochein.',
  'जवाब प्राप्त नहीं हो सका, पुनः पूछें।': 'Jawaab praapt nahi ho saka, punah poochein.'
};

class SpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;
  private queue: Array<{ text: string; langCode: string; options?: SpeechOptions }> = [];
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }

      // Unlock HTML5 Audio on user's first tap or click anywhere
      const unlockAudio = () => {
        if (this.isAudioUnlocked) return;
        this.isAudioUnlocked = true;
        try {
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A');
          silentAudio.volume = 0.01;
          silentAudio.play().catch(() => {});
        } catch (e) {}
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public hasNativeVoiceFor(locale: string): boolean {
    const voices = this.getVoices();
    const langPrefix = locale.split('-')[0].toLowerCase();
    return voices.some((v) => v.lang.toLowerCase().startsWith(langPrefix));
  }

  public findVoice(locale: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices.length) return null;

    const langPrefix = locale.split('-')[0].toLowerCase();

    // 1. English
    if (langPrefix === 'en') {
      const indianEnglish = voices.find(
        (v) => v.lang.toLowerCase() === 'en-in' || v.name.toLowerCase().includes('india')
      );
      if (indianEnglish) return indianEnglish;
      const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (anyEnglish) return anyEnglish;
      return voices.find((v) => v.default) || voices[0] || null;
    }

    // 2. Hindi (Search for Google हिन्दी, Kalpana, Hemant, Swara, Lekha, or hi-IN)
    if (langPrefix === 'hi') {
      const hindi = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.includes('हिन्दी') ||
          v.name.toLowerCase().includes('kalpana') ||
          v.name.toLowerCase().includes('hemant') ||
          v.name.toLowerCase().includes('lekha') ||
          v.name.toLowerCase().includes('swara') ||
          v.name.toLowerCase().includes('madhur') ||
          v.name.toLowerCase().includes('neerja')
      );
      if (hindi) return hindi;
    }

    // 3. Exact locale
    const exact = voices.find((v) => v.lang.toLowerCase() === locale.toLowerCase());
    if (exact) return exact;

    // 4. Prefix match
    const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    if (prefixMatch) return prefixMatch;

    return null;
  }

  public stopSpeaking() {
    this.queue = [];
    this.isSpeaking = false;

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Play studio-grade Gemini Neural Audio (WAV base64) directly
   */
  public playAudioBase64(base64Wav: string, options?: SpeechOptions): Promise<void> {
    return new Promise((resolve) => {
      this.stopSpeaking();

      try {
        const audio = new Audio('data:audio/wav;base64,' + base64Wav);
        this.currentAudio = audio;
        this.isSpeaking = true;

        if (options?.rate && options.rate >= 0.7 && options.rate <= 1.5) {
          audio.playbackRate = options.rate;
        }

        audio.onplay = () => {
          options?.onStart?.();
        };

        const finish = () => {
          this.isSpeaking = false;
          this.currentAudio = null;
          options?.onEnd?.();
          resolve();
        };

        audio.onended = finish;
        audio.onerror = (e) => {
          console.warn('Neural audio playback notice:', e);
          finish();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio play notice:', err);
            finish();
          });
        }
      } catch (e) {
        console.warn('Neural audio init error:', e);
        this.isSpeaking = false;
        options?.onEnd?.();
        resolve();
      }
    });
  }

  /**
   * Speak text:
   * - If Hindi:
   *   1. If device has an authentic native Hindi voice: Speaks Devanagari in natural Hindi!
   *      Cleans punctuation ('।' -> '.') to eliminate any Unicode character reader artifacts.
   *   2. If device lacks a native Hindi voice:
   *      Uses phonetic Romanized Hindi with English voice so the blind user hears real Hindi words
   *      without hearing "KANNA" or unwanted English speech!
   * - If English: Speaks clean English with an English voice.
   */
  public async speak(text: string, locale: string = 'en-US', options?: SpeechOptions): Promise<void> {
    if (!text || text.trim() === '') return;

    const isHindi = locale.startsWith('hi') || /[\u0900-\u097F]/.test(text);

    if (isHindi) {
      if (options?.priority === 'urgent') {
        this.stopSpeaking();
      }

      // Check for device Hindi voice
      const hindiVoice = this.findVoice('hi-IN');

      if (hindiVoice) {
        // Native Hindi voice is installed on OS (Android/Windows/Mac)
        // Clean danda '।' to '.' to prevent character reading
        const cleanHindi = text
          .replace(/।/g, '. ')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim();

        return new Promise((resolve) => {
          this.isSpeaking = true;
          const utterance = new SpeechSynthesisUtterance(cleanHindi);
          utterance.voice = hindiVoice;
          utterance.lang = 'hi-IN';
          utterance.rate = options?.rate ?? 0.95;
          utterance.pitch = options?.pitch ?? 1.0;
          utterance.volume = options?.volume ?? 1.0;

          utterance.onstart = () => {
            options?.onStart?.();
          };

          utterance.onend = () => {
            this.isSpeaking = false;
            options?.onEnd?.();
            resolve();
            this.processQueue();
          };

          utterance.onerror = (e) => {
            console.warn('Hindi speech synthesis notice:', e);
            this.isSpeaking = false;
            options?.onEnd?.();
            resolve();
            this.processQueue();
          };

          window.speechSynthesis.speak(utterance);
        });
      }

      // Device does NOT have a Hindi voice installed on the OS:
      // Try neural audio from /api/tts
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const result = await response.json();
        if (result?.audio_b64) {
          return await this.playAudioBase64(result.audio_b64, options);
        }
      } catch (err) {}

      // If neural audio is unavailable, speak Romanized phonetic Hindi so it sounds like HINDI:
      const phonetic = options?.phoneticText || PHONETIC_MAP[text.trim()] || options?.englishFallback;
      if (phonetic) {
        return this.speakEnglishVoice(phonetic, options);
      }

      options?.onEnd?.();
      return;
    }

    // Standard English text
    return this.speakEnglishVoice(text, options);
  }

  private speakEnglishVoice(text: string, options?: SpeechOptions): Promise<void> {
    const safeText = text.replace(/[\u0900-\u097F]/g, '').trim();
    if (!safeText) {
      options?.onEnd?.();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        options?.onEnd?.();
        resolve();
        return;
      }

      if (options?.priority === 'urgent') {
        this.stopSpeaking();
      }

      const runUtterance = () => {
        this.isSpeaking = true;
        const utterance = new SpeechSynthesisUtterance(safeText);
        utterance.lang = 'en-US';
        utterance.rate = options?.rate ?? 0.95;
        utterance.pitch = options?.pitch ?? 1.0;
        utterance.volume = options?.volume ?? 1.0;

        const voice = this.findVoice('en-US');
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          options?.onStart?.();
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          options?.onEnd?.();
          resolve();
          this.processQueue();
        };

        utterance.onerror = (e) => {
          console.warn('English SpeechSynthesis notice:', e);
          this.isSpeaking = false;
          options?.onEnd?.();
          resolve();
          this.processQueue();
        };

        window.speechSynthesis.speak(utterance);
      };

      if (this.isSpeaking && options?.priority !== 'urgent') {
        this.queue.push({ text: safeText, langCode: 'en-US', options });
      } else {
        runUtterance();
      }
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && !this.isSpeaking) {
      const next = this.queue.shift();
      if (next) {
        this.speak(next.text, next.langCode, next.options);
      }
    }
  }

  public announceUrgent(warningText: string, locale: string = 'en-US', audioB64?: string): Promise<void> {
    this.stopSpeaking();
    playEarconDanger();
    Haptics.danger();

    if (audioB64) {
      return this.playAudioBase64(audioB64, { priority: 'urgent' });
    }

    return this.speak(warningText, locale, {
      priority: 'urgent',
      rate: 1.05
    });
  }

  public speakUrgent(warningText: string, locale: string = 'en-US', audioB64?: string): Promise<void> {
    return this.announceUrgent(warningText, locale, audioB64);
  }
}

export const speechService = new SpeechService();
