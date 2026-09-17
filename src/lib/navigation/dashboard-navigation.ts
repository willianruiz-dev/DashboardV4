import type { RouteDefinition } from "@/features/auth/schemas";

export interface DashboardNavigationItem {
  children: DashboardNavigationItem[];
  href: string | null;
  id: number;
  title: string;
}

const legacyPathToAppPath: Readonly<Record<string, string>> = {
  "/": "/dashboard",
  "/Admin/Alerts": "/dashboard/alerts",
  "/Admin/Costumers": "/dashboard/clients",
  "/Admin/Masters/Currencies": "/dashboard/masters/currencies",
  "/Admin/Masters/Denominations": "/dashboard/masters/denominations",
  "/Admin/Masters/Regions": "/dashboard/masters/regions",
  "/Admin/Masters/TypeDoc": "/dashboard/masters/type-documents",
  "/Admin/Offices": "/dashboard/offices",
  "/Admin/PayPad": "/dashboard/paypads",
  "/Admin/Roles": "/dashboard/roles",
  "/Admin/Routes": "/dashboard/routes",
  "/Admin/Users": "/dashboard/users",
  "/Reports": "/dashboard/reports",
  "/Transactions": "/dashboard/transactions",
  "/Admin/Transactions/DispensingControl": "/dashboard/transactions/dispensing-control",
};

function createNavigationItem(route: RouteDefinition): DashboardNavigationItem | null {
  if (!route.title?.trim()) {
    return null;
  }

  return {
    children: [],
    href: route.route ? (legacyPathToAppPath[route.route] ?? null) : null,
    id: route.id,
    title: route.title,
  };
}

export function buildDashboardNavigation(routes: readonly RouteDefinition[]): DashboardNavigationItem[] {
  const nodes = new Map<number, DashboardNavigationItem>();
  const parentIds = new Map<number, number | null>();

  for (const route of routes) {
    const item = createNavigationItem(route);
    if (!item || item.href === "/dashboard" || nodes.has(item.id)) {
      continue;
    }

    nodes.set(item.id, item);
    parentIds.set(item.id, route.idFather && route.idFather > 0 ? route.idFather : null);
  }

  const rootItems: DashboardNavigationItem[] = [];

  for (const [id, item] of nodes) {
    const parentId = parentIds.get(id) ?? null;
    const parent = parentId ? nodes.get(parentId) : undefined;

    if (parent && parent.id !== item.id) {
      parent.children.push(item);
      continue;
    }

    rootItems.push(item);
  }

  return rootItems;
}
