import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TableRowActionsProps = {
  children: ReactNode;
  label?: string;
};

export function TableRowActions({
  children,
  label = 'Ações',
}: TableRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='shrink-0'
          aria-label={label}
        >
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
