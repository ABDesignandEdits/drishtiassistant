/**
 * Native Bixby / Siri-Style Floating Assistant Overlay
 * Sits gracefully at the bottom of the camera without blocking the user's face or view.
 * Displays live speech transcription, dynamic audio ripples, and prompt "How can I help you?".
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrishtiStore } from '../state/drishtiStore';
import { SUPPORTED_LANGUAGES } from '../speech/languages';

interface ListeningOverlayProps {
  onCancel: () => void;
  onSubmitQuestion: (question: string) => void;
}

export const ListeningOverlay: React.FC<ListeningOverlayProps> = ({ onCancel, onSubmitQuestion }) => {
  const { language, transcript } = useDrishtiStore();
  const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.hi;

  const COMMON_QUESTIONS =
    language === 'hi'
      ? [
          { label: 'सामने क्या है? (What are you looking at)', query: 'What are you looking at? Describe the scene in front of me.' },
          { label: 'रंग क्या है? (Color)', query: 'What is the color of the main object in front of the camera?' },
          { label: 'रुपया / नोट जांचें', query: 'What Indian rupee currency note or coin is in front of the camera?' },
          { label: 'लिखावट पढ़ें (OCR)', query: 'Read aloud any visible text, signs, labels, or documents.' }
        ]
      : [
          { label: 'What are you looking at?', query: 'What are you looking at? Describe the scene in front of me.' },
          { label: 'What color is this?', query: 'What is the color of the main object in front of the camera?' },
          { label: 'Currency check', query: 'What Indian rupee currency note or coin is in front of the camera?' },
          { label: 'Read sign / text', query: 'Read aloud any visible text, signs, labels, or documents.' }
        ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end">
        {/* Soft, subtle upper ambient gradient (camera & face 100% visible) */}
        <div
          onClick={onCancel}
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-auto"
        />

        {/* FLOATING BIXBY / SIRI LIQUID GLASS ASSISTANT SHEET */}
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 120, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-xl mx-auto px-4 pb-6 pointer-events-auto z-10"
        >
          <div className="glass-surface p-5 sm:p-6 rounded-[32px] border border-[#64D2FF]/40 shadow-2xl bg-black/45 backdrop-blur-xl">
            {/* Top Bar with Assistant Header & Dismiss Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#64D2FF] animate-ping" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#64D2FF]">
                  {language === 'hi' ? 'दृष्टि सहायक (Drishti Assistant)' : 'Drishti Voice Assistant'}
                </span>
              </div>
              <button
                onClick={onCancel}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm active:scale-90 transition-transform"
                aria-label="Close assistant"
              >
                ✕
              </button>
            </div>

            {/* Glowing Neon Bixby Orb & Audio Waves */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex items-center justify-center shrink-0">
                <div className="absolute w-12 h-12 rounded-full bg-[#64D2FF]/30 animate-ping" />
                <div className="absolute w-10 h-10 rounded-full bg-amber-400/30 animate-pulse" />
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#64D2FF] to-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-[#64D2FF]/40 z-10">
                  🎙️
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {language === 'hi' ? 'हाँ, मैं आपकी क्या मदद करूँ?' : 'How can I help you?'}
                </h3>
                <p className="text-xs text-[#64D2FF] font-medium">
                  {language === 'hi'
                    ? 'किसी भी वस्तु, सामग्री या दृश्य के बारे में पूछें...'
                    : 'Ask about any object, material, color, or text in front of you...'}
                </p>
              </div>
            </div>

            {/* Real-Time Spoken Transcript Bubble */}
            <div className="glass-surface px-4 py-3 rounded-2xl border border-white/15 bg-white/5 mb-4 min-h-[52px] flex items-center">
              <p className="text-sm sm:text-base font-semibold text-white">
                {transcript ? (
                  <span className="text-amber-300">"{transcript}"</span>
                ) : (
                  <span className="text-white/50 italic flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {language === 'hi' ? 'सुन रही हूँ...' : 'Listening...'}
                  </span>
                )}
              </p>
            </div>

            {/* Quick Suggestion Chips (Zero touch required, but available as shortcuts) */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
              {COMMON_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSubmitQuestion(q.query)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/15 active:scale-95 transition-transform"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Manual Cancel & Submit if needed */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[11px] text-white/50">
                {language === 'hi' ? 'आवाज से पूरी तरह नियंत्रित' : 'Hands-free voice controlled'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="px-3 py-1 rounded-xl text-xs text-white/70 hover:text-white bg-white/10"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                {transcript && (
                  <button
                    onClick={() => onSubmitQuestion(transcript)}
                    className="px-3 py-1 rounded-xl text-xs font-bold text-[#05070F] bg-[#64D2FF] shadow-sm shadow-[#64D2FF]/30 active:scale-95"
                  >
                    {language === 'hi' ? 'पूछें' : 'Ask'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
