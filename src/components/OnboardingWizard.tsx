import React, { useState, useEffect } from 'react';
import { useDrishtiStore } from '../state/drishtiStore';
import { SUPPORTED_LANGUAGES } from '../speech/languages';
import { speechService } from '../speech/speechService';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { language, setLanguage } = useDrishtiStore();
  const [step, setStep] = useState<number>(1);

  const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.hi;

  useEffect(() => {
    // Speak guidance at each step
    if (step === 1) {
      speechService.speak(
        language === 'hi'
          ? 'दृष्टि में आपका स्वागत है। यह दृष्टिहीनों के लिए आंखें है। शुरू करने के लिए अपनी भाषा चुनें।'
          : 'Welcome to Drishti. Eyes for the blind. Choose your language to begin.',
        langConfig.locale
      );
    } else if (step === 2) {
      speechService.speak(
        language === 'hi'
          ? 'दृष्टि का संचालन बहुत सरल है। कहीं भी एक बार टैप करें तो दृष्टि सामने का दृश्य बताएगी। दो बार जल्दी टैप करने पर आप सवाल पूछ सकते हैं। डेढ़ सेकंड दबाकर रखने पर आपातकालीन मोड सक्रिय हो जाएगा। तीन बार टैप करने पर पिछली बात दोहराई जाएगी।'
          : 'Operating Drishti is simple. Tap once anywhere to describe what is in front of you. Double-tap to ask a question. Hold for 1.5 seconds for emergency. Triple-tap to repeat.',
        langConfig.locale
      );
    } else if (step === 3) {
      speechService.speak(
        language === 'hi'
          ? 'सुरक्षा चेतावनी: दृष्टि एक कृत्रिम बुद्धिमत्ता सहायता उपकरण है। यह सफेद छड़ी या सहायक का विकल्प नहीं है। क्या आप तैयार हैं?'
          : 'Safety notice: Drishti is an AI assistive aid and does not replace a white cane or guide dog. Are you ready?',
        langConfig.locale
      );
    }
  }, [step, language]);

  return (
    <div
      role="dialog"
      aria-label="Drishti Voice Onboarding"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gradient-to-b from-[#0B1224] to-[#05070F] select-none"
    >
      <div className="glass-surface-strong p-8 max-w-md w-full border border-white/20 text-center">
        {step === 1 && (
          <div>
            <div className="text-6xl mb-4">👁️</div>
            <h1 className="text-3xl font-extrabold text-white mb-2">दृष्टि • Drishti</h1>
            <p className="text-sm text-[#64D2FF] mb-6">
              {language === 'hi' ? 'अपनी पसंदीदा भाषा चुनें' : 'Choose your preferred language'}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {['hi', 'en', 'bn', 'te', 'mr', 'ta'].map((code) => {
                const item = SUPPORTED_LANGUAGES[code];
                return (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code);
                      speechService.speak(item.welcome, item.locale);
                    }}
                    className={`p-3 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
                      language === code
                        ? 'bg-[#64D2FF] text-[#05070F] border-white font-bold'
                        : 'bg-white/10 text-white border-white/15'
                    }`}
                  >
                    <span>{item.nativeName}</span>
                    <span>{item.flag}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl bg-[#64D2FF] text-[#05070F] font-bold text-lg active:scale-95 transition-transform"
            >
              {language === 'hi' ? 'आगे बढ़ें (Next)' : 'Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-5xl mb-4">👆</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {language === 'hi' ? '4 सरल इशारे (Gestures)' : '4 Simple Gestures'}
            </h2>

            <div className="space-y-3 text-left mb-6 text-sm">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <span className="text-xl">1️⃣</span>
                <div>
                  <div className="font-bold text-white">{language === 'hi' ? 'सिंगल टैप (1 Tap)' : 'Single Tap'}</div>
                  <div className="text-xs text-[#C7D2E8]">{language === 'hi' ? 'सामने का दृश्य और खतरे बताएं' : 'Describe scene & hazards'}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <span className="text-xl">2️⃣</span>
                <div>
                  <div className="font-bold text-white">{language === 'hi' ? 'डबल टैप (Double Tap)' : 'Double Tap'}</div>
                  <div className="text-xs text-[#C7D2E8]">{language === 'hi' ? 'सवाल पूछें (Ask Drishti)' : 'Voice question (Ask Drishti)'}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <span className="text-xl">3️⃣</span>
                <div>
                  <div className="font-bold text-white">{language === 'hi' ? 'लंबा दबाएं 1.5s' : 'Hold 1.5 Seconds'}</div>
                  <div className="text-xs text-[#C7D2E8]">{language === 'hi' ? 'आपातकाल + पुलिस 112 + एसएमएस' : 'Emergency Mode + Police 112'}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <span className="text-xl">4️⃣</span>
                <div>
                  <div className="font-bold text-white">{language === 'hi' ? 'ट्रिपल टैप (3 Taps)' : 'Triple Tap'}</div>
                  <div className="text-xs text-[#C7D2E8]">{language === 'hi' ? 'पिछली बात दोहराएं' : 'Repeat last description'}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-4 rounded-2xl bg-[#64D2FF] text-[#05070F] font-bold text-lg active:scale-95 transition-transform"
            >
              {language === 'hi' ? 'समझ गया • आगे बढ़ें' : 'Understood • Next'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="text-6xl mb-4">🛡️</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {language === 'hi' ? 'सुरक्षा और गोपनीयता' : 'Safety & Privacy'}
            </h2>
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 text-left mb-6 space-y-2">
              <p>
                ⚠️ <strong>{language === 'hi' ? 'महत्वपूर्ण सूचना:' : 'Notice:'}</strong>{' '}
                {language === 'hi'
                  ? 'दृष्टि एक सहायक उपकरण है। यह सफेद छड़ी या गाइड डॉग का विकल्प नहीं है।'
                  : 'Drishti is an assistive aid and cannot replace your white cane or guide dog.'}
              </p>
              <p>
                🔒 <strong>{language === 'hi' ? 'गोपनीयता:' : 'Privacy:'}</strong>{' '}
                {language === 'hi'
                  ? 'कैमरा तस्वीरें केवल तात्कालिक विश्लेषण के लिए इस्तेमाल होती हैं और कभी भी सर्वर पर सेव नहीं की जातीं।'
                  : 'Images are analyzed in real-time and immediately discarded. Never stored.'}
              </p>
            </div>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('drishti_onboarded', 'true');
                }
                onComplete();
              }}
              className="w-full py-4 rounded-2xl bg-[#64D2FF] text-[#05070F] font-bold text-lg active:scale-95 transition-transform"
            >
              {language === 'hi' ? 'दृष्टि शुरू करें • Start' : 'Start Drishti'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
