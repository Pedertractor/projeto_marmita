import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import type { Order } from '@/types/domain';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const DRAG_THRESHOLD_PX = 6;
const AUTOPLAY_MS = 5000;

type RequesterHomeCarouselProps = {
  todayOrder: Order | undefined;
  ordersLoading: boolean;
  todayOrderHref: string | null;
  onOpenFirstSteps: () => void;
  className?: string;
};

function scrollContainerToIndex(el: HTMLDivElement, index: number) {
  const child = el.children[index] as HTMLElement | undefined;
  if (!child) return;
  const delta = child.getBoundingClientRect().left - el.getBoundingClientRect().left;
  el.scrollTo({
    left: el.scrollLeft + delta,
    behavior: 'smooth',
  });
}

function OrdersSpotlightCard({
  className,
  logoSrc,
  children,
}: {
  className?: string;
  logoSrc: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-31 items-center overflow-hidden rounded-2xl bg-card shadow-card',
        className,
      )}
    >
      <img
        src={logoSrc}
        alt=''
        aria-hidden
        draggable={false}
        className='pointer-events-none absolute top-1/2 -right-5 z-0 h-[118%] w-[46%] max-w-[46%] -translate-y-1/2 object-contain object-right'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-y-0 left-0 z-1 w-[64%] bg-linear-to-r from-card from-72% to-transparent'
      />
      <div className='relative z-10 min-w-0 w-[58%] px-6 py-5'>{children}</div>
    </div>
  );
}

function EmptyOrdersCard({ className }: { className?: string }) {
  return (
    <OrdersSpotlightCard className={className} logoSrc='/tigela_sad_logo.png'>
      <p className='text-base font-semibold tracking-tight'>Pedidos de hoje</p>
      <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>
        Nenhuma solicitação
      </p>
    </OrdersSpotlightCard>
  );
}

function FilledOrdersCard({
  todayOrder,
  className,
}: {
  todayOrder: Order;
  className?: string;
}) {
  return (
    <OrdersSpotlightCard
      className={cn(className, 'transition-colors hover:bg-primary/4')}
      logoSrc='/tigela_logo.png'
    >
      <p className='text-base font-semibold tracking-tight'>Pedidos de hoje</p>
      <p className='mt-2 font-medium tracking-tight'>#{todayOrder.orderCode}</p>
      <div className='mt-2'>
        <OrderStatusBadge status={todayOrder.status} compact />
      </div>
    </OrdersSpotlightCard>
  );
}

