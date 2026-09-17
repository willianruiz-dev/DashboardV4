"use client";

import { Menu, PanelLeftClose } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { LogoutButton } from "@/components/layout/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { DashboardSession } from "@/features/auth/schemas";
import { DashboardSessionProvider } from "@/features/auth/session-context";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { buildDashboardNavigation, withDispensingControl } from "@/lib/navigation/dashboard-navigation";
import { isSuperAdminRole } from "@/lib/roles/super-admin";

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
  // El "Control de dispensado" es de nivel SuperAdmin: se inyecta en la
  // navegación directamente en el frontend (por nombre de rol), sin
  // depender de registros de ruta en datos ni de cambios al API.
  const navigation = withDispensingControl(
    buildDashboardNavigation(session.routes),
    isSuperAdminRole(session.role.role ?? session.user.role),
  );
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
            <Link aria-label="Ir al inicio de E-city" className="flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/dashboard">
              <Image
                alt=""
                className="h-auto w-28 rounded-sm border bg-card p-0.5 sm:w-32"
                height={182}
                priority
                sizes="(max-width: 640px) 7rem, 8rem"
                src="/images/banner_resized.jpg"
                width={448}
              />
            </Link>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-foreground">Dashboard operativo</p>
              <p className="truncate text-xs text-muted-foreground">E-city</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <ThemeToggle />
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleName}</p>
            </div>
            <BackendStaticImage
              alt={`Perfil de ${displayName}`}
              className="rounded-full"
              fallback={<span aria-hidden="true" className="text-xs font-semibold text-secondary-foreground">{getInitials(displayName)}</span>}
              fallbackSrc="/images/profile-default.png"
              height={40}
              src={backendStaticFilePath(session.user.img)}
              width={40}
            />
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
    </DashboardSessionProvider>
  );
}
