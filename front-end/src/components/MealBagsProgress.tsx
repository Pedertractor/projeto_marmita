import { PaperBagIcon } from '@/components/PaperBagIcon';
import { cn } from '@/lib/utils';

type MealBagsProgressProps = {
  count: number;
  /** Índice da marmita atual (0-based). Use -1 quando nenhuma estiver em foco. */
  currentIndex: number;
  /** Quantas marmitas já foram concluídas (ficam verdes). */
  completedCount: number;
};

/** Ícones arredondados de paper-bag abaixo do passo a passo. */
export function MealBagsProgress({
  count,
  currentIndex,
  completedCount,
}: MealBagsProgressProps) {
  if (count < 1) return null;

  return (
    <div
      className='flex shrink-0 flex-wrap items-center justify-center gap-2'
      role='list'
      aria-label={`${completedCount} de ${count} marmitas concluídas`}
    >
      {Array.from({ length: count }, (_, index) => {
        const done = index < completedCount;
        const current = index === currentIndex && !done;

        return (
          <span
            key={index}
            role='listitem'
            title={`Marmita ${index + 1}`}
            className={cn(
              'flex size-9 items-center justify-center rounded-full border transition',
              done &&
                'border-primary bg-primary text-primary-foreground shadow-sm',
              current &&
                'border-primary bg-primary/15 text-primary ring-2 ring-primary/25',
              !done &&
                !current &&
                'border-border/70 bg-muted/40 text-muted-foreground',
            )}
          >
            <PaperBagIcon size={16} strokeWidth={2.25} />
            <span className='sr-only'>
              Marmita {index + 1}
              {done ? ' concluída' : current ? ' atual' : ''}
            </span>
          </span>
        );
      })}
    </div>
  );
}
