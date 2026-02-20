import type { ItemCategory } from "@/data/items";

export const ITEM_ICONS: Record<string, string> = {
  Tomato: "🍅",
  Lemon: "🍋",
  Cucumber: "🥒",
  Cabbage: "🥬",
  Cauliflower: "🥦",
  Peas: "🫛",
  "Bottle Gourd": "🥒",
  Brinjal: "🍆",
  "Green Chilli": "🌶️",
  Ginger: "🫚",
  Ladyfinger: "🌿",
  "Ridge Gourd": "🥒",
  "Bitter Gourd": "🥒",
  Radish: "🥕",
  Carrot: "🥕",
  "Apple Gourd": "🥒",
  "Cluster Beans": "🫛",
  Beetroot: "🍠",
  Pumpkin: "🎃",
  "Taro Root": "🫚",
  Corn: "🌽",
  Potato: "🥔",
  Onion: "🧅",
  "Peeled Garlic": "🧄",
  Yam: "🍠",
  "Large Brinjal": "🍆",
  Beans: "🫛",
  "Sweet Potato": "🍠",
  Jackfruit: "🍈",
  "Round Gourd": "🥒",
  "Snake Cucumber": "🥒",
  "Elephant Foot Yam": "🍠",
  "Pointed Gourd": "🥒",
  "Ivy Gourd": "🥒",
  "Lotus Stem": "🌱",
  Spinach: "🥬",
  Coriander: "🌿",
  Mint: "🌿",
  "Spring Onion": "🧅",
  Fenugreek: "🌿",
  "Green Chickpeas": "🫛",
  "Mustard Greens": "🥬",
  "Lemon Grass": "🌾",
  "Lemon Leaves": "🍃",
  "Curry Leaves": "🍃",
  Avocado: "🥑",
  Kiwi: "🥝",
  "Dragon Fruit": "🐉",
  Blueberry: "🫐",
};

const CATEGORY_FALLBACK_ICON: Record<ItemCategory, string> = {
  vegetables: "🥬",
  herbs: "🌿",
  fruits: "🍎",
};

export const getItemIcon = (itemEn: string, category?: ItemCategory | null) => {
  const exact = ITEM_ICONS[itemEn];
  if (exact) return exact;
  if (category) return CATEGORY_FALLBACK_ICON[category];
  return "📦";
};

const CATEGORY_BG: Record<ItemCategory, string> = {
  vegetables: "#d9f99d",
  herbs: "#bbf7d0",
  fruits: "#fed7aa",
};

const CATEGORY_RING: Record<ItemCategory, string> = {
  vegetables: "#65a30d",
  herbs: "#16a34a",
  fruits: "#ea580c",
};

const ICON_CACHE = new Map<string, string>();
const CUSTOM_ICON_BY_ITEM = new Map<string, string>();

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const toShortCode = (itemEn: string) => {
  const words = itemEn
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return "IT";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
};

export const getItemIconImage = (itemEn: string, category?: ItemCategory | null) => {
  const custom = CUSTOM_ICON_BY_ITEM.get(itemEn);
  if (custom) return custom;

  const key = `${itemEn}|${category ?? "none"}`;
  const cached = ICON_CACHE.get(key);
  if (cached) return cached;

  const emoji = getItemIcon(itemEn, category);
  const seed = hashString(itemEn.toLowerCase());
  const hue = seed % 360;
  const accentHue = (hue + 35) % 360;
  const bg = category ? CATEGORY_BG[category] : `hsl(${hue} 72% 90%)`;
  const ring = category ? CATEGORY_RING[category] : "#6b7280";
  const shortCode = toShortCode(itemEn);

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${bg}' />
      <stop offset='100%' stop-color='hsl(${accentHue} 90% 97%)' />
    </linearGradient>
  </defs>
  <circle cx='38' cy='10' r='7' fill='hsl(${accentHue} 90% 85%)' opacity='0.7'/>
  <rect x='8' y='30' width='20' height='10' rx='5' fill='hsl(${hue} 85% 82%)' opacity='0.75'/>
  <rect x='2' y='2' width='44' height='44' rx='12' fill='url(#g)' stroke='${ring}' stroke-width='2'/>
  <text x='24' y='26' text-anchor='middle' font-size='20'>${emoji}</text>
  <text x='24' y='40' text-anchor='middle' font-size='9' font-weight='700' fill='#1f2937'>${shortCode}</text>
</svg>`;

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  ICON_CACHE.set(key, dataUri);
  return dataUri;
};

export const setCustomItemIcon = (itemEn: string, iconUrl: string | null | undefined) => {
  if (!itemEn) return;
  if (iconUrl && iconUrl.trim()) {
    CUSTOM_ICON_BY_ITEM.set(itemEn, iconUrl);
    return;
  }
  CUSTOM_ICON_BY_ITEM.delete(itemEn);
};

export const hydrateCustomItemIcons = (
  rows: Array<{ item_en: string; icon_url?: string | null }>,
) => {
  rows.forEach((row) => {
    setCustomItemIcon(row.item_en, row.icon_url ?? null);
  });
};
