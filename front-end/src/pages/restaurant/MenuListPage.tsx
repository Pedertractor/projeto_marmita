import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, getISOWeek, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Copy, Plus } from 'lucide-react';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import {
  draftsFromMenu,
  MenuFormDialog,
  type MenuFormDialogMode,
  type MenuItemDraft,
} from '@/pages/restaurant/MenuForm';
import { menusApi } from '@/services/menus';
import { formatDate, parseISODateLocal, todayISODate, toISODate } from '@/utils/format';
import type { Menu } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function menuDateKey(value: string): string {
  return value.slice(0, 10);
}

function weekStartMonday(iso: string): Date {
  return startOfWeek(parseISODateLocal(iso), { weekStartsOn: 1 });
}

function suggestCopyDate(sourceIso: string, occupied: Set<string>): string {
  const source = parseISODateLocal(sourceIso);
  for (let offset = 1; offset <= 14; offset += 1) {
    const next = toISODate(addDays(source, offset));
    if (!occupied.has(next)) return next;
  }
  return toISODate(addDays(source, 1));
}

type DialogSession = {
  mode: MenuFormDialogMode;
  date: string;
  sourceDate?: string;
  seedItems?: MenuItemDraft[];
};

export function MenuListPage() {
  const today = todayISODate();
  const [weekStart, setWeekStart] = useState(() => weekStartMonday(today));
  const [session, setSession] = useState<DialogSession | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const weekStartIso = toISODate(weekStart);
  const weekEndIso = toISODate(weekDays[6]);

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['menus', weekStartIso],
    queryFn: () => menusApi.list(weekStartIso),
  });

  const menusByDate = useMemo(() => {
    const map = new Map<string, Menu>();
    for (const menu of menus) {
      const key = menuDateKey(String(menu.date));
      if (key >= weekStartIso && key <= weekEndIso) {
        map.set(key, menu);
      }
    }
    return map;
  }, [menus, weekStartIso, weekEndIso]);

  const occupiedDates = useMemo(
    () => menus.map((menu) => menuDateKey(String(menu.date))),
    [menus],
  );

  function openCreate(date: string) {
    setSession({ mode: 'create', date });
  }

  function openEdit(menu: Menu) {
    setSession({
      mode: 'edit',
      date: menuDateKey(String(menu.date)),
      seedItems: draftsFromMenu(menu),
    });
  }

  function openCopy(menu: Menu) {
    const source = menuDateKey(String(menu.date));
    setSession({
      mode: 'copy',
      date: suggestCopyDate(source, new Set(occupiedDates)),
      sourceDate: source,
      seedItems: draftsFromMenu(menu),
    });
  }

  function showWeekOf(iso: string) {
    setWeekStart(weekStartMonday(iso));
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>Cardápios</h1>
          <p className='text-sm text-muted-foreground'>
            {formatDate(weekStartIso)} – {formatDate(weekEndIso)} · Semana{' '}
            {getISOWeek(weekStart)}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            aria-label='Semana anterior'
            onClick={() => setWeekStart((current) => addDays(current, -7))}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setWeekStart(weekStartMonday(today))}
          >
            Hoje
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon-sm'
            aria-label='Próxima semana'
            onClick={() => setWeekStart((current) => addDays(current, 7))}
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto px-1 pt-1 pb-2'>
        {weekDays.map((day, index) => {
          const iso = toISODate(day);
          const menu = menusByDate.get(iso);
          const isToday = iso === today;

          return (
            <section
              key={iso}
              className={cn(
                'relative flex min-h-0 w-[220px] shrink-0 flex-col rounded-2xl border border-transparent bg-muted/40 p-2 sm:w-[240px] lg:min-w-0 lg:flex-1',
                isToday && 'z-10 border-primary bg-primary/5 shadow-sm',
              )}
            >
              <header className='mb-2 flex items-baseline justify-between px-1'>
                <div>
                  <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    {WEEKDAY_LABELS[index]}
                  </p>
                  <p className='text-sm font-semibold'>
                    {format(day, "d 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                {isToday ? (
                  <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary'>
                    Hoje
                  </span>
                ) : null}
              </header>

              {isLoading ? (
                <p className='px-1 text-xs text-muted-foreground'>Carregando…</p>
              ) : menu ? (
                <article className='flex flex-col gap-3 rounded-xl bg-card p-3 shadow-card'>
                  <p className='text-xs text-muted-foreground'>
                    {menu.items.length} itens ·{' '}
                    {menu.items.filter((item) => item.available).length}{' '}
                    disponíveis
                  </p>
                  <ul className='flex flex-wrap content-start gap-1.5'>
                    {menu.items.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs',
                          item.available
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground line-through',
                        )}
                      >
                        <MenuItemIcon iconKey={item.iconKey} size={14} />
                        {item.name}
                      </li>
                    ))}
                  </ul>
                  <div className='grid grid-cols-2 gap-1.5'>
                    <Button
                      type='button'
                      variant='outline'
                      size='xs'
                      className='min-w-0 px-2'
                      onClick={() => openEdit(menu)}
                    >
                      Editar
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='xs'
                      className='min-w-0 px-2'
                      onClick={() => openCopy(menu)}
                    >
                      <Copy className='size-3' />
                      Copiar
                    </Button>
                  </div>
                </article>
              ) : (
                <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-6 text-center'>
                  <p className='text-xs text-muted-foreground'>Sem cardápio</p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => openCreate(iso)}
                  >
                    <Plus className='size-3.5' />
                    Criar
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {session ? (
        <MenuFormDialog
          key={`${session.mode}-${session.sourceDate ?? ''}-${session.date}-${session.seedItems?.map((item) => item.name).join('|') ?? ''}`}
          open
          mode={session.mode}
          initialDate={session.date}
          sourceDate={session.sourceDate}
          seedItems={session.seedItems}
          occupiedDates={occupiedDates}
          onOpenChange={(open) => {
            if (!open) setSession(null);
          }}
          onSaved={showWeekOf}
        />
      ) : null}
    </div>
  );
}
