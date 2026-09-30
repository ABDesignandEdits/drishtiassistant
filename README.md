# DRISHTI (दृष्टि) — "Eyes for the Blind"

> **Drishti is an accessibility-first AI visual assistant and danger guardian built for India's 62 million visually impaired individuals.**
> Point the phone camera toward the world: Drishti speaks what it sees in the user's native language, answers spoken questions about the environment, identifies Indian currency (₹10/20/50/100/200/500), reads signage/text, and proactively warns them of hazards (stairs, approaching vehicles, obstacles, potholes) before they step into harm.

---

## 🌟 Key Innovations & Zero-Sight Architecture

1. **Blind-First Gesture Map (Zero Screen Peeking Needed)**
   - **Single Tap Anywhere**: Captures the scene, analyzes via Gemini 3.8 Flash Vision, and immediately speaks the description in the chosen language.
   - **Double Tap (<300ms)**: "Ask Drishti" voice query mode with real-time speech recognition. (e.g. *"What color is this shirt?"*, *"What does this sign say?"*, *"How much is this currency note?"*).
   - **1.5s Long Press**: Instant Emergency Mode with haptic ramp, sends SMS with Google Maps GPS link (`https://maps.google.com/?q=LAT,LNG`) to emergency contacts, and shows giant stacked buttons for Police (112), Ambulance (108), and family.
   - **Triple Tap**: Repeats the last spoken description.
   - **Two-Finger Tap**: Toggles continuous scan mode (adaptive 2.5s loop with stationary detection).
   - **Swipe Down**: Immediately silences speech synthesis.

2. **Liquid Glass Noir Design System (visionOS-Inspired + WCAG AAA)**
   - High contrast dark palette (`#05070F` base, `#64D2FF` cyan action, `#FF9F0A` hazard amber, `#5E5CE6` indigo ambient blobs).
   - **Strict Color-Blind Safe Guarantee**: Never relies on red/green. Danger is always multi-sensory: amber diagonal stripe texture + ⚠️ icon + "DANGER" text + sharp 880 Hz square burst earcon + SOS vibration pattern `[200, 80, 200, 80, 400]`.
   - **High-Contrast Light Theme**: Automatic via `prefers-contrast` or toggleable in settings.

3. **10 Indic Languages Supported (No Machine Translation Hallucinations)**
   - Direct native prompt synthesis in:
     - 🇮🇳 **हिन्दी (Hindi)** - `hi-IN`
     - 🇮🇳 **English (India)** - `en-IN`
     - 🇮🇳 **বাংলা (Bengali)** - `bn-IN`
     - 🇮🇳 **తెలుగు (Telugu)** - `te-IN`
     - 🇮🇳 **मराठी (Marathi)** - `mr-IN`
     - 🇮🇳 **தமிழ் (Tamil)** - `ta-IN`
     - 🇮🇳 **ગુજરાતી (Gujarati)** - `gu-IN`
     - 🇮🇳 **ಕನ್ನಡ (Kannada)** - `kn-IN`
     - 🇮🇳 **മലയാളം (Malayalam)** - `ml-IN`
     - 🇮🇳 **ਪੰਜਾਬੀ (Punjabi)** - `pa-IN`

4. **Web Audio Earcons & Haptic Feedback**
   - Pure synthesized tones:
     - Ready: Rising two-note (440Hz -> 660Hz)
     - Listening: 880Hz crisp blip
     - Thinking: Gentle rhythmic ticking
     - Error: Descending two-note (550Hz -> 330Hz)
     - Danger: 880Hz square burst

---

## 🎭 3-Minute Blindfold Hackathon Demo Script

1. **Setup (0:00 - 0:30)**:
   - Hand the phone to a judge or volunteer and place a blindfold over their eyes.
   - State: *"The entire screen is one button. Tap once anywhere."*

2. **Scene Description (0:30 - 1:15)**:
   - Judge taps screen.
   - Camera clicks, thinking tone ticks for ~800ms.
   - Drishti speaks clearly: *"सामने लगभग 2 मीटर पर एक मेज़ और कुर्सी है। बाईं ओर लैपटॉप खुला हुआ है। रास्ता साफ है।"*
   - Judge and audience experience zero-sight operation.

3. **Voice Question: "Ask Drishti" (1:15 - 1:50)**:
   - Judge double-taps screen.
   - Drishti responds: *"दृष्टि सुन रही है, पूछिए..."*
   - Judge asks: *"What color is the bottle on the table?"*
   - Drishti inspects the current frame: *"The bottle appears to be dark blue with a silver cap."*

4. **Indian Currency Reader (1:50 - 2:20)**:
   - Hold a ₹500 rupee note in front of the camera.
   - Tap screen or ask: *"How much is this note?"*
   - Drishti responds: *"यह पांच सौ रुपये का नोट है।" (Five hundred rupee note)*.

5. **Hazard Alert Warning (2:20 - 2:45)**:
   - Roll a chair or step toward stairs.
   - Drishti's continuous scan triggers: urgent 880Hz danger earcon sounds, phone vibrates SOS pattern, perimeter pulses amber with diagonal stripes:
   - Drishti interrupts speech: *"सावधान! रास्ते में रुकावट है, सीधे आगे!"*

6. **Emergency Long-Press (2:45 - 3:00)**:
   - Hold screen for 1.5 seconds.
   - Haptic ramp vibrates during hold.
   - Voice announces: *"आपातकालीन मोड सक्रिय हो गया है।"*
   - Police 112 & Ambulance 108 giant 88px+ buttons appear, SMS link dispatched with GPS.

---

## 🛠️ Tech Stack & Endpoints

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, Web Speech API, Web Audio API, Vibration API, MediaDevices API.
- **Backend**: Express on Node.js with Vite middleware (`server.ts`).
- **AI Model**: Google Gemini 3.8 Flash Vision (`@google/genai`) with structured JSON schemas and anti-hallucination prompting.
- **Endpoints**:
  - `POST /api/describe`: Receives `{ image_b64, lang, mode }` → returns `{ spoken, hazards[], objects[], text[], currency }`.
  - `POST /api/ask`: Receives `{ image_b64, question, lang }` → returns `{ spoken, kind, value, confidence }`.
  - `POST /api/emergency`: Receives `{ lat, lng, accuracy, contacts, lang }` → generates Google Maps link and dispatches alerts.
  - `GET /api/health`: Health status and model connectivity.
  - `GET /api/user/preferences`: Synchronizes settings and emergency contacts.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables in .env
GEMINI_API_KEY=your_gemini_api_key

# 3. Start development server on port 3000
npm run dev

# 4. Open http://localhost:3000 in your browser
```
