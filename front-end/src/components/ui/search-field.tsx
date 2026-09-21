import { Search } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type SearchFieldProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'className'
> & {
  className?: string;
  inputClassName?: string;
};

function SearchField({
  className,
  inputClassName,
  ...props
}: SearchFieldProps) {
  return (
    <div className={cn('relative max-w-sm', className)}>
      <Search className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        type='search'
        className={cn('rounded-full pl-10', inputClassName)}
        {...props}
      />
    </div>
  );
}

export { SearchField };
