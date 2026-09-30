import { create } from 'zustand';

export interface Hazard {
  type: 'stairs_up' | 'stairs_down' | 'vehicle_approaching' | 'obstacle' | 'open_drain' | 'pothole' | 'chair' | 'wall' | 'other' | string;
  direction: 'ahead' | 'left' | 'right' | string;
  distance_m?: number | null;
  urgency: 'low' | 'medium' | 'high' | 'critical' | string;
}

export interface ARNode {
  id: string;
  label: string;
  labelNative: string;
  category: 'object' | 'currency' | 'text' | 'hazard' | 'color';
  box2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0 to 1000
  centerPoint: [number, number]; // [y, x] percentages 0-100
  confidence: number;
  details?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical' | 'none';
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export type AppMode = 'idle' | 'analyzing' | 'listening' | 'speaking' | 'emergency' | 'settings' | 'help' | 'onboarding';

interface DrishtiState {
  language: string;
  mode: AppMode;
  isScanning: boolean;
  isARAnalyzerEnabled: boolean;
  isVoiceControlActive: boolean;
  voiceStatus: 'idle' | 'listening' | 'heard' | 'processing';
  lastVoiceCommand: string;
  arFilter: 'all' | 'hazard' | 'currency' | 'text' | 'object';
  arNodes: ARNode[];
  activeArNode: ARNode | null;
  lastSpoken: string;
  lastDescription: string;
  lastHazards: Hazard[];
  lastObjects: string[];
  lastText: string[];
  lastCurrency: { detected: boolean; denomination: number | null; confidence: number } | null;
  activeDanger: Hazard | null;
  transcript: string;
  highContrast: boolean;
  speechRate: number;
  emergencyContacts: EmergencyContact[];
  medicalNote: string;
  batteryLevel: number | null;
  isOnline: boolean;
  cameraReady: boolean;
  lastHazardAnnouncedAt: number;
  recentHazardCache: Array<{ key: string; timestamp: number }>;

