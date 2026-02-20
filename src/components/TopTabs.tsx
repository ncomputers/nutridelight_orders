import { cn } from "@/lib/utils";

export interface TopTabItem {
  key: string;
  label: string;
  path?: string;
  show?: boolean;
  badgeCount?: number;
}

interface TopTabsKeyModeProps {
  tabs: TopTabItem[];
  activeTab: string;
  onChange: (nextTab: string) => void;
  activePath?: never;
  onNavigate?: never;
  className?: string;
}

interface TopTabsPathModeProps {
  tabs: TopTabItem[];
  activePath: string;
  onNavigate: (nextPath: string) => void;
  activeTab?: never;
  onChange?: never;
  className?: string;
}

type TopTabsProps = TopTabsKeyModeProps | TopTabsPathModeProps;

const TopTabs = (props: TopTabsProps) => {
  const visibleTabs = props.tabs.filter((tab) => tab.show !== false);
  const isPathMode = "onNavigate" in props;

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", props.className)}>
      {visibleTabs.map((tab) => {
        const isActive = isPathMode ? tab.path === props.activePath : tab.key === props.activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              if (isPathMode) {
                if (tab.path) props.onNavigate(tab.path);
                return;
              }
              props.onChange(tab.key);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent",
            )}
            aria-pressed={isActive}
          >
            <span>{tab.label}</span>
            {typeof tab.badgeCount === "number" && tab.badgeCount > 0 && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {tab.badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TopTabs;
