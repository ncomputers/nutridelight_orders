export type ItemCategory = "vegetables" | "herbs" | "fruits";

type RawCatalogItem = {
  en: string;
  hi: string;
  category: ItemCategory;
};

export interface CatalogItem extends RawCatalogItem {
  code: string;
}

const CATEGORY_CODE_PREFIX: Record<ItemCategory, string> = {
  vegetables: "VEG",
  herbs: "HRB",
  fruits: "FRT",
};

const toItemCode = (category: ItemCategory, en: string) =>
  `${CATEGORY_CODE_PREFIX[category]}_${en
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}`;

export const CATEGORY_LABELS: Record<ItemCategory, { label: string; icon: string }> = {
  vegetables: { label: "Vegetables", icon: "🥦" },
  herbs: { label: "Herbs & Greens", icon: "🌿" },
  fruits: { label: "Premium Fruits", icon: "🥝" },
};

const RAW_CATALOG: RawCatalogItem[] = [
  // Vegetables
  { en: "Tomato", hi: "टमाटर", category: "vegetables" },
  { en: "Lemon", hi: "निम्बू", category: "vegetables" },
  { en: "Cucumber", hi: "खीरा ककड़ी", category: "vegetables" },
  { en: "Cabbage", hi: "पत्ता गोभी", category: "vegetables" },
  { en: "Cauliflower", hi: "फूल गोभी", category: "vegetables" },
  { en: "Peas", hi: "मटरफली", category: "vegetables" },
  { en: "Bottle Gourd", hi: "लौकी", category: "vegetables" },
  { en: "Brinjal", hi: "बैगन", category: "vegetables" },
  { en: "Green Chilli", hi: "हरी मिर्ची", category: "vegetables" },
  { en: "Ginger", hi: "अदरक", category: "vegetables" },
  { en: "Ladyfinger", hi: "भिण्डी", category: "vegetables" },
  { en: "Ridge Gourd", hi: "तरोई", category: "vegetables" },
  { en: "Bitter Gourd", hi: "करेला", category: "vegetables" },
  { en: "Radish", hi: "मूली", category: "vegetables" },
  { en: "Carrot", hi: "गाजर", category: "vegetables" },
  { en: "Apple Gourd", hi: "टिण्डा", category: "vegetables" },
  { en: "Cluster Beans", hi: "ग्वारफली", category: "vegetables" },
  { en: "Beetroot", hi: "चुकन्दर", category: "vegetables" },
  { en: "Pumpkin", hi: "कद्दू", category: "vegetables" },
  { en: "Taro Root", hi: "अरवी", category: "vegetables" },
  { en: "Corn", hi: "भुट्टा", category: "vegetables" },
  { en: "Potato", hi: "आलू", category: "vegetables" },
  { en: "Onion", hi: "प्याज", category: "vegetables" },
  { en: "Peeled Garlic", hi: "लहसुन छिला", category: "vegetables" },
  { en: "Yam", hi: "रतालू", category: "vegetables" },
  { en: "Large Brinjal", hi: "बैगन बड़ा", category: "vegetables" },
  { en: "Beans", hi: "बिन्स", category: "vegetables" },
  { en: "Sweet Potato", hi: "शकरकंद", category: "vegetables" },
  { en: "Jackfruit", hi: "कटहल", category: "vegetables" },
  { en: "Round Gourd", hi: "टिण्डा देसी", category: "vegetables" },
  { en: "Snake Cucumber", hi: "ककड़ी", category: "vegetables" },
  { en: "Elephant Foot Yam", hi: "जिमीकंद", category: "vegetables" },
  { en: "Pointed Gourd", hi: "परवल", category: "vegetables" },
  { en: "Ivy Gourd", hi: "कुंदरू", category: "vegetables" },
  { en: "Lotus Stem", hi: "कमल ककड़ी", category: "vegetables" },

  // Herbs & Greens
  { en: "Spinach", hi: "पालक", category: "herbs" },
  { en: "Coriander", hi: "धनिया", category: "herbs" },
  { en: "Mint", hi: "पुदीना", category: "herbs" },
  { en: "Spring Onion", hi: "हरा प्याज", category: "herbs" },
  { en: "Fenugreek", hi: "मैथी", category: "herbs" },
  { en: "Green Chickpeas", hi: "हरा चना", category: "herbs" },
  { en: "Mustard Greens", hi: "सरसों", category: "herbs" },
  { en: "Lemon Grass", hi: "लेमन ग्रास", category: "herbs" },
  { en: "Lemon Leaves", hi: "लेमन लिवज", category: "herbs" },
  { en: "Curry Leaves", hi: "करी पत्ता", category: "herbs" },

  // Premium Fruits
  { en: "Avocado", hi: "एवोकाडो", category: "fruits" },
  { en: "Kiwi", hi: "कीवी", category: "fruits" },
  { en: "Dragon Fruit", hi: "ड्रैगन फ्रूट", category: "fruits" },
  { en: "Blueberry", hi: "ब्लूबेरी", category: "fruits" },
];

export const CATALOG: CatalogItem[] = RAW_CATALOG.map((item) => ({
  ...item,
  code: toItemCode(item.category, item.en),
}));
