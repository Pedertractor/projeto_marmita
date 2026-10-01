import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';

type Tip = {
  id: string;
  image: string;
  title: string;
  text: string;
};

const TIPS: Tip[] = [
  {
    id: 'antecedencia',
    image: '/illustrations/best-practices/tip-antecedencia.png',
    title: 'Peça com antecedência',
    text: 'Envie o pedido cedo para o restaurante organizar a produção do dia.',
  },
  {
    id: 'ingredientes',
    image: '/illustrations/best-practices/tip-ingredientes.png',
    title: 'Confira os ingredientes',
    text: 'Leia o cardápio do dia e confira os ingredientes antes de confirmar.',
  },
  {
    id: 'quantidade',
    image: '/illustrations/best-practices/tip-quantidade.png',
    title: 'Peça só o necessário',
    text: 'Solicite a quantidade de marmitas que você vai usar, sem exagero.',
  },
];

const DRAG_THRESHOLD_PX = 6;
const AUTOPLAY_MS = 4000;

function scrollContainerToIndex(el: HTMLDivElement, index: number) {
  const child = el.children[index] as HTMLElement | undefined;
  if (!child) return;
  const delta = child.getBoundingClientRect().left - el.getBoundingClientRect().left;
  el.scrollTo({
    left: el.scrollLeft + delta - (el.clientWidth - child.clientWidth) / 2,
    behavior: 'smooth',
  });
}

export function BestPracticesCarousel({ className }: { className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0);
  const activeRef = useRef(0);
  const pauseReasons = useRef(new Set<string>());

  function pause(reason: string) {
    pauseReasons.current.add(reason);
  }

  function resume(reason: string) {
    pauseReasons.current.delete(reason);
  }

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;

    const id = window.setInterval(() => {
      if (pauseReasons.current.size > 0 || dragState.current.active) return;
      const el = scrollRef.current;
      if (!el) return;
      const next = (activeRef.current + 1) % TIPS.length;
      scrollContainerToIndex(el, next);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [cycle]);

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

  return (
    <section
      className={cn('flex h-full min-w-0 max-w-full flex-col gap-3', className)}
      aria-roledescription='carrossel'
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) pause('hover');
      }}
      onMouseLeave={() => resume('hover')}
      onFocus={() => pause('focus')}
      onBlur={onBlur}
    >
      <h2 className='text-base font-semibold'>Boas práticas</h2>
      <div
        ref={scrollRef}
        className={cn(
          'flex min-h-0 min-w-0 max-w-full flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth',
          'touch-pan-x select-none scrollbar-none',
        )}
        onScroll={updateActive}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        role='list'
        aria-label='Dicas para solicitar marmitas'
      >
        {TIPS.map((tip) => (
          <article
            key={tip.id}
            role='listitem'
            className='relative flex min-h-31 w-[min(100%,calc(100%-1.25rem))] max-w-full shrink-0 snap-center items-center overflow-hidden rounded-2xl bg-card shadow-card lg:h-full lg:min-h-40 lg:w-full'
          >
            <img
              src={tip.image}
              alt=''
              aria-hidden
              draggable={false}
              className='pointer-events-none absolute top-1/2 -right-7 z-0 h-[118%] w-[48%] max-w-[48%] -translate-y-1/2 object-contain object-right'
            />
            <div
              aria-hidden
              className='pointer-events-none absolute inset-y-0 left-0 z-1 w-[64%] bg-linear-to-r from-card from-72% to-transparent'
            />
            <div className='relative z-10 min-w-0 w-[58%] px-4 py-4'>
              <h3 className='text-sm font-semibold'>{tip.title}</h3>
              <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>{tip.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className='flex justify-center gap-1.5' role='tablist' aria-label='Slides das dicas'>
        {TIPS.map((tip, index) => (
          <button
            key={tip.id}
            type='button'
            role='tab'
            aria-selected={active === index}
            aria-label={tip.title}
            className={cn(
              'size-1.5 rounded-full transition-all',
              active === index ? 'w-4 bg-primary' : 'bg-primary/30',
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
