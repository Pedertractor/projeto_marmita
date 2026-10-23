import { Check } from 'lucide-react';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { cn } from '@/lib/utils';

export type MenuItemToggleItem = {
  id: string;
  name: string;
  description?: string | null;
  iconKey?: string | null;
};

type MenuItemToggleButtonProps = {
  item: MenuItemToggleItem;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function MenuItemToggleButton({
  item,
  checked,
  disabled = false,
  onClick,
  className,
}: MenuItemToggleButtonProps) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition',
        checked
          ? 'border-primary/40 bg-primary/10 text-foreground'
          : 'border-border/60 bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          checked ? 'bg-primary/15' : 'bg-background',
        )}
      >
        <MenuItemIcon
          iconKey={item.iconKey}
          size={16}
          className={checked ? 'text-primary' : 'text-muted-foreground'}
        />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate leading-none font-medium'>{item.name}</span>
        {item.description?.trim() ? (
          <span className='mt-0.5 block line-clamp-2 text-xs text-muted-foreground'>
            {item.description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border',
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40',
        )}
        aria-hidden
      >
        {checked ? <Check className='size-3' strokeWidth={3} /> : null}
      </span>
      <span className='sr-only'>
        {checked
          ? 'Selecionado — toque para remover'
          : 'Não selecionado — toque para incluir'}
      </span>
    </button>
  );
}
