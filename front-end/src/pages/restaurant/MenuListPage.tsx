import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { menusApi } from '@/services/menus';
import { ROUTES } from '@/routes/constants';
import { formatDate, todayISODate } from '@/utils/format';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function MenuListPage() {
  const fromDate = todayISODate();
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['menus', fromDate],
    queryFn: () => menusApi.list(fromDate),
  });

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-semibold'>Cardápios</h1>
          <p className='text-sm text-muted-foreground'>
            A partir de {formatDate(fromDate)}
          </p>
        </div>
        <Button asChild>
          <Link to={`${ROUTES.MENU_EDIT}?date=${fromDate}`}>
            <Plus className='mr-2 size-4' />
            Novo / editar
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      ) : menus.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum cardápio</CardTitle>
            <CardDescription>
              Crie o cardápio do dia para os solicitantes pedirem.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className='grid gap-3 md:grid-cols-2'>
          {menus.map((menu) => (
            <Card key={menu.id}>
              <CardHeader className='pb-2'>
                <CardTitle className='text-base'>
                  {formatDate(menu.date)}
                </CardTitle>
                <CardDescription>
                  {menu.items.length} itens ·{' '}
                  {menu.items.filter((i) => i.available).length} disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <ul className='flex flex-wrap gap-1.5'>
                  {menu.items.map((item) => (
                    <li
                      key={item.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                        item.available
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground line-through'
                      }`}
                    >
                      <MenuItemIcon iconKey={item.iconKey} size={14} />
                      {item.name}
                    </li>
                  ))}
                </ul>
                <Button asChild variant='outline' size='sm'>
                  <Link
                    to={`${ROUTES.MENU_EDIT}?date=${String(menu.date).slice(0, 10)}`}
                  >
                    Editar
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
