import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
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
import { forgotPasswordEmailSchema } from '@/schemas/login';
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
  return 'Não foi possível concluir a solicitação.';
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestLink(event: React.FormEvent) {
    event.preventDefault();
    const parsed = forgotPasswordEmailSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'E-mail inválido');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(parsed.data.email);
      setStep('sent');
    } catch (error) {
      toast.error(readErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

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
                    {step === 'sent' ? 'E-mail enviado' : 'Esqueci a senha'}
                  </CardTitle>
                  <CardDescription className='text-sm text-muted-foreground'>
                    {step === 'email'
                      ? 'Informe o e-mail da sua conta para receber um link'
                      : 'Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha. Abra sua caixa de entrada.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className='px-4 pt-4 md:px-6'>
                  {step === 'email' ? (
                    <form onSubmit={(event) => void handleRequestLink(event)}>
                      <FieldGroup className='gap-3 md:gap-4'>
                        <Field>
                          <FieldLabel htmlFor='forgot-email'>E-mail</FieldLabel>
                          <Input
                            id='forgot-email'
                            type='email'
                            autoComplete='email'
                            placeholder='seu@email.com'
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                          />
                        </Field>
                        <Field>
                          <Button
                            type='submit'
                            disabled={loading || !email.trim()}
                          >
                            {loading ? 'Enviando…' : 'Enviar link'}
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
                      <div className='flex flex-col items-center gap-3 py-2 text-center'>
                        <div className='flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                          <Check className='size-7' strokeWidth={3} />
                        </div>
                        <p className='text-sm text-muted-foreground'>
                          Verifique também a pasta de spam.
                        </p>
                      </div>
                      <Field>
                        <Button asChild>
                          <Link to={ROUTES.LOGIN}>Voltar ao login</Link>
                        </Button>
                      </Field>
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