export function RequesterHomeCarousel({
  todayOrder,
  ordersLoading,
  todayOrderHref,
  onOpenFirstSteps,
  className,
}: RequesterHomeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const pauseReasons = useRef(new Set<string>());
  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0);

  const slides = [
    { id: 'pedido', label: 'Pedidos de hoje' },
    { id: 'primeiros-passos', label: 'Primeiros passos' },
  ] as const;

  function pause(reason: string) {
    pauseReasons.current.add(reason);
  }

  function resume(reason: string) {
    pauseReasons.current.delete(reason);
  }

  function updateActive() {
    const el = scrollRef.current;
    if (!el) return;
    const center = el.getBoundingClientRect().left + el.clientWidth / 2;
    let closest = 0;
    let min = Number.POSITIVE_INFINITY;
    Array.from(el.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - center);
      if (dist < min) {
        min = dist;
        closest = index;
      }
    });
    activeRef.current = closest;
    setActive(closest);
  }

  function scrollToIndex(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    scrollContainerToIndex(el, index);
  }

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;

    const id = window.setInterval(() => {
      if (pauseReasons.current.size > 0 || dragState.current.active) return;
      const el = scrollRef.current;
      if (!el) return;
      const next = (activeRef.current + 1) % slides.length;
      scrollContainerToIndex(el, next);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [cycle, slides.length]);

  function onBlur(e: FocusEvent<HTMLElement>) {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    resume('focus');
  }

  function restartAutoplay() {
    setCycle((value) => value + 1);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    pause('pointer');
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || !dragState.current.active) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
    if (!dragState.current.moved) {
      dragState.current.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = dragState.current.scrollLeft - dx;
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragState.current.active = false;
    resume('pointer');
    restartAutoplay();
  }

  function wrapInteractive(content: ReactNode, options: {
    href?: string | null;
    onClick?: () => void;
    ariaLabel: string;
  }) {
    const handleActivate = (event: { preventDefault: () => void }) => {
      if (dragState.current.moved) {
        event.preventDefault();
        return;
      }
      options.onClick?.();
    };

    if (options.href) {
      return (
        <Link
          to={options.href}
          className='block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={options.ariaLabel}
          onClick={handleActivate}
        >
          {content}
        </Link>
      );
    }

    if (options.onClick) {
      return (
        <button
          type='button'
          className='block h-full w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={options.ariaLabel}
          onClick={handleActivate}
        >
          {content}
        </button>
      );
    }

    return content;
  }

  const orderCard = ordersLoading ? (
    <Card className='h-full'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Pedidos de hoje</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>Carregando…</p>
      </CardContent>
    </Card>
  ) : !todayOrder ? (
    <EmptyOrdersCard className='h-full' />
  ) : (
    <FilledOrdersCard todayOrder={todayOrder} className='h-full' />
  );

  const firstStepsCard = (
    <div className='relative flex h-full min-h-31 items-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/22 via-primary/12 to-primary/4 shadow-sm ring-1 ring-primary/10 transition-opacity hover:opacity-95'>
      <img
        src='/tigela_idea_logo.png'
        alt=''
        aria-hidden
        draggable={false}
        className='pointer-events-none absolute top-1/2 -right-5 z-0 h-[118%] w-[46%] max-w-[46%] -translate-y-1/2 object-contain object-right'
      />
      <div className='relative z-10 min-w-0 w-[58%] px-6 py-5'>
        <p className='text-base font-semibold tracking-tight'>Primeiros passos</p>
        <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>
          Veja como solicitar marmitas.
        </p>
      </div>
    </div>
  );

  return (
    <section
      className={cn('flex min-w-0 flex-col gap-2.5', className)}
      aria-roledescription='carrossel'
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) pause('hover');
      }}
      onMouseLeave={() => resume('hover')}
      onFocus={() => pause('focus')}
      onBlur={onBlur}
    >
      <div
        ref={scrollRef}
        className={cn(
          'flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth',
          'touch-pan-x select-none scrollbar-none',
        )}
        onScroll={updateActive}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role='list'
        aria-label='Pedidos de hoje e primeiros passos'
      >
        <article role='listitem' className='w-full min-w-full shrink-0 snap-center'>
          {wrapInteractive(orderCard, {
            href: todayOrderHref,
            ariaLabel:
              todayOrder?.status === 'DRAFT'
                ? 'Continuar pedidos de hoje'
                : todayOrder
                  ? 'Ver pedidos de hoje'
                  : 'Pedidos de hoje',
          })}
        </article>
        <article role='listitem' className='w-full min-w-full shrink-0 snap-center'>
          {wrapInteractive(firstStepsCard, {
            onClick: onOpenFirstSteps,
            ariaLabel: 'Abrir primeiros passos',
          })}
        </article>
      </div>
      <div className='flex justify-center gap-1.5' role='tablist' aria-label='Slides do destaque'>
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type='button'
            role='tab'
            aria-selected={active === index}
            aria-label={slide.label}
            className={cn(
              'h-1.5 rounded-full transition-all',
              active === index ? 'w-4 bg-primary' : 'w-1.5 bg-primary/30',
            )}
            onClick={() => {
              scrollToIndex(index);
              restartAutoplay();
            }}
          />
        ))}
      </div>
    </section>
  );
}
