import { forwardRef, useImperativeHandle } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AnimatedIconHandle, SidebarIcon } from '@/config/sidebar';

/** Adapta ícones do lucide-react para a sidebar (sem animação). */
export function lucideSidebarIcon(Icon: LucideIcon): SidebarIcon {
  const Wrapped = forwardRef<
    AnimatedIconHandle,
    {
      size?: number;
      className?: string;
      animateOnHover?: boolean;
    }
  >(function SidebarLucideIcon({ size = 16, className }, ref) {
    useImperativeHandle(ref, () => ({
      startAnimation: () => undefined,
      stopAnimation: () => undefined,
    }));

    return <Icon size={size} className={className} aria-hidden />;
  });

  Wrapped.displayName = `SidebarIcon(${Icon.displayName ?? 'Lucide'})`;

  return Wrapped as SidebarIcon;
}
