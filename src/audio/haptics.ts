/**
 * Haptic Vibration System for Drishti
 * Strictly pairs with sound & visual patterns for accessible feedback.
 */

export function triggerHaptic(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignored if user has not interacted or device lacks vibration motor
    }
  }
}

export const Haptics = {
  tap: () => triggerHaptic(15),
  doubleTap: () => triggerHaptic([20, 40, 25]),
  listening: () => triggerHaptic(35),
  capture: () => triggerHaptic([30, 20, 30]),
  danger: () => triggerHaptic([200, 80, 200, 80, 400]),
  emergencyRamp: () => triggerHaptic([40, 40, 80, 40, 120, 40, 600]),
  error: () => triggerHaptic([80, 60, 80])
};
