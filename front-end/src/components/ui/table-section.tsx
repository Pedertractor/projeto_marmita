import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Table, TableCell, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';

type TableSectionPagination = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  summary: ReactNode;
};

type TableSectionProps = {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  pagination?: TableSectionPagination;
};

export function TableSection({
  children,
  className,
  tableClassName,
  pagination,
}: TableSectionProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border-0 bg-card shadow-card', className)}>
      <Table className={cn('table-fixed', tableClassName)}>{children}</Table>
      {pagination ? <TablePagination {...pagination} /> : null}
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className='h-24 text-center text-sm text-muted-foreground'
      >
        {children}
      </TableCell>
    </TableRow>
  );
}
