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

import {

  Card,

  CardContent,

  CardDescription,

  CardFooter,

  CardHeader,

  CardTitle,

} from '@/components/ui/card';



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

    <div className='mx-auto w-full max-w-4xl space-y-4'>

      <div className='flex flex-wrap items-center gap-2'>

        <Button asChild variant='ghost' size='icon-sm'>

          <Link to={ROUTES.MENUS}>

            <ArrowLeft className='size-4' />

          </Link>

        </Button>

        <div className='min-w-0 flex-1'>

          <h1 className='text-2xl font-semibold'>Cardápio do dia</h1>

          <p className='text-sm text-muted-foreground'>

            Criar ou substituir itens da data

          </p>

        </div>

      </div>



      <Card className='flex max-h-[min(720px,calc(100vh-10rem))] min-h-0 flex-col'>

        <CardHeader className='shrink-0'>

          <CardTitle>Data e itens</CardTitle>

          <CardDescription>

            Ao salvar, os itens da data são recriados. Escolha um ícone para cada

            prato.

          </CardDescription>

        </CardHeader>

        <CardContent className='flex min-h-0 flex-1 flex-col gap-4 pb-0'>

          <div className='flex shrink-0 flex-col items-start gap-1.5'>

            <Label htmlFor='date' className='block'>

              Data

            </Label>

            <DatePicker

              id='date'

              className='h-10 w-auto'

              value={parseISODateLocal(date)}

              onChange={(next) => {

                if (next) setDate(toISODate(next));

              }}

            />

          </div>



          <div className='-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-1 pb-4'>

            <div className='hidden gap-3 px-1 pb-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[auto_minmax(0,1fr)_2.5rem_2.5rem] md:items-center'>

              <span>Ícone</span>

              <span>Nome do item</span>

              <span className='sr-only'>Disponível</span>

              <span className='sr-only'>Remover</span>

            </div>



            {items.map((item, index) => (

              <div

                key={index}

                className='grid gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center md:grid-cols-[auto_minmax(0,1fr)_2.5rem_2.5rem] md:items-center md:py-1 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none'

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



                <div className='min-w-0'>

                  <Input

                    value={item.name}

                    placeholder={`Item ${index + 1}`}

                    className='w-full min-w-0'

                  onChange={(e) =>

                    setItems((prev) =>

                      prev.map((it, i) =>

                        i === index ? { ...it, name: e.target.value } : it,

                      ),

                    )

                  }

                  />

                </div>



                <div className='flex items-center justify-center md:col-start-3'>

                  <Label htmlFor={`avail-${index}`} className='sr-only'>

                    Item disponível

                  </Label>

                  <Checkbox

                    id={`avail-${index}`}

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

                </div>



                <Button

                  type='button'

                  variant='ghost'

                  size='icon-sm'

                  className='justify-self-center md:col-start-4'

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

        <CardFooter className='shrink-0 flex-col gap-3 border-t border-border/60 sm:flex-row sm:flex-wrap'>

          <Button

            type='button'

            variant='outline'

            className='w-full sm:w-auto'

            onClick={() => setItems((prev) => [...prev, emptyItem()])}

          >

            <Plus className='mr-2 size-4' />

            Adicionar item

          </Button>



          <Button

            className='w-full sm:ml-auto sm:w-auto sm:min-w-48'

            disabled={saveMutation.isPending}

            onClick={() => saveMutation.mutate()}

          >

            {saveMutation.isPending ? 'Salvando…' : 'Salvar cardápio'}

          </Button>

        </CardFooter>

      </Card>

    </div>

  );

}

