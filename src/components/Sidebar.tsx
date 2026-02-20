import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavigationModuleItem } from "@/config/navigation";

interface SidebarProps {
  modules: NavigationModuleItem[];
  activeModuleKey: string | null;
  onNavigate: (path: string) => void;
  mobile?: boolean;
  className?: string;
}

const Sidebar = ({
  modules,
  activeModuleKey,
  onNavigate,
  mobile = false,
  className,
}: SidebarProps) => {
  const visibleModules = modules.filter((module) => module.show);

  if (mobile) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
        {visibleModules.map((module) => (
          <Button
            key={module.key}
            size="sm"
            variant={activeModuleKey === module.key ? "default" : "outline"}
            onClick={() => onNavigate(module.path)}
          >
            {module.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {visibleModules.map((module) => (
        <Button
          key={module.key}
          variant={activeModuleKey === module.key ? "default" : "outline"}
          className="w-full justify-start"
          onClick={() => onNavigate(module.path)}
        >
          {module.label}
        </Button>
      ))}
    </div>
  );
};

export default Sidebar;
