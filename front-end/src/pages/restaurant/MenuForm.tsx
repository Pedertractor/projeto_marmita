import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { MenuItemIconPicker } from '@/components/MenuItemIconPicker';
import {
  DEFAULT_MENU_ITEM_ICON_KEY,
  normalizeMenuItemIconKey,
  type MenuItemIconKey,
} from '@/config/menu-item-icons';
import { menusApi } from '@/services/menus';
import { useAuth } from '@/contexts/useAuth';
import { formatDate, parseISODateLocal, toISODate } from '@/utils/format';
import { recordMenuRegisteredChatEvent } from '@/utils/restaurant-chat-menu-events';
import type { Menu } from '@/types/domain';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type MenuItemDraft = {
  name: string;
  iconKey: MenuItemIconKey;
  available: boolean;
};

export function emptyMenuItem(): MenuItemDraft {
  return {
    name: '',
    iconKey: DEFAULT_MENU_ITEM_ICON_KEY,
    available: true,
  };
}

export function draftsFromMenu(menu: Menu): MenuItemDraft[] {
  return menu.items.map((item) => ({
    name: item.name,
    iconKey: normalizeMenuItemIconKey(item.iconKey),
    available: item.available,
  }));
}

type MenuFormProps = {
  initialDate: string;
  /** Data de origem no modo copiar (somente leitura). */
  sourceDate?: string;
  seedItems?: MenuItemDraft[];
  /** Recarrega os itens do dia quando a data muda (editar e página). */
  syncItemsOnDateChange?: boolean;
  /** Avisa que salvar substitui um cardápio já existente na data. */
  warnIfOccupied?: boolean;
  occupiedDates?: string[];
  onSaved?: (savedDate: string) => void;
  layout?: 'page' | 'dialog';
};

