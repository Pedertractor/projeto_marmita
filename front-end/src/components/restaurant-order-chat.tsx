import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { menusApi } from '@/services/menus';
import { ordersApi } from '@/services/orders';
import { adminOrderPath, ROUTES } from '@/routes/constants';
import type { Order } from '@/types/domain';
import { formatDate, todayISODate, formatDateTime } from '@/utils/format';
import {
  getSeenRestaurantOrderIds,
  markRestaurantOrdersSeen,
} from '@/utils/restaurant-chat-seen';
import {
  getSeenRestaurantMenuChatIds,
  markRestaurantMenuChatSeen,
  syncRestaurantMenuChatEvents,
  type RestaurantMenuChatEvent,
} from '@/utils/restaurant-chat-menu-events';
import { cn } from '@/lib/utils';

const TIGELA_CHAT_SRC = '/tigela_logo_chat.png';
const POLL_MS = 4000;
const MAX_ORDER_MESSAGES = 12;

type ChatTimelineItem =
  | { kind: 'menu'; event: RestaurantMenuChatEvent; at: string }
  | { kind: 'order'; order: Order; at: string };

function orderSubmittedAt(order: Order): string {
  const submitted = order.statusHistory
    ?.filter((h) => h.toStatus === 'SUBMITTED')
    .at(-1);
  return formatDateTime(submitted?.createdAt ?? order.updatedAt ?? order.createdAt);
}

function orderTimestamp(order: Order): string {
  const submitted = order.statusHistory
    ?.filter((h) => h.toStatus === 'SUBMITTED')
    .at(-1);
  return submitted?.createdAt ?? order.updatedAt ?? order.createdAt;
}

function orderMessage(order: Order) {
  const qty = order.quantity;
  const marmitas = qty === 1 ? '1 marmita' : `${qty} marmitas`;

  return (
    <div className='space-y-0.5'>
      <p>
        Chegou um novo pedido! O código é{' '}
        <span className='font-semibold tracking-wide'>{order.orderCode}</span>
      </p>
      <p>
        {order.requesterName} - {order.companyName};
      </p>
      <p>
        {marmitas};
      </p>
      <p>{orderSubmittedAt(order)};</p>
    </div>
  );
}

