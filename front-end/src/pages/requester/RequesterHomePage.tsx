import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { BestPracticesCarousel } from '@/components/BestPracticesCarousel';
import { RequesterHomeCarousel } from '@/components/RequesterHomeCarousel';
import {
  isRequesterFirstStepsDone,
  RequesterFirstSteps,
} from '@/components/RequesterFirstSteps';
import { MarmitaSoupIcon } from '@/components/marmita-soup-icon';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import { useAuth } from '@/contexts/useAuth';
import { authApi } from '@/services/auth';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { ROUTES, requesterOrderPath, requesterOrderWizardPath } from '@/routes/constants';
import type { Order } from '@/types/domain';
import { todayISODate, formatDate } from '@/utils/format';
import { isRequesterOrderWindowOpen } from '@/utils/order-status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function pickTodayOrder(orders: Order[]) {
  return orders.find((order) => order.status !== 'DRAFT') ?? orders.find((order) => order.status === 'DRAFT');
}

export function RequesterHomePage() {
  const { user, updateUser } = useAuth();
  const today = todayISODate();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const [guideOpen, setGuideOpen] = useState(false);
  const [simulatingChallenge, setSimulatingChallenge] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const windowOpen = isRequesterOrderWindowOpen(new Date(now));

  async function simulateEmailChallenge() {
    setSimulatingChallenge(true);
    try {
      const result = await authApi.forceEmailChallenge();
      updateUser(result.user);
    } finally {
      setSimulatingChallenge(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    if (!isRequesterFirstStepsDone(user.id)) setGuideOpen(true);
  }, [user?.id]);

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', today],
    queryFn: () => menusApi.getByDate(today),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'mine', today],
    queryFn: () => ordersApi.list({ menuDate: today }),
  });

  const todayOrder = pickTodayOrder(orders);
  const hasRequestedToday = Boolean(
    todayOrder && todayOrder.status !== 'DRAFT',
  );
  const requestLabel = hasRequestedToday
    ? 'Solicitar mais marmitas'
    : 'Solicitar marmitas';
  const availableItems = menu?.items.filter((item) => item.available) ?? [];
  const canRequest =
    Boolean(menu && availableItems.length > 0) && windowOpen;
  const waitingForMenu = menuLoading || !menu;
  const todayOrderHref = todayOrder
    ? todayOrder.status === 'DRAFT'
      ? requesterOrderWizardPath(todayOrder.id)
      : requesterOrderPath(todayOrder.id)
    : null;

  return (
    <div className='min-w-0 space-y-5 overflow-x-clip'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-xl font-semibold tracking-tight'>
          Bem-vindo{firstName ? `, ${firstName}` : ''}
        </h1>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={simulatingChallenge}
          onClick={() => void simulateEmailChallenge()}
        >
          {simulatingChallenge
            ? 'Abrindo…'
            : 'Simular verificação de e-mail'}
        </Button>
      </header>

      {user?.id ? (
        <RequesterFirstSteps
          userId={user.id}
          open={guideOpen}
          onOpenChange={setGuideOpen}
        />
      ) : null}

      <RequesterHomeCarousel
        todayOrder={todayOrder}
        ordersLoading={ordersLoading}
        todayOrderHref={todayOrderHref}
        onOpenFirstSteps={() => setGuideOpen(true)}
      />

      <div className='grid min-w-0 gap-5 lg:grid-cols-2 lg:items-stretch'>
        <Card
          variant={waitingForMenu ? 'default' : 'promo'}
          className={cn(
            'h-full min-w-0 max-w-full overflow-hidden',
            waitingForMenu && 'relative bg-zinc-100 text-zinc-900 shadow-sm',
          )}
        >
          {waitingForMenu ? (
            <>
              <img
                src='/tigela_waiting.png'
                alt=''
                aria-hidden
                draggable={false}
                className='pointer-events-none absolute top-2 -right-2 z-0 h-[7.5rem] w-[42%] max-w-[10.5rem] object-contain object-right grayscale sm:h-36'
              />
              <CardHeader className='relative z-10 pb-2 pr-[40%]'>
                <CardTitle className='flex items-center gap-2 text-lg text-zinc-900'>
                  <MarmitaSoupIcon size={20} className='text-zinc-700' />
                  Cardápio de hoje
                </CardTitle>
                <CardDescription className='text-zinc-500'>
                  {formatDate(today)}
                </CardDescription>
              </CardHeader>
              <CardContent className='relative z-10 flex min-w-0 flex-1 flex-col space-y-3'>
                <p className='max-w-[58%] text-sm leading-relaxed text-zinc-500'>
                  {menuLoading
                    ? 'Carregando…'
                    : 'Ainda não há cardápio publicado para hoje.'}
                </p>
                <div className='mt-auto min-w-0'>
                  <Button
                    className='w-full max-w-full border-0 bg-zinc-400 text-white hover:bg-zinc-400 disabled:opacity-100'
                    disabled
                  >
                    <span className='inline-flex items-center'>
                      Aguardando cardápio
                      <span
                        className='waiting-ellipsis ml-0.5 inline-flex'
                        aria-hidden
                      >
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                    </span>
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <MarmitaSoupIcon size={20} className='text-primary' />
                  Cardápio de hoje
                </CardTitle>
                <CardDescription>{formatDate(today)}</CardDescription>
              </CardHeader>
              <CardContent className='flex min-w-0 flex-1 flex-col space-y-3'>
                {availableItems.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    Nenhum item disponível no momento.
                  </p>
                ) : (
                  <ul className='flex flex-wrap gap-2'>
                    {availableItems.map((item) => (
                      <li
                        key={item.id}
                        className='inline-flex max-w-full items-center gap-1.5 rounded-full bg-background px-3 py-1 text-sm shadow-sm'
                      >
                        <MenuItemIcon
                          iconKey={item.iconKey}
                          size={16}
                          className='text-primary'
                        />
                        <span className='truncate'>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className='mt-auto min-w-0'>
                  {canRequest ? (
                    <Button asChild className='w-full max-w-full'>
                      <Link to={ROUTES.REQUESTER_ORDER_NEW}>
                        <Plus className='mr-2 size-4 shrink-0' />
                        {requestLabel}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className='w-full max-w-full'
                      disabled
                      title={
                        !windowOpen && availableItems.length > 0
                          ? 'Fora de horário'
                          : undefined
                      }
                    >
                      {!windowOpen && availableItems.length > 0
                        ? 'Fora de horário'
                        : requestLabel}
                    </Button>
                  )}
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <BestPracticesCarousel className='h-full min-w-0' />
      </div>
    </div>
  );
}
