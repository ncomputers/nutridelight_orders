import type { ReactNode } from "react";
import type { NavigationModuleItem } from "@/config/navigation";
import TopTabs, { type TopTabItem } from "@/components/TopTabs";

interface ModuleLayoutProps {
  title: string;
  module: NavigationModuleItem | null;
  activeTabPath: string;
  onTabNavigate: (path: string) => void;
  children: ReactNode;
}

const ModuleLayout = ({
  title,
  module,
  activeTabPath,
  onTabNavigate,
  children,
}: ModuleLayoutProps) => {
  const tabs: TopTabItem[] = module?.tabs ?? [];

  return (
    <section className="bg-card rounded-lg border border-border p-4 mb-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h2>
      {tabs.length > 0 && (
        <TopTabs
          tabs={tabs}
          activePath={activeTabPath}
          onNavigate={onTabNavigate}
          className="mb-4"
        />
      )}
      {children}
    </section>
  );
};

export default ModuleLayout;
