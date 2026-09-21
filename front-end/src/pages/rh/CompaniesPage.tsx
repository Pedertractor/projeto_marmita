import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { companiesApi } from '@/services/companies';
import { reportsApi } from '@/services/reports';
import { useAuth } from '@/contexts/useAuth';
import { canToggleCompanyActive } from '@/config/permissions';
import {
  formatCurrency,
  parseISODateLocal,
  todayISODate,
  toISODate,
} from '@/utils/format';
import { mergeCompaniesWithReport } from '@/pages/rh/merge-companies-with-report';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useClientPagination } from '@/hooks/use-client-pagination';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow, TableSection } from '@/components/ui/table-section';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import type { Company } from '@/types/domain';

export function CompaniesPage() {
  const { user } = useAuth();
  const canToggle =
    user?.role != null && canToggleCompanyActive(user.role);
  const queryClient = useQueryClient();

  const today = todayISODate();
  const [fromDate, setFromDate] = useState(today.slice(0, 8) + '01');
  const [toDate, setToDate] = useState(today);
  const [pendingToggle, setPendingToggle] = useState<Company | null>(null);

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report-by-company', fromDate, toDate],
    queryFn: () => reportsApi.byCompany({ fromDate, toDate }),
  });

  const rows = useMemo(
    () => mergeCompaniesWithReport(companies, report?.companies ?? []),
    [companies, report?.companies],
  );

  const { page, setPage, totalPages, pageItems } = useClientPagination(rows);

  const isLoading = companiesLoading || reportLoading;

  const toggleActiveMutation = useMutation({
    mutationFn: (company: Company) =>
      companiesApi.update(company.id, { active: !company.active }),
    onSuccess: (_data, company) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(
        company.active ? 'Empresa desativada.' : 'Empresa reativada.',
      );
      setPendingToggle(null);
    },
  });

  function requestToggle(company: Company) {
    if (company.active) {
      setPendingToggle(company);
      return;
    }
    toggleActiveMutation.mutate(company);
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='font-semibold tracking-tight'>Empresas</h1>
        <p className='mt-1.5 text-sm text-muted-foreground'>
          Empresas criadas no cadastro — acompanhe gastos e status
        </p>
        <div className='mt-3 flex flex-wrap items-end gap-x-4 gap-y-3'>
          <div className='grid gap-1.5'>
            <Label htmlFor='companies-from'>De</Label>
            <DatePicker
              id='companies-from'
              value={parseISODateLocal(fromDate)}
              onChange={(date) => {
                if (!date) return;
                const iso = toISODate(date);
                setFromDate(iso);
                if (iso > toDate) setToDate(iso);
                setPage(1);
              }}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='companies-to'>Até</Label>
            <DatePicker
              id='companies-to'
              value={parseISODateLocal(toDate)}
              onChange={(date) => {
                if (!date) return;
                const iso = toISODate(date);
                setToDate(iso);
                if (iso < fromDate) setFromDate(iso);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
          Carregando empresas…
        </div>
      ) : (
        <TableSection
          className='text-sm'
          tableClassName='table-auto'
          pagination={{
            page,
            totalPages,
            onPageChange: setPage,
            summary: (
              <span className='text-xs text-muted-foreground'>
                {rows.length} empresa(s)
              </span>
            ),
          }}
        >
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='h-9 px-3 text-xs font-medium text-muted-foreground'>
                Nome
              </TableHead>
              <TableHead className='h-9 px-3 text-xs font-medium text-muted-foreground'>
                Status
              </TableHead>
              <TableHead className='h-9 px-3 text-center text-xs font-medium text-muted-foreground'>
                Marmitas
              </TableHead>
              <TableHead className='h-9 px-3 text-xs font-medium text-muted-foreground'>
                Gasto total
              </TableHead>
              {canToggle ? <TableHead className='h-9 w-10 px-1' /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableEmptyRow colSpan={canToggle ? 5 : 4}>
                Nenhuma empresa cadastrada.
              </TableEmptyRow>
            ) : (
              pageItems.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className='max-w-[14rem] truncate px-3 py-2 text-sm font-medium'>
                    {company.name}
                  </TableCell>
                  <TableCell className='px-3 py-2'>
                    <Badge variant={company.active ? 'default' : 'secondary'}>
                      {company.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className='px-3 py-2 text-center text-sm tabular-nums'>
                    {company.quantity}
                  </TableCell>
                  <TableCell className='px-3 py-2 text-sm tabular-nums font-medium'>
                    {formatCurrency(company.totalPrice)}
                  </TableCell>
                  {canToggle ? (
                    <TableCell className='px-1 text-right'>
                      <TableRowActions label='Ações da empresa'>
                        <DropdownMenuItem
                          onClick={() => requestToggle(company)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {company.active ? 'Desativar' : 'Reativar'}
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

      <AlertDialog
        open={pendingToggle != null}
        onOpenChange={(next) => {
          if (!next) setPendingToggle(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle
                ? `Ao desativar “${pendingToggle.name}”, todos os usuários vinculados a essa empresa perderão o acesso ao sistema enquanto ela estiver inativa.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={toggleActiveMutation.isPending}
              onClick={() => {
                if (pendingToggle) toggleActiveMutation.mutate(pendingToggle);
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
