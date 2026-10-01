import { AnimatePresence, motion } from 'motion/react';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { cn } from '@/lib/utils';

export type MealPlateItem = {
  id: string;
  name: string;
  iconKey?: string | null;
};

type MealPlateProps = {
  items: MealPlateItem[];
  className?: string;
};

/** Posições em círculo (percentuais) para até 8 itens no prato. */
function positionForIndex(index: number, total: number) {
  if (total === 1) {
    return { left: '50%', top: '50%' };
  }
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = total <= 4 ? 28 : 32;
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`,
  };
}

export function MealPlate({ items, className }: MealPlateProps) {
  return (
    <div
      className={cn(
        'relative mx-auto aspect-square w-full max-w-65',
        className,
      )}
      aria-label={
        items.length
          ? `Prato com ${items.length} item${items.length > 1 ? 's' : ''}`
          : 'Prato vazio'
      }
    >
      <img
        src='/prato.png'
        alt=''
        aria-hidden
        className='pointer-events-none absolute inset-0 size-full object-contain'
        draggable={false}
      />

      <AnimatePresence mode='popLayout'>
        {items.map((item, index) => {
          const pos = positionForIndex(index, items.length);
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className='absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5'
              style={{ left: pos.left, top: pos.top }}
              title={item.name}
            >
              <MenuItemIcon
                iconKey={item.iconKey}
                size={22}
                className='text-primary'
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {items.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='absolute inset-0 z-10 flex items-center justify-center px-8 text-center text-xs text-muted-foreground'
        >
          Selecione itens abaixo
        </motion.p>
      ) : null}
    </div>
  );
}
