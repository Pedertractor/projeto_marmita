import type { LucideIcon } from 'lucide-react';
import {
  Beef,
  CakeSlice,
  Drumstick,
  Egg,
  Fish,
  Leaf,
  Salad,
  Soup,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react';

export const MENU_ITEM_ICON_KEYS = [
  'beef',
  'chicken',
  'fish',
  'salad',
  'egg',
  'pasta',
  'soup',
  'vegetarian',
  'dessert',
  'generic',
] as const;

export type MenuItemIconKey = (typeof MENU_ITEM_ICON_KEYS)[number];

export const DEFAULT_MENU_ITEM_ICON_KEY: MenuItemIconKey = 'generic';

export const MENU_ITEM_ICONS: Record<
  MenuItemIconKey,
  { label: string; icon: LucideIcon }
> = {
  beef: { label: 'Carne', icon: Beef },
  chicken: { label: 'Frango', icon: Drumstick },
  fish: { label: 'Peixe', icon: Fish },
  salad: { label: 'Salada', icon: Salad },
  egg: { label: 'Ovo', icon: Egg },
  pasta: { label: 'Massa', icon: Wheat },
  soup: { label: 'Sopa', icon: Soup },
  vegetarian: { label: 'Vegetariano', icon: Leaf },
  dessert: { label: 'Sobremesa', icon: CakeSlice },
  generic: { label: 'Geral', icon: UtensilsCrossed },
};

export function normalizeMenuItemIconKey(
  value?: string | null,
): MenuItemIconKey {
  if (value && value in MENU_ITEM_ICONS) {
    return value as MenuItemIconKey;
  }
  return DEFAULT_MENU_ITEM_ICON_KEY;
}

/** Infere ícone a partir do nome quando o menuItem não está disponível. */
export function iconKeyFromItemName(name: string): MenuItemIconKey {
  const n = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (n.includes('frango')) return 'chicken';
  if (n.includes('carne') || n.includes('bovina')) return 'beef';
  if (n.includes('peixe')) return 'fish';
  if (n.includes('salada')) return 'salad';
  if (n.includes('ovo')) return 'egg';
  if (n.includes('arroz') || n.includes('massa') || n.includes('macarr')) {
    return 'pasta';
  }
  if (n.includes('sopa')) return 'soup';
  if (n.includes('feijao') || n.includes('veget')) return 'vegetarian';
  if (n.includes('sobremesa') || n.includes('doce')) return 'dessert';
  return DEFAULT_MENU_ITEM_ICON_KEY;
}

export const MENU_ITEM_BADGE_CLASS: Record<MenuItemIconKey, string> = {
  beef: 'bg-primary/10 text-primary',
  chicken: 'bg-primary/10 text-primary',
  fish: 'bg-primary/10 text-primary',
  salad: 'bg-primary/10 text-primary',
  egg: 'bg-primary/10 text-primary',
  pasta: 'bg-primary/10 text-primary',
  soup: 'bg-primary/10 text-primary',
  vegetarian: 'bg-primary/10 text-primary',
  dessert: 'bg-primary/10 text-primary',
  generic: 'bg-primary/10 text-primary',
};
