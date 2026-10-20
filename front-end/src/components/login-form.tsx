import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import {
  COMPANY_KIND_OPTIONS,
  isInternalCompanyKind,
} from '@/constants/company-kind';
import type { CompanyKind } from '@/services/registration-requests';
import { cn } from '@/lib/utils';
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
import { useAuth } from '@/contexts/useAuth';
import { homeForRole, ROUTES } from '@/routes/constants';
import {
  changePasswordFormSchema,
  loginCardSchema,
  loginEmailSchema,
} from '@/schemas/login';
import { userApi } from '@/services/user';

const loginFieldMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const { user, login, isLoading, isLoggedIn, updateUser, setLoading } =
    useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyKind, setCompanyKind] = useState<CompanyKind>('OTHER');
  const [companyPickerOpen, setCompanyPickerOpen] = useState(true);
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);
  const isInternal = isInternalCompanyKind(companyKind);
  const mustChangePassword = Boolean(user?.mustChangePassword);
  const canSubmitLogin = isInternal
    ? cardNumber.trim().length > 0 && password.length > 0
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length > 0;

  function handleCompanySelect(value: CompanyKind) {
    if (!companyPickerOpen) {
      setCompanyPickerOpen(true);
      return;
    }
    setCompanyKind(value);
    setCompanyPickerOpen(false);
  }

  function syncCapsLockFromEvent(e: React.KeyboardEvent) {
    setCapsLockOn(e.getModifierState('CapsLock'));
  }

  function handlePasswordBlur(
    e: React.FocusEvent<HTMLInputElement>,
    peerIds: string[],
  ) {
    const next = e.relatedTarget as HTMLElement | null;
    if (next?.id && peerIds.includes(next.id)) return;
    setCapsLockOn(false);
  }

  useEffect(() => {
    if (isLoggedIn && user && !mustChangePassword) {
      navigate(homeForRole(user.role), { replace: true });
    }
  }, [isLoggedIn, mustChangePassword, navigate, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isInternal) {
      const result = loginCardSchema.safeParse({
        cardNumber,
        unit: companyKind,
        password,
      });
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? 'Verifique os dados.');
        return;
      }
      await login({
        cardNumber: result.data.cardNumber.trim(),
        unit: result.data.unit,
        password: result.data.password,
      });
      return;
    }

    const result = loginEmailSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Verifique os dados.');
      return;
    }

    await login({
      email: result.data.email,
      password: result.data.password,
    });
  }

  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = changePasswordFormSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Verifique os dados.');
      return;
    }

    setLoading(true);
    try {
      const { user: updatedUser } = await userApi.changePasswordFirstLogin(
        result.data.newPassword,
      );
      updateUser(updatedUser);
      toast.success('Senha alterada com sucesso.');
      navigate(homeForRole(updatedUser.role), { replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {mustChangePassword ? (
        <>
          <CardHeader className='px-4 py-0 text-center md:px-6'>
            <CardTitle className='text-xl font-semibold tracking-tight text-foreground'>
              Alterar senha
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Defina uma nova senha para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className='px-4 pt-4 md:px-6'>
            <form onSubmit={handleChangePasswordSubmit}>
              <FieldGroup className='gap-3 md:gap-4'>
                <Field>
                  <FieldLabel htmlFor='newPassword'>Nova senha</FieldLabel>
                  <div className='relative'>
                    <Input
                      id='newPassword'
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      placeholder='Mínimo 8 caracteres'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={syncCapsLockFromEvent}
                      onKeyUp={syncCapsLockFromEvent}
                      onBlur={(e) =>
                        handlePasswordBlur(e, ['confirmPassword'])
                      }
                      className='hide-native-password-reveal pr-9'
                      required
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      className='absolute inset-y-0 right-0 h-full'
                      onClick={() => setShowNewPassword((p) => !p)}
                      aria-label={
                        showNewPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                    >
                      {showNewPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor='confirmPassword'>
                    Confirmar nova senha
                  </FieldLabel>
                  <div className='relative'>
                    <Input
                      id='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      placeholder='Repita a nova senha'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={syncCapsLockFromEvent}
                      onKeyUp={syncCapsLockFromEvent}
                      onBlur={(e) => handlePasswordBlur(e, ['newPassword'])}
                      className='hide-native-password-reveal pr-9'
                      required
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      className='absolute inset-y-0 right-0 h-full'
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      aria-label={
                        showConfirmPassword
                          ? 'Ocultar senha'
                          : 'Mostrar senha'
                      }
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </Field>
                {capsLockOn ? (
                  <FieldDescription>Caps Lock está ativo</FieldDescription>
                ) : null}
                <Field>
                  <Button type='submit' disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Alterar senha'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </>
      ) : (
        <>
          <CardHeader className='px-4 py-0 text-center md:px-6'>
            <CardTitle className='text-xl font-semibold tracking-tight text-foreground'>
              Bem-vindo
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {isInternal
                ? 'Entre com cartão e senha'
                : 'Entre com e-mail e senha'}
            </CardDescription>
          </CardHeader>
          <CardContent className='px-4 pt-4 md:px-6'>
            <form onSubmit={handleSubmit}>
              <FieldGroup className='gap-3 md:gap-4'>
                  <Field>
                    <FieldLabel>Empresa</FieldLabel>
                    <div
                      className={cn(
                        'grid gap-1.5',
                        companyPickerOpen ? 'grid-cols-3' : 'grid-cols-1',
                      )}
                    >
                      <AnimatePresence initial={false} mode='popLayout'>
                        {COMPANY_KIND_OPTIONS.filter(
                          (opt) =>
                            companyPickerOpen || opt.value === companyKind,
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
                                variant={selected ? 'default' : 'outline'}
                                aria-expanded={companyPickerOpen}
                                className={cn(
                                  'h-10 w-full min-w-0 px-1.5 text-xs font-medium sm:px-3 sm:text-sm',
                                  selected &&
                                    'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                                )}
                                onClick={() => handleCompanySelect(opt.value)}
                              >
                                <span className='truncate'>{opt.label}</span>
                              </Button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </Field>

                <AnimatePresence mode='wait' initial={false}>
                  {isInternal ? (
                    <motion.div key={`card-${companyKind}`} {...loginFieldMotion}>
                      <Field>
                        <FieldLabel htmlFor='loginCard'>Cartão</FieldLabel>
                        <Input
                          id='loginCard'
                          inputMode='numeric'
                          autoComplete='username'
                          placeholder='Nº do cartão'
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          required
                        />
                      </Field>
                    </motion.div>
                  ) : (
                    <motion.div key='email' {...loginFieldMotion}>
                      <Field>
                        <FieldLabel htmlFor='email'>E-mail</FieldLabel>
                        <Input
                          id='email'
                          type='email'
                          autoComplete='username'
                          placeholder='seu@email.com'
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field>
                  <FieldLabel htmlFor='password'>Senha</FieldLabel>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      placeholder='••••••••'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={syncCapsLockFromEvent}
                      onKeyUp={syncCapsLockFromEvent}
                      onBlur={() => setCapsLockOn(false)}
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
                  {capsLockOn ? (
                    <FieldDescription>Caps Lock está ativo</FieldDescription>
                  ) : null}
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className='text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
                  >
                    Esqueceu a senha?
                  </Link>
                </Field>
                <Field>
                  <Button type='submit' disabled={isLoading || !canSubmitLogin}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </Field>
                <FieldDescription className='text-center'>
                  Não tem conta?{' '}
                  <Link to={ROUTES.REGISTER} className='underline'>
                    Cadastrar
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </>
      )}
    </div>
  );
}
