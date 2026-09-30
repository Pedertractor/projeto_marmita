import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { MenuItemIconPicker } from '@/components/MenuItemIconPicker';
import {
  DEFAULT_MENU_ITEM_ICON_KEY,
  normalizeMenuItemIconKey,
  type MenuItemIconKey,
} from '@/config/menu-item-icons';
import { menusApi } from '@/services/menus';
import { ROUTES } from '@/routes/constants';
import { parseISODateLocal, todayISODate, toISODate } from '@/utils/format';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

type ItemDraft = {
  name: string;
  iconKey: MenuItemIconKey;
  available: boolean;
};

function emptyItem(): ItemDraft {
  return {
    name: '',
    iconKey: DEFAULT_MENU_ITEM_ICON_KEY,
    available: true,
  };
}

export function MenuEditPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialDate = params.get('date') || todayISODate();
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [loaded, setLoaded] = useState(false);

  const { data: menu } = useQuery({
    queryKey: ['menu', date],
    queryFn: () => menusApi.getByDate(date),
  });

  useEffect(() => {
    setLoaded(false);
  }, [date]);

  useEffect(() => {
    if (loaded) return;
    if (menu?.items?.length) {
      setItems(
        menu.items.map((i) => ({
          name: i.name,
          iconKey: normalizeMenuItemIconKey(i.iconKey),
          available: i.available,
        })),
      );
    } else if (menu === null) {
      setItems([emptyItem()]);
    }
    if (menu !== undefined) setLoaded(true);
  }, [menu, loaded]);

  const canAddItem = items[items.length - 1]?.name.trim().length > 0;
  const canSave = items.every((item) => item.name.trim().length > 0);

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleaned = items
        .map((i, idx) => ({
          name: i.name.trim(),
          description: null,
          iconKey: i.iconKey,
          available: i.available,
          sortOrder: idx,
        }))
        .filter((i) => i.name);

      if (cleaned.length === 0) {
        throw new Error('Informe ao menos um item');
      }

      return menusApi.upsert({ date, items: cleaned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      queryClient.invalidateQueries({ queryKey: ['menu', date] });
      toast.success('Cardápio salvo.');
      navigate(ROUTES.MENUS);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Não foi possível salvar.';
      if (message === 'Informe ao menos um item') toast.error(message);
    },
  });

  return (
    <div className='mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-3'>
      <div className='flex shrink-0 items-center gap-2'>
        <Button asChild variant='ghost' size='icon-sm'>
          <Link to={ROUTES.MENUS} aria-label='Voltar'>
            <ArrowLeft className='size-4' />
          </Link>
        </Button>
        <h1 className='text-xl font-semibold md:text-2xl'>Cardápio do dia</h1>
      </div>

      <Card
        variant='compact'
        className='flex max-h-[calc(100dvh-8.5rem)] min-h-0 flex-1 flex-col overflow-hidden md:max-h-[min(720px,calc(100vh-10rem))]'
      >
        <CardContent className='flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 md:px-6 md:py-4'>
          <div className='flex shrink-0 flex-col gap-1.5'>
            <Label htmlFor='date'>Data</Label>
            <DatePicker
              id='date'
              className='h-11 w-full md:h-10 md:w-auto'
              value={parseISODateLocal(date)}
              onChange={(next) => {
                if (next) setDate(toISODate(next));
              }}
            />
          </div>

          <div className='min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain py-1'>
            <div className='hidden gap-3 px-1 pb-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[auto_minmax(0,1fr)_2.5rem_2.5rem] md:items-center'>
              <span>Ícone</span>
              <span>Nome do item</span>
              <span className='sr-only'>Disponível</span>
              <span className='sr-only'>Remover</span>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className='grid grid-cols-[2.5rem_minmax(0,1fr)_auto_2.5rem] items-center gap-2 rounded-xl border border-border bg-muted/40 p-2 md:grid-cols-[auto_minmax(0,1fr)_2.5rem_2.5rem] md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:py-1'
              >
                <div className='shrink-0'>
                  <MenuItemIconPicker
                    value={item.iconKey}
                    onChange={(iconKey) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, iconKey } : it,
                        ),
                      )
                    }
                  />
                </div>

                <Input
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
                    id={`avail-${index}`}
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
                    htmlFor={`avail-${index}`}
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
        </CardContent>

        <CardFooter className='sticky bottom-0 z-10 shrink-0 flex-row gap-2 border-t border-border bg-card px-3 py-3 md:px-6'>
          <Button
            type='button'
            variant='outline'
            className='h-11 flex-1 md:h-9 md:flex-none'
            disabled={!canAddItem}
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            <Plus className='size-4' />
            Item
          </Button>

          <Button
            className='h-11 flex-1 md:ml-auto md:h-9 md:min-w-48'
            disabled={saveMutation.isPending || !canSave}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
