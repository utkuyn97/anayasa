/**
 * usePin — PIN unlock context provider & hook.
 * PIN unlock state is MEMORY ONLY — never localStorage/sessionStorage (SECURITY.md).
 * Re-locks after 5 minutes in background (visibilitychange).
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

interface PinContextType {
  isUnlocked: boolean;
  needsSetup: boolean;
  setNeedsSetup: (v: boolean) => void;
  unlock: () => void;
  lock: () => void;
}

const PinContext = createContext<PinContextType | null>(null);

const BACKGROUND_LOCK_MS = 5 * 60 * 1000; // 5 minutes

export function PinProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const backgroundTimerRef = useRef<number | null>(null);
  const wentBackgroundRef = useRef<number | null>(null);

  const unlock = useCallback(() => setIsUnlocked(true), []);
  const lock = useCallback(() => setIsUnlocked(false), []);

  // Re-lock when app goes to background for > 5 minutes
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        wentBackgroundRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const went = wentBackgroundRef.current;
        if (went && Date.now() - went > BACKGROUND_LOCK_MS) {
          lock();
        }
        wentBackgroundRef.current = null;
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
      }
    };
  }, [lock]);

  return (
    <PinContext.Provider
      value={{ isUnlocked, needsSetup, setNeedsSetup, unlock, lock }}
    >
      {children}
    </PinContext.Provider>
  );
}

export function usePin() {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error('usePin must be inside PinProvider');
  return ctx;
}
