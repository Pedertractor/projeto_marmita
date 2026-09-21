import { useState } from 'react';
import {
  DEFAULT_MENU_ITEM_ICON_KEY,
  MENU_ITEM_ICON_KEYS,
  MENU_ITEM_ICONS,
  type MenuItemIconKey,
} from '@/config/menu-item-icons';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type MenuItemIconPickerProps = {
  value?: string | null;
  onChange: (iconKey: MenuItemIconKey) => void;
  disabled?: boolean;
};

export function MenuItemIconPicker({
  value,
  onChange,
  disabled,
}: MenuItemIconPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = (value ?? DEFAULT_MENU_ITEM_ICON_KEY) as MenuItemIconKey;
  const selectedLabel = MENU_ITEM_ICONS[selected]?.label ?? 'Ícone';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={disabled}
          className='size-10 shrink-0 rounded-xl'
          aria-label={`Ícone: ${selectedLabel}. Clique para alterar`}
        >
          <MenuItemIcon iconKey={selected} size={20} className='text-primary' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64 p-3'>
        <p className='mb-2 text-xs font-medium text-muted-foreground'>
          Escolha um ícone
        </p>
        <div className='grid grid-cols-5 gap-1.5'>
          {MENU_ITEM_ICON_KEYS.map((key) => {
            const { label } = MENU_ITEM_ICONS[key];
            const active = key === selected;
            return (
              <Button
                key={key}
                type='button'
                variant={active ? 'default' : 'outline'}
                size='icon'
                className={cn('size-10 rounded-lg', active && 'ring-2 ring-ring')}
                title={label}
                aria-label={label}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
              >
                <MenuItemIcon
                  iconKey={key}
                  size={18}
                  className={active ? 'text-primary-foreground' : 'text-primary'}
                />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
