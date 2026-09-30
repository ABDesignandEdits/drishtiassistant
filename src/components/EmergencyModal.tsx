import React, { useEffect, useState } from 'react';
import { useDrishtiStore } from '../state/drishtiStore';
import { speechService } from '../speech/speechService';
import { SUPPORTED_LANGUAGES } from '../speech/languages';

interface EmergencyModalProps {
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ onClose }) => {
  const { language, emergencyContacts, medicalNote } = useDrishtiStore();
  const [smsStatus, setSmsStatus] = useState<string>('Sending emergency alert with GPS...');
  const [mapsLink, setMapsLink] = useState<string>('');
  const [isDispatched, setIsDispatched] = useState<boolean>(false);

  const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.hi;

  useEffect(() => {
    // Speak activation notice immediately
    speechService.speakUrgent(langConfig.emergencyActivated, langConfig.locale);

    // Get current GPS position and dispatch emergency
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const link = `https://maps.google.com/?q=${latitude},${longitude}`;
          setMapsLink(link);

          try {
            const res = await fetch('/api/emergency', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                accuracy,
                contacts: emergencyContacts,
                lang: language,
                note: medicalNote
              })
            });
            const data = await res.json();
            const timeStr = data.timestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const message = language === 'hi'
              ? `आपातकालीन एसएमएस ${data.sent} संपर्कों को ${timeStr} पर भेजा गया`
              : `SMS & Live GPS sent to ${data.sent} contact(s) at ${timeStr}`;
            setSmsStatus(message);
            setIsDispatched(true);
            speechService.speak(message, langConfig.locale);
          } catch (e) {
            setSmsStatus(language === 'hi' ? 'एसएमएस भेजने में त्रुटि हुई' : 'SMS dispatch failed');
          }
        },
        async (err) => {
          console.warn('Geolocation failed:', err);
          // Fallback dispatch without coordinates
          try {
            const res = await fetch('/api/emergency', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contacts: emergencyContacts,
                lang: language,
                note: medicalNote
              })
            });
            const data = await res.json();
            const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            setSmsStatus(`Emergency alert sent at ${timeStr} (Location unavailable)`);
            setIsDispatched(true);
          } catch (e) {
            setSmsStatus('Failed to send SMS');
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Emergency Mode"
      className="fixed inset-0 z-50 flex flex-col justify-between p-6 bg-gradient-to-b from-[#1A0B0B] via-[#05070F] to-[#05070F] overflow-y-auto"
    >
      {/* Header Info */}
      <div className="w-full max-w-lg mx-auto text-center pt-4">
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full danger-stripes text-black font-black text-sm uppercase tracking-wider mb-4">
          <span>🚨</span> {language === 'hi' ? 'आपातकालीन मोड' : 'EMERGENCY MODE'}
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-2">
          {language === 'hi' ? 'मदद के लिए तुरंत कॉल करें' : 'One-Tap Emergency Calling'}
        </h1>

        {/* State line */}
        <div className="glass-surface p-4 border border-[#FF9F0A]/40 mb-4 text-center">
          <p className="text-sm font-semibold text-[#FFB340]">
            {isDispatched ? '✅ ' : '⏳ '}
            {smsStatus}
          </p>
          {mapsLink && (
            <p className="text-xs text-[#C7D2E8] truncate mt-1">
              📍 {mapsLink}
            </p>
          )}
        </div>
      </div>

      {/* Giant Calling Buttons (min 88px tall for touch target accessibility) */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4 my-auto">
        {/* Police 112 */}
        <a
          href="tel:112"
          className="h-24 rounded-3xl bg-[#0A84FF] hover:bg-[#0070E0] text-white flex items-center justify-between px-8 text-2xl font-bold shadow-xl border border-white/30 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">👮</span>
            <div className="text-left">
              <div>{language === 'hi' ? 'पुलिस हेल्पलाइन' : 'Police Helpline'}</div>
              <div className="text-sm font-mono text-blue-100">National Emergency 112</div>
            </div>
          </div>
          <span className="text-3xl font-mono">112 📞</span>
        </a>

        {/* Ambulance 108 */}
        <a
          href="tel:108"
          className="h-24 rounded-3xl bg-[#FF9F0A] hover:bg-[#E08B00] text-black flex items-center justify-between px-8 text-2xl font-bold shadow-xl border border-black/30 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">🚑</span>
            <div className="text-left">
              <div>{language === 'hi' ? 'एम्बुलेंस' : 'Ambulance'}</div>
              <div className="text-sm font-mono text-black/80">Medical Emergency 108</div>
            </div>
          </div>
          <span className="text-3xl font-mono">108 📞</span>
        </a>

        {/* Saved Contacts */}
        {emergencyContacts.map((contact, idx) => (
          <a
            key={idx}
            href={`tel:${contact.phone}`}
            className="h-22 rounded-3xl glass-surface-strong text-white flex items-center justify-between px-8 text-xl font-semibold border border-white/20 active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">👤</span>
              <div className="text-left">
                <div>{contact.name}</div>
                <div className="text-sm font-mono text-[#C7D2E8]">{contact.phone}</div>
              </div>
            </div>
            <span className="text-xl">📞 Call</span>
          </a>
        ))}
      </div>

      {/* Honest Footer Notice & Dismiss Button */}
      <div className="w-full max-w-lg mx-auto text-center pt-4">
        <p className="text-xs text-[#C7D2E8] mb-4">
          {language === 'hi'
            ? 'सूचना: वेब ब्राउज़र सुरक्षा के कारण कॉल करने के लिए ऊपर दिए गए बड़े बटन पर टैप करें।'
            : 'Note: Web security requires a single tap on the buttons above to place phone calls.'}
        </p>

        <button
          onClick={onClose}
          className="h-16 w-full rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg border border-white/20 active:scale-95 transition-transform"
        >
          {language === 'hi' ? 'सुरक्षित हूँ • आपातकाल बंद करें' : 'I am Safe • Exit Emergency'}
        </button>
      </div>
    </div>
  );
};
