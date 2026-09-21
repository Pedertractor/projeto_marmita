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

export function isMenuItemIconKey(value: string): value is MenuItemIconKey {
  return (MENU_ITEM_ICON_KEYS as readonly string[]).includes(value);
}
