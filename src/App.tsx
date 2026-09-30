import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CameraCapture, CameraCaptureHandle } from './components/CameraCapture';
import { DangerAlert } from './components/DangerAlert';
import { ARLensAnalyzer } from './components/ARLensAnalyzer';
import { ListeningOverlay } from './components/ListeningOverlay';
import { EmergencyModal } from './components/EmergencyModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useDrishtiStore, Hazard } from './state/drishtiStore';
import { useGlobalGestures } from './gestures/useGlobalGestures';
import { speechService } from './speech/speechService';
import { speechRecognitionService } from './speech/speechRecognition';
import { voiceCommandService } from './speech/voiceCommandService';
import { SUPPORTED_LANGUAGES } from './speech/languages';
import { playEarconReady, playEarconListening, playEarconError, startThinkingAudio, stopThinkingAudio } from './audio/earcons';
import { Haptics } from './audio/haptics';

export default function App() {
  const cameraRef = useRef<CameraCaptureHandle>(null);

  const {
    language,
    mode,
    setMode,
    isScanning,
    toggleScanning,
    isARAnalyzerEnabled,
    toggleARAnalyzer,
    isVoiceControlActive,
    toggleVoiceControl,
    setVoiceControlActive,
    voiceStatus,
    setVoiceStatus,
    lastSpoken,
    setLastSpoken,
    setAnalysisResult,
    lastHazards,
    activeDanger,
    setActiveDanger,
    setTranscript,
    isOnline,
    setIsOnline,
    batteryLevel,
    setBatteryLevel,
    shouldAnnounceHazard,
    speechRate
  } = useDrishtiStore();

  const [lastSpokenEn, setLastSpokenEn] = useState<string>('');
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lastFrameSnapshot, setLastFrameSnapshot] = useState<string | null>(null);

  const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.hi;

  // Speak helper that uses native voice if available, or falls back to clear English pronunciation
  const speakAppropriately = useCallback(
    async (
      nativeText: string,
      englishText?: string,
      options?: {
        audioB64?: string;
        rate?: number;
        priority?: 'normal' | 'urgent';
        onStart?: () => void;
        onEnd?: () => void;
      }
    ) => {
      const isEnglishMode = language === 'en';
      const hasNativeVoice = speechService.hasNativeVoiceFor(langConfig.locale);

      const onStart = () => {
        setIsSpeakingNow(true);
        voiceCommandService.setMuted(true);
        options?.onStart?.();
      };

      const onEnd = () => {
        setIsSpeakingNow(false);
        setTimeout(() => voiceCommandService.setMuted(false), 400);
        options?.onEnd?.();
      };

      // PRIORITY 1: If Gemini Neural Audio WAV is provided, play it directly!
      // Studio-grade voice, 100% accurate pronunciation, zero "canna" glitches on all platforms
      if (options?.audioB64) {
        return speechService.playAudioBase64(options.audioB64, {
          rate: options?.rate ?? speechRate,
          priority: options?.priority,
          onStart,
          onEnd
        });
      }

      // PRIORITY 2: If in English mode, ALWAYS speak English with English TTS voice
      if (isEnglishMode) {
        const textToSpeak = englishText || nativeText;
        return speechService.speak(textToSpeak, 'en-US', {
          rate: options?.rate ?? speechRate,
          priority: options?.priority,
          onStart,
          onEnd
        });
      }

      // PRIORITY 3: Hindi / Indic language
      // Speaks in authentic Hindi using native device voice, neural audio, or phonetic Hindi
      return speechService.speak(nativeText, langConfig.locale, {
        rate: options?.rate ?? speechRate,
        priority: options?.priority,
        englishFallback: englishText,
        onStart,
        onEnd
      });
    },
    [language, langConfig, speechRate]
  );

  // Initial Onboarding Check & Battery/Online Listeners
  useEffect(() => {
    const hasOnboarded = typeof window !== 'undefined' && localStorage.getItem('drishti_onboarded') === 'true';
    if (!hasOnboarded) {
      setShowOnboarding(true);
    } else {
      playEarconReady();
      speakAppropriately(langConfig.welcome, 'Welcome to Drishti. Eyes for the blind. Tap anywhere to see.');
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      speakAppropriately(
        'इंटरनेट कनेक्शन कट गया है। दृष्टि ऑफ़लाइन मोड में है।',
        'Internet connection is offline.'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Battery monitoring if supported
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * 1. Describe Scene (Single Tap or "What are you looking at" voice command)
   */
  const handleDescribeScene = useCallback(async () => {
    if (mode === 'analyzing') return;
    voiceCommandService.sleepAssistant();

    speechService.stopSpeaking();
    setMode('analyzing');
    startThinkingAudio();

    // Spoken acknowledgment
    speakAppropriately(
      language === 'hi' ? 'एक पल...' : 'Analyzing...',
      'Analyzing what is ahead...'
    );

    const frame = cameraRef.current?.captureFrame();
    if (!frame) {
      stopThinkingAudio();
      setMode('idle');
      playEarconError();
      speakAppropriately(
        'कैमरा तैयार हो रहा है, दोबारा टैप करें।',
        'Camera is initializing. Please tap again.'
      );
      return;
    }

    setLastFrameSnapshot(frame);

    try {
      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_b64: frame,
          lang: language,
          mode: 'tap'
        })
      });

      stopThinkingAudio();
      const result = await response.json();

      setAnalysisResult({
        spoken: result.spoken,
        hazards: result.hazards,
        objects: result.objects,
        text: result.text,
        currency: result.currency,
        arNodes: result.ar_nodes || []
      });

      if (result.spoken_en) {
        setLastSpokenEn(result.spoken_en);
      }

      // Check for urgent hazards first
      if (result.hazards && result.hazards.length > 0) {
        const topHazard: Hazard = result.hazards[0];
        setActiveDanger(topHazard);
        if (shouldAnnounceHazard(topHazard)) {
          const warningPrefix = language === 'hi' ? 'सावधान! ' : 'Caution! ';
          await speechService.speakUrgent(warningPrefix + result.spoken, langConfig.locale);
          setMode('idle');
          return;
        }
      }

      // Speak scene description out loud with studio-quality neural audio or appropriate voice
      await speakAppropriately(result.spoken, result.spoken_en, { audioB64: result.audio_b64 });
    } catch (err) {
      stopThinkingAudio();
      playEarconError();
      speakAppropriately(
        'सामने का दृश्य पहचानने में समस्या हुई, कृपया पुनः टैप करें।',
        'Could not analyze scene. Please tap again.'
      );
    } finally {
      setMode('idle');
    }
  }, [mode, language, langConfig, setMode, setAnalysisResult, setActiveDanger, shouldAnnounceHazard, speakAppropriately]);

  /**
   * 2. Voice Input / Ask Drishti (Double Tap or Voice Wake)
   */
  const handleStartVoiceQuestion = useCallback(() => {
    speechService.stopSpeaking();
    playEarconListening();
    Haptics.listening();
    setTranscript('');
    setMode('listening');
    voiceCommandService.wakeAssistant();

    const promptNative = language === 'hi' ? 'हाँ, मैं आपकी क्या मदद करूँ?' : 'How can I help you?';
    const promptEn = 'How can I help you?';

    speakAppropriately(promptNative, promptEn, {
      onEnd: () => {
        voiceCommandService.wakeAssistant();
      }
    });
  }, [language, setMode, setTranscript, speakAppropriately]);

  const handleExecuteQuestion = async (questionText: string) => {
    voiceCommandService.sleepAssistant();
    setMode('analyzing');
    startThinkingAudio();

    // Use current camera frame or last snapshot
    const frame = cameraRef.current?.captureFrame() || lastFrameSnapshot;
    if (!frame) {
      stopThinkingAudio();
      setMode('idle');
      speakAppropriately(
        'कृपया कैमरे को सामने रखें और दोबारा पूछें।',
        'Please point the camera and ask again.'
      );
      return;
    }

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_b64: frame,
          question: questionText,
          lang: language
        })
      });

      stopThinkingAudio();
      const result = await response.json();

      setLastSpoken(result.spoken);
      if (result.spoken_en) {
        setLastSpokenEn(result.spoken_en);
      }

      await speakAppropriately(result.spoken, result.spoken_en, { audioB64: result.audio_b64 });
    } catch (e) {
      stopThinkingAudio();
      playEarconError();
      speakAppropriately(
        'जवाब प्राप्त नहीं हो सका, पुनः पूछें।',
        'Could not get answer, please ask again.'
      );
    } finally {
      setMode('idle');
    }
  };

  /**
   * 3. Emergency Mode (Long-press 1.5s)
   */
  const handleEmergencyTrigger = useCallback(() => {
    speechService.stopSpeaking();
    setMode('emergency');
  }, [setMode]);

  /**
   * 4. Repeat Last Spoken (Triple Tap)
   */
  const handleRepeatLast = useCallback(() => {
    if (lastSpoken) {
      speakAppropriately(lastSpoken, lastSpokenEn);
    }
  }, [lastSpoken, lastSpokenEn, speakAppropriately]);

  /**
   * 5. Toggle Continuous Scan Mode (Two-finger Tap)
   */
  const handleToggleScan = useCallback(() => {
    const nextState = !isScanning;
    toggleScanning();
    Haptics.doubleTap();
    speakAppropriately(
      nextState
        ? (language === 'hi' ? 'सतत निगरानी मोड चालू है' : 'Continuous scan mode activated')
        : (language === 'hi' ? 'सतत निगरानी मोड बंद है' : 'Continuous scan mode stopped'),
      nextState ? 'Continuous scan mode active' : 'Continuous scan stopped'
    );
  }, [isScanning, toggleScanning, language, speakAppropriately]);

  /**
   * 6. Stop Speaking (Swipe Down)
   */
  const handleStopSpeaking = useCallback(() => {
    speechService.stopSpeaking();
    setIsSpeakingNow(false);
    stopThinkingAudio();
    if (mode === 'listening') {
      speechRecognitionService.stopListening();
      setMode('idle');
    }
  }, [mode, setMode]);

  // Register Global Root Gestures Handler
  useGlobalGestures({
    onSingleTap: handleDescribeScene,
    onDoubleTap: handleStartVoiceQuestion,
    onTripleTap: handleRepeatLast,
    onLongPress: handleEmergencyTrigger,
    onTwoFingerTap: handleToggleScan,
    onSwipeDown: handleStopSpeaking
  });

  // Continuous Voice Command Engine ("Hey Drishti", "What are you looking at", full app control)
  useEffect(() => {
    if (!isVoiceControlActive) {
      voiceCommandService.stop();
      return;
    }

    voiceCommandService.init(
      {
        onDescribe: () => {
          handleDescribeScene();
        },
        onAskQuestion: (question: string) => {
          handleExecuteQuestion(question);
        },
        onToggleScan: (enable?: boolean) => {
          const next = enable !== undefined ? enable : !isScanning;
          if (next !== isScanning) handleToggleScan();
        },
        onToggleAR: (enable?: boolean) => {
          const next = enable !== undefined ? enable : !isARAnalyzerEnabled;
          if (next !== isARAnalyzerEnabled) toggleARAnalyzer();
        },
        onSwitchCamera: () => {
          cameraRef.current?.switchCamera();
        },
        onEmergency: () => {
          handleEmergencyTrigger();
        },
        onRepeat: () => {
          handleRepeatLast();
        },
        onStop: () => {
          handleStopSpeaking();
        },
        onWakeWordHeard: () => {
          // Bixby-style wake: Automatically open Ask assistant and say "How can I help you?"
          setMode('listening');
          setTranscript('');
          playEarconListening();
          Haptics.doubleTap();

          const promptNative = language === 'hi' ? 'हाँ, मैं आपकी क्या मदद करूँ?' : 'How can I help you?';
          const promptEn = 'How can I help you?';

          speakAppropriately(promptNative, promptEn, {
            onEnd: () => {
              voiceCommandService.wakeAssistant();
            }
          });
        },
        onLiveTranscript: (text: string) => {
          setTranscript(text);
        },
        onAssistantSleep: () => {
          if (useDrishtiStore.getState().mode === 'listening') {
            setMode('idle');
          }
        },
        onMicPermissionNeeded: () => {
          setHasMicPermission(false);
        },
        onStatusChange: (status) => {
          setVoiceStatus(status);
        }
      },
      langConfig.locale
    );

    voiceCommandService.start();

    return () => {
      voiceCommandService.stop();
    };
  }, [
    isVoiceControlActive,
    language,
    langConfig,
    isScanning,
    isARAnalyzerEnabled,
    handleDescribeScene,
    handleToggleScan,
    toggleARAnalyzer,
    handleEmergencyTrigger,
    handleRepeatLast,
    handleStopSpeaking,
    speakAppropriately,
    setVoiceStatus
  ]);

  // Continuous Scan Loop
  useEffect(() => {
    if (!isScanning) return;

    let scanTimer: NodeJS.Timeout;

    const performScanCycle = async () => {
      if (document.hidden || mode === 'analyzing' || mode === 'listening' || mode === 'emergency') {
        scanTimer = setTimeout(performScanCycle, 2500);
        return;
      }

      const frame = cameraRef.current?.captureFrame();
      if (!frame) {
        scanTimer = setTimeout(performScanCycle, 2500);
        return;
      }

      try {
        const response = await fetch('/api/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_b64: frame,
            lang: language,
            mode: 'scan',
            prev: lastSpoken
          })
        });

        const result = await response.json();

        // Update real-time AR pins from scan
        if (result.ar_nodes && result.ar_nodes.length > 0) {
          useDrishtiStore.getState().setArNodes(result.ar_nodes);
        }

        // If hazards detected during scan
        if (result.hazards && result.hazards.length > 0) {
          const topHazard = result.hazards[0];
          if (shouldAnnounceHazard(topHazard)) {
            setActiveDanger(topHazard);
            await speechService.speakUrgent(
              (language === 'hi' ? 'सावधान! ' : 'Caution! ') + (result.spoken || 'आगे खतरा है'),
              langConfig.locale
            );
          }
        }
      } catch (e) {
        // Silently continue scan loop
      }

      scanTimer = setTimeout(performScanCycle, 2500);
    };

    scanTimer = setTimeout(performScanCycle, 2000);

    return () => clearTimeout(scanTimer);
  }, [isScanning, mode, language, lastSpoken, langConfig, shouldAnnounceHazard, setActiveDanger]);

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#05070F] text-white">
      {/* 3 Slowly Drifting Liquid Aurora Blobs (Subtle Ambient Backdrop) */}
      <div className="aurora-bg opacity-20 pointer-events-none">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Full-bleed Camera Feed & Capture View — Always front & center */}
      <CameraCapture ref={cameraRef} onTap={handleDescribeScene} />

      {/* Google Lens AR Analyzer Overlay */}
      <ARLensAnalyzer />

      {/* Screen Edge Danger Pulse Alert */}
      <DangerAlert hazard={activeDanger} onDismiss={() => setActiveDanger(null)} />

      {/* TOP FLOATING STATUS BAR (Liquid Glass Pill) */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: App Branding & Language Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowSettings(true)}
            className="glass-surface px-4 py-2 flex items-center gap-2 border border-white/20 active:scale-95 transition-transform bg-black/30 backdrop-blur-md"
            aria-label="Open settings and change language"
          >
            <span className="text-xl">👁️</span>
            <span className="font-bold text-sm tracking-wide text-white">
              {langConfig.nativeName} ({langConfig.code.toUpperCase()})
            </span>
          </button>

          {/* AR Lens Toggle Indicator */}
          <button
            onClick={toggleARAnalyzer}
            className={`glass-surface px-3 py-2 flex items-center gap-1.5 text-xs font-bold border transition-all ${
              isARAnalyzerEnabled
                ? 'bg-[#64D2FF]/20 text-[#64D2FF] border-[#64D2FF] shadow-sm shadow-[#64D2FF]/20'
                : 'text-[#C7D2E8] border-white/10 hover:bg-white/10 bg-black/30 backdrop-blur-md'
            }`}
            aria-label="Toggle Google Lens AR mode"
          >
            <span>✨</span>
            <span>{isARAnalyzerEnabled ? 'AR LENS' : 'AR OFF'}</span>
          </button>

          {/* Voice Wake Word & Commands Pill ("Hey Drishti") */}
          <button
            onClick={async () => {
              const granted = await voiceCommandService.ensureMicrophonePermission();
              if (granted) {
                setHasMicPermission(true);
                if (!isVoiceControlActive) {
                  setVoiceControlActive(true);
                }
                voiceCommandService.start();
                playEarconReady();
              } else {
                toggleVoiceControl();
              }
            }}
            className={`glass-surface px-3 py-2 flex items-center gap-1.5 text-xs font-bold border transition-all ${
              !hasMicPermission
                ? 'bg-amber-500/25 text-amber-300 border-amber-400 animate-pulse shadow-md shadow-amber-400/20'
                : isVoiceControlActive
                ? voiceStatus === 'heard' || voiceStatus === 'processing'
                  ? 'bg-amber-400 text-black border-white shadow-lg animate-pulse'
                  : 'bg-[#64D2FF]/20 text-[#64D2FF] border-[#64D2FF]'
                : 'text-[#C7D2E8] border-white/10 hover:bg-white/10 bg-black/30 backdrop-blur-md'
            }`}
            title="Voice Commands: Say 'Hey Drishti' or 'What are you looking at'"
            aria-label="Toggle Voice Commands"
          >
            <span>{!hasMicPermission ? '⚠️' : isVoiceControlActive ? (voiceStatus === 'heard' ? '👂' : '🎙️') : '🔇'}</span>
            <span className="hidden sm:inline">
              {!hasMicPermission
                ? 'ENABLE MIC'
                : isVoiceControlActive
                ? voiceStatus === 'heard'
                  ? 'HEARD...'
                  : 'HEY DRISHTI'
                : 'VOICE OFF'}
            </span>
          </button>

          {/* Continuous Scan Indicator */}
          <button
            onClick={handleToggleScan}
            className={`glass-surface px-3 py-2 hidden sm:flex items-center gap-1.5 text-xs font-bold border transition-all ${
              isScanning
                ? 'bg-[#64D2FF]/20 text-[#64D2FF] border-[#64D2FF]'
                : 'text-[#C7D2E8] border-white/10 hover:bg-white/10 bg-black/30 backdrop-blur-md'
            }`}
            aria-label="Toggle continuous scan mode"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isScanning ? 'bg-[#64D2FF] animate-ping' : 'bg-slate-500'}`} />
            <span>{isScanning ? 'SCAN ON' : 'SCAN OFF'}</span>
          </button>
        </div>

        {/* Right: Camera Flip, Emergency & Settings */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Flip Camera Button (Switch between rear and selfie front camera) */}
          <button
            onClick={() => cameraRef.current?.switchCamera()}
            className="h-11 w-11 rounded-full glass-surface flex items-center justify-center text-lg text-white border-white/20 active:scale-90 transition-transform bg-black/30 backdrop-blur-md"
            title="Switch front/rear camera"
            aria-label="Switch camera"
          >
            🔄
          </button>

          {batteryLevel !== null && (
            <div className="glass-surface px-3 py-2 text-xs font-mono font-semibold text-[#C7D2E8] hidden sm:flex items-center gap-1 border-white/10 bg-black/30 backdrop-blur-md">
              <span>🔋</span>
              <span>{batteryLevel}%</span>
            </div>
          )}

          {/* Emergency Fast Access */}
          <button
            onClick={handleEmergencyTrigger}
            className="h-11 px-4 rounded-full danger-stripes text-black font-black text-xs uppercase tracking-wider shadow-lg active:scale-90 transition-transform flex items-center gap-1.5 border border-black/30"
            aria-label="Activate Emergency Mode"
          >
            <span>🚨</span>
            <span className="hidden sm:inline">EMERGENCY</span>
          </button>

          {/* Settings Gear */}
          <button
            onClick={() => setShowSettings(true)}
            className="h-11 w-11 rounded-full glass-surface flex items-center justify-center text-lg text-white border-white/20 active:scale-90 transition-transform bg-black/30 backdrop-blur-md"
            aria-label="Open settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* SLEEK FLOATING TOP INDICATOR (Never blocks the user's face in the center) */}
      <div className="absolute top-20 left-0 right-0 pointer-events-none flex justify-center z-30 px-4">
        {mode === 'analyzing' && (
          <div className="glass-surface px-5 py-2.5 rounded-full flex items-center gap-3 border border-[#64D2FF]/50 shadow-2xl backdrop-blur-md bg-black/40 animate-pulse">
            <div className="w-4 h-4 border-2 border-[#64D2FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              {langConfig.analyzing}
            </span>
          </div>
        )}

        {isSpeakingNow && mode !== 'analyzing' && (
          <div className="glass-surface px-5 py-2 rounded-full flex items-center gap-3 border border-[#64D2FF]/50 shadow-xl bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-[#64D2FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-6 bg-[#64D2FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-3 bg-[#64D2FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="w-1.5 h-5 bg-[#64D2FF] rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
            </div>
            <span className="text-xs font-semibold text-[#64D2FF]">Drishti Speaking...</span>
          </div>
        )}

        {voiceStatus === 'heard' && mode === 'idle' && !isSpeakingNow && (
          <div className="glass-surface px-5 py-2 rounded-full flex items-center gap-2 border border-amber-400/60 shadow-xl bg-black/40 backdrop-blur-md animate-pulse">
            <span className="text-sm">👂</span>
            <span className="text-xs font-bold text-amber-300">
              {language === 'hi' ? 'दृष्टि सुन रही है...' : 'Listening to voice command...'}
            </span>
          </div>
        )}
      </div>

      {/* BOTTOM ACCESSIBLE CAPTION BOX & TAP ZONE (Transparent Glass, Face clearly visible behind) */}
      <footer className="absolute bottom-6 left-4 right-4 z-30 pointer-events-none flex flex-col items-center gap-3">
        {/* Large Spoken Transcript Display for Low-Vision users */}
        {lastSpoken && (
          <section
            aria-live="polite"
            className="w-full max-w-xl glass-surface p-4 sm:p-5 rounded-3xl border border-white/20 shadow-2xl text-left pointer-events-auto bg-black/35 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-[#64D2FF]">
                {language === 'hi' ? 'दृष्टि विवरण (Last Spoken)' : 'Drishti Output'}
              </span>
              <button
                onClick={handleRepeatLast}
                className="text-xs font-semibold text-white/80 hover:text-white flex items-center gap-1 active:scale-90"
                aria-label="Repeat last spoken description"
              >
                <span>🔊</span> {language === 'hi' ? 'दोहराएं (Repeat)' : 'Replay'}
              </button>
            </div>
            <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
              {language === 'en'
                ? (lastSpokenEn || (lastSpoken && !/[\u0900-\u097F]/.test(lastSpoken) ? lastSpoken : 'Drishti is ready. Tap to see the scene.'))
                : lastSpoken}
            </p>
            {language !== 'en' && lastSpokenEn && lastSpokenEn !== lastSpoken && (
              <p className="text-sm text-[#C7D2E8] font-normal mt-2 border-t border-white/10 pt-2 italic">
                {lastSpokenEn}
              </p>
            )}
          </section>
        )}

        {/* Global Gesture Hint Pill & Quick Action Bar */}
        <div className="w-full max-w-xl glass-surface px-5 py-3.5 rounded-3xl flex items-center justify-between border border-white/20 pointer-events-auto bg-black/35 backdrop-blur-md">
          {/* Describe Button */}
          <button
            onClick={handleDescribeScene}
            className="flex-1 py-3 px-2 rounded-2xl bg-[#64D2FF] text-[#05070F] font-bold text-base sm:text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-[#64D2FF]/20"
            aria-label="Tap to see and describe scene"
          >
            <span className="text-xl">👁️</span>
            <span>{language === 'hi' ? 'देखें (Tap)' : 'See (Tap)'}</span>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-white/20 mx-3" />

          {/* Ask Button */}
          <button
            onClick={handleStartVoiceQuestion}
            className="flex-1 py-3 px-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-base sm:text-lg flex items-center justify-center gap-2 border border-white/20 active:scale-95 transition-transform"
            aria-label="Ask Drishti voice question"
          >
            <span className="text-xl">🎙️</span>
            <span>{language === 'hi' ? 'पूछें (Double Tap)' : 'Ask (2-Tap)'}</span>
          </button>
        </div>

        {/* Minimal Gestures Caption for Accessibility */}
        <p className="text-xs font-medium text-[#C7D2E8]/80 text-center">
          {language === 'hi'
            ? '1 टैप: देखें • 2 टैप: सवाल पूछें • 1.5s दबाएं: आपातकाल • स्वाइप डाउन: रोकें'
            : '1-Tap: Describe • 2-Tap: Voice Question • 1.5s Hold: Emergency • Swipe Down: Stop'}
        </p>
      </footer>

      {/* OVERLAYS */}
      {mode === 'listening' && (
        <ListeningOverlay
          onCancel={() => {
            speechRecognitionService.stopListening();
            setMode('idle');
          }}
          onSubmitQuestion={handleExecuteQuestion}
        />
      )}

      {mode === 'emergency' && (
        <EmergencyModal onClose={() => setMode('idle')} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </main>
  );
}
