import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Copy } from 'lucide-react';
import {
  userApi,
  type CardUnit,
  type LookupEmployeeResult,
} from '@/services/user';
import { companiesApi } from '@/services/companies';
import { ROUTES } from '@/routes/constants';
import type { UserRole } from '@/types/auth';
import {
  ROLE_OPTIONS,
  findSodexoCompany,
  roleNeedsCompany,
} from '@/pages/Usuarios/userFormConstants';
import { useAuth } from '@/contexts/useAuth';
import {
  canAssignSuperAdminRole,
  canCreateUser,
} from '@/config/permissions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CreateMode = 'card' | 'manual';

function getErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return fallback;
}

export function NewUserPage() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<CreateMode>('card');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('REQUESTER');
  const [companyId, setCompanyId] = useState<string>('');
  const [requiresWorkLocation, setRequiresWorkLocation] = useState(false);

  const [unit, setUnit] = useState<CardUnit>('PEDERTRACTOR');
  const [cardNumber, setCardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [employee, setEmployee] = useState<LookupEmployeeResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  });

  const roleOptions = useMemo(() => {
    if (authUser && canAssignSuperAdminRole(authUser.role)) return ROLE_OPTIONS;
    return ROLE_OPTIONS.filter((o) => o.value !== 'SUPER_ADMIN');
  }, [authUser]);

  useEffect(() => {
    if (
      authUser &&
      !canAssignSuperAdminRole(authUser.role) &&
      role === 'SUPER_ADMIN'
    ) {
      setRole('REQUESTER');
    }
  }, [authUser, role]);

  useEffect(() => {
    if (role === 'REQUESTER') {
      const match = companies.find((c) => c.active && c.code === unit);
      if (match) setCompanyId(match.id);
      return;
    }
    if (role === 'RESTAURANT') {
      const sodexo = findSodexoCompany(companies);
      if (sodexo) setCompanyId(sodexo.id);
    }
  }, [unit, role, companies]);

  useEffect(() => {
    if (mode !== 'card') {
      setEmployee(null);
      setLookupError(null);
      setLookingUp(false);
      return;
    }

    const trimmed = cardNumber.trim();
    setEmployee(null);
    setLookupError(null);

    if (!trimmed) {
      setLookingUp(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLookingUp(true);
      setLookupError(null);
      try {
        const result = await userApi.lookupEmployee(trimmed, unit);
        setEmployee(result);
      } catch (err: unknown) {
        setEmployee(null);
        setLookupError(
          getErrorMessage(err, 'Não foi possível buscar o colaborador.'),
        );
      } finally {
        setLookingUp(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [cardNumber, unit, mode]);

  const registerByCardMutation = useMutation({
    mutationFn: () =>
      userApi.registerByCard({
        cardNumber: (employee?.cardNumber || cardNumber).trim(),
        unit,
        role,
        email: email.trim() || null,
        phone: phone.trim() || null,
        companyId: roleNeedsCompany(role) ? companyId || null : null,
        requiresWorkLocation:
          role === 'REQUESTER' ? requiresWorkLocation : false,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTemporaryPassword(data.temporaryPassword);
      toast.success('Usuário criado.');
    },
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      userApi.register({
        name: name.trim(),
        email: email.trim(),
        role,
        companyId: roleNeedsCompany(role) ? companyId || null : null,
        requiresWorkLocation:
          role === 'REQUESTER' ? requiresWorkLocation : false,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTemporaryPassword(data.temporaryPassword);
      toast.success('Usuário criado.');
    },
  });

  if (!authUser || !canCreateUser(authUser.role)) {
    return <Navigate to={ROUTES.USUARIOS} replace />;
  }

  const needsCompany = roleNeedsCompany(role);

  async function copyTemporaryPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success('Senha temporária copiada.');
    } catch {
      toast.error('Não foi possível copiar a senha.');
    }
  }

  if (temporaryPassword) {
    return (
      <div className='mx-auto max-w-xl space-y-4'>
        <Card>
          <CardHeader>
            <CardTitle>Usuário criado</CardTitle>
            <CardDescription>
              Anote a senha temporária. O usuário precisará trocá-la no
              primeiro login.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='rounded-md border bg-muted/40 p-3'>
              <p className='text-xs text-muted-foreground'>Senha temporária</p>
              <div className='mt-1 flex items-center justify-between gap-2'>
                <code className='text-sm font-semibold tracking-wide'>
                  {temporaryPassword}
                </code>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => void copyTemporaryPassword()}
                >
                  <Copy className='mr-1 size-3.5' />
                  Copiar
                </Button>
              </div>
            </div>
            {employee ? (
              <p className='text-sm text-muted-foreground'>
                {employee.name} — cartão {employee.cardNumber} ({unit})
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              className='w-full'
              onClick={() => navigate(ROUTES.USUARIOS)}
            >
              Ir para lista de usuários
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-xl space-y-4'>
      <Button asChild variant='ghost' size='sm'>
        <Link to={ROUTES.USUARIOS}>
          <ArrowLeft className='mr-2 size-4' />
          Voltar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
          <CardDescription>
            {mode === 'card'
              ? 'Busca o colaborador na API base pelo cartão. A senha temporária é o número do cartão'
              : 'Cadastro externo com e-mail. A senha temporária será marmita123'}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='space-y-1.5'>
            <Label>Modo de criação</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as CreateMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='card'>Por cartão (automático)</SelectItem>
                <SelectItem value='manual'>Manual (e-mail)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'card' ? (
            <>
              <div className='space-y-1.5'>
                <Label>Unidade</Label>
                <Select
                  value={unit}
                  onValueChange={(v) => setUnit(v as CardUnit)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='PEDERTRACTOR'>PEDERTRACTOR</SelectItem>
                    <SelectItem value='TRACTOR'>TRACTOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='cardNumber'>Número do cartão</Label>
                <Input
                  id='cardNumber'
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder='Ex.: 5487'
                  autoComplete='off'
                />
                {lookingUp ? (
                  <p className='text-xs text-muted-foreground'>
                    Buscando colaborador…
                  </p>
                ) : null}
                {lookupError ? (
                  <p className='text-xs text-destructive'>{lookupError}</p>
                ) : null}
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='employee-name'>Nome</Label>
                <Input
                  id='employee-name'
                  value={employee?.name ?? ''}
                  readOnly
                  placeholder={
                    lookingUp
                      ? 'Buscando…'
                      : 'Preenchido automaticamente ao digitar o cartão'
                  }
                  className='bg-muted/40'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='email-optional'>E-mail (opcional)</Label>
                <Input
                  id='email-optional'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='Se vazio, usa e-mail interno do cartão'
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='phone'>Telefone (opcional)</Label>
                <Input
                  id='phone'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className='space-y-1.5'>
                <Label htmlFor='name'>Nome</Label>
                <Input
                  id='name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='email'>E-mail</Label>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                A senha temporária será <code>marmita123</code>. O usuário
                precisará trocá-la no primeiro login.
              </p>
            </>
          )}

          <div className='space-y-1.5'>
            <Label>Papel</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsCompany ? (
            <div className='space-y-1.5'>
              <Label>Empresa</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder='Selecione a empresa' />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter((c) => c.active)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {role === 'REQUESTER' ? (
            <div className='flex items-start gap-2 pt-1'>
              <Checkbox
                id='new-work-location'
                checked={requiresWorkLocation}
                onCheckedChange={(v) => setRequiresWorkLocation(Boolean(v))}
              />
              <div className='space-y-0.5'>
                <Label htmlFor='new-work-location' className='font-normal'>
                  Exigir local de trabalho nas marmitas
                </Label>
                <p className='text-xs text-muted-foreground'>
                  Ao solicitar, este usuário informa onde cada pessoa está
                  trabalhando.
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          {mode === 'card' ? (
            <Button
              className='w-full'
              disabled={
                !employee ||
                (needsCompany && !companyId) ||
                registerByCardMutation.isPending
              }
              onClick={() => registerByCardMutation.mutate()}
            >
              {registerByCardMutation.isPending
                ? 'Salvando…'
                : 'Criar usuário'}
            </Button>
          ) : (
            <Button
              className='w-full'
              disabled={
                !name.trim() ||
                !email.trim() ||
                (needsCompany && !companyId) ||
                registerMutation.isPending
              }
              onClick={() => registerMutation.mutate()}
            >
              {registerMutation.isPending ? 'Salvando…' : 'Criar usuário'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
