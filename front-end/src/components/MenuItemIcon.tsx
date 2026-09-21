import {
  DEFAULT_MENU_ITEM_ICON_KEY,
  MENU_ITEM_ICONS,
  normalizeMenuItemIconKey,
} from '@/config/menu-item-icons';
import { cn } from '@/lib/utils';

type MenuItemIconProps = {
  iconKey?: string | null;
  size?: number;
  className?: string;
};

export function MenuItemIcon({
  iconKey,
  size = 18,
  className,
}: MenuItemIconProps) {
  const key = normalizeMenuItemIconKey(iconKey);
  const Icon = MENU_ITEM_ICONS[key].icon;

  return (
    <Icon
      size={size}
      className={cn('shrink-0', className)}
      aria-hidden
    />
  );
}

export function menuItemIconLabel(iconKey?: string | null): string {
  const key = normalizeMenuItemIconKey(iconKey ?? DEFAULT_MENU_ITEM_ICON_KEY);
  return MENU_ITEM_ICONS[key].label;
}
