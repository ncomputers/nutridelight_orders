import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  title: string;
  subtitle: string;
  sidebar: ReactNode;
  mobileNav: ReactNode;
  mobileSticky: boolean;
  onLogout: () => void;
  children: ReactNode;
}

const MainLayout = ({
  title,
  subtitle,
  sidebar,
  mobileNav,
  mobileSticky,
  onLogout,
  children,
}: MainLayoutProps) => {
  return (
    <div className="app-dvh bg-background overflow-hidden md:grid md:grid-cols-[250px_1fr]">
      <aside className="hidden md:flex md:flex-col border-r border-border bg-card sticky top-0 h-[100dvh] overflow-y-auto p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {sidebar}
        <div className="mt-auto">
          <Button variant="outline" className="w-full" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </aside>

      <main className="min-w-0 h-[100dvh] overflow-hidden flex flex-col">
        <header className={`md:hidden bg-card border-b border-border px-3 py-3 ${mobileSticky ? "sticky top-0 z-40" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
          {mobileNav}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-stable-scroll p-3 sm:p-4 md:p-6 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="max-w-5xl">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
