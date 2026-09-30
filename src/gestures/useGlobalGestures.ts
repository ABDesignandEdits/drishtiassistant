import { useEffect, useRef } from 'react';
import { Haptics } from '../audio/haptics';

export interface GestureCallbacks {
  onSingleTap: () => void;
  onDoubleTap: () => void;
  onTripleTap: () => void;
  onLongPress: () => void;
  onTwoFingerTap: () => void;
  onSwipeDown: () => void;
}

export function useGlobalGestures(callbacks: GestureCallbacks) {
  const tapCountRef = useRef<number>(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hapticRampTimersRef = useRef<NodeJS.Timeout[]>([]);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);

  // Clear all pending timers
  const clearLongPressTimers = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    hapticRampTimersRef.current.forEach((t) => clearTimeout(t));
    hapticRampTimersRef.current = [];
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // 1. Two-finger tap detection
      if (e.touches.length === 2) {
        clearLongPressTimers();
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        tapCountRef.current = 0;
        Haptics.doubleTap();
        callbacks.onTwoFingerTap();
        return;
      }

      if (e.touches.length > 2) return;

      const touch = e.touches[0];
      startPosRef.current = { x: touch.clientX, y: touch.clientY };
      isLongPressTriggeredRef.current = false;

      // Setup long-press haptic ramp (1.5 seconds hold for emergency)
      clearLongPressTimers();

      // Haptic pulses during the ramp
      hapticRampTimersRef.current.push(
        setTimeout(() => Haptics.tap(), 400),
        setTimeout(() => Haptics.tap(), 800),
        setTimeout(() => Haptics.listening(), 1200)
      );

      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        clearLongPressTimers();
        Haptics.emergencyRamp();
        callbacks.onLongPress();
      }, 1500);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startPosRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startPosRef.current.x;
      const dy = touch.clientY - startPosRef.current.y;

      // If finger moves more than 20px, cancel long-press
      if (Math.hypot(dx, dy) > 20) {
        clearLongPressTimers();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      clearLongPressTimers();

      // If emergency was triggered by the 1.5s long-press, do nothing further
      if (isLongPressTriggeredRef.current) {
        isLongPressTriggeredRef.current = false;
        startPosRef.current = null;
        return;
      }

      // Check for swipe down gesture
      if (startPosRef.current && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dy = touch.clientY - startPosRef.current.y;
        const dx = touch.clientX - startPosRef.current.x;

        if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) {
          // Swipe down detected: cancel speech
          Haptics.tap();
          callbacks.onSwipeDown();
          startPosRef.current = null;
          tapCountRef.current = 0;
          if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
          return;
        }
      }

      startPosRef.current = null;

      // Disambiguate Single, Double, and Triple Taps
      const now = Date.now();
      lastTouchTimeRef.current = now;
      tapCountRef.current += 1;

      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }

      if (tapCountRef.current === 3) {
        // Triple tap -> Repeat last response
        tapCountRef.current = 0;
        Haptics.doubleTap();
        callbacks.onTripleTap();
        return;
      }

      tapTimerRef.current = setTimeout(() => {
        const count = tapCountRef.current;
        tapCountRef.current = 0;

        if (count === 1) {
          // Single tap -> Describe scene
          Haptics.tap();
          callbacks.onSingleTap();
        } else if (count === 2) {
          // Double tap -> Voice question ("Ask Drishti")
          Haptics.doubleTap();
          callbacks.onDoubleTap();
        }
      }, 300);
    };

    // Keyboard accessibility shortcuts for TalkBack / Desktop
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        Haptics.tap();
        callbacks.onSingleTap();
      } else if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'v') {
        e.preventDefault();
        Haptics.doubleTap();
        callbacks.onDoubleTap();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        callbacks.onTwoFingerTap();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        callbacks.onTripleTap();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        callbacks.onSwipeDown();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearLongPressTimers();
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [callbacks]);
}
