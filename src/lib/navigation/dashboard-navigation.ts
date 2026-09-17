import type { RouteDefinition } from "@/features/auth/schemas";

export interface DashboardNavigationItem {
  children: DashboardNavigationItem[];
  href: string | null;
  id: number;
  title: string;
}

export const DISPENSING_CONTROL_HREF = "/dashboard/transactions/dispensing-control";

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

function cloneNavigationItem(item: DashboardNavigationItem): DashboardNavigationItem {
  return { ...item, children: item.children.map(cloneNavigationItem) };
}

function findNavigationItem(items: readonly DashboardNavigationItem[], href: string): DashboardNavigationItem | null {
  for (const item of items) {
    if (item.href === href) {
      return item;
    }

    const child = findNavigationItem(item.children, href);
    if (child) {
      return child;
    }
  }

  return null;
}

function findNavigationItemByTitle(items: readonly DashboardNavigationItem[], normalizedTitle: string): DashboardNavigationItem | null {
  for (const item of items) {
    if ((item.title ?? "").trim().toLowerCase() === normalizedTitle) {
      return item;
    }

    const child = findNavigationItemByTitle(item.children, normalizedTitle);
    if (child) {
      return child;
    }
  }

  return null;
}

/**
 * Inyecta el ítem "Control de dispensado" en la navegación para roles
 * SuperAdmin (sin depender de registros de ruta en datos): se anida bajo
 * "Transacciones" si existe, o a nivel raíz si no. Si la ruta ya viene
 * asignada al rol en datos, no se duplica.
 */
export function withDispensingControl(items: readonly DashboardNavigationItem[], enabled: boolean): DashboardNavigationItem[] {
  if (!enabled) {
    return [...items];
  }

  const rootItems: DashboardNavigationItem[] = items.map(cloneNavigationItem);
  if (findNavigationItem(rootItems, DISPENSING_CONTROL_HREF)) {
    return rootItems;
  }

  const dispensingItem: DashboardNavigationItem = {
    children: [],
    href: DISPENSING_CONTROL_HREF,
    id: -1,
    title: "Control de dispensado",
  };

  // Preferencia de ubicación: la sección "Transacciones" por título (aunque
  // su ruta maestra esté vacía), luego por enlace de la app; si no existe
  // ninguna, el ítem va a nivel raíz (debajo de "Inicio").
  const host =
    findNavigationItemByTitle(rootItems, "transacciones") ??
    findNavigationItem(rootItems, "/dashboard/transactions") ??
    null;

  if (host) {
    host.children.push(dispensingItem);
  } else {
    rootItems.push(dispensingItem);
  }

  return rootItems;
}
