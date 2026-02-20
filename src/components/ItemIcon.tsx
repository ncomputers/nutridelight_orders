import type { ItemCategory } from "@/data/items";
import { getItemIconImage } from "@/data/itemIcons";

interface ItemIconProps {
  itemEn: string;
  category?: ItemCategory | null;
  size?: number;
  className?: string;
}

const ItemIcon = ({ itemEn, category = null, size = 20, className = "" }: ItemIconProps) => {
  return (
    <img
      src={getItemIconImage(itemEn, category)}
      alt={`${itemEn} icon`}
      width={size}
      height={size}
      className={`inline-block rounded-md align-middle ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
};

export default ItemIcon;
