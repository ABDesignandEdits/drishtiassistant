export interface LanguageConfig {
  code: string;
  locale: string;
  name: string;
  nativeName: string;
  flag: string;
  welcome: string;
  tapToSee: string;
  listening: string;
  analyzing: string;
  dangerAlert: string;
  emergencyActivated: string;
  askHint: string;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  hi: {
    code: 'hi',
    locale: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    welcome: 'नमस्ते, मैं दृष्टि हूँ। आपकी आँखें।',
    tapToSee: 'स्क्रीन पर कहीं भी टैप करें',
    listening: 'दृष्टि सुन रही है, अपना सवाल पूछें...',
    analyzing: 'दृश्य का विश्लेषण हो रहा है...',
    dangerAlert: 'सावधान! आगे खतरा!',
    emergencyActivated: 'आपातकालीन मोड सक्रिय हो गया है।',
    askHint: 'डबल-टैप करके सवाल पूछें'
  },
  en: {
    code: 'en',
    locale: 'en-IN',
    name: 'English (India)',
    nativeName: 'English',
    flag: '🇮🇳',
    welcome: 'Hello, I am Drishti. Eyes for the blind.',
    tapToSee: 'Tap anywhere on the screen',
    listening: 'Drishti is listening, ask your question...',
    analyzing: 'Analyzing what is in front of you...',
    dangerAlert: 'Caution! Danger ahead!',
    emergencyActivated: 'Emergency mode activated.',
    askHint: 'Double-tap anywhere to ask'
  },
  bn: {
    code: 'bn',
    locale: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇮🇳',
    welcome: 'নমস্কার, আমি দৃষ্টি।',
    tapToSee: 'স্ক্রিনের যেকোনো জায়গায় ট্যাপ করুন',
    listening: 'দৃষ্টি শুনছে, আপনার প্রশ্ন বলুন...',
    analyzing: 'বিশ্লেষণ করা হচ্ছে...',
    dangerAlert: 'সাবধান! সামনে বিপদ!',
    emergencyActivated: 'জরুরি মোড সক্রিয় করা হয়েছে।',
    askHint: 'প্রশ্ন করতে ডাবল-ট্যাপ করুন'
  },
  te: {
    code: 'te',
    locale: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    welcome: 'నమస్కారం, నేను దృష్టి.',
    tapToSee: 'స్క్రీన్ పై ఎక్కడైనా నొక్కండి',
    listening: 'దృష్టి వింటోంది, మీ ప్రశ్న అడగండి...',
    analyzing: 'విశ్లేషిస్తోంది...',
    dangerAlert: 'జాగ్రత్త! ముందు ప్రమాదం ఉంది!',
    emergencyActivated: 'ఎమర్జెన్సీ మోడ్ ప్రారంభించబడింది.',
    askHint: 'ప్రశ్నించడానికి డబుల్ ట్యాప్ చేయండి'
  },
  mr: {
    code: 'mr',
    locale: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    welcome: 'नमस्कार, मी दृष्टी आहे.',
    tapToSee: 'स्क्रीनवर कुठेही टॅप करा',
    listening: 'दृष्टी ऐकत आहे, आपला प्रश्न विचारा...',
    analyzing: 'विश्लेषण करत आहे...',
    dangerAlert: 'सावधान! समोर धोका आहे!',
    emergencyActivated: 'आपत्कालीन मोड सक्रिय केला आहे.',
    askHint: 'विचारण्यासाठी डबल-टॅप करा'
  },
  ta: {
    code: 'ta',
    locale: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    welcome: 'வணக்கம், நான் திருஷ்டி.',
    tapToSee: 'திரையில் எங்கு வேண்டுமானாலும் தட்டவும்',
    listening: 'திருஷ்டி கேட்கிறது, உங்கள் கேள்வியைக் கேளுங்கள்...',
    analyzing: 'ஆராய்கிறது...',
    dangerAlert: 'எச்சரிக்கை! முன்னால் ஆபத்து!',
    emergencyActivated: 'அவசர நிலை செயல்படுத்தப்பட்டது.',
    askHint: 'கேட்க இரட்டை தட்டவும்'
  },
  gu: {
    code: 'gu',
    locale: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    welcome: 'નમસ્તે, હું દ્રષ્ટિ છું.',
    tapToSee: 'સ્ક્રીન પર ગમે ત્યાં ટેપ કરો',
    listening: 'દ્રષ્ટિ સાંભળી રહી છે, તમારો પ્રશ્ન પૂછો...',
    analyzing: 'વિશ્લેષણ કરી રહ્યું છે...',
    dangerAlert: 'સાવધાન! આગળ જોખમ છે!',
    emergencyActivated: 'ઇમરજન્સી મોડ સક્રિય થયો છે.',
    askHint: 'પૂછવા માટે ડબલ-ટેપ કરો'
  },
  kn: {
    code: 'kn',
    locale: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    welcome: 'ನಮಸ್ಕಾರ, ನಾನು ದೃಷ್ಟಿ.',
    tapToSee: 'ಪರದೆಯ ಮೇಲೆ ಎಲ್ಲಿಯಾದರೂ ಸ್ಪರ್ಶಿಸಿ',
    listening: 'ದೃಷ್ಟಿ ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ, ಪ್ರಶ್ನೆ ಕೇಳಿ...',
    analyzing: 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    dangerAlert: 'ಎಚ್ಚರಿಕೆ! ಮುಂದೆ ಅಪಾಯವಿದೆ!',
    emergencyActivated: 'ತುರ್ತು ಮೋಡ್ ಸಕ್ರಿಯಗೊಂಡಿದೆ.',
    askHint: 'ಕೇಳಲು ಡಬಲ್-ಟ್ಯಾಪ್ ಮಾಡಿ'
  },
  ml: {
    code: 'ml',
    locale: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    welcome: 'നമസ്കാരം, ഞാൻ ദൃഷ്ടി.',
    tapToSee: 'സ്ക്രീനിൽ എവിടെയും തൊടുക',
    listening: 'ദൃഷ്ടി കേൾക്കുന്നു, ചോദിക്കൂ...',
    analyzing: 'വിശകലനം ചെയ്യുന്നു...',
    dangerAlert: 'ജാഗ്രത! മുന്നിൽ അപകടം!',
    emergencyActivated: 'അടിയന്തര മോഡ് സജീവമാക്കി.',
    askHint: 'ചോദിക്കാൻ ഇരട്ട ടാപ്പ് ചെയ്യുക'
  },
  pa: {
    code: 'pa',
    locale: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    welcome: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਦ੍ਰਿਸ਼ਟੀ ਹਾਂ।',
    tapToSee: 'ਸਕ੍ਰੀਨ \'ਤੇ ਕਿਤੇ ਵੀ ਟੈਪ ਕਰੋ',
    listening: 'ਦ੍ਰਿਸ਼ਟੀ ਸੁਣ ਰਹੀ ਹੈ, ਆਪਣਾ ਸਵਾਲ ਪੁੱਛੋ...',
    analyzing: 'ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ...',
    dangerAlert: 'ਸਾਵਧਾਨ! ਅੱਗੇ ਖ਼ਤਰਾ ਹੈ!',
    emergencyActivated: 'ਐਮਰਜੈਂਸੀ ਮੋਡ ਸਰਗਰਮ ਹੋ ਗਿਆ ਹੈ।',
    askHint: 'ਪੁੱਛਣ ਲਈ ਡਬਲ-ਟੈਪ ਕਰੋ'
  }
};
