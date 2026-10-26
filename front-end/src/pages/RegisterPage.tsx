import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { MarmitaSoupIcon } from '@/components/marmita-soup-icon';
import { AuthAttribution } from '@/components/auth-attribution';
import { AuthFoodRainBackground } from '@/components/auth-food-rain';
import { AvatarPicker } from '@/components/avatar-picker';
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
import { CardContent } from '@/components/ui/card';
import {
  Field,
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterStep = 'intro' | 'form';

type FieldErrorKey =
  | 'avatar'
  | 'cardNumber'
  | 'companyName'
  | 'name'
  | 'email'
  | 'phone'
  | 'password'
  | 'confirmPassword';

type FieldErrors = Partial<Record<FieldErrorKey, string>>;

export function RegisterPage() {
  const [step, setStep] = useState<RegisterStep>('intro');
  const [companyKind, setCompanyKind] = useState<CompanyKind>('OTHER');
  const [companyPickerOpen, setCompanyPickerOpen] = useState(true);
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isInternal = isInternalCompanyKind(companyKind);

  function clearFieldError(key: FieldErrorKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleCompanySelect(value: CompanyKind) {
    if (!companyPickerOpen) {
      setCompanyPickerOpen(true);
      return;
    }
    setCompanyKind(value);
    setCompanyPickerOpen(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.cardNumber;
      delete next.companyName;
      delete next.name;
      return next;
    });
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};

    if (!avatar) {
      errors.avatar = 'Adicione sua foto';
    }

    if (isInternal) {
      const trimmedCard = cardNumber.trim();
      if (!trimmedCard) {
        errors.cardNumber = 'Informe o cartão';
      } else if (validating) {
        errors.cardNumber = 'Aguarde a validação';
      } else if (validateError) {
        errors.cardNumber = validateError;
      } else if (!employee) {
        errors.cardNumber = 'Valide o número do cartão';
      }
    } else {
      if (!companyName.trim()) {
        errors.companyName = 'Informe o nome da empresa';
      }
      if (!name.trim()) {
        errors.name = 'Informe o nome';
      }
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      errors.email = 'Informe o e-mail';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'E-mail inválido';
    } else if (emailBlockMessage) {
      errors.email = emailBlockMessage;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) {
      errors.phone = 'Informe o celular';
    } else if (phoneDigits.length < 10) {
      errors.phone = 'Celular incompleto';
    }

    if (!password) {
      errors.password = 'Informe a senha';
    } else if (password.length < 8) {
      errors.password = 'Senha deve ter no mínimo 8 caracteres';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirme a senha';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }

    return errors;
  }

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
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
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
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const trimmedEmail = email.trim().toLowerCase();

    setSubmitting(true);
    try {
      await registrationRequestsApi.create({
        phone: phone.trim(),
        password,
        companyKind,
        email: trimmedEmail,
        avatar: avatar!,
        ...(isInternal
          ? {
              cardNumber: cardNumber.trim(),
              name: employee?.name,
            }
          : {
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
    <div className='relative flex h-svh flex-col overflow-hidden md:p-6'>
      <AuthFoodRainBackground />
      <div className='relative z-10 mx-auto flex h-full w-full max-w-sm min-h-0 flex-col gap-4'>
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
            'flex min-h-0 flex-1 flex-col overflow-hidden isolate',
            'bg-background/95 backdrop-blur-[2px]',
            'md:rounded-2xl md:bg-card md:shadow-card md:backdrop-blur-none',
          )}
        >
          <div
            className={cn(
              'min-h-0 flex-1 overscroll-contain',
              step === 'intro'
                ? 'flex flex-col overflow-hidden'
                : 'overflow-y-auto py-6',
            )}
          >
            <AnimatePresence mode='wait' initial={false}>
              {step === 'intro' ? (
                <motion.div
                  key='intro'
                  className='flex h-full min-h-0 flex-1 flex-col justify-between gap-4 px-4 py-6 md:px-6'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <div className='shrink-0 space-y-1.5 text-center'>
                    <h1 className='text-xl font-semibold tracking-tight text-foreground'>
                      Antes de começar
                    </h1>
                    <p className='text-sm leading-relaxed text-muted-foreground'>
                      Entenda como funciona o cadastro no Marmita
                    </p>
                  </div>

                  <img
                    src='/tigela_logo.png'
                    alt=''
                    aria-hidden
                    draggable={false}
                    className='mx-auto h-[min(7.5rem,18svh)] w-auto shrink-0 object-contain'
                  />

                  <ol className='w-full shrink-0 space-y-3.5 text-sm leading-relaxed text-muted-foreground'>
                    <li className='flex gap-3'>
                      <span
                        className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'
                        aria-hidden
                      >
                        1
                      </span>
                      <p className='text-left'>
                        O{' '}
                        <span className='font-medium text-foreground'>
                          Marmita
                        </span>{' '}
                        é mantido pela{' '}
                        <span className='font-medium text-foreground'>
                          Pedertractor &amp; Tractorcomponents
                        </span>
                        .
                      </p>
                    </li>
                    <li className='flex gap-3'>
                      <span
                        className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'
                        aria-hidden
                      >
                        2
                      </span>
                      <p className='text-left'>
                        Ao se cadastrar, o{' '}
                        <span className='font-medium text-foreground'>
                          Recursos Humanos
                        </span>{' '}
                        avaliará sua solicitação.
                      </p>
                    </li>
                    <li className='flex gap-3'>
                      <span
                        className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'
                        aria-hidden
                      >
                        3
                      </span>
                      <p className='text-left'>
                        Após a aprovação, você receberá um{' '}
                        <span className='whitespace-nowrap font-medium text-foreground'>
                          e-mail
                        </span>{' '}
                        confirmando a criação do seu usuário.
                      </p>
                    </li>
                  </ol>

                  <div className='grid w-full shrink-0 grid-cols-2 gap-3'>
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      asChild
                    >
                      <Link to={ROUTES.LOGIN}>Voltar</Link>
                    </Button>
                    <Button
                      type='button'
                      className='w-full'
                      onClick={() => setStep('form')}
                    >
                      Prosseguir
                    </Button>
                  </div>

                  <div className='shrink-0 md:hidden'>
                    <AuthAttribution />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key='form'
                  className='flex flex-col gap-4 pb-2'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {!submitted ? (
                    <div className='relative flex items-center justify-center px-4 md:px-6'>
                      <Link
                        to='/'
                        className='absolute left-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:hidden'
                        aria-label='Marmita'
                      >
                        <MarmitaSoupIcon size={20} />
                      </Link>
                      <h1 className='text-xl font-semibold tracking-tight text-foreground'>
                        Cadastro
                      </h1>
                    </div>
                  ) : null}

                  <CardContent className='px-4 pt-6 md:px-6 md:pt-8'>
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
                              Recursos Humanos
                            </span>{' '}
                            vai avaliar suas informações em breve.
                          </p>
                          <p>
                            Quando for aprovado, você receberá um e-mail com a
                            confirmação do seu usuário e poderá acessar o
                            sistema.
                          </p>
                        </div>
                        <Button asChild className='mt-8 w-full max-w-sm'>
                          <Link to={ROUTES.LOGIN}>Voltar ao login</Link>
                        </Button>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit} noValidate>
                        <FieldGroup className='gap-5 md:gap-7'>
                          <AvatarPicker
                            value={avatar}
                            onChange={(dataUrl) => {
                              setAvatar(dataUrl);
                              clearFieldError('avatar');
                            }}
                            name={name || employee?.name || ''}
                            required
                            error={fieldErrors.avatar}
                          />

                          <Field>
                            <FieldLabel>Empresa</FieldLabel>
                            <div
                              className={cn(
                                'grid gap-1.5',
                                companyPickerOpen
                                  ? 'grid-cols-3'
                                  : 'grid-cols-1',
                              )}
                            >
                              <AnimatePresence
                                initial={false}
                                mode='popLayout'
                              >
                                {COMPANY_KIND_OPTIONS.filter(
                                  (opt) =>
                                    companyPickerOpen ||
                                    opt.value === companyKind,
                                ).map((opt) => {
                                  const selected = companyKind === opt.value;
                                  return (
                                    <motion.div
                                      key={opt.value}
                                      layout
                                      initial={{ opacity: 0, scale: 0.96 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.96 }}
                                      transition={{
                                        duration: 0.2,
                                        ease: 'easeOut',
                                      }}
                                      className='min-w-0'
                                    >
                                      <Button
                                        type='button'
                                        variant={
                                          selected ? 'default' : 'outline'
                                        }
                                        aria-expanded={companyPickerOpen}
                                        className={cn(
                                          'h-10 w-full min-w-0 px-1.5 text-xs font-medium sm:px-3 sm:text-sm',
                                          selected &&
                                            'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                                        )}
                                        onClick={() =>
                                          handleCompanySelect(opt.value)
                                        }
                                      >
                                        <span className='truncate'>
                                          {opt.label}
                                        </span>
                                      </Button>
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
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
                                      <FieldLabel htmlFor='cardNumber'>
                                        Cartão
                                      </FieldLabel>
                                      <Input
                                        id='cardNumber'
                                        value={cardNumber}
                                        onChange={(e) => {
                                          setCardNumber(e.target.value);
                                          clearFieldError('cardNumber');
                                        }}
                                        placeholder='Nº'
                                        inputMode='numeric'
                                        required
                                        aria-invalid={Boolean(
                                          fieldErrors.cardNumber,
                                        )}
                                        className={cn(
                                          employee &&
                                            !fieldErrors.cardNumber &&
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
                                          disabled
                                          tabIndex={-1}
                                          value={employee?.name ?? ''}
                                          placeholder='Após validar o cartão'
                                          className={cn(
                                            'cursor-not-allowed bg-muted pr-9 text-muted-foreground disabled:opacity-100 dark:bg-muted/50',
                                            employee &&
                                              'border-primary/40 text-foreground',
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
                                  {fieldErrors.cardNumber || validateError ? (
                                    <p className='text-sm text-destructive'>
                                      {fieldErrors.cardNumber ?? validateError}{' '}
                                      {(
                                        fieldErrors.cardNumber ?? validateError
                                      )?.includes('login') ? (
                                        <Link
                                          to={ROUTES.LOGIN}
                                          className='underline'
                                        >
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
                                    onChange={(e) => {
                                      setCompanyName(e.target.value);
                                      clearFieldError('companyName');
                                    }}
                                    required
                                    aria-invalid={Boolean(
                                      fieldErrors.companyName,
                                    )}
                                  />
                                  {fieldErrors.companyName ? (
                                    <p className='text-sm text-destructive'>
                                      {fieldErrors.companyName}
                                    </p>
                                  ) : null}
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor='name'>Nome</FieldLabel>
                                  <Input
                                    id='name'
                                    value={name}
                                    onChange={(e) => {
                                      setName(e.target.value);
                                      clearFieldError('name');
                                    }}
                                    required
                                    aria-invalid={Boolean(fieldErrors.name)}
                                  />
                                  {fieldErrors.name ? (
                                    <p className='text-sm text-destructive'>
                                      {fieldErrors.name}
                                    </p>
                                  ) : null}
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
                              onChange={(e) => {
                                setEmail(e.target.value);
                                clearFieldError('email');
                              }}
                              aria-invalid={Boolean(
                                fieldErrors.email || emailBlockMessage,
                              )}
                              required
                              placeholder='seu@email.com'
                            />
                            {fieldErrors.email || emailBlockMessage ? (
                              <p className='text-sm text-destructive'>
                                {fieldErrors.email ?? emailBlockMessage}{' '}
                                {emailBlockMessage ||
                                fieldErrors.email
                                  ?.toLowerCase()
                                  .includes('login') ? (
                                  <Link to={ROUTES.LOGIN} className='underline'>
                                    Ir para o login
                                  </Link>
                                ) : null}
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
                              onChange={(e) => {
                                setPhone(formatBrazilianPhone(e.target.value));
                                clearFieldError('phone');
                              }}
                              placeholder='(00) 00000-0000'
                              maxLength={16}
                              required
                              aria-invalid={Boolean(fieldErrors.phone)}
                            />
                            {fieldErrors.phone ? (
                              <p className='text-sm text-destructive'>
                                {fieldErrors.phone}
                              </p>
                            ) : null}
                          </Field>
                          <Field>
                            <FieldLabel htmlFor='password'>Senha</FieldLabel>
                            <div className='relative'>
                              <Input
                                id='password'
                                type={showPassword ? 'text' : 'password'}
                                autoComplete='new-password'
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  clearFieldError('password');
                                }}
                                className='hide-native-password-reveal pr-9'
                                required
                                minLength={6}
                                aria-invalid={Boolean(fieldErrors.password)}
                              />
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon-sm'
                                className='absolute inset-y-0 right-0 h-full'
                                onClick={() => setShowPassword((p) => !p)}
                                aria-label={
                                  showPassword
                                    ? 'Ocultar senha'
                                    : 'Mostrar senha'
                                }
                              >
                                {showPassword ? <EyeOff /> : <Eye />}
                              </Button>
                            </div>
                            {fieldErrors.password ? (
                              <p className='text-sm text-destructive'>
                                {fieldErrors.password}
                              </p>
                            ) : null}
                          </Field>
                          <Field>
                            <Label htmlFor='confirmPassword'>
                              Confirmar senha
                            </Label>
                            <Input
                              id='confirmPassword'
                              type={showPassword ? 'text' : 'password'}
                              autoComplete='new-password'
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                clearFieldError('confirmPassword');
                              }}
                              className='hide-native-password-reveal'
                              required
                              minLength={6}
                              aria-invalid={Boolean(
                                fieldErrors.confirmPassword,
                              )}
                            />
                            {fieldErrors.confirmPassword ? (
                              <p className='text-sm text-destructive'>
                                {fieldErrors.confirmPassword}
                              </p>
                            ) : null}
                          </Field>
                          <Field>
                            <div className='grid grid-cols-2 gap-2'>
                              <Button
                                type='button'
                                variant='outline'
                                onClick={() => setStep('intro')}
                              >
                                Voltar
                              </Button>
                              <Button type='submit' disabled={submitting}>
                                {submitting
                                  ? 'Enviando…'
                                  : 'Enviar solicitação'}
                              </Button>
                            </div>
                          </Field>
                        </FieldGroup>
                      </form>
                    )}
                  </CardContent>

                  <div className='px-4 md:hidden'>
                    <AuthAttribution />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className='hidden shrink-0 md:block'>
          <AuthAttribution />
        </div>
      </div>
    </div>
  );
}
