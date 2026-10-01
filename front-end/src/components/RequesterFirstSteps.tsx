import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { XIcon } from 'lucide-react';
import { FIRST_STEPS, slideBodyText, SlideBody } from '@/components/requester-first-steps-slides';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'requester-first-steps:';
const DRAG_THRESHOLD_PX = 6;

export function isRequesterFirstStepsDone(userId: string) {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === 'done';
  } catch {
    return false;
  }
}

export function markRequesterFirstStepsDone(userId: string) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, 'done');
  } catch {
    // Sem persistência o guia pode reaparecer na próxima visita.
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollContainerToIndex(
  el: HTMLDivElement,
  index: number,
  behavior: ScrollBehavior,
) {
  const child = el.children[index] as HTMLElement | undefined;
  if (!child) return;
  const delta = child.getBoundingClientRect().left - el.getBoundingClientRect().left;
  el.scrollTo({ left: el.scrollLeft + delta, behavior });
}

function nearestSlideIndex(el: HTMLDivElement) {
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
  return closest;
}

type RequesterFirstStepsProps = {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RequesterFirstSteps({
  userId,
  open,
  onOpenChange,
}: RequesterFirstStepsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const lockScrollSync = useRef(false);
  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const [index, setIndex] = useState(0);
  const slide = FIRST_STEPS[index] ?? FIRST_STEPS[0];
  const lastIndex = FIRST_STEPS.length - 1;

  function setActiveIndex(next: number) {
    const clamped = Math.max(0, Math.min(lastIndex, next));
    indexRef.current = clamped;
    setIndex(clamped);
    return clamped;
  }

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(lastIndex, next));
    const el = scrollRef.current;
    const canScroll = Boolean(el && el.clientWidth > 0);
    setActiveIndex(clamped);
    if (!el || !canScroll) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    lockScrollSync.current = true;
    scrollContainerToIndex(el, clamped, behavior);
    window.setTimeout(() => {
      lockScrollSync.current = false;
    }, behavior === 'auto' ? 0 : 450);
  }

  function dismiss() {
    markRequesterFirstStepsDone(userId);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) markRequesterFirstStepsDone(userId);
    onOpenChange(next);
  }

  useLayoutEffect(() => {
    if (!open) return;
    indexRef.current = 0;
    setIndex(0);
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: 0, behavior: 'auto' });
  }, [open]);

  function updateActiveFromScroll() {
    if (lockScrollSync.current) return;
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(nearestSlideIndex(el));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || !dragState.current.active) return;
    const dx = event.clientX - dragState.current.startX;
    if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
    if (!dragState.current.moved) {
      dragState.current.moved = true;
      el.setPointerCapture(event.pointerId);
    }
    el.scrollLeft = dragState.current.scrollLeft - dx;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    const moved = dragState.current.moved;
    dragState.current.active = false;
    if (!el || !moved) return;
    goTo(nearestSlideIndex(el));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(indexRef.current + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(indexRef.current - 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-roledescription='carrossel'
        className={cn(
          'flex max-h-dvh flex-col gap-0 overflow-hidden p-0',
          'max-md:inset-0! max-md:h-dvh! max-md:max-h-dvh! max-md:w-full! max-md:max-w-none! max-md:translate-x-0! max-md:translate-y-0! max-md:rounded-none!',
          'md:max-w-2xl',
        )}
        onKeyDown={onKeyDown}
      >
        <DialogTitle className='sr-only'>Primeiros passos</DialogTitle>
        <DialogDescription className='sr-only'>{slideBodyText(slide)}</DialogDescription>
        <div className='relative flex min-h-12 shrink-0 items-center justify-center px-4 pt-[env(safe-area-inset-top)]'>
          <SlideDots index={index} onSelect={goTo} />
          <DialogClose
            className='absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            aria-label='Fechar'
          >
            <XIcon className='size-4' />
          </DialogClose>
        </div>

        <div
          ref={scrollRef}
          className='flex min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none md:hidden'
          onScroll={updateActiveFromScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {FIRST_STEPS.map((item, itemIndex) => (
            <article
              key={item.id}
              aria-hidden={index !== itemIndex}
              className='flex h-full w-full min-w-full shrink-0 snap-center flex-col items-center justify-center gap-5 px-5'
            >
              <item.Preview />
              <div className='w-full max-w-sm'>
                <h2 className='text-center text-xl font-semibold tracking-tight'>{item.title}</h2>
                <SlideBody slide={item} />
              </div>
            </article>
          ))}
        </div>

        <div className='hidden md:grid md:min-h-110 md:grid-cols-2'>
          <div className='flex items-center justify-center bg-muted/50 px-8 py-8'>
            <slide.Preview />
          </div>
          <div className='flex flex-col justify-between gap-6 px-6 py-8'>
            <div>
              <h2 className='text-xl font-semibold tracking-tight'>{slide.title}</h2>
              <SlideBody slide={slide} />
            </div>
            <StepAction
              isFirst={index === 0}
              isLast={index === lastIndex}
              onBack={() => goTo(index - 1)}
              onFinish={dismiss}
              onNext={() => goTo(index + 1)}
            />
          </div>
        </div>

        <div className='flex shrink-0 px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:hidden'>
          <StepAction
            isFirst={index === 0}
            isLast={index === lastIndex}
            onBack={() => goTo(index - 1)}
            onFinish={dismiss}
            onNext={() => goTo(index + 1)}
          />
        </div>

        <p className='sr-only' aria-live='polite'>
          {slide.title}. {slideBodyText(slide)}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SlideDots({
  index,
  onSelect,
}: {
  index: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className='flex items-center gap-1.5' role='tablist' aria-label='Slides dos primeiros passos'>
      {FIRST_STEPS.map((item, itemIndex) => (
        <button
          key={item.id}
          type='button'
          role='tab'
          aria-selected={index === itemIndex}
          aria-label={item.title}
          className={cn(
            'h-1.5 rounded-full transition-all',
            index === itemIndex ? 'w-4 bg-primary' : 'w-1.5 bg-primary/30',
          )}
          onClick={() => onSelect(itemIndex)}
        />
      ))}
    </div>
  );
}

function StepAction({
  isFirst,
  isLast,
  onBack,
  onFinish,
  onNext,
}: {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onFinish: () => void;
  onNext: () => void;
}) {
  return (
    <div className={cn('flex w-full items-center gap-3', isFirst ? 'justify-end' : 'justify-between')}>
      {isFirst ? null : (
        <Button type='button' variant='outline' onClick={onBack}>
          Voltar
        </Button>
      )}
      <Button type='button' onClick={isLast ? onFinish : onNext}>
        {isLast ? 'Começar' : 'Próximo'}
      </Button>
    </div>
  );
}
