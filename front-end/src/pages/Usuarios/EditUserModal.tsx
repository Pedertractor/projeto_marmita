import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { userApi, type UserDetail } from '@/services/user';
import { companiesApi } from '@/services/companies';
import type { ListUser, UserRole } from '@/types/auth';
import { ROLE_OPTIONS } from '@/pages/Usuarios/userFormConstants';
import { useAuth } from '@/contexts/useAuth';
import {
  canAssignSuperAdminRole,
  canResetUserPassword,
} from '@/config/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const isSuperAdmin = authUser?.role === 'SUPER_ADMIN';
  const isRhLimited = authUser?.role === 'RH';

  const [name, setName] = useState(detail.name);
  const [phone, setPhone] = useState(() =>
    formatBrazilianPhone(detail.phone ?? ''),
  );
  const [role, setRole] = useState<UserRole>(detail.role);
  const [active, setActive] = useState(detail.active);
  const [companyId, setCompanyId] = useState(detail.companyId ?? '');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
    enabled: isSuperAdmin,
  });

  const canAssignSuper =
    authUser?.role != null && canAssignSuperAdminRole(authUser.role);
  const canResetPassword =
    authUser?.role != null &&
    canResetUserPassword(authUser.role) &&
    authUser.id !== detail.id &&
    !(isRhLimited && detail.role === 'SUPER_ADMIN');

  const roleOptions = useMemo(() => {
    const base = canAssignSuper
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((opt) => opt.value !== 'SUPER_ADMIN');
    if (base.some((o) => o.value === detail.role)) return base;
    const current = ROLE_OPTIONS.find((o) => o.value === detail.role);
    return current ? [current, ...base] : base;
  }, [canAssignSuper, detail.role]);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (isRhLimited) {
        return userApi.updateByAdmin(detail.id, {
          name: name.trim(),
          phone: phone.trim() || null,
          active,
          role,
        });
      }
      return userApi.updateByAdmin(detail.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        role,
        active,
        companyId: role === 'REQUESTER' ? companyId || null : null,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (authUser?.id === detail.id) {
        await refreshUser();
      }
      toast.success('Usuário atualizado.');
      onClose();
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => userApi.resetPasswordByAdmin(detail.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTempPassword(data.temporaryPassword ?? null);
      toast.success('Senha redefinida.');
      setResetConfirmOpen(false);
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
          {detail.role === 'SUPER_ADMIN' && isRhLimited ? (
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
        {isSuperAdmin && role === 'REQUESTER' ? (
          <div className='space-y-1.5'>
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder='Selecione' />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className='flex items-center gap-2'>
          <Checkbox
            id='edit-active'
            checked={active}
            onCheckedChange={(v) => setActive(Boolean(v))}
          />
          <Label htmlFor='edit-active'>Ativo</Label>
        </div>
        {tempPassword ? (
          <p className='rounded-md bg-muted p-2 text-sm'>
            Senha temporária: <strong>{tempPassword}</strong>
          </p>
        ) : null}
      </div>
      <DialogFooter className='gap-2 sm:gap-0'>
        {canResetPassword ? (
          <Button
            type='button'
            variant='outline'
            onClick={() => setResetConfirmOpen(true)}
          >
            Resetar senha
          </Button>
        ) : null}
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

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
            <AlertDialogDescription>
              A senha será substituída por uma senha temporária aleatória. No
              próximo login, o usuário precisará definir uma nova senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function EditUserModal({ user, open, onClose }: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => userApi.getById(user!.id),
    enabled: open && Boolean(user?.id),
  });
  const { user: authUser } = useAuth();
  const isRh = authUser?.role === 'RH';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            {isRh
              ? 'Altere nome, celular, papel e status'
              : 'Altere nome, celular, papel, empresa e status'}
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