export function MenuForm({
  initialDate,
  sourceDate,
  seedItems,
  syncItemsOnDateChange = false,
  warnIfOccupied = false,
  occupiedDates = [],
  onSaved,
  layout = 'page',
}: MenuFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fieldId = useId();
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<MenuItemDraft[]>(() =>
    seedItems?.length
      ? seedItems.map((item) => ({ ...item }))
      : [emptyMenuItem()],
  );
  const hasSeed = Boolean(seedItems?.length);
  const [loaded, setLoaded] = useState(!syncItemsOnDateChange || hasSeed);
  const skipInitialDateSync = useRef(syncItemsOnDateChange && hasSeed);
  const listRef = useRef<HTMLDivElement>(null);
  const lastInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusNewItem = useRef(false);

  const { data: menu } = useQuery({
    queryKey: ['menu', date],
    queryFn: () => menusApi.getByDate(date),
    enabled: syncItemsOnDateChange,
  });

  useEffect(() => {
    if (!syncItemsOnDateChange) return;
    if (skipInitialDateSync.current) {
      skipInitialDateSync.current = false;
      return;
    }
    setLoaded(false);
  }, [date, syncItemsOnDateChange]);

  useEffect(() => {
    if (!syncItemsOnDateChange || loaded) return;
    if (menu?.items?.length) {
      setItems(draftsFromMenu(menu));
    } else if (menu === null) {
      setItems([emptyMenuItem()]);
    }
    if (menu !== undefined) setLoaded(true);
  }, [menu, loaded, syncItemsOnDateChange]);

  const canAddItem = items[items.length - 1]?.name.trim().length > 0;
  const canSave = items.every((item) => item.name.trim().length > 0);

  useEffect(() => {
    if (!shouldFocusNewItem.current) return;
    shouldFocusNewItem.current = false;
    const input = lastInputRef.current;
    const list = listRef.current;
    if (list) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
    input?.focus({ preventScroll: true });
  }, [items.length]);
  const replacesExisting =
    warnIfOccupied && occupiedDates.includes(date.slice(0, 10));

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleaned = items
        .map((item, index) => ({
          name: item.name.trim(),
          description: null,
          iconKey: item.iconKey,
          available: item.available,
          sortOrder: index,
        }))
        .filter((item) => item.name);

      if (cleaned.length === 0) {
        throw new Error('Informe ao menos um item');
      }

      return menusApi.upsert({ date, items: cleaned });
    },
    onSuccess: (savedMenu) => {
      if (user?.id && user.name) {
        recordMenuRegisteredChatEvent(user.id, {
          menuDate: date,
          menuId: savedMenu.id,
          registeredByName:
            savedMenu.createdBy?.name ||
            savedMenu.updatedBy?.name ||
            user.name,
          createdAt: savedMenu.createdAt,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-restaurant'] });
      toast.success('Cardápio salvo.');
      onSaved?.(date);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Não foi possível salvar.';
      if (message === 'Informe ao menos um item') toast.error(message);
    },
  });

  const fields = (
    <>
      {sourceDate ? (
        <div className='flex shrink-0 flex-col gap-1.5'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 sm:gap-3'>
            <div className='flex min-w-0 flex-col gap-1.5'>
              <Label htmlFor={`${fieldId}-source-date`}>De</Label>
              <div
                id={`${fieldId}-source-date`}
                className={cn(
                  'flex h-11 w-full items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 text-sm text-muted-foreground md:h-10',
                )}
                aria-readonly
              >
                <CalendarIcon className='size-3.5 shrink-0 opacity-70' aria-hidden />
                <span className='truncate'>{formatDate(sourceDate)}</span>
              </div>
            </div>

            <ArrowRight
              className='mb-2.5 size-4 shrink-0 text-muted-foreground'
              aria-hidden
            />

            <div className='flex min-w-0 flex-col gap-1.5'>
              <Label htmlFor={`${fieldId}-date`}>Para</Label>
              <DatePicker
                id={`${fieldId}-date`}
                className='h-11 w-full md:h-10'
                value={parseISODateLocal(date)}
                disabledDates={occupiedDates}
                onChange={(next) => {
                  if (next) setDate(toISODate(next));
                }}
              />
            </div>
          </div>
          {replacesExisting ? (
            <p className='text-xs text-amber-700 dark:text-amber-400'>
              Já existe um cardápio neste dia. Salvar substitui os itens atuais.
            </p>
          ) : null}
        </div>
      ) : (
        <div className='flex shrink-0 flex-col gap-1.5'>
          <Label htmlFor={`${fieldId}-date`}>Data</Label>
          <DatePicker
            id={`${fieldId}-date`}
            className='h-11 w-full md:h-10 md:w-auto'
            value={parseISODateLocal(date)}
            onChange={(next) => {
              if (next) setDate(toISODate(next));
            }}
          />
          {replacesExisting ? (
            <p className='text-xs text-amber-700 dark:text-amber-400'>
              Já existe um cardápio neste dia. Salvar substitui os itens atuais.
            </p>
          ) : null}
        </div>
      )}

      <div
        ref={listRef}
        className='min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain py-1'
      >
        <div className='hidden gap-3 px-1 pb-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[auto_minmax(0,1fr)_2.5rem_2.5rem] md:items-center'>
          <span>Ícone</span>
          <span>Nome do item</span>
          <span className='sr-only'>Disponível</span>
          <span className='sr-only'>Remover</span>
        </div>

        {items.map((item, index) => (
          <div
            key={`${fieldId}-${index}`}
            className='grid grid-cols-[2.5rem_minmax(0,1fr)_auto_2.5rem] items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 md:grid-cols-[auto_minmax(0,1fr)_2.5rem_2.5rem] md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:py-1'
          >
            <div className='shrink-0'>
              <MenuItemIconPicker
                value={item.iconKey}
                onChange={(iconKey) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === index ? { ...it, iconKey } : it)),
                  )
                }
              />
            </div>

            <Input
              ref={index === items.length - 1 ? lastInputRef : undefined}
              value={item.name}
              placeholder='Nome do prato'
              aria-label={`Nome do item ${index + 1}`}
              className='h-11 w-full min-w-0 border-border bg-background md:h-10'
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((it, i) =>
                    i === index ? { ...it, name: e.target.value } : it,
                  ),
                )
              }
            />

            <div className='flex flex-col items-center justify-center gap-0.5 md:col-start-3'>
              <Checkbox
                id={`${fieldId}-avail-${index}`}
                className='h-5 w-5 md:h-4 md:w-4'
                checked={item.available}
                onCheckedChange={(checked) =>
                  setItems((prev) =>
                    prev.map((it, i) =>
                      i === index
                        ? { ...it, available: Boolean(checked) }
                        : it,
                    ),
                  )
                }
              />
              <Label
                htmlFor={`${fieldId}-avail-${index}`}
                className='text-[10px] leading-none font-medium text-muted-foreground md:sr-only'
              >
                Disp.
              </Label>
            </div>

            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              className='size-10 justify-self-center md:col-start-4 md:size-8'
              aria-label='Remover item'
              disabled={items.length === 1}
              onClick={() =>
                setItems((prev) =>
                  prev.length === 1
                    ? prev
                    : prev.filter((_, i) => i !== index),
                )
              }
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        ))}
      </div>
    </>
  );

  const actions = (
    <>
      <Button
        type='button'
        variant='outline'
        className='h-11 flex-[2] md:h-9'
        disabled={!canAddItem}
        onClick={() => {
          shouldFocusNewItem.current = true;
          setItems((prev) => [...prev, emptyMenuItem()]);
        }}
      >
        <Plus className='size-4' />
        Item
      </Button>

      <Button
        className='h-11 flex-1 md:h-9 md:min-w-28'
        disabled={saveMutation.isPending || !canSave}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </>
  );

  if (layout === 'dialog') {
    return (
      <div className='flex min-h-0 flex-1 flex-col'>
        <div className='flex min-h-0 flex-1 flex-col gap-3 px-6 py-4'>
          {fields}
        </div>
        <div className='flex shrink-0 flex-row gap-2 border-t border-border px-6 py-3'>
          {actions}
        </div>
      </div>
    );
  }

  return (
    <Card
      variant='compact'
      className='flex max-h-[calc(100dvh-8.5rem)] min-h-0 flex-1 flex-col overflow-hidden md:max-h-[min(720px,calc(100vh-10rem))]'
    >
      <CardContent className='flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 md:px-6 md:py-4'>
        {fields}
      </CardContent>
      <CardFooter className='sticky bottom-0 z-10 shrink-0 flex-row gap-2 border-t border-border bg-card px-3 py-3 md:px-6'>
        {actions}
      </CardFooter>
    </Card>
  );
}

