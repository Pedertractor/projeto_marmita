import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { reportsApi } from '@/services/reports';
import { ordersApi } from '@/services/orders';
import { adminOrderPath } from '@/routes/constants';
import { formatCurrency, formatDate } from '@/utils/format';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { Button } from '@/components/ui/button';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyRow, TableSection } from '@/components/ui/table-section';
const viewMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.24, ease: 'easeOut' as const },
};

export interface ReportByCompanySectionProps {
  fromDate: string;
  toDate: string;
}

export function ReportByCompanySection({
  fromDate,
  toDate,
}: ReportByCompanySectionProps) {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    setCompanyId(null);
    setCompanyName('');
  }, [fromDate, toDate]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report-by-company', fromDate, toDate],
    queryFn: () => reportsApi.byCompany({ fromDate, toDate }),
  });

  const companyRows = report?.companies ?? [];
  const { page, setPage, totalPages, pageItems } =
    useClientPagination(companyRows);

  const { data: drillOrders = [], isLoading: drillLoading } = useQuery({
    queryKey: ['orders', 'company', companyId, fromDate, toDate],
    queryFn: () =>
      ordersApi.list({
        companyId: companyId!,
        fromDate,
        toDate,
      }),
    enabled: Boolean(companyId),
  });

  const showDetail = Boolean(companyId);

  function openCompany(id: string, name: string) {
    setCompanyId(id);
    setCompanyName(name);
  }

  function closeDetail() {
    setCompanyId(null);
    setCompanyName('');
  }

  return (
    <section className='space-y-3'>
      <div>
        <div className='flex flex-wrap items-center gap-2'>
          {showDetail ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={closeDetail}
            >
              <ArrowLeft className='size-4' aria-hidden />
              Voltar
            </Button>
          ) : null}
          <h2 className='flex items-center gap-1.5 text-base font-semibold tracking-tight'>
            {!showDetail ? (
              <Building2 className='size-3.5 text-primary' aria-hidden />
            ) : null}
            {showDetail ? companyName : 'Relatório por empresa'}
          </h2>
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>
          {showDetail
            ? `Pedidos de ${formatDate(fromDate)} a ${formatDate(toDate)}`
            : 'Totais no período — clique em uma empresa para ver os pedidos'}
        </p>
      </div>

      {isLoading ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='size-4 animate-spin text-primary' aria-hidden />
          Carregando relatório…
        </div>
      ) : (
        <AnimatePresence mode='wait' initial={false}>
          {!showDetail ? (
            <motion.div key='companies-table' {...viewMotion}>
              <TableSection
                pagination={{
                  page,
                  totalPages,
                  onPageChange: setPage,
                  summary: `${companyRows.length} empresa(s)`,
                }}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[40%]'>Empresa</TableHead>
                    <TableHead className='w-[20%]'>Pedidos</TableHead>
                    <TableHead className='w-[20%]'>Marmitas</TableHead>
                    <TableHead className='w-[20%]'>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableEmptyRow colSpan={4}>
                      Sem dados no período.
                    </TableEmptyRow>
                  ) : (
                    pageItems.map((row) => (
                      <TableRow
                        key={row.companyId}
                        className='cursor-pointer hover:bg-primary/[0.04]'
                        tabIndex={0}
                        role='button'
                        onClick={() =>
                          openCompany(row.companyId, row.companyName)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openCompany(row.companyId, row.companyName);
                          }
                        }}
                      >
                        <TableCell className='truncate font-medium'>
                          {row.companyName}
                        </TableCell>
                        <TableCell>{row.orders}</TableCell>
                        <TableCell>{row.quantity}</TableCell>
                        <TableCell className='whitespace-nowrap font-medium text-primary'>
                          {formatCurrency(row.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </TableSection>
            </motion.div>
          ) : (
            <motion.div key={`company-${companyId}`} {...viewMotion}>
              <div className='overflow-hidden rounded-lg border border-primary/15 text-sm'>
                {drillLoading ? (
                  <div className='flex items-center gap-2 px-3 py-4 text-muted-foreground'>
                    <Loader2
                      className='size-4 animate-spin text-primary'
                      aria-hidden
                    />
                    Carregando pedidos…
                  </div>
                ) : drillOrders.length === 0 ? (
                  <p className='px-3 py-4 text-muted-foreground'>
                    Sem pedidos neste período.
                  </p>
                ) : (
                  drillOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={adminOrderPath(order.id)}
                      className='flex items-center justify-between gap-2 border-t border-primary/10 px-3 py-2.5 transition-colors first:border-t-0 hover:bg-primary/[0.04]'
                    >
                      <div className='min-w-0'>
                        <p className='font-medium'>
                          {order.quantity} marmitas ·{' '}
                          {formatCurrency(order.totalPrice)}
                        </p>
                        <p className='truncate text-xs text-muted-foreground'>
                          {order.requesterName}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </Link>
                  ))
                )}
              </div>
              {!drillLoading && drillOrders.length > 0 ? (
                <p className='mt-2 text-xs text-muted-foreground'>
                  {drillOrders.length} pedido(s) no período
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
