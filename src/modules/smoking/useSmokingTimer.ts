/**
 * useSmokingTimer.ts — Real-time countdown hook for smoking quit timer.
 *
 * Updates every second using setInterval.
 * Returns current duration, savings, and breakdown.
 */
import { useState, useEffect, useRef } from 'react';
import { computeDuration, computeSavings, breakdownDuration } from './smoking.helpers';

interface UseSmokingTimerResult {
  durationMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  savings: number;
}

export function useSmokingTimer(
  quitDate: string | null,
  lastRelapseAt: string | null,
  perDay: number,
  packPrice: number,
  packSize: number,
): UseSmokingTimerResult {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!quitDate) return;

    // Tick every second
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [quitDate]);

  if (!quitDate) {
    return { durationMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, savings: 0 };
  }

  // Force recalculate with current `now`
  const durationMs = computeDuration(quitDate, lastRelapseAt);
  // Adjust for the live tick
  const liveDuration = durationMs + (Date.now() - now);
  const actualDuration = Math.max(0, liveDuration > 0 ? durationMs : 0);

  const { days, hours, minutes, seconds } = breakdownDuration(actualDuration);
  const savings = computeSavings(actualDuration, perDay, packPrice, packSize);

  return { durationMs: actualDuration, days, hours, minutes, seconds, savings };
}
