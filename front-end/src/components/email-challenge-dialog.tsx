import { useCallback, useEffect, useRef, useState } from 'react';
import { authApi } from '@/services/auth';
import { useAuth } from '@/contexts/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function readErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Não foi possível concluir a verificação.';
}

export function EmailChallengeDialog() {
  const { user, updateUser } = useAuth();
  const open = Boolean(user?.needsEmailChallenge);
  const hasRealEmail = Boolean(user?.hasRealEmail);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const autoSentRef = useRef(false);
  const verifyingRef = useRef(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const requestCode = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      const result = await authApi.sendEmailChallenge();
      setCodeSent(true);
      setRetryAfter(result.retryAfterSeconds);
    } catch (sendError) {
      autoSentRef.current = false;
      setError(readErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      autoSentRef.current = false;
      setCode('');
      setError(null);
      setRetryAfter(0);
      setCodeSent(false);
      setSending(false);
    }
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !hasRealEmail) return;
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    void requestCode();
  }, [open, hasRealEmail, user?.id, requestCode]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfter((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter]);

  async function handleSaveEmail(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Informe um e-mail válido');
      return;
    }
    setSavingEmail(true);
    setError(null);
    try {
      const result = await authApi.updateMyEmail(trimmed);
      updateUser(result.user);
      setEmail('');
    } catch (saveError) {
      setError(readErrorMessage(saveError));
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleVerify(nextCode = code) {
    if (nextCode.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setError(null);
    try {
      const result = await authApi.verifyEmailChallenge(nextCode);
      setCode('');
      updateUser(result.user);
    } catch (verifyError) {
      setCode('');
      setError(readErrorMessage(verifyError));
      inputsRef.current[0]?.focus();
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }

  function commitCode(nextRaw: string, focusIndex: number) {
    const next = nextRaw.replace(/\D/g, '').slice(0, 6);
    setCode(next);
    inputsRef.current[Math.min(focusIndex, 5)]?.focus();
    if (next.length === 6) {
      void handleVerify(next);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) {
      setCode(code.slice(0, index) + code.slice(index + 1));
      return;
    }
    commitCode(
      code.slice(0, index) + digitsOnly + code.slice(index + 1),
      index + digitsOnly.length,
    );
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    commitCode(pasted, pasted.replace(/\D/g, '').length);
  }

  const digits = Array.from({ length: 6 }, (_, index) => code[index] ?? '');

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {hasRealEmail ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirme que é você</DialogTitle>
              <DialogDescription>
                {sending && !codeSent
                  ? 'Enviando código para '
                  : 'Enviamos um código de 6 dígitos para '}
                <span className='font-medium text-foreground'>
                  {user?.maskedEmail}
                </span>
                {sending && !codeSent
                  ? '…'
                  : '. Abra seu e-mail e informe o código para continuar.'}
              </DialogDescription>
            </DialogHeader>
            <div className='flex justify-center gap-2'>
              {digits.map((digit, index) => (
                <Input
                  key={index}
                  ref={(node) => {
                    inputsRef.current[index] = node;
                  }}
                  inputMode='numeric'
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={index === 0 ? 6 : 1}
                  value={digit}
                  disabled={verifying}
                  aria-label={`Dígito ${index + 1}`}
                  className='h-12 w-11 px-0 text-center text-lg font-semibold'
                  onChange={(event) =>
                    handleDigitChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
            {error ? (
              <p className='text-sm text-destructive'>{error}</p>
            ) : (
              <p className='text-sm text-muted-foreground'>
                O código expira em 10 minutos.
              </p>
            )}
            <DialogFooter className='sm:justify-between'>
              <Button
                type='button'
                variant='outline'
                disabled={sending || retryAfter > 0}
                onClick={() => void requestCode()}
              >
                {retryAfter > 0
                  ? `Reenviar em ${retryAfter}s`
                  : sending
                    ? 'Enviando…'
                    : 'Reenviar código'}
              </Button>
              <Button
                type='button'
                disabled={code.length !== 6 || verifying}
                onClick={() => void handleVerify()}
              >
                {verifying ? 'Confirmando…' : 'Confirmar código'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={(event) => void handleSaveEmail(event)}>
            <DialogHeader>
              <DialogTitle>Cadastre seu e-mail</DialogTitle>
              <DialogDescription>
                Para continuar solicitando marmitas, informe um e-mail que só
                você acessa. Vamos enviar um código de confirmação.
              </DialogDescription>
            </DialogHeader>
            <div className='mt-4 space-y-2'>
              <Label htmlFor='challenge-email'>E-mail</Label>
              <Input
                id='challenge-email'
                type='email'
                autoComplete='email'
                value={email}
                placeholder='seu@email.com'
                onChange={(event) => setEmail(event.target.value)}
              />
              {error ? (
                <p className='text-sm text-destructive'>{error}</p>
              ) : null}
            </div>
            <DialogFooter className='mt-4'>
              <Button type='submit' disabled={savingEmail || !email.trim()}>
                {savingEmail ? 'Salvando…' : 'Enviar código'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
