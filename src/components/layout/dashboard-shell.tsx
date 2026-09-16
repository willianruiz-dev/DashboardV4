"use client";

import { Menu, PanelLeftClose } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { LogoutButton } from "@/components/layout/logout-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { DashboardSession } from "@/features/auth/schemas";
import { DashboardSessionProvider } from "@/features/auth/session-context";
import { buildDashboardNavigation } from "@/lib/navigation/dashboard-navigation";

interface DashboardShellProps {
  children: ReactNode;
  session: DashboardSession;
}

function getDisplayName(session: DashboardSession): string {
  const name = [session.user.name, session.user.lastName].filter((part): part is string => Boolean(part?.trim())).join(" ");
  return name || session.user.userName || "Usuario";
}

function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const navigation = buildDashboardNavigation(session.routes);
  const displayName = getDisplayName(session);
  const roleName = session.role.role ?? session.user.role ?? "Rol sin nombre";

  return (
    <DashboardSessionProvider session={session}>
      <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <aside className={desktopSidebarCollapsed ? "hidden lg:hidden" : "hidden border-r lg:block lg:w-72"}>
        <AppSidebar navigation={navigation} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet onOpenChange={setMobileNavigationOpen} open={mobileNavigationOpen}>
              <SheetTrigger asChild>
                <Button aria-label="Abrir navegación" className="lg:hidden" size="icon" type="button" variant="ghost">
                  <Menu aria-hidden="true" className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navegación</SheetTitle>
                  <SheetDescription>Accesos disponibles para tu rol.</SheetDescription>
                </SheetHeader>
                <AppSidebar navigation={navigation} onNavigate={() => setMobileNavigationOpen(false)} />
              </SheetContent>
            </Sheet>

            <Button
              aria-label={desktopSidebarCollapsed ? "Mostrar navegación" : "Ocultar navegación"}
              className="hidden lg:inline-flex"
              onClick={() => setDesktopSidebarCollapsed((current) => !current)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <PanelLeftClose aria-hidden="true" className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Dashboard operativo</p>
              <p className="truncate text-xs text-muted-foreground">E-city</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleName}</p>
            </div>
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              {getInitials(displayName)}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
    </DashboardSessionProvider>
  );
}
