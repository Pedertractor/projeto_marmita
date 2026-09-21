import { X } from 'lucide-react';
import { MenuItemIcon } from '@/components/MenuItemIcon';
import {
  iconKeyFromItemName,
  MENU_ITEM_BADGE_CLASS,
  normalizeMenuItemIconKey,
} from '@/config/menu-item-icons';
import { cn } from '@/lib/utils';
import type { MenuItem, OrderMealItem } from '@/types/domain';

type DisplayItem = {
  key: string;
  name: string;
  description?: string | null;
  iconKey: string;
  included: boolean;
};

function resolveIconKey(item: OrderMealItem) {
  if (item.menuItem?.iconKey) {
    return normalizeMenuItemIconKey(item.menuItem.iconKey);
  }
  return iconKeyFromItemName(item.itemName);
}

/** Linha de observação da marmita (exclusões "sem X" + texto livre). */
export function mealObservationText(notes?: string | null): string | null {
  if (!notes?.trim()) return null;
  const parts = notes
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return `Observação: ${parts.join(' ; ')}`;
}

function parseExcludedNames(notes?: string | null): string[] {
  if (!notes?.trim()) return [];
  return notes
    .split(';')
    .map((part) => part.trim())
    .filter((part) => /^sem\s+/i.test(part))
    .map((part) => part.replace(/^sem\s+/i, '').trim().toLowerCase())
    .filter(Boolean);
}

function buildDisplayItems(
  selected: OrderMealItem[],
  menuItems?: MenuItem[] | null,
  notes?: string | null,
): DisplayItem[] {
  if (menuItems && menuItems.length > 0) {
    const selectedIds = new Set(
      selected.map((i) => i.menuItemId).filter((id): id is string => Boolean(id)),
    );
    const selectedNames = new Set(
      selected.map((i) => i.itemName.trim().toLowerCase()),
    );

    return [...menuItems]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => {
        const included =
          selectedIds.has(item.id) ||
          selectedNames.has(item.name.trim().toLowerCase());
        return {
          key: item.id,
          name: item.name,
          description: item.description,
          iconKey: normalizeMenuItemIconKey(item.iconKey),
          included,
        };
      });
  }

  const included = selected.map((item) => ({
    key: item.id,
    name: item.itemName,
    description: item.menuItem?.description,
    iconKey: resolveIconKey(item),
    included: true,
  }));

  const excludedNames = parseExcludedNames(notes);
  const excluded = excludedNames.map((name) => ({
    key: `excluded-${name}`,
    name,
    iconKey: iconKeyFromItemName(name),
    included: false,
  }));

  return [...included, ...excluded];
}

type MealIngredientsBadgesProps = {
  items: OrderMealItem[];
  menuItems?: MenuItem[] | null;
  notes?: string | null;
  className?: string;
};

export function MealIngredientsBadges({
  items,
  menuItems,
  notes,
  className,
}: MealIngredientsBadgesProps) {
  const displayItems = buildDisplayItems(items, menuItems, notes);

  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {displayItems.map((item) =>
        item.included ? (
          <li
            key={item.key}
            className={cn(
              'inline-flex max-w-full flex-col gap-0.5 rounded-2xl px-2.5 py-1.5 text-xs font-medium',
              MENU_ITEM_BADGE_CLASS[
                normalizeMenuItemIconKey(item.iconKey)
              ],
            )}
          >
            <span className='inline-flex items-center gap-1'>
              <MenuItemIcon
                iconKey={item.iconKey}
                size={12}
                className='opacity-90'
              />
              {item.name}
            </span>
            {item.description?.trim() ? (
              <span className='text-[10px] font-normal leading-snug opacity-80'>
                {item.description}
              </span>
            ) : null}
          </li>
        ) : (
          <li
            key={item.key}
            className='inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
          >
            <span className='relative inline-flex size-3 shrink-0 items-center justify-center'>
              <MenuItemIcon
                iconKey={item.iconKey}
                size={12}
                className='opacity-40'
              />
              <X
                className='absolute inset-0 m-auto size-3 stroke-[3]'
                aria-hidden
              />
            </span>
            {item.name}
          </li>
        ),
      )}
    </ul>
  );
}
