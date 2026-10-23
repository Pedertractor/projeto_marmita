import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function OrderSpecialBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Badge
      variant='secondary'
      className={cn(
        'border-amber-200 bg-amber-50 text-amber-900',
        compact && 'px-1.5 py-0 text-[10px]',
        className,
      )}
    >
      Especial
    </Badge>
  );
}
