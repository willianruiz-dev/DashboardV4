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

interface NavigationItemLocation {
  array: DashboardNavigationItem[];
  index: number;
}

function findNavigationItemLocation(
  items: DashboardNavigationItem[],
  href: string,
  normalizedTitle: string,
): NavigationItemLocation | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) {
      continue;
    }

    const matches = item.href === href || (item.title ?? "").trim().toLowerCase() === normalizedTitle;

    if (matches) {
      return { array: items, index };
    }

    const inChildren = findNavigationItemLocation(item.children, href, normalizedTitle);
    if (inChildren) {
      return inChildren;
    }
  }

  return null;
}

/**
 * Inyecta el ítem "Control de dispensado" en la navegación para roles
 * SuperAdmin, **sin depender de registros de ruta en datos**. El módulo
 * queda TOTALMENTE SEPARADO de "Transacciones":
 * 1) Como ítem hermano justo debajo de la entrada "Transacciones" si
 *    existe (por título o por enlace, aunque su ruta maestra esté vacía).
 *    "Transacciones" se conserva intacta: nunca se convierte en grupo.
 * 2) Si no existe esa entrada, a nivel raíz (debajo de "Inicio").
 * Si la ruta ya viniera asignada al rol en datos, no se duplica.
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
  // El módulo va TOTALMENTE SEPARADO: como ítem hermano justo DEBajo de la
  // entrada "Transacciones" (que se conserva intacta, con su enlace
  // original), nunca como hijo, para no alterar la navegación existente.
  const location = findNavigationItemLocation(rootItems, "/dashboard/transactions", "transacciones");

  if (location) {
    location.array.splice(location.index + 1, 0, dispensingItem);
  } else {
    rootItems.push(dispensingItem);
  }

  return rootItems;
}
