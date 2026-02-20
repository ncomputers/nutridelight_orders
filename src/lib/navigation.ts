import type { NavigationModuleItem } from "@/config/navigation";

export const getCurrentModule = (
  pathname: string,
  items: NavigationModuleItem[],
): NavigationModuleItem | null => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return items.find((item) => normalizedPath.startsWith(item.path)) ?? null;
};