export function RestaurantOrderChat() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(() =>
    user ? getSeenRestaurantOrderIds(user.id) : new Set(),
  );
  const [seenMenuIds, setSeenMenuIds] = useState<Set<string>>(() =>
    user ? getSeenRestaurantMenuChatIds(user.id) : new Set(),
  );
  const [menuEvents, setMenuEvents] = useState<RestaurantMenuChatEvent[]>([]);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const today = todayISODate();
  const { data: submitted = [] } = useQuery({
    queryKey: ['orders', 'restaurant-alerts', 'SUBMITTED', today],
    queryFn: () => ordersApi.list({ status: 'SUBMITTED', menuDate: today }),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', today],
    queryFn: () => menusApi.getByDate(today),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const menuMissing = !menuLoading && menu === null;

  useEffect(() => {
    if (!user || menuLoading) return;
    setMenuEvents(
      syncRestaurantMenuChatEvents(user.id, today, menu ?? null),
    );
  }, [user, today, menu, menuLoading]);

  const ofToday = useMemo(
    () => submitted.filter((order) => order.menuDate.slice(0, 10) === today),
    [submitted, today],
  );

  const orderMessages = useMemo(
    () => ofToday.slice(0, MAX_ORDER_MESSAGES),
    [ofToday],
  );

  const timeline = useMemo(() => {
    const items: ChatTimelineItem[] = [
      ...menuEvents.map((event) => ({
        kind: 'menu' as const,
        event,
        at: event.createdAt,
      })),
      ...orderMessages.map((order) => ({
        kind: 'order' as const,
        order,
        at: orderTimestamp(order),
      })),
    ];
    return items.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [menuEvents, orderMessages]);

  const unreadOrderIds = useMemo(() => {
    return orderMessages
      .filter((order) => !seenOrderIds.has(order.id))
      .map((o) => o.id);
  }, [orderMessages, seenOrderIds]);

  const unreadMenuIds = useMemo(() => {
    return menuEvents
      .filter((event) => {
        if (seenMenuIds.has(event.id)) return false;
        if (event.type === 'menu_missing') return menuMissing;
        return true;
      })
      .map((event) => event.id);
  }, [menuEvents, seenMenuIds, menuMissing]);

  const unreadCount = unreadOrderIds.length + unreadMenuIds.length;
  const hasAlerts = unreadCount > 0;

  useEffect(() => {
    if (!user) return;
    const currentIds = new Set(ofToday.map((o) => o.id));
    const previous = knownIdsRef.current;
    knownIdsRef.current = currentIds;

    if (!previous) return;

    let hasNew = false;
    for (const id of currentIds) {
      if (!previous.has(id)) {
        hasNew = true;
        break;
      }
    }
    if (!hasNew) return;

    void queryClient.invalidateQueries({ queryKey: ['dashboard-restaurant'] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, ofToday, user]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, timeline.length, menuMissing]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next || !user) return;

    if (unreadOrderIds.length > 0) {
      const nextSeen = markRestaurantOrdersSeen(user.id, unreadOrderIds);
      setSeenOrderIds(new Set(nextSeen));
    }

    const visibleMenuIds = menuEvents.map((event) => event.id);
    if (visibleMenuIds.length > 0) {
      const nextSeen = markRestaurantMenuChatSeen(user.id, visibleMenuIds);
      setSeenMenuIds(new Set(nextSeen));
    }
  }

  function handleAccess(orderId: string) {
    if (!user) return;
    const nextSeen = markRestaurantOrdersSeen(user.id, [orderId]);
    setSeenOrderIds(new Set(nextSeen));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type='button'
          aria-label={
            hasAlerts
              ? menuMissing
                ? 'Chat da Tigela, cardápio de hoje pendente'
                : `Chat da Tigela, ${unreadCount} aviso${unreadCount === 1 ? '' : 's'} novo${unreadCount === 1 ? '' : 's'}`
              : 'Chat da Tigela'
          }
          className={cn(
            'fixed right-5 bottom-5 z-40 size-12 rounded-full bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)] ring-1 transition hover:scale-[1.03] hover:shadow-[0_10px_32px_rgba(0,0,0,0.16)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:right-6 md:bottom-6 md:size-16',
            menuMissing ? 'ring-amber-300' : 'ring-[#e8d9c8]',
          )}
        >
          <span className='relative flex size-full items-center justify-center'>
            <img
              src={TIGELA_CHAT_SRC}
              alt=''
              className='size-8 object-contain select-none md:size-12'
              draggable={false}
            />
            {hasAlerts ? (
              <span
                aria-hidden
                className={cn(
                  'absolute top-0 right-0 size-2.5 rounded-full bg-red-500 ring-2 ring-white md:size-3',
                  menuMissing && 'animate-pulse',
                )}
              />
            ) : null}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={isMobile ? 'top' : 'left'}
        align='end'
        sideOffset={12}
        className='w-[min(100vw-2rem,22rem)] overflow-hidden p-0'
      >
        <div className='flex h-[min(70vh,28rem)] flex-col'>
          <div className='flex items-center gap-3 border-b px-3 py-2.5'>
            <Avatar size='default' className='size-9 bg-[#fff7ee]'>
              <AvatarImage src={TIGELA_CHAT_SRC} alt='Tigela' />
              <AvatarFallback>TI</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold'>Tigela</p>
              <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <span className='size-1.5 rounded-full bg-emerald-500' />
                Assistente do restaurante
              </p>
            </div>
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              aria-label='Fechar chat'
              onClick={() => handleOpenChange(false)}
            >
              <X />
            </Button>
          </div>

          <div
            ref={listRef}
            className='flex flex-1 flex-col gap-4 overflow-y-auto bg-muted/30 px-3 py-4'
          >
            {timeline.length === 0 ? (
              <ChatBubble>
                Oi! Por enquanto está tudo quieto por aqui. Assim que um
                solicitante enviar um pedido, eu te aviso na hora.
              </ChatBubble>
            ) : (
              timeline.map((item) => {
                if (item.kind === 'menu') {
                  return (
                    <MenuEventBubble
                      key={item.event.id}
                      event={item.event}
                      menuStillMissing={menuMissing}
                      onNavigate={() => setOpen(false)}
                    />
                  );
                }

                return (
                  <ChatBubble key={item.order.id}>
                    <div className='space-y-2'>
                      <div>{orderMessage(item.order)}</div>
                      <Button size='xs' asChild>
                        <Link
                          to={adminOrderPath(item.order.id)}
                          onClick={() => handleAccess(item.order.id)}
                        >
                          Acessar pedido
                        </Link>
                      </Button>
                    </div>
                  </ChatBubble>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuEventBubble({
  event,
  menuStillMissing,
  onNavigate,
}: {
  event: RestaurantMenuChatEvent;
  menuStillMissing: boolean;
  onNavigate: () => void;
}) {
  if (event.type === 'menu_missing') {
    return (
      <ChatBubble urgent={menuStillMissing}>
        <div className='space-y-2'>
          <p>
            Atenção! O cardápio de hoje ({formatDate(event.menuDate)}) ainda não
            foi lançado.
          </p>
          <p>
            Enquanto isso, os solicitantes ficam sem poder pedir. Quanto antes
            publicar, mais rápido a operação começa.
          </p>
          {menuStillMissing ? (
            <Button size='xs' asChild>
              <Link
                to={`${ROUTES.MENU_EDIT}?date=${event.menuDate}`}
                onClick={onNavigate}
              >
                <BookOpen className='size-3.5' />
                Lançar cardápio agora
              </Link>
            </Button>
          ) : (
            <p className='text-xs text-muted-foreground'>
              {formatDateTime(event.createdAt)}
            </p>
          )}
        </div>
      </ChatBubble>
    );
  }

  return (
    <ChatBubble>
      <div className='space-y-1'>
        <p>
          Cardápio de {formatDate(event.menuDate)} registrado com sucesso!
        </p>
        <p>
          Lançado por{' '}
          <span className='font-semibold'>{event.registeredByName}</span>.
        </p>
        <p className='text-xs text-muted-foreground'>
          {formatDateTime(event.createdAt)}
        </p>
      </div>
    </ChatBubble>
  );
}

function ChatBubble({
  children,
  className,
  urgent = false,
}: {
  children: ReactNode;
  className?: string;
  urgent?: boolean;
}) {
  return (
    <div className={cn('flex max-w-[95%] items-end gap-2', className)}>
      <Avatar size='sm' className='mb-0.5 bg-[#fff7ee]'>
        <AvatarImage src={TIGELA_CHAT_SRC} alt='' />
        <AvatarFallback>TI</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'rounded-2xl rounded-bl-md px-3 py-2 text-sm leading-relaxed shadow-sm ring-1',
          urgent
            ? 'bg-amber-50 text-amber-950 ring-amber-200/80'
            : 'bg-card ring-border/60',
        )}
      >
        {children}
      </div>
    </div>
  );
}
