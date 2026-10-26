import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeMenu } from "@/components/layout/theme-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceTimeZoneProvider } from "@/components/ui/local-time";
import type { User } from "@/db/schema";

type ShellUser = Pick<User, "name" | "email" | "role" | "theme" | "themeMode">;

export function AppShell({
  user,
  timeZone,
  children,
}: {
  user: ShellUser;
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceTimeZoneProvider timeZone={timeZone}>
      <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="bg-sidebar hidden border-r px-3 py-4 lg:flex lg:flex-col">
          <SidebarNav />
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
            <MobileNav />
            <GlobalSearch />
            <ThemeMenu theme={user.theme} themeMode={user.themeMode} />
            <UserMenu user={{ name: user.name, email: user.email, role: user.role }} />
          </header>
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </WorkspaceTimeZoneProvider>
  );
}
