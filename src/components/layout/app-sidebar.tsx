"use client";

import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  LayoutDashboard,
  MapPinned,
  Network,
  ReceiptText,
  Route,
  Settings2,
  ShieldCheck,
  Tags,
  Users,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DashboardNavigationItem } from "@/lib/navigation/dashboard-navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  navigation: readonly DashboardNavigationItem[];
  onNavigate?: () => void;
}

function NavigationIcon({ className, href }: { className?: string; href: string | null }) {
  const iconProps = {
    "aria-hidden": true,
    className,
  };

  switch (href) {
    case "/dashboard":
      return <LayoutDashboard {...iconProps} />;
    case "/dashboard/alerts":
      return <Bell {...iconProps} />;
    case "/dashboard/clients":
      return <Building2 {...iconProps} />;
    case "/dashboard/masters/currencies":
      return <CircleDollarSign {...iconProps} />;
    case "/dashboard/masters/denominations":
      return <WalletCards {...iconProps} />;
    case "/dashboard/masters/regions":
      return <MapPinned {...iconProps} />;
    case "/dashboard/masters/type-documents":
      return <Tags {...iconProps} />;
    case "/dashboard/offices":
      return <Landmark {...iconProps} />;
    case "/dashboard/paypads":
      return <Settings2 {...iconProps} />;
    case "/dashboard/reports":
      return <ChartNoAxesCombined {...iconProps} />;
    case "/dashboard/roles":
      return <ShieldCheck {...iconProps} />;
    case "/dashboard/routes":
      return <Route {...iconProps} />;
    case "/dashboard/transactions":
      return <ReceiptText {...iconProps} />;
    case "/dashboard/users":
      return <Users {...iconProps} />;
    default:
      return <Network {...iconProps} />;
  }
}

function NavigationItem({ item, onNavigate }: { item: DashboardNavigationItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const hasChildren = item.children.length > 0;
  const isCurrent = item.href === pathname;
  const hasCurrentChild = item.children.some((child) => child.href === pathname);

  if (hasChildren) {
    return (
      <details className="group" open={hasCurrentChild}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary [&::-webkit-details-marker]:hidden">
          <NavigationIcon className="size-4 text-primary" href={item.href} />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="ml-4 grid gap-1 border-l pl-2">
          {item.children.map((child) => (
            <NavigationItem item={child} key={child.id} onNavigate={onNavigate} />
          ))}
        </div>
      </details>
    );
  }

  if (!item.href) {
    return (
      <span className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
        <NavigationIcon className="size-4" href={item.href} />
        <span className="min-w-0 truncate">{item.title}</span>
      </span>
    );
  }

  return (
    <Link
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isCurrent
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-secondary hover:text-secondary-foreground",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <NavigationIcon className="size-4 shrink-0" href={item.href} />
      <span className="min-w-0 truncate">{item.title}</span>
    </Link>
  );
}

export function AppSidebar({ navigation, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside aria-label="Navegación principal" className="grid h-full grid-rows-[auto_1fr] gap-6 bg-card p-4 text-card-foreground">
      <Link aria-label="E-city Software: ir al inicio" className="flex min-h-11 items-center rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/dashboard" onClick={onNavigate}>
        <Image
          alt=""
          className="h-auto w-40 rounded-sm border bg-card p-1"
          height={182}
          priority
          sizes="10rem"
          src="/images/banner_resized.jpg"
          width={448}
        />
      </Link>
      <nav className="grid content-start gap-1 overflow-y-auto pr-1">
        <Link
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-secondary hover:text-secondary-foreground",
          )}
          href="/dashboard"
          onClick={onNavigate}
        >
          <LayoutDashboard aria-hidden="true" className="size-4 shrink-0" />
          Inicio
        </Link>
        {navigation.map((item) => (
          <NavigationItem item={item} key={item.id} onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  );
}
