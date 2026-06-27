/**
 * PinPage — 6-digit PIN entry with numpad.
 * Handles: verification, first-time setup, lock state.
 */
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Delete, Loader2, ShieldCheck } from 'lucide-react';

import { usePin } from '@/hooks/usePin';
import { verifyPin, setPin as setPinApi, hasPinSet, checkDeviceRemembered } from '@/lib/pin';
import { cn } from '@/lib/utils';

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;

export default function PinPage() {
  const { t } = useTranslation();
  const { unlock, needsSetup, setNeedsSetup } = usePin();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_ATTEMPTS);

  // Check if PIN is set + device remembered
  useEffect(() => {
    async function check() {
      const remembered = await checkDeviceRemembered();
      if (remembered) {
        unlock();
        return;
      }
      const hasPin = await hasPinSet();
      setNeedsSetup(!hasPin);
      setIsLoading(false);
    }
    check();
  }, [unlock, setNeedsSetup]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLocked || isVerifying) return;
      setError(null);

      if (needsSetup) {
        if (isConfirming) {
          const next = confirmPin + digit;
          setConfirmPin(next);
          if (next.length === PIN_LENGTH) {
            // Compare PINs
            if (next === pin) {
              setIsVerifying(true);
              setPinApi(next).then((result) => {
                if (result.success) {
                  unlock();
                } else {
                  setError(result.error ?? t('common.error'));
                  setPin('');
                  setConfirmPin('');
                  setIsConfirming(false);
                  setIsVerifying(false);
                }
              });
            } else {
              setError(t('pin.mismatch'));
              setPin('');
              setConfirmPin('');
              setIsConfirming(false);
            }
          }
        } else {
          const next = pin + digit;
          setPin(next);
          if (next.length === PIN_LENGTH) {
            setIsConfirming(true);
          }
        }
      } else {
        const next = pin + digit;
        setPin(next);
        if (next.length === PIN_LENGTH) {
          setIsVerifying(true);
          verifyPin(next).then((result) => {
            if (result.success) {
              unlock();
            } else if (result.locked) {
              setIsLocked(true);
              const mins = result.lockedUntil
                ? Math.ceil(
                    (new Date(result.lockedUntil).getTime() - Date.now()) /
                      60000,
                  )
                : 15;
              setError(t('pin.locked', { minutes: mins }));
            } else {
              setRemainingAttempts(result.remainingAttempts ?? MAX_ATTEMPTS - 1);
              setError(t('pin.wrong'));
              setPin('');
              setIsVerifying(false);
            }
          });
        }
      }
    },
    [pin, confirmPin, isConfirming, isLocked, isVerifying, needsSetup, unlock, setNeedsSetup, t],
  );

  const handleDelete = useCallback(() => {
    if (isVerifying) return;
    if (needsSetup && isConfirming) {
      setConfirmPin((p) => p.slice(0, -1));
    } else {
      setPin((p) => p.slice(0, -1));
    }
    setError(null);
  }, [isVerifying, needsSetup, isConfirming]);

  const currentPin = needsSetup && isConfirming ? confirmPin : pin;
  const title = needsSetup
    ? isConfirming
      ? t('pin.confirm')
      : t('pin.setup')
    : t('pin.title');
  const subtitle = needsSetup
    ? isConfirming
      ? t('pin.confirmSubtitle')
      : t('pin.setupSubtitle')
    : t('pin.subtitle');

  if (isLoading) {
    return (
      <div className="flex min-h-screen-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen-dvh flex-col items-center justify-between px-6 pb-safe-bottom pt-safe-top">
      {/* Top section: title + dots */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <ShieldCheck className="mb-4 h-12 w-12 text-primary" />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

        {/* PIN dots */}
        <div className="mt-8 flex gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all duration-200',
                i < currentPin.length
                  ? 'scale-110 border-primary bg-primary'
                  : 'border-muted-foreground/30',
              )}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Remaining attempts */}
        {!needsSetup && !isLocked && remainingAttempts < MAX_ATTEMPTS && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('pin.attemptsLeft', { count: remainingAttempts })}
          </p>
        )}
      </div>

      {/* Numpad */}
      <div className="w-full max-w-xs pb-8">
        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(
            (key) => {
              if (key === '') return <div key="empty" />;
              if (key === 'del') {
                return (
                  <button
                    key="del"
                    onClick={handleDelete}
                    disabled={isLocked}
                    className="flex h-16 items-center justify-center rounded-2xl text-muted-foreground transition-colors active:bg-muted"
                  >
                    <Delete className="h-6 w-6" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => handleDigit(key)}
                  disabled={isLocked || isVerifying}
                  className="flex h-16 items-center justify-center rounded-2xl text-2xl font-medium transition-colors active:bg-primary/10 active:text-primary"
                >
                  {key}
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
