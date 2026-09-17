"use client";

import { Edit3, KeyRound, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { ChangeUserPasswordDialog } from "@/features/users/components/change-user-password-dialog";
import { UserEditorDialog } from "@/features/users/components/user-editor-dialog";
import { VerifyUserPasswordDialog } from "@/features/users/components/verify-user-password-dialog";
import { useDeleteUser, useUpdateUser, useUsers } from "@/features/users/hooks";
import type { DashboardUser, UserUpdateRequest } from "@/features/users/schemas";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";

function displayText(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

function userFullName(user: DashboardUser): string {
  const result = [user.name, user.lastName].filter((part): part is string => Boolean(part?.trim())).join(" ");
  return result || displayText(user.userName, "Usuario sin nombre");
}

function UserAvatar({ user }: { user: DashboardUser }) {
  const source = backendStaticFilePath(user.img);
  const initials = userFullName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <BackendStaticImage
      alt={`Perfil de ${displayText(user.userName)}`}
      className="rounded-full"
      fallback={<span aria-hidden="true" className="text-xs font-semibold text-secondary-foreground">{initials || "U"}</span>}
      fallbackSrc="/images/profile-default.png"
      height={40}
      src={source}
      width={40}
    />
  );
}

function createUserUpdatePayload(user: DashboardUser, status: number): UserUpdateRequest {
  return {
    client: user.client ?? null,
    document: user.document ?? null,
    email: user.email ?? null,
    id: user.id,
    idClient: user.idClient ?? null,
    idRole: user.idRole,
    idTypeDocument: user.idTypeDocument,
    idUserCreated: user.idUserCreated ?? 0,
    idUserUpdated: user.idUserUpdated ?? 0,
    img: user.img ?? null,
    imgExt: user.imgExt ?? null,
    imgList: user.imgList ?? [],
    lastName: user.lastName ?? null,
    name: user.name ?? null,
    phone: user.phone ?? null,
    pwd: null,
    role: user.role ?? null,
    status,
    typeDocument: user.typeDocument ?? null,
    userCreated: user.userCreated ?? null,
    userName: user.userName ?? null,
    userUpdated: user.userUpdated ?? null,
  };
}

export function UsersPage() {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadUsers");
  const canWrite = hasPermission(session, "WriteUsers");
  const canDelete = hasPermission(session, "DelUsers");
  const isRoot = session.role.role?.toLocaleLowerCase() === "root";
  const usersQuery = useUsers(canRead);
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; userId?: number } | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<DashboardUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<DashboardUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardUser | null>(null);
  const users = usersQuery.data ?? [];

  async function toggleStatus(user: DashboardUser, checked: boolean): Promise<void> {
    try {
      await updateUserMutation.mutateAsync(createUserUpdatePayload(user, Number(checked)));
      toast.success(`Estado de ${displayText(user.userName)} actualizado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar el estado del usuario.");
    }
  }

  function requestEdit(user: DashboardUser): void {
    if (isRoot) {
      setEditor({ mode: "edit", userId: user.id });
      return;
    }
    setVerificationTarget(user);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(deleteTarget.id);
      toast.success("Usuario eliminado.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el usuario.");
    }
  }

  const columns: ColumnDef<DashboardUser, unknown>[] = [
      {
        id: "profile",
        cell: ({ row }) => <UserAvatar user={row.original} />,
        header: "Perfil",
        meta: { mobileLabel: "Perfil" },
      },
      {
        accessorKey: "userName",
        cell: ({ row }) => <span className="font-medium">{displayText(row.original.userName)}</span>,
        header: "Usuario",
        meta: { mobileLabel: "Usuario" },
      },
      {
        accessorKey: "document",
        cell: ({ row }) => displayText(row.original.document),
        header: "Documento",
        meta: { mobileLabel: "Documento" },
      },
      {
        accessorKey: "typeDocument",
        cell: ({ row }) => displayText(row.original.typeDocument),
        header: "Tipo de documento",
        meta: { mobileLabel: "Tipo de documento" },
      },
      {
        id: "name",
        cell: ({ row }) => userFullName(row.original),
        header: "Nombre",
        meta: { mobileLabel: "Nombre" },
      },
      {
        accessorKey: "phone",
        cell: ({ row }) => displayText(row.original.phone),
        header: "Teléfono",
        meta: { mobileLabel: "Teléfono" },
      },
      {
        accessorKey: "email",
        cell: ({ row }) => displayText(row.original.email),
        header: "Correo",
        meta: { mobileLabel: "Correo" },
      },
      {
        accessorKey: "role",
        cell: ({ row }) => <Badge variant="secondary">{displayText(row.original.role, "Sin rol")}</Badge>,
        header: "Rol",
        meta: { mobileLabel: "Rol" },
      },
      {
        accessorKey: "status",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              aria-label={`Cambiar estado de ${displayText(row.original.userName)}`}
              checked={Boolean(row.original.status)}
              disabled={!canWrite || updateUserMutation.isPending}
              onCheckedChange={(checked) => void toggleStatus(row.original, checked)}
            />
            <span className="text-sm">{row.original.status ? "Activo" : "Inactivo"}</span>
          </div>
        ),
        header: "Estado",
        meta: { mobileLabel: "Estado" },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {canWrite ? (
              <Button aria-label={`Editar ${displayText(row.original.userName)}`} onClick={() => requestEdit(row.original)} size="icon" type="button" variant="ghost">
                <Edit3 aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {canWrite ? (
              <Button aria-label={`Cambiar contraseña de ${displayText(row.original.userName)}`} onClick={() => setPasswordTarget(row.original)} size="icon" type="button" variant="ghost">
                <KeyRound aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {canDelete && row.original.id !== 1 ? (
              <Button aria-label={`Eliminar ${displayText(row.original.userName)}`} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost">
                <Trash2 aria-hidden="true" className="size-4 text-destructive" />
              </Button>
            ) : null}
          </div>
        ),
        header: "Acciones",
      },
    ];

  if (!canRead) {
    return <ForbiddenState />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        description="Gestiona cuentas, roles asociados y el estado de acceso de los usuarios."
        title="Usuarios"
      />

      {usersQuery.isPending ? <ListSkeleton rows={6} /> : null}
      {!usersQuery.isPending && usersQuery.isError ? <ErrorState description={usersQuery.error instanceof Error ? usersQuery.error.message : "No fue posible cargar los usuarios."} onRetry={() => void usersQuery.refetch()} /> : null}
      {!usersQuery.isPending && !usersQuery.isError && users.length === 0 ? <EmptyState description="No hay usuarios disponibles para este rol." title="No hay usuarios" /> : null}
      {!usersQuery.isPending && !usersQuery.isError && users.length > 0 ? (
        <>
          {canWrite ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setEditor({ mode: "create" })} type="button" variant="success">
                <UserPlus aria-hidden="true" className="size-4" />
                Crear usuario
              </Button>
              <p className="text-sm text-muted-foreground">
                {users.length} usuario{users.length === 1 ? "" : "s"} registrado{users.length === 1 ? "" : "s"}.
              </p>
            </div>
          ) : null}
          <ResponsiveDataTable
            columns={columns}
            data={users}
            getCardDescription={(user) => `${displayText(user.role, "Sin rol")} · ${displayText(user.email)}`}
            getCardTitle={userFullName}
            getRowId={(user) => String(user.id)}
            label="Listado de usuarios"
          />
        </>
      ) : null}

      {editor ? (
        <UserEditorDialog
          existingUsers={users}
          mode={editor.mode}
          onOpenChange={(open) => {
            if (!open) {
              setEditor(null);
            }
          }}
          open
          userId={editor.userId}
        />
      ) : null}
      {verificationTarget ? (
        <VerifyUserPasswordDialog
          onOpenChange={(open) => {
            if (!open) {
              setVerificationTarget(null);
            }
          }}
          onVerified={() => {
            setEditor({ mode: "edit", userId: verificationTarget.id });
            setVerificationTarget(null);
          }}
          open
          userName={verificationTarget.userName}
        />
      ) : null}
      {passwordTarget ? (
        <ChangeUserPasswordDialog
          document={passwordTarget.document}
          onOpenChange={(open) => {
            if (!open) {
              setPasswordTarget(null);
            }
          }}
          open
          userName={passwordTarget.userName}
        />
      ) : null}
      <DestructiveConfirmationDialog
        isPending={deleteUserMutation.isPending}
        onConfirm={() => void confirmDelete()}
        onOpenChange={(open) => {
          if (!open && !deleteUserMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${displayText(deleteTarget.userName)} (ID ${deleteTarget.id})` : "el usuario seleccionado"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
