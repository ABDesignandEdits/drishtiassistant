/**
 * Native Bixby-Style Conversational Voice Assistant Engine for Drishti
 * Rock-solid continuous speech recognition with:
 * 1. Automatic microphone permission handling (`ensureMicrophonePermission`)
 * 2. Fresh-instance continuous auto-restart (recovers from browser silence disconnects)
 * 3. Broad phonetic regex matching for "Hey Drishti" ("dristi", "drushti", "christie", "दृष्टि", etc.)
 * 4. Broad semantic matching for "What are you looking at" ("look", "see", "what is this", "सामने क्या है", etc.)
 * 5. Audio gate muting during TTS speech playback to prevent self-triggering
 */

import { playEarconListening, playEarconReady } from '../audio/earcons';
import { Haptics } from '../audio/haptics';

export interface VoiceCommandHandlers {
  onDescribe: () => void;
  onAskQuestion: (question: string) => void;
  onToggleScan: (enable?: boolean) => void;
  onToggleAR: (enable?: boolean) => void;
  onSwitchCamera: () => void;
  onEmergency: () => void;
  onRepeat: () => void;
  onStop: () => void;
  onWakeWordHeard: () => void;
  onLiveTranscript?: (text: string, isFinal: boolean) => void;
  onStatusChange?: (status: 'idle' | 'listening' | 'heard' | 'processing') => void;
  onAssistantSleep?: () => void;
  onMicPermissionNeeded?: () => void;
}

export function matchesWakeWord(text: string): boolean {
  const t = text.toLowerCase();
  const patterns = [
    /drishti/i,
    /dristi/i,
    /drushti/i,
    /drishty/i,
    /drish\s*ti/i,
    /drishtee/i,
    /trishti/i,
    /tristi/i,
    /christie/i,
    /christy/i,
    /kristi/i,
    /kristy/i,
    /दृष्टि/,
    /दृष्टी/,
    /हे दृष्टि/,
    /hey\s+rishi/i,
    /hey\s+rich/i,
    /a\s+drishti/i
  ];
  return patterns.some((p) => p.test(t));
}

