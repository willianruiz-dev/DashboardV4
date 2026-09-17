/**
 * Acceso de nivel SuperAdmin resuelto en el frontend por nombre de rol,
 * sin operaciones de datos (la app no expone crear rutas/permisos nuevos
 * para este fin ni se modifica el API legado).
 *
 * Se normalizan mayúsculas, espacios, guiones y guiones bajos para que
 * "SuperAdmin", "super admin", "super-admin" y "Super_Admin" sean equivalentes.
 */
const SUPER_ADMIN_ROLE_NAMES = new Set(["superadmin", "root"]);

export function isSuperAdminRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").trim().toLowerCase().replace(/[\s_\-]+/gu, "");
  return SUPER_ADMIN_ROLE_NAMES.has(normalized);
}
