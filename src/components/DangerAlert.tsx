import React from 'react';
import { Hazard, useDrishtiStore } from '../state/drishtiStore';

interface DangerAlertProps {
  hazard: Hazard | null;
  onDismiss?: () => void;
}

export const DangerAlert: React.FC<DangerAlertProps> = ({ hazard, onDismiss }) => {
  if (!hazard) return null;

  const { language } = useDrishtiStore();

  const getHazardLabel = (type: string): { en: string; hi: string } => {
    switch (type.toLowerCase()) {
      case 'stairs_up':
        return { en: 'Stairs Going Up', hi: 'सीढ़ियाँ ऊपर' };
      case 'stairs_down':
      case 'stairs':
        return { en: 'Stairs Going Down Ahead', hi: 'सीढ़ियाँ आगे नीचे' };
      case 'vehicle_approaching':
      case 'vehicle':
        return { en: 'Vehicle Approaching', hi: 'गाड़ी आ रही है' };
      case 'open_drain':
        return { en: 'Open Drain Ahead', hi: 'खुला नाला आगे है' };
      case 'pothole':
        return { en: 'Pothole / Drop-off', hi: 'गड्ढा या ढलान' };
      case 'obstacle':
      case 'chair':
        return { en: 'Obstacle in Path', hi: 'रास्ते में रुकावट' };
      case 'wall':
        return { en: 'Wall Close Ahead', hi: 'दीवार सामने है' };
      default:
        return { en: 'Danger Ahead', hi: 'आगे खतरा' };
    }
  };

  const getDirectionLabel = (direction: string): { en: string; hi: string } => {
    switch (direction.toLowerCase()) {
      case 'left':
        return { en: 'On your left (9 o\'clock)', hi: 'बाईं ओर' };
      case 'right':
        return { en: 'On your right (3 o\'clock)', hi: 'दाईं ओर' };
      case 'ahead':
      default:
        return { en: 'Straight Ahead (12 o\'clock)', hi: 'सीधे आगे' };
    }
  };

  const labels = getHazardLabel(hazard.type);
  const dir = getDirectionLabel(hazard.direction);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 pointer-events-auto z-40 flex flex-col justify-between p-6 danger-active-pulse"
      onClick={onDismiss}
    >
      {/* Top Banner with Diagonal Stripes */}
      <div className="w-full max-w-lg mx-auto danger-stripes rounded-3xl p-5 shadow-2xl border-2 border-black/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl animate-bounce" aria-hidden="true">⚠️</span>
          <div>
            <div className="text-xs uppercase tracking-widest font-black text-black">
              {language === 'hi' ? 'खतरा • DANGER' : 'DANGER • ALERT'}
            </div>
            <h1 className="text-2xl font-black text-black leading-tight">
              {language === 'hi' ? labels.hi : labels.en}
            </h1>
            <p className="text-sm font-bold text-black/80">
              {language === 'hi' ? dir.hi : dir.en}
              {hazard.distance_m ? ` • ~${hazard.distance_m}m` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          className="h-12 w-12 rounded-full bg-black text-white font-bold flex items-center justify-center text-lg active:scale-90 transition-transform"
          aria-label="Dismiss danger alert"
        >
          ✕
        </button>
      </div>

      {/* Screen perimeter warning banner hint */}
      <div className="w-full text-center">
        <div className="inline-block px-6 py-3 rounded-full bg-black/80 backdrop-blur-md text-[#FF9F0A] font-bold text-sm border border-[#FF9F0A]">
          ⚠️ {language === 'hi' ? 'सावधान रहें • आवाज़ सुनें' : 'Caution • Listen to Spoken Guidance'}
        </div>
      </div>
    </div>
  );
};
