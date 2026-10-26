import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { userApi, type UserDetail } from '@/services/user';
import { companiesApi } from '@/services/companies';
import type { ListUser, UserRole } from '@/types/auth';
import {
  ROLE_OPTIONS,
  findSodexoCompany,
  isSodexoCompany,
  roleNeedsCompany,
} from '@/pages/Usuarios/userFormConstants';
import { useAuth } from '@/contexts/useAuth';
import { canAssignSuperAdminRole } from '@/config/permissions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatBrazilianPhone } from '@/utils/format';

type Props = {
  user: ListUser | null;
  open: boolean;
  onClose: () => void;
};

function EditUserFormBody({
  detail,
  onClose,
}: {
  detail: UserDetail;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user: authUser, refreshUser } = useAuth();
  const isRh = authUser?.role === 'RH';

  const [name, setName] = useState(detail.name);
  const [phone, setPhone] = useState(() =>
    formatBrazilianPhone(detail.phone ?? ''),
  );
  const [role, setRole] = useState<UserRole>(detail.role);
  const [requiresWorkLocation, setRequiresWorkLocation] = useState(
    Boolean(detail.requiresWorkLocation),
  );
  const [companyId, setCompanyId] = useState(detail.companyId ?? '');

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  });

  useEffect(() => {
    if (role === 'RESTAURANT') {
      const sodexo = findSodexoCompany(companies);
      if (sodexo) setCompanyId(sodexo.id);
      return;
    }
    if (role === 'REQUESTER') {
      const current = companies.find((c) => c.id === companyId);
      if (current && isSodexoCompany(current)) {
        setCompanyId('');
      }
    }
  }, [role, companies, companyId]);

  const canAssignSuper =
    authUser?.role != null && canAssignSuperAdminRole(authUser.role);

  const roleOptions = useMemo(() => {
    const base = canAssignSuper
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((opt) => opt.value !== 'SUPER_ADMIN');
    if (base.some((o) => o.value === detail.role)) return base;
    const current = ROLE_OPTIONS.find((o) => o.value === detail.role);
    return current ? [current, ...base] : base;
  }, [canAssignSuper, detail.role]);

  const updateMutation = useMutation({
    mutationFn: () =>
      userApi.updateByAdmin(detail.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        role,
        requiresWorkLocation:
          role === 'REQUESTER' ? requiresWorkLocation : false,
        companyId: roleNeedsCompany(role) ? companyId || null : null,
      }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (authUser?.id === detail.id) {
        await refreshUser();
      }
      toast.success('Usuário atualizado.');
      onClose();
    },
  });

  return (
    <>
      <div className='space-y-3 py-2'>
        <div className='space-y-1.5'>
          <Label>E-mail</Label>
          <Input value={detail.email} disabled />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='edit-name'>Nome</Label>
          <Input
            id='edit-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='edit-phone'>Celular</Label>
          <Input
            id='edit-phone'
            type='tel'
            inputMode='numeric'
            autoComplete='tel'
            value={phone}
            onChange={(e) =>
              setPhone(formatBrazilianPhone(e.target.value))
            }
            placeholder='(00) 00000-0000'
            maxLength={16}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Papel</Label>
          {detail.role === 'SUPER_ADMIN' && isRh ? (
            <Input
              value={
                ROLE_OPTIONS.find((o) => o.value === detail.role)?.label ??
                detail.role
              }
              disabled
            />
          ) : (
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
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
          )}
        </div>
        {roleNeedsCompany(role) ? (
          <div className='space-y-1.5'>
            <Label>Empresa</Label>
            {role === 'RESTAURANT' ? (
              <Input value='Sodexo' disabled className='bg-muted/40' />
            ) : (
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder='Selecione' />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter((c) => !isSodexoCompany(c))
                    .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
        {role === 'REQUESTER' ? (
          <div className='flex items-start gap-2'>
            <Checkbox
              id='edit-work-location'
              checked={requiresWorkLocation}
              onCheckedChange={(v) => setRequiresWorkLocation(Boolean(v))}
            />
            <div className='space-y-0.5'>
              <Label htmlFor='edit-work-location' className='font-normal'>
                Exigir local de trabalho nas marmitas
              </Label>
              <p className='text-xs text-muted-foreground'>
                Ao solicitar, este usuário informa onde cada pessoa está
                trabalhando.
              </p>
            </div>
          </div>
        ) : null}
      </div>
      <DialogFooter>
        <Button
          disabled={!name.trim() || updateMutation.isPending}
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            'Salvar'
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditUserModal({ user, open, onClose }: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => userApi.getById(user!.id),
    enabled: open && Boolean(user?.id),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Altere nome, celular, papel e empresa
          </DialogDescription>
        </DialogHeader>
        {isLoading || !detail ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='size-5 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <EditUserFormBody key={detail.id} detail={detail} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}
