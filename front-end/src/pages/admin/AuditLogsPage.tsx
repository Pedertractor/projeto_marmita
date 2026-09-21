import { useQuery } from '@tanstack/react-query';

import { auditApi } from '@/services/audit';

import { formatDateTime } from '@/utils/format';

import { useClientPagination } from '@/hooks/use-client-pagination';

import {

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow,

} from '@/components/ui/table';

import { TableEmptyRow, TableSection } from '@/components/ui/table-section';



export function AuditLogsPage() {

  const { data: logs = [], isLoading } = useQuery({

    queryKey: ['audit-logs'],

    queryFn: () => auditApi.list({ limit: 200 }),

  });



  const { page, setPage, totalPages, pageItems } = useClientPagination(logs);



  return (

    <div className='space-y-4'>

      <div>

        <h1 className='text-2xl font-semibold'>Auditoria</h1>

        <p className='text-sm text-muted-foreground'>

          Últimos eventos registrados

        </p>

      </div>



      {isLoading ? (

        <p className='text-sm text-muted-foreground'>Carregando…</p>

      ) : (

        <TableSection

          pagination={{

            page,

            totalPages,

            onPageChange: setPage,

            summary: `${logs.length} registro(s)`,

          }}

        >

          <TableHeader>

            <TableRow>

              <TableHead className='w-[22%]'>Quando</TableHead>

              <TableHead className='w-[22%]'>Ação</TableHead>

              <TableHead className='w-[28%]'>Entidade</TableHead>

              <TableHead className='w-[28%]'>Usuário</TableHead>

            </TableRow>

          </TableHeader>

          <TableBody>

            {pageItems.length === 0 ? (

              <TableEmptyRow colSpan={4}>Nenhum log encontrado.</TableEmptyRow>

            ) : (

              pageItems.map((log) => (

                <TableRow key={log.id}>

                  <TableCell className='truncate whitespace-nowrap text-sm text-muted-foreground'>

                    {formatDateTime(log.createdAt)}

                  </TableCell>

                  <TableCell className='truncate font-medium'>

                    {log.action}

                  </TableCell>

                  <TableCell className='truncate text-sm text-muted-foreground'>

                    {log.entityType}

                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ''}

                  </TableCell>

                  <TableCell className='truncate text-sm'>

                    {log.user?.name ?? log.userId ?? '—'}

                  </TableCell>

                </TableRow>

              ))

            )}

          </TableBody>

        </TableSection>

      )}

    </div>

  );

}


