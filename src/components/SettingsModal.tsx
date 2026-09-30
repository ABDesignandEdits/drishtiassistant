import React, { useState } from 'react';
import { useDrishtiStore } from '../state/drishtiStore';
import { SUPPORTED_LANGUAGES } from '../speech/languages';
import { speechService } from '../speech/speechService';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    language,
    setLanguage,
    highContrast,
    toggleHighContrast,
    speechRate,
    setSpeechRate,
    emergencyContacts,
    addEmergencyContact,
    removeEmergencyContact
  } = useDrishtiStore();

  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    if (langCode === 'en') {
      useDrishtiStore.getState().setLastSpoken('Drishti is ready. Say "What are you looking at" or tap to describe.');
      useDrishtiStore.setState({ transcript: '' });
    } else if (langCode === 'hi') {
      useDrishtiStore.getState().setLastSpoken('दृष्टि तैयार है। बोलिए "सामने क्या है" या दृश्य देखने के लिए टैप करें।');
      useDrishtiStore.setState({ transcript: '' });
    }
    const cfg = SUPPORTED_LANGUAGES[langCode];
    if (cfg) {
      speechService.speak(cfg.welcome, cfg.locale);
    }
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    const cfg = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.hi;
    speechService.speak(
      language === 'hi' ? 'आवाज़ की गति बदल दी गई है' : 'Speech rate updated',
      cfg.locale,
      { rate }
    );
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContactName.trim() && newContactPhone.trim()) {
      addEmergencyContact({
        name: newContactName.trim(),
        phone: newContactPhone.trim()
      });
      setNewContactName('');
      setNewContactPhone('');
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Drishti Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
    >
      <div className="glass-surface-strong p-6 sm:p-8 max-w-lg w-full my-auto border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {language === 'hi' ? 'दृष्टि सेटिंग्स' : 'Drishti Settings'}
            </h2>
            <p className="text-xs text-[#C7D2E8]">Accessibility & Language Configuration</p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center active:scale-90"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* 1. Language Selection (10 Indic Languages) */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-[#64D2FF] uppercase tracking-wider block mb-3">
            {language === 'hi' ? 'भाषा चुनें (10 भाषाएं)' : 'Select Spoken Language (10 Languages)'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`p-3 rounded-2xl text-left border flex items-center justify-between transition-all ${
                  language === lang.code
                    ? 'bg-[#64D2FF] text-[#05070F] font-bold border-white shadow-lg'
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="text-base font-semibold">{lang.nativeName}</div>
                  <div className={`text-xs ${language === lang.code ? 'text-black/70' : 'text-slate-400'}`}>
                    {lang.name}
                  </div>
                </div>
                <span>{lang.flag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. High Contrast Theme Toggle */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
          <div>
            <div className="text-base font-semibold text-white">
              {language === 'hi' ? 'उच्च कंट्रास्ट थीम' : 'High Contrast Light Theme'}
            </div>
            <div className="text-xs text-[#C7D2E8]">
              {language === 'hi' ? 'कम रोशनी या कम दृष्टि के लिए' : 'For enhanced outdoor visibility'}
            </div>
          </div>
          <button
            onClick={toggleHighContrast}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              highContrast ? 'bg-amber-400 text-black' : 'bg-white/20 text-white'
            }`}
          >
            {highContrast ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* 3. Speech Rate Presets */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-[#64D2FF] uppercase tracking-wider block mb-2">
            {language === 'hi' ? 'आवाज़ की गति' : 'Speech Speed'}
          </label>
          <div className="flex gap-2">
            {[
              { label: '0.8x Slow', rate: 0.8 },
              { label: '1.0x Normal', rate: 1.0 },
              { label: '1.2x Fast', rate: 1.2 }
            ].map((item) => (
              <button
                key={item.rate}
                onClick={() => handleRateChange(item.rate)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${
                  Math.abs(speechRate - item.rate) < 0.05
                    ? 'bg-[#64D2FF] text-[#05070F] border-white'
                    : 'bg-white/5 text-white border-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Emergency Contacts Manager */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-[#64D2FF] uppercase tracking-wider block mb-2">
            {language === 'hi' ? 'आपातकालीन संपर्क' : 'Emergency Contacts'}
          </label>

          <div className="space-y-2 mb-3">
            {emergencyContacts.map((contact, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-sm"
              >
                <div>
                  <span className="font-semibold text-white">{contact.name}: </span>
                  <span className="font-mono text-[#C7D2E8]">{contact.phone}</span>
                </div>
                {idx > 0 && (
                  <button
                    onClick={() => removeEmergencyContact(idx)}
                    className="text-amber-400 hover:text-amber-300 text-xs px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddContact} className="flex gap-2">
            <input
              type="text"
              placeholder="Name (e.g. Brother)"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="flex-1 p-2 rounded-xl bg-black/40 border border-white/20 text-white text-xs placeholder:text-slate-500"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="flex-1 p-2 rounded-xl bg-black/40 border border-white/20 text-white text-xs placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-[#64D2FF] text-[#05070F] font-bold text-xs"
            >
              Add
            </button>
          </form>
        </div>

        {/* Close and apply */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-[#64D2FF] text-[#05070F] font-bold text-base active:scale-95 transition-transform"
        >
          {language === 'hi' ? 'सहेजें और वापस जाएं' : 'Save & Return'}
        </button>
      </div>
    </div>
  );
};
