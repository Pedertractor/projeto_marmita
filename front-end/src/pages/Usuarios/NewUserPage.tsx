import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { userApi } from '@/services/user';
import { companiesApi } from '@/services/companies';
import { ROUTES } from '@/routes/constants';
import type { UserRole } from '@/types/auth';
import { ROLE_OPTIONS } from '@/pages/Usuarios/userFormConstants';
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

export function NewUserPage() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('REQUESTER');
  const [companyId, setCompanyId] = useState<string>('');
  const [requiresWorkLocation, setRequiresWorkLocation] = useState(false);

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

  const registerMutation = useMutation({
    mutationFn: () =>
      userApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        companyId: role === 'REQUESTER' ? companyId || null : null,
        requiresWorkLocation:
          role === 'REQUESTER' ? requiresWorkLocation : false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado.');
      navigate(ROUTES.USUARIOS);
    },
  });

  if (!authUser || !canCreateUser(authUser.role)) {
    return <Navigate to={ROUTES.USUARIOS} replace />;
  }

  const needsCompany = role === 'REQUESTER';

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
            Cadastro com e-mail e senha inicial
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
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
          <div className='space-y-1.5'>
            <Label htmlFor='password'>Senha inicial</Label>
            <Input
              id='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
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
          {needsCompany ? (
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
          <Button
            className='w-full'
            disabled={
              !name.trim() ||
              !email.trim() ||
              password.length < 8 ||
              (needsCompany && !companyId) ||
              registerMutation.isPending
            }
            onClick={() => registerMutation.mutate()}
          >
            {registerMutation.isPending ? 'Salvando…' : 'Criar usuário'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
