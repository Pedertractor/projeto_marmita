import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { MesaSoupIcon } from '@/components/mesa-soup-icon';
import { AuthAttribution } from '@/components/auth-attribution';
import { AuthSceneAnimationProvider } from '@/components/auth-scene-animation';
import { AnimatePresence, motion } from 'motion/react';
import {
  COMPANY_KIND_OPTIONS,
  internalUnitFromKind,
  isInternalCompanyKind,
} from '@/constants/company-kind';
import {
  registrationRequestsApi,
  type CompanyKind,
  type ValidatedEmployee,
} from '@/services/registration-requests';
import { ROUTES } from '@/routes/constants';
import { formatBrazilianPhone } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
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
import { Label } from '@/components/ui/label';

const formSectionMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

export function RegisterPage() {
  const [companyKind, setCompanyKind] = useState<CompanyKind>('OTHER');
  const [cardNumber, setCardNumber] = useState('');
  const [employee, setEmployee] = useState<ValidatedEmployee | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailBlockMessage, setEmailBlockMessage] = useState<string | null>(
    null,
  );

  const isInternal = isInternalCompanyKind(companyKind);

  useEffect(() => {
    setEmployee(null);
    setValidateError(null);
    if (!isInternal) {
      setCardNumber('');
      return;
    }
    const trimmed = cardNumber.trim();
    if (!trimmed) return;

    const unit = internalUnitFromKind(companyKind);
    if (!unit) return;

    const timer = window.setTimeout(async () => {
      setValidating(true);
      setValidateError(null);
      try {
        const result = await registrationRequestsApi.validateEmployee({
          cardNumber: trimmed,
          unit,
        });
        setEmployee(result);
        setName(result.name);
      } catch (err: unknown) {
        setEmployee(null);
        setName('');
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Não foi possível validar o cartão.';
        setValidateError(message);
      } finally {
        setValidating(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [cardNumber, companyKind, isInternal]);

  useEffect(() => {
    if (isInternal) {
      setCompanyName('');
    } else {
      setName('');
      setEmployee(null);
      setValidateError(null);
    }
  }, [companyKind, isInternal]);

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailBlockMessage(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const result = await registrationRequestsApi.checkAvailability({
          email: trimmed,
        });
        setEmailBlockMessage(
          result.available
            ? null
            : result.message ?? 'Este e-mail não pode ser usado no cadastro.',
        );
      } catch {
        setEmailBlockMessage(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (isInternal && !employee) {
      toast.error('Valide o número do cartão antes de continuar.');
      return;
    }
    if (!isInternal && (!companyName.trim() || !name.trim())) {
      toast.error('Informe empresa e nome.');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && emailBlockMessage) {
      toast.error(emailBlockMessage);
      return;
    }
    if (!isInternal && !trimmedEmail) {
      toast.error('Informe o e-mail.');
      return;
    }

    setSubmitting(true);
    try {
      await registrationRequestsApi.create({
        phone: phone.trim(),
        password,
        companyKind,
        ...(isInternal
          ? {
              cardNumber: cardNumber.trim(),
              name: employee?.name,
              ...(trimmedEmail ? { email: trimmedEmail } : {}),
            }
          : {
              email: trimmedEmail,
              companyName: companyName.trim(),
              name: name.trim(),
            }),
      });
      setSubmitted(true);
    } catch {
      // toast already handled by interceptor
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSceneAnimationProvider>
    <div className='relative flex min-h-svh flex-col items-center justify-center overflow-x-hidden p-6 md:p-10'>
      <div className='relative z-10 flex w-full max-w-md flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <a
            href='/'
            className='flex items-center justify-center gap-2.5 text-lg font-semibold'
          >
            <div className='flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground'>
              <MesaSoupIcon size={20} />
            </div>
            Mesa
          </a>

          <Card>
          {!submitted ? (
            <CardHeader className='text-center'>
              <CardTitle className='text-xl'>Cadastro</CardTitle>
              <CardDescription>
                Preencha os dados abaixo. Após o envio, o time do Mesa analisa
                sua solicitação antes de liberar o acesso.
              </CardDescription>
            </CardHeader>
          ) : null}
          <CardContent>
            {submitted ? (
              <motion.div
                className='flex flex-col items-center px-2 py-8 text-center'
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div
                  className='mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5'
                  aria-hidden
                >
                  <CheckCircle2 className='size-9 text-primary' />
                </div>
                <h2 className='text-xl font-semibold tracking-tight'>
                  Solicitação enviada
                </h2>
                <div className='mt-3 max-w-sm space-y-3 text-sm leading-relaxed text-muted-foreground'>
                  <p>
                    Recebemos seu pedido de cadastro. O{' '}
                    <span className='font-medium text-foreground'>
                      time do Mesa
                    </span>{' '}
                    vai avaliar suas informações em breve.
                  </p>
                  <p>
                    Quando for aprovado, você poderá acessar o sistema com seus
                    dados de login. Por enquanto, aguarde — avisaremos assim que
                    seu acesso estiver liberado.
                  </p>
                </div>
                <Button asChild className='mt-8 w-full max-w-sm'>
                  <Link to={ROUTES.LOGIN}>Voltar ao login</Link>
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Empresa</FieldLabel>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                      {COMPANY_KIND_OPTIONS.map((opt) => {
                        const selected = companyKind === opt.value;
                        return (
                          <Button
                            key={opt.value}
                            type='button'
                            variant={selected ? 'default' : 'outline'}
                            className={cn(
                              'h-10 w-full font-medium',
                              selected &&
                                'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                            )}
                            onClick={() => setCompanyKind(opt.value)}
                          >
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  </Field>

                  <AnimatePresence mode='wait' initial={false}>
                    {isInternal ? (
                      <motion.div
                        key={`internal-${companyKind}`}
                        className='space-y-4'
                        {...formSectionMotion}
                      >
                        <Field>
                          <div className='grid grid-cols-[minmax(5.75rem,7.5rem)_1fr] items-start gap-3'>
                            <div className='space-y-2'>
                              <FieldLabel htmlFor='cardNumber'>Cartão</FieldLabel>
                              <Input
                                id='cardNumber'
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                placeholder='Nº'
                                inputMode='numeric'
                                required
                                className={cn(
                                  employee &&
                                    'border-primary ring-1 ring-primary/20',
                                )}
                              />
                            </div>
                            <div className='min-w-0 space-y-2'>
                              <FieldLabel
                                htmlFor='nameInternal'
                                className='inline-flex items-center gap-1.5'
                              >
                                Nome
                                {validating ? (
                                  <Loader2
                                    className='size-3.5 animate-spin text-muted-foreground'
                                    aria-label='Validando cartão'
                                  />
                                ) : null}
                              </FieldLabel>
                              <div className='relative'>
                                <Input
                                  id='nameInternal'
                                  readOnly
                                  disabled={Boolean(employee)}
                                  value={employee?.name ?? ''}
                                  placeholder='Após validar o cartão'
                                  className={cn(
                                    'pr-9',
                                    employee
                                      ? 'cursor-not-allowed bg-muted text-muted-foreground disabled:opacity-100 dark:bg-muted/40'
                                      : 'text-muted-foreground',
                                  )}
                                />
                                {employee ? (
                                  <CheckCircle2
                                    className='pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary'
                                    aria-hidden
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                          {validateError ? (
                            <p className='text-sm text-destructive'>
                              {validateError}{' '}
                              {validateError.includes('login') ? (
                                <Link to={ROUTES.LOGIN} className='underline'>
                                  Ir para o login
                                </Link>
                              ) : null}
                            </p>
                          ) : null}
                        </Field>
                      </motion.div>
                    ) : (
                      <motion.div
                        key='other'
                        className='space-y-4'
                        {...formSectionMotion}
                      >
                        <Field>
                          <FieldLabel htmlFor='companyName'>
                            Nome da empresa
                          </FieldLabel>
                          <Input
                            id='companyName'
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor='name'>Nome</FieldLabel>
                          <Input
                            id='name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field>
                    <FieldLabel
                      htmlFor='email'
                      className='inline-flex flex-wrap items-center gap-1.5'
                    >
                      E-mail
                      {isInternal ? (
                        <span className='font-normal text-muted-foreground'>
                          (opcional)
                        </span>
                      ) : null}
                      {checkingEmail ? (
                        <Loader2
                          className='size-3.5 animate-spin text-muted-foreground'
                          aria-label='Verificando e-mail'
                        />
                      ) : null}
                    </FieldLabel>
                    <Input
                      id='email'
                      type='email'
                      autoComplete='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={Boolean(emailBlockMessage)}
                      required={!isInternal}
                      placeholder={
                        isInternal
                          ? 'Se quiser, informe seu e-mail pessoal'
                          : undefined
                      }
                    />
                    {emailBlockMessage ? (
                      <p className='text-sm text-destructive'>
                        {emailBlockMessage}{' '}
                        <Link to={ROUTES.LOGIN} className='underline'>
                          Ir para o login
                        </Link>
                      </p>
                    ) : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='phone'>Celular</FieldLabel>
                    <Input
                      id='phone'
                      type='tel'
                      inputMode='numeric'
                      autoComplete='tel'
                      value={phone}
                      onChange={(e) =>
                        setPhone(formatBrazilianPhone(e.target.value))
                      }
                      placeholder='(00) 00000-0000'
                      maxLength={16}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='password'>Senha</FieldLabel>
                    <div className='relative'>
                      <Input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='new-password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className='hide-native-password-reveal pr-9'
                        required
                        minLength={6}
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
                    <Label htmlFor='confirmPassword'>Confirmar senha</Label>
                    <Input
                      id='confirmPassword'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className='hide-native-password-reveal'
                      required
                      minLength={6}
                    />
                  </Field>
                  <Field>
                    <Button
                      type='submit'
                      disabled={
                        submitting ||
                        (isInternal &&
                          (!employee || validating || Boolean(validateError))) ||
                        (checkingEmail || Boolean(emailBlockMessage))
                      }
                    >
                      {submitting ? 'Enviando…' : 'Enviar solicitação'}
                    </Button>
                  </Field>
                  <FieldDescription className='text-center'>
                    Já tem conta?{' '}
                    <Link to={ROUTES.LOGIN} className='underline'>
                      Entrar
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
        </div>
        <AuthAttribution />
      </div>
    </div>
    </AuthSceneAnimationProvider>
  );
}