export function matchesLookingQuery(text: string): boolean {
  const t = text.toLowerCase().trim();
  const pattern = /\b(what are you looking at|what you looking at|what are you seeing|what do you see|what's in front of me|what is in front of me|describe the scene|describe what you see|सामने क्या है|क्या दिख रहा है|क्या देख रहे हो)\b/i;
  return pattern.test(t);
}

class VoiceCommandService {
  private recognition: any = null;
  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private hasMicPermission: boolean = false;
  private handlers: VoiceCommandHandlers | null = null;
  private locale: string = 'en-IN';
  private restartTimeout: any = null;
  private isAssistantAwake: boolean = false;
  private assistantSleepTimer: any = null;
  private queryDebounceTimer: any = null;
  private lastTriggeredText: string = '';
  private lastTriggeredTime: number = 0;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public init(handlers: VoiceCommandHandlers, locale: string = 'en-IN') {
    this.handlers = handlers;
    this.locale = locale;
  }

  public setLocale(locale: string) {
    this.locale = locale;
    if (this.isRunning) {
      this.restart();
    }
  }

  /**
   * Request microphone permission explicitly via MediaDevices API
   * Essential for mobile Chrome, Safari & Edge before SpeechRecognition can listen
   */
  public async ensureMicrophonePermission(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        this.hasMicPermission = true;
        return true;
      }
    } catch (e) {
      console.warn('Microphone permission request failed:', e);
      this.hasMicPermission = false;
      this.handlers?.onMicPermissionNeeded?.();
    }
    return false;
  }

  public getHasMicPermission(): boolean {
    return this.hasMicPermission;
  }

  public async start() {
    if (!this.isSupported()) return;

    this.isRunning = true;
    this.startRecognitionSession();
  }

  /**
   * Spins up a fresh SpeechRecognition instance
   * Solves Chrome's InvalidStateError on restart and auto-recovers on silence
   */
  private startRecognitionSession() {
    if (!this.isRunning || this.isMuted) return;

    // Teardown previous instance cleanly
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const rec = new SpeechRecognitionClass();
      rec.lang = this.locale;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        this.hasMicPermission = true;
        this.handlers?.onStatusChange?.(this.isAssistantAwake ? 'heard' : 'listening');
      };

      rec.onresult = (event: any) => {
        if (this.isMuted) return;

        let transcript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        const cleanText = transcript.trim();
        if (!cleanText) return;

        // Emit live transcript to UI for Bixby liquid card
        this.handlers?.onLiveTranscript?.(cleanText, isFinal);

        this.processVoiceInput(cleanText, isFinal);
      };

      rec.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.hasMicPermission = false;
          this.handlers?.onMicPermissionNeeded?.();
        }
      };

      rec.onend = () => {
        // In Chrome, SpeechRecognition automatically ends after silence or audio pauses.
        // We gracefully re-create a new session after 300ms to maintain continuous listening.
        if (this.isRunning && !this.isMuted) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isRunning && !this.isMuted) {
              this.startRecognitionSession();
            }
          }, 300);
        } else {
          this.handlers?.onStatusChange?.('idle');
        }
      };

      this.recognition = rec;
      rec.start();
    } catch (e) {
      console.warn('SpeechRecognition starter notice, retrying:', e);
      clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        if (this.isRunning && !this.isMuted) {
          this.startRecognitionSession();
        }
      }, 1000);
    }
  }

  public stop() {
    this.isRunning = false;
    this.isAssistantAwake = false;
    clearTimeout(this.restartTimeout);
    clearTimeout(this.assistantSleepTimer);
    clearTimeout(this.queryDebounceTimer);

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
    this.handlers?.onStatusChange?.('idle');
  }

  public restart() {
    this.stop();
    setTimeout(() => this.start(), 200);
  }

  /**
   * Temporarily mute recognition while Drishti is speaking out loud
   * Aborts mic stream so Drishti doesn't hear itself, then restarts on unmute
   */
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {}
      }
    } else {
      if (this.isRunning) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          this.startRecognitionSession();
        }, 200);
      }
    }
  }

  /**
   * Puts the assistant in awake listening mode (after user says "Hey Drishti")
   */
  public wakeAssistant() {
    this.isAssistantAwake = true;
    this.resetAssistantSleepTimer();
    this.handlers?.onStatusChange?.('heard');
  }

  /**
   * Puts assistant back into ambient standby
   */
  public sleepAssistant() {
    this.isAssistantAwake = false;
    clearTimeout(this.assistantSleepTimer);
    clearTimeout(this.queryDebounceTimer);
    this.handlers?.onStatusChange?.('listening');
    this.handlers?.onAssistantSleep?.();
  }

  public isAwake(): boolean {
    return this.isAssistantAwake;
  }

  private resetAssistantSleepTimer() {
    clearTimeout(this.assistantSleepTimer);
    // Auto-sleep if user doesn't say anything for 9 seconds
    this.assistantSleepTimer = setTimeout(() => {
      if (this.isAssistantAwake) {
        this.sleepAssistant();
      }
    }, 9000);
  }

  /**
   * Main conversational processor
   */
  private processVoiceInput(text: string, isFinal: boolean) {
    const now = Date.now();
    const lower = text.toLowerCase().trim();

    // Prevent immediate duplicate executions within 2.5 seconds
    if (lower === this.lastTriggeredText && now - this.lastTriggeredTime < 2500) {
      return;
    }

    // ==========================================
    // CASE A: ASSISTANT IS ALREADY AWAKE ("How can I help?")
    // ==========================================
    if (this.isAssistantAwake) {
      this.resetAssistantSleepTimer();

      // Cancel / stop
      if (
        lower === 'cancel' ||
        lower === 'stop' ||
        lower === 'never mind' ||
        lower === 'close' ||
        lower === 'रुको' ||
        lower === 'रद्द' ||
        lower === 'शांत'
      ) {
        this.sleepAssistant();
        this.handlers?.onStop();
        return;
      }

      // 1. Direct App Controls while awake
      if (lower.includes('scan on') || lower.includes('start scan') || lower.includes('स्कैन चालू')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onToggleScan(true);
        return;
      }
      if (lower.includes('scan off') || lower.includes('stop scan') || lower.includes('स्कैन बंद')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onToggleScan(false);
        return;
      }
      if (lower.includes('ar on') || lower.includes('show ar') || lower.includes('ar चालू')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onToggleAR(true);
        return;
      }
      if (lower.includes('ar off') || lower.includes('hide ar') || lower.includes('ar बंद')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onToggleAR(false);
        return;
      }
      if (lower.includes('flip') || lower.includes('switch camera') || lower.includes('कैमरा बदलो')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onSwitchCamera();
        return;
      }
      if (lower.includes('emergency') || lower.includes('help') || lower.includes('मदद')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onEmergency();
        return;
      }
      if (lower.includes('repeat') || lower.includes('दोहराओ') || lower.includes('फिर से बोलो')) {
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        this.sleepAssistant();
        this.handlers?.onRepeat();
        return;
      }

      // 3. Custom question (e.g. "What color is this?", "How much is this note?", "Read the text")
      clearTimeout(this.queryDebounceTimer);
      const executeQuery = () => {
        if (text.trim().length > 3) {
          this.lastTriggeredText = lower;
          this.lastTriggeredTime = now;
          this.sleepAssistant();
          playEarconListening();
          Haptics.tap();
          this.handlers?.onAskQuestion(text.trim());
        }
      };

      if (isFinal) {
        executeQuery();
      } else {
        this.queryDebounceTimer = setTimeout(executeQuery, 1200);
      }
      return;
    }

    // ==========================================
    // CASE B: AMBIENT STANDBY (Listening for Wake Word or Direct Commands)
    // ==========================================

    // 1. Direct Looking Command even without wake word (e.g. user just asks "What are you looking at?")
    if (matchesLookingQuery(lower)) {
      this.lastTriggeredText = lower;
      this.lastTriggeredTime = now;
      playEarconListening();
      Haptics.tap();
      this.handlers?.onDescribe();
      return;
    }

    // 2. Wake Word Triggered: e.g. "Hey Drishti" or "Hey Drishti what are you looking at"
    if (matchesWakeWord(lower)) {
      // Strip wake word to see if user asked a question in the same breath
      let commandText = lower
        .replace(/hey\s+drishti|drishti|dristi|drushti|christie|christy|kristi|दृष्टि|दृष्टी/gi, '')
        .trim();
      commandText = commandText.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

      // Compound command: "Hey Drishti, what are you looking at?"
      if (commandText.length > 2) {
        if (matchesLookingQuery(commandText)) {
          this.lastTriggeredText = lower;
          this.lastTriggeredTime = now;
          playEarconListening();
          Haptics.tap();
          this.handlers?.onDescribe();
          return;
        }

        // Custom question in compound sentence:
        this.lastTriggeredText = lower;
        this.lastTriggeredTime = now;
        playEarconListening();
        Haptics.tap();
        this.handlers?.onAskQuestion(commandText);
        return;
      }

      // Wake word alone ("Hey Drishti" or "Drishti"):
      // Wake up assistant, play chime, ask "How can I help you?"
      this.lastTriggeredText = lower;
      this.lastTriggeredTime = now;
      this.wakeAssistant();
      playEarconReady();
      Haptics.doubleTap();
      this.handlers?.onWakeWordHeard();
      return;
    }

    // 3. Direct App Controls (stop, silence, repeat, camera flip, emergency)
    if (lower === 'stop' || lower === 'silence' || lower === 'रुको' || lower === 'शांत') {
      this.lastTriggeredText = lower;
      this.lastTriggeredTime = now;
      this.handlers?.onStop();
      return;
    }

    if (lower === 'repeat' || lower === 'दोहराओ' || lower === 'फिर से बोलो') {
      this.lastTriggeredText = lower;
      this.lastTriggeredTime = now;
      this.handlers?.onRepeat();
      return;
    }

    if (lower === 'flip camera' || lower === 'switch camera' || lower === 'कैमरा बदलो') {
      this.lastTriggeredText = lower;
      this.lastTriggeredTime = now;
      playEarconReady();
      this.handlers?.onSwitchCamera();
      return;
    }

    if (lower === 'emergency' || lower === 'help me' || lower === 'आपातकाल' || lower === 'मदद') {
      this.lastTriggeredText = lower;
      this.lastTriggeredTime = now;
      this.handlers?.onEmergency();
      return;
    }
  }
}

export const voiceCommandService = new VoiceCommandService();
