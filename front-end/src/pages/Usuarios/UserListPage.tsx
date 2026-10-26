import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { userApi } from '@/services/user';
import { ROUTES } from '@/routes/constants';
import type { ListUser, UserRole } from '@/types/auth';
import { useAuth } from '@/contexts/useAuth';
import {
  canCreateUser,
  canEditUserAsAdmin,
  canManageUserLifecycle,
  canResetUserPassword,
} from '@/config/permissions';
import { formattedRoles } from '@/utils/roles';
import { EditUserModal } from '@/pages/Usuarios/EditUserModal';
import { useClientPagination } from '@/hooks/use-client-pagination';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow, TableSection } from '@/components/ui/table-section';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { getInitials } from '@/utils/get-initials';
import { resolveAvatarUrl } from '@/utils/avatar-url';

type PendingAction =
  | { type: 'reset'; user: ListUser }
  | { type: 'toggle'; user: ListUser }
  | { type: 'delete'; user: ListUser };

export function UserListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const showNewUser = authUser?.role != null && canCreateUser(authUser.role);
  const allowAdminEdit =
    authUser?.role != null && canEditUserAsAdmin(authUser.role);
  const allowReset =
    authUser?.role != null && canResetUserPassword(authUser.role);
  const allowLifecycle =
    authUser?.role != null && canManageUserLifecycle(authUser.role);
  const isRh = authUser?.role === 'RH';

  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<ListUser | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.listAll(),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => userApi.resetPasswordByAdmin(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPending(null);
      toast.success(
        data.temporaryPassword
          ? `Senha temporária: ${data.temporaryPassword}. O usuário precisará trocá-la no próximo login.`
          : 'Senha redefinida. O usuário precisará trocá-la no próximo login.',
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (user: ListUser) =>
      userApi.updateByAdmin(user.id, { active: !user.active }),
    onSuccess: (_data, user) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPending(null);
      toast.success(
        user.active ? 'Usuário desativado.' : 'Usuário reativado.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userApi.deleteByAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPending(null);
      toast.success('Usuário apagado.');
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const { page, setPage, totalPages, pageItems } =
    useClientPagination(filtered);

  function canActOnTarget(target: ListUser): boolean {
    if (!authUser) return false;
    if (authUser.id === target.id) return false;
    if (isRh && target.role === 'SUPER_ADMIN') return false;
    return true;
  }

  function canResetTarget(target: ListUser): boolean {
    return allowReset && canActOnTarget(target);
  }

  function canLifecycleTarget(target: ListUser): boolean {
    return allowLifecycle && canActOnTarget(target);
  }

  const actionPending =
    resetMutation.isPending ||
    toggleActiveMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className='space-y-6'>
      <EditUserModal
        user={editUser}
        open={editUser !== null}
        onClose={() => setEditUser(null)}
      />

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>Usuários</h1>
          <p className='text-sm text-muted-foreground'>
            Gestão de contas e papéis
          </p>
        </div>
        {showNewUser ? (
          <Button onClick={() => navigate(ROUTES.USUARIOS_NOVO)}>
            <Plus className='mr-2 size-4' />
            Novo usuário
          </Button>
        ) : null}
      </div>

      <SearchField
        placeholder='Buscar por nome ou e-mail'
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      ) : isError ? (
        <p className='text-sm text-destructive'>Erro ao carregar usuários.</p>
      ) : (
        <TableSection
          pagination={{
            page,
            totalPages,
            onPageChange: setPage,
            summary: `${filtered.length} usuário(s)`,
          }}
        >
          <TableHeader>
            <TableRow>
              <TableHead className='w-[26%]'>Usuário</TableHead>
              <TableHead className='w-[24%]'>E-mail</TableHead>
              <TableHead className='w-[14%]'>Papel</TableHead>
              <TableHead className='w-[18%]'>Empresa</TableHead>
              <TableHead className='w-[12%]'>Status</TableHead>
              {allowAdminEdit ? (
                <TableHead className='w-10 px-1' />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableEmptyRow colSpan={allowAdminEdit ? 6 : 5}>
                Nenhum usuário encontrado.
              </TableEmptyRow>
            ) : (
              pageItems.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className='truncate'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <Avatar className='size-8 shrink-0'>
                        <AvatarImage
                          src={resolveAvatarUrl(u.avatarUrl)}
                          alt={u.name}
                        />
                        <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className='truncate font-medium' title={u.name}>
                        {u.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='truncate' title={u.email}>
                    {u.email}
                  </TableCell>
                  <TableCell className='truncate'>
                    {formattedRoles[u.role as UserRole] ?? u.role}
                  </TableCell>
                  <TableCell className='truncate'>
                    {u.company?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'secondary'}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {allowAdminEdit ? (
                    <TableCell className='px-1 text-right'>
                      <TableRowActions label='Ações do usuário'>
                        <DropdownMenuItem onClick={() => setEditUser(u)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        {canResetTarget(u) ? (
                          <DropdownMenuItem
                            onClick={() =>
                              setPending({ type: 'reset', user: u })
                            }
                          >
                            <KeyRound />
                            Resetar senha
                          </DropdownMenuItem>
                        ) : null}
                        {canLifecycleTarget(u) ? (
                          <DropdownMenuItem
                            onClick={() =>
                              setPending({ type: 'toggle', user: u })
                            }
                          >
                            {u.active ? <UserX /> : <UserCheck />}
                            {u.active ? 'Desativar' : 'Reativar'}
                          </DropdownMenuItem>
                        ) : null}
                        {canLifecycleTarget(u) ? (
                          <DropdownMenuItem
                            variant='destructive'
                            onClick={() =>
                              setPending({ type: 'delete', user: u })
                            }
                          >
                            <Trash2 />
                            Apagar
                          </DropdownMenuItem>
                        ) : null}
                      </TableRowActions>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </TableSection>
      )}

      <AlertDialog
        open={pending != null}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === 'reset'
                ? 'Resetar senha?'
                : pending?.type === 'toggle'
                  ? pending.user.active
                    ? 'Desativar usuário?'
                    : 'Reativar usuário?'
                  : pending?.type === 'delete'
                    ? 'Apagar usuário?'
                    : null}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.type === 'reset'
                ? `A senha de “${pending.user.name}” será substituída pela senha temporária padrão (número do cartão para interno ou marmita123 para externo). No próximo login, o usuário precisará definir uma nova senha.`
                : pending?.type === 'toggle'
                  ? pending.user.active
                    ? `“${pending.user.name}” perderá o acesso ao sistema enquanto estiver inativo.`
                    : `“${pending.user.name}” voltará a ter acesso ao sistema.`
                  : pending?.type === 'delete'
                    ? `“${pending.user.name}” será removido permanentemente. Só é possível apagar se não houver apontamentos. Caso contrário, desative a conta.`
                    : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending || !pending}
              onClick={() => {
                if (!pending) return;
                if (pending.type === 'reset') {
                  resetMutation.mutate(pending.user.id);
                } else if (pending.type === 'toggle') {
                  toggleActiveMutation.mutate(pending.user);
                } else {
                  deleteMutation.mutate(pending.user.id);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
