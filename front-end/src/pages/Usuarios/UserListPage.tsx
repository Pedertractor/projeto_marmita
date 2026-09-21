import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';

import { Plus } from 'lucide-react';

import { userApi } from '@/services/user';

import { ROUTES } from '@/routes/constants';

import type { ListUser, UserRole } from '@/types/auth';

import { useAuth } from '@/contexts/useAuth';

import { canCreateUser, canEditUserAsAdmin } from '@/config/permissions';

import { formattedRoles } from '@/utils/roles';

import { EditUserModal } from '@/pages/Usuarios/EditUserModal';

import { useClientPagination } from '@/hooks/use-client-pagination';

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



function getInitials(name: string): string {

  return name

    .split(' ')

    .map((n) => n[0])

    .slice(0, 2)

    .join('')

    .toUpperCase();

}



export function UserListPage() {

  const navigate = useNavigate();

  const { user: authUser } = useAuth();

  const showNewUser = authUser?.role != null && canCreateUser(authUser.role);

  const allowAdminEdit =

    authUser?.role != null && canEditUserAsAdmin(authUser.role);

  const [search, setSearch] = useState('');

  const [editUser, setEditUser] = useState<ListUser | null>(null);



  const {

    data: users = [],

    isLoading,

    isError,

  } = useQuery({

    queryKey: ['users'],

    queryFn: () => userApi.listAll(),

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

                      <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>

                        {getInitials(u.name)}

                      </div>

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

                          Editar

                        </DropdownMenuItem>

                      </TableRowActions>

                    </TableCell>

                  ) : null}

                </TableRow>

              ))

            )}

          </TableBody>

        </TableSection>

      )}

    </div>

  );

}


