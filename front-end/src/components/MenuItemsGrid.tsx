import {
  MenuItemToggleButton,
  type MenuItemToggleItem,
} from '@/components/MenuItemToggleButton';

type MenuItemsGridProps = {
  items: MenuItemToggleItem[];
  selectedIds: string[];
  onToggle: (itemId: string) => void;
  disabled?: boolean;
};

export function MenuItemsGrid({
  items,
  selectedIds,
  onToggle,
  disabled = false,
}: MenuItemsGridProps) {
  return (
    <ul className='hidden gap-2 md:grid md:grid-cols-2' role='list'>
      {items.map((item) => (
        <li key={item.id} role='listitem'>
          <MenuItemToggleButton
            item={item}
            checked={selectedIds.includes(item.id)}
            disabled={disabled}
            onClick={() => onToggle(item.id)}
          />
        </li>
      ))}
    </ul>
  );
}