  // Actions
  setLanguage: (lang: string) => void;
  setMode: (mode: AppMode) => void;
  toggleScanning: () => void;
  setScanning: (scanning: boolean) => void;
  toggleARAnalyzer: () => void;
  setARAnalyzerEnabled: (enabled: boolean) => void;
  toggleVoiceControl: () => void;
  setVoiceControlActive: (active: boolean) => void;
  setVoiceStatus: (status: 'idle' | 'listening' | 'heard' | 'processing') => void;
  setLastVoiceCommand: (cmd: string) => void;
  setARFilter: (filter: 'all' | 'hazard' | 'currency' | 'text' | 'object') => void;
  setArNodes: (nodes: ARNode[]) => void;
  setActiveArNode: (node: ARNode | null) => void;
  setLastSpoken: (text: string) => void;
  setAnalysisResult: (result: {
    spoken: string;
    hazards?: Hazard[];
    objects?: string[];
    text?: string[];
    currency?: { detected: boolean; denomination: number | null; confidence: number };
    arNodes?: ARNode[];
  }) => void;
  setActiveDanger: (hazard: Hazard | null) => void;
  setTranscript: (text: string) => void;
  toggleHighContrast: () => void;
  setSpeechRate: (rate: number) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (index: number) => void;
  setMedicalNote: (note: string) => void;
  setBatteryLevel: (level: number | null) => void;
  setIsOnline: (online: boolean) => void;
  setCameraReady: (ready: boolean) => void;
  shouldAnnounceHazard: (hazard: Hazard) => boolean;
}

export const useDrishtiStore = create<DrishtiState>((set, get) => {
  const initialLang =
    typeof window !== 'undefined'
      ? localStorage.getItem('drishti_lang') ||
        (navigator.language && navigator.language.startsWith('hi') ? 'hi' : 'en')
      : 'en';

  return {
    language: initialLang,
    mode: 'idle',
    isScanning: false,
    isARAnalyzerEnabled: true,
    isVoiceControlActive: true,
    voiceStatus: 'listening',
    lastVoiceCommand: '',
    arFilter: 'all',
    arNodes: [],
    activeArNode: null,
    lastSpoken:
      initialLang === 'hi'
        ? 'दृष्टि तैयार है। बोलिए "सामने क्या है"।'
        : 'Drishti is ready. Say "What are you looking at" or "Hey Drishti".',
    lastDescription: '',
  lastHazards: [],
  lastObjects: [],
  lastText: [],
  lastCurrency: null,
  activeDanger: null,
  transcript: '',
  highContrast: typeof window !== 'undefined' ? localStorage.getItem('drishti_contrast') === 'true' : false,
  speechRate: 0.95,
  emergencyContacts: [
    { name: 'Family', phone: '+919876543210' },
    { name: 'Emergency Helpline', phone: '112' }
  ],
  medicalNote: 'Visually impaired user using Drishti assistive navigation.',
  batteryLevel: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  cameraReady: false,
  lastHazardAnnouncedAt: 0,
  recentHazardCache: [],

  setLanguage: (lang: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('drishti_lang', lang);
    }
    set({ language: lang });
  },

  setMode: (mode: AppMode) => set({ mode }),

  toggleScanning: () => set((state) => ({ isScanning: !state.isScanning })),
  setScanning: (isScanning: boolean) => set({ isScanning }),

  toggleARAnalyzer: () => set((state) => ({ isARAnalyzerEnabled: !state.isARAnalyzerEnabled })),
  setARAnalyzerEnabled: (isARAnalyzerEnabled: boolean) => set({ isARAnalyzerEnabled }),
  toggleVoiceControl: () => set((state) => ({ isVoiceControlActive: !state.isVoiceControlActive })),
  setVoiceControlActive: (isVoiceControlActive: boolean) => set({ isVoiceControlActive }),
  setVoiceStatus: (voiceStatus) => set({ voiceStatus }),
  setLastVoiceCommand: (lastVoiceCommand: string) => set({ lastVoiceCommand }),
  setARFilter: (arFilter) => set({ arFilter }),

  setArNodes: (arNodes: ARNode[]) => set({ arNodes }),
  setActiveArNode: (activeArNode: ARNode | null) => set({ activeArNode }),

  setLastSpoken: (lastSpoken: string) => set({ lastSpoken }),

  setAnalysisResult: ({ spoken, hazards = [], objects = [], text = [], currency = null, arNodes = [] }) => {
    set({
      lastSpoken: spoken,
      lastDescription: spoken,
      lastHazards: hazards,
      lastObjects: objects,
      lastText: text,
      lastCurrency: currency,
      arNodes: arNodes.length > 0 ? arNodes : generateFallbackArNodes(objects, text, currency, hazards)
    });
  },

  setActiveDanger: (activeDanger) => set({ activeDanger }),

  setTranscript: (transcript: string) => set({ transcript }),

  toggleHighContrast: () =>
    set((state) => {
      const next = !state.highContrast;
      if (typeof window !== 'undefined') {
        localStorage.setItem('drishti_contrast', String(next));
        if (next) {
          document.documentElement.setAttribute('data-theme', 'high-contrast-light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
      return { highContrast: next };
    }),

  setSpeechRate: (speechRate: number) => set({ speechRate }),

  addEmergencyContact: (contact: EmergencyContact) =>
    set((state) => ({
      emergencyContacts: [...state.emergencyContacts, contact]
    })),

  removeEmergencyContact: (index: number) =>
    set((state) => ({
      emergencyContacts: state.emergencyContacts.filter((_, i) => i !== index)
    })),

  setMedicalNote: (medicalNote: string) => set({ medicalNote }),

  setBatteryLevel: (batteryLevel: number | null) => set({ batteryLevel }),

  setIsOnline: (isOnline: boolean) => set({ isOnline }),

  setCameraReady: (cameraReady: boolean) => set({ cameraReady }),

  shouldAnnounceHazard: (hazard: Hazard) => {
    const state = get();
    const now = Date.now();
    const typeLower = (hazard.type || '').toLowerCase();

    // Benign everyday furniture/items are NEVER hazards
    const BENIGN_ITEMS = ['chair', 'table', 'wall', 'laptop', 'bottle', 'door', 'floor', 'bed', 'desk', 'person', 'ceiling', 'cup', 'book', 'paper', 'phone'];
    if (BENIGN_ITEMS.some((b) => typeLower.includes(b))) {
      return false;
    }

    // Only genuine physical walking hazards trigger urgent alarm
    const GENUINE_HAZARDS = ['stairs_down', 'stairs_up', 'stairs', 'vehicle', 'oncoming', 'open_drain', 'open_trench', 'hole', 'pothole', 'fire', 'broken_glass', 'overhead'];
    const isGenuineHazard = GENUINE_HAZARDS.some((gh) => typeLower.includes(gh));

    if (!isGenuineHazard && hazard.urgency !== 'critical') {
      return false;
    }

    const key = `${hazard.type}_${hazard.direction}`;
    if (hazard.urgency === 'high' || hazard.urgency === 'critical') {
      const updated = state.recentHazardCache.filter((c) => now - c.timestamp < 8000);
      updated.push({ key, timestamp: now });
      set({ recentHazardCache: updated, lastHazardAnnouncedAt: now });
      return true;
    }

    const existing = state.recentHazardCache.find((c) => c.key === key && now - c.timestamp < 8000);
    if (existing) {
      return false;
    }

    const updated = state.recentHazardCache.filter((c) => now - c.timestamp < 8000);
    updated.push({ key, timestamp: now });
    set({ recentHazardCache: updated, lastHazardAnnouncedAt: now });
    return true;
  }
};
});

// Generates fallback spatial AR nodes if raw bounding boxes were omitted
function generateFallbackArNodes(
  objects: string[],
  text: string[],
  currency: { detected: boolean; denomination: number | null } | null,
  hazards: Hazard[]
): ARNode[] {
  const nodes: ARNode[] = [];

  // 1. Genuine Hazards only
  const BENIGN_ITEMS = ['chair', 'table', 'wall', 'laptop', 'bottle', 'door', 'floor', 'bed', 'desk', 'person', 'ceiling', 'cup', 'book', 'paper', 'phone'];
  const realHazards = hazards.filter((h) => !BENIGN_ITEMS.some((b) => (h.type || '').toLowerCase().includes(b)));

  realHazards.forEach((h, i) => {
    const x = h.direction === 'left' ? 25 : h.direction === 'right' ? 75 : 50;
    const y = 35 + i * 15;
    nodes.push({
      id: `hazard_${i}`,
      label: `Hazard: ${h.type}`,
      labelNative: `खतरा: ${h.type}`,
      category: 'hazard',
      box2d: [y * 10 - 150, x * 10 - 150, y * 10 + 150, x * 10 + 150],
      centerPoint: [y, x],
      confidence: 0.95,
      urgency: (h.urgency as any) || 'high',
      details: `${h.direction} • ${h.distance_m ? `~${h.distance_m}m` : 'ahead'}`
    });
  });

  // 2. Currency
  if (currency && currency.detected && currency.denomination) {
    nodes.push({
      id: 'currency_main',
      label: `₹${currency.denomination} Note`,
      labelNative: `₹${currency.denomination} का नोट`,
      category: 'currency',
      box2d: [350, 300, 650, 700],
      centerPoint: [50, 50],
      confidence: 0.98,
      details: `Indian Rupee ₹${currency.denomination} verified`
    });
  }

  // 3. Text OCR
  text.forEach((t, i) => {
    nodes.push({
      id: `text_${i}`,
      label: `"${t}"`,
      labelNative: `"${t}"`,
      category: 'text',
      box2d: [200 + i * 180, 200, 320 + i * 180, 800],
      centerPoint: [25 + i * 20, 50],
      confidence: 0.92,
      details: 'OCR Text detected'
    });
  });

  // 4. Objects
  const defaultPositions = [
    [55, 45],
    [40, 25],
    [45, 75],
    [70, 30],
    [65, 70]
  ];
  objects.slice(0, 5).forEach((obj, i) => {
    const pos = defaultPositions[i % defaultPositions.length];
    nodes.push({
      id: `obj_${i}`,
      label: obj,
      labelNative: obj,
      category: 'object',
      box2d: [pos[0] * 10 - 120, pos[1] * 10 - 120, pos[0] * 10 + 120, pos[1] * 10 + 120],
      centerPoint: [pos[0], pos[1]],
      confidence: 0.91,
      details: 'Visual entity'
    });
  });

  return nodes;
}
