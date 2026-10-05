import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Eye, EyeOff } from 'lucide-react';
import { AuthAttribution } from '@/components/auth-attribution';
import { AuthFoodRainBackground } from '@/components/auth-food-rain';
import { MarmitaSoupIcon } from '@/components/marmita-soup-icon';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/constants';
import { resetPasswordFormSchema } from '@/schemas/login';
import { authApi } from '@/services/auth';

function readErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Não foi possível redefinir a senha.';
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get('token')?.trim() ?? '',
    [searchParams],
  );
  const [accountName, setAccountName] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(Boolean(token));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreviewLoading(false);
      setPreviewError('Este link é inválido ou está incompleto');
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);

    void authApi
      .previewPasswordReset(token)
      .then((result) => {
        if (cancelled) return;
        setAccountName(result.name);
        setMaskedEmail(result.maskedEmail);
      })
      .catch((error) => {
        if (cancelled) return;
        setPreviewError(readErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error('Link inválido ou incompleto.');
      return;
    }

    const parsed = resetPasswordFormSchema.safeParse({
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Verifique os dados.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPasswordWithToken({
        token,
        newPassword: parsed.data.newPassword,
      });
      setDone(true);
    } catch (error) {
      toast.error(readErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const canShowForm = Boolean(
    !done && token && accountName && maskedEmail && !previewError,
  );

  return (
    <div className='relative flex h-svh flex-col overflow-hidden md:p-4'>
      <AuthFoodRainBackground />
      <div className='relative z-10 mx-auto flex h-full w-full max-w-sm flex-col justify-evenly gap-2 py-2 md:justify-center md:gap-3 md:py-0'>
        <a
          href='/'
          className='hidden shrink-0 items-center gap-2 self-center text-base font-semibold tracking-tight text-foreground md:flex md:gap-2.5 md:text-lg'
        >
          <div className='flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <MarmitaSoupIcon size={20} />
          </div>
          Marmita
        </a>

        <div
          className={cn(
            'flex min-h-0 shrink flex-col isolate',
            'bg-background/95 backdrop-blur-[2px]',
            'md:rounded-2xl md:bg-card md:shadow-card md:backdrop-blur-none',
          )}
        >
          <div className='py-4 md:py-5'>
            <div className='flex flex-col gap-2'>
              <a
                href='/'
                className='flex shrink-0 items-center gap-2 self-center text-base font-semibold tracking-tight text-foreground md:hidden'
              >
                <div className='flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                  <MarmitaSoupIcon size={20} />
                </div>
                Marmita
              </a>

              <div className='flex flex-col'>
                <CardHeader className='px-4 py-0 text-center md:px-6'>
                  <CardTitle className='text-xl font-semibold tracking-tight text-foreground'>
                    {done ? 'Senha redefinida' : 'Nova senha'}
                  </CardTitle>
                  <CardDescription className='text-sm text-muted-foreground'>
                    {done
                      ? 'Tudo certo. Você já pode entrar com a nova senha.'
                      : previewLoading
                        ? 'Carregando…'
                        : canShowForm
                          ? 'Defina uma nova senha para esta conta'
                          : (previewError ??
                            'Este link é inválido ou está incompleto')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='px-4 pt-4 md:px-6'>
                  {done ? (
                    <FieldGroup className='gap-3 md:gap-4'>
                      <div className='flex flex-col items-center gap-3 py-2 text-center'>
                        <div className='flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                          <Check className='size-7' strokeWidth={3} />
                        </div>
                        {accountName ? (
                          <div>
                            <p className='text-sm font-medium text-foreground'>
                              {accountName}
                            </p>
                            {maskedEmail ? (
                              <p className='text-xs text-muted-foreground'>
                                {maskedEmail}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <p className='text-sm text-muted-foreground'>
                          Sua senha foi atualizada com sucesso.
                        </p>
                      </div>
                      <Field>
                        <Button asChild>
                          <Link to={ROUTES.LOGIN}>Ir para o login</Link>
                        </Button>
                      </Field>
                    </FieldGroup>
                  ) : previewLoading ? (
                    <p className='text-center text-sm text-muted-foreground'>
                      Validando link…
                    </p>
                  ) : canShowForm ? (
                    <form onSubmit={(event) => void handleReset(event)}>
                      <FieldGroup className='gap-3 md:gap-4'>
                        <div className='rounded-2xl bg-muted/50 px-4 py-3 text-center'>
                          <p className='text-sm font-medium text-foreground'>
                            {accountName}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {maskedEmail}
                          </p>
                        </div>
                        <Field>
                          <FieldLabel htmlFor='reset-password'>
                            Nova senha
                          </FieldLabel>
                          <div className='relative'>
                            <Input
                              id='reset-password'
                              type={showPassword ? 'text' : 'password'}
                              autoComplete='new-password'
                              placeholder='••••••••'
                              value={newPassword}
                              onChange={(event) =>
                                setNewPassword(event.target.value)
                              }
                              className='hide-native-password-reveal pr-9'
                              required
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon-sm'
                              className='absolute inset-y-0 right-0 h-full'
                              onClick={() => setShowPassword((p) => !p)}
                              aria-label={
                                showPassword ? 'Ocultar senha' : 'Mostrar senha'
                              }
                            >
                              {showPassword ? <EyeOff /> : <Eye />}
                            </Button>
                          </div>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor='reset-confirm'>
                            Confirmar senha
                          </FieldLabel>
                          <Input
                            id='reset-confirm'
                            type={showPassword ? 'text' : 'password'}
                            autoComplete='new-password'
                            placeholder='••••••••'
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                            className='hide-native-password-reveal'
                            required
                          />
                        </Field>
                        <Field>
                          <Button
                            type='submit'
                            disabled={
                              loading ||
                              newPassword.length < 6 ||
                              !confirmPassword
                            }
                          >
                            {loading ? 'Salvando…' : 'Redefinir senha'}
                          </Button>
                        </Field>
                        <FieldDescription className='text-center'>
                          <Link to={ROUTES.LOGIN} className='underline'>
                            Voltar ao login
                          </Link>
                        </FieldDescription>
                      </FieldGroup>
                    </form>
                  ) : (
                    <FieldGroup className='gap-3 md:gap-4'>
                      <Field>
                        <Button asChild>
                          <Link to={ROUTES.FORGOT_PASSWORD}>
                            Solicitar novo link
                          </Link>
                        </Button>
                      </Field>
                      <FieldDescription className='text-center'>
                        <Link to={ROUTES.LOGIN} className='underline'>
                          Voltar ao login
                        </Link>
                      </FieldDescription>
                    </FieldGroup>
                  )}
                </CardContent>
              </div>

              <div className='px-4 md:hidden'>
                <AuthAttribution />
              </div>
            </div>
          </div>
        </div>

        <div className='hidden shrink-0 md:block'>
          <AuthAttribution />
        </div>
      </div>
    </div>
  );
}
