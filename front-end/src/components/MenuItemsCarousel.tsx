import { useRef } from 'react';
import {
  MenuItemToggleButton,
  type MenuItemToggleItem,
} from '@/components/MenuItemToggleButton';
import { cn } from '@/lib/utils';

type MenuItemsCarouselProps = {
  items: MenuItemToggleItem[];
  selectedIds: string[];
  onToggle: (itemId: string) => void;
  disabled?: boolean;
};

const DRAG_THRESHOLD_PX = 6;

export function MenuItemsCarousel({
  items,
  selectedIds,
  onToggle,
  disabled = false,
}: MenuItemsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
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

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragState.current.active = false;
  }

  function handleToggle(itemId: string) {
    if (dragState.current.moved) return;
    onToggle(itemId);
  }

  return (
    <div className='relative -mx-6 md:hidden'>
      <div
        ref={scrollRef}
        className={cn(
          'flex gap-3 overflow-x-auto overscroll-x-contain px-6 pb-1',
          'snap-x snap-mandatory scroll-smooth',
          'touch-pan-x select-none',
          !disabled && 'cursor-grab active:cursor-grabbing',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        role='list'
        aria-label='Itens do cardápio — arraste para o lado'
      >
        {items.map((item) => {
          const checked = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              role='listitem'
              className='w-[min(92vw,360px)] max-w-full shrink-0 snap-center'
            >
              <MenuItemToggleButton
                item={item}
                checked={checked}
                disabled={disabled}
                onClick={() => handleToggle(item.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