const DIALOG_COPY = {
  create: {
    title: 'Novo cardápio',
    description: 'Informe os itens e o dia do cardápio.',
  },
  edit: {
    title: 'Editar cardápio',
    description: 'Altere os itens ou a data. Salvar atualiza o dia escolhido.',
  },
  copy: {
    title: 'Copiar cardápio',
    description:
      'Os itens foram copiados. Remova, acrescente e escolha o dia de destino.',
  },
} as const;

export type MenuFormDialogMode = keyof typeof DIALOG_COPY;

type MenuFormDialogProps = {
  open: boolean;
  mode: MenuFormDialogMode;
  initialDate: string;
  sourceDate?: string;
  seedItems?: MenuItemDraft[];
  occupiedDates?: string[];
  onOpenChange: (open: boolean) => void;
  onSaved?: (savedDate: string) => void;
};

export function MenuFormDialog({
  open,
  mode,
  initialDate,
  sourceDate,
  seedItems,
  occupiedDates,
  onOpenChange,
  onSaved,
}: MenuFormDialogProps) {
  const copy = DIALOG_COPY[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='flex max-h-[min(90dvh,760px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'
        onInteractOutside={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest('[data-radix-popper-content-wrapper]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className='shrink-0 px-6 pt-6 pr-12'>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {open ? (
          <MenuForm
            initialDate={initialDate}
            sourceDate={mode === 'copy' ? sourceDate : undefined}
            seedItems={seedItems}
            syncItemsOnDateChange={mode !== 'copy'}
            warnIfOccupied={mode === 'copy'}
            occupiedDates={occupiedDates}
            layout='dialog'
            onSaved={(savedDate) => {
              onSaved?.(savedDate);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
