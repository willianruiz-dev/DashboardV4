"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { type ChangeEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLookupClients, useLookupRoles, useLookupTypeDocuments } from "@/features/lookups/hooks";
import { useCreateUser, useUpdateUser, useUser } from "@/features/users/hooks";
import type { DashboardUser, UserCreateRequest, UserEditorFormValues, UserUpdateRequest } from "@/features/users/schemas";
import { userEditorFormSchema } from "@/features/users/schemas";
import { imageFileToBytes } from "@/lib/files/image";

interface UserEditorDialogProps {
  existingUsers: readonly DashboardUser[];
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  userId?: number;
}

function getString(value: string | null | undefined): string {
  return value ?? "";
}

function createFormDefaults(mode: "create" | "edit", user?: DashboardUser): UserEditorFormValues {
  const sharedValues = {
    document: getString(user?.document),
    email: getString(user?.email),
    idClient: user?.idClient ? String(user.idClient) : "",
    idRole: user?.idRole ? String(user.idRole) : "",
    idTypeDocument: user?.idTypeDocument ? String(user.idTypeDocument) : "",
    imgExt: user?.imgExt ?? null,
    imgList: user?.imgList ?? [],
    lastName: getString(user?.lastName),
    name: getString(user?.name),
    phone: getString(user?.phone),
    status: Boolean(user?.status ?? 1),
    userName: getString(user?.userName),
  };

  return mode === "create"
    ? {
        ...sharedValues,
        mode: "create",
        password: "",
        passwordConfirmation: "",
      }
    : {
        ...sharedValues,
        mode: "edit",
        password: "",
        passwordConfirmation: "",
      };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible obtener los datos necesarios para el formulario.";
}

function findDuplicate(
  users: readonly DashboardUser[],
  field: "document" | "userName",
  value: string,
  currentUserId: number | undefined,
): boolean {
  const normalizedValue = value.trim().toLocaleLowerCase();
  return users.some(
    (user) =>
      user.id !== currentUserId &&
      (field === "document" ? user.document : user.userName)?.trim().toLocaleLowerCase() === normalizedValue,
  );
}

export function UserEditorDialog({ existingUsers, mode, onOpenChange, open, userId }: UserEditorDialogProps) {
  const userQuery = useUser(mode === "edit" ? (userId ?? null) : null);
  const clientsQuery = useLookupClients();
  const rolesQuery = useLookupRoles();
  const typeDocumentsQuery = useLookupTypeDocuments();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const form = useForm<UserEditorFormValues>({
    defaultValues: createFormDefaults(mode),
    resolver: zodResolver(userEditorFormSchema),
  });

  const isLoading =
    clientsQuery.isPending ||
    rolesQuery.isPending ||
    typeDocumentsQuery.isPending ||
    (mode === "edit" && userQuery.isPending);
  const loadingError = clientsQuery.error ?? rolesQuery.error ?? typeDocumentsQuery.error ?? userQuery.error;
  const currentUser = mode === "edit" ? userQuery.data : undefined;
  const isPending = createUserMutation.isPending || updateUserMutation.isPending;

  useEffect(() => {
    if (!open || (mode === "edit" && !currentUser)) {
      return;
    }

    form.reset(createFormDefaults(mode, currentUser));
  }, [currentUser, form, mode, open]);

  function closeDialog(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onImageChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }

    try {
      const image = await imageFileToBytes(file);
      form.clearErrors("imgList");
      form.setValue("imgExt", image.extension, { shouldDirty: true });
      form.setValue("imgList", image.values, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      form.setError("imgList", { message: getErrorMessage(error) });
    }
  }

  async function onSubmit(values: UserEditorFormValues): Promise<void> {
    const currentUserId = currentUser?.id;
    if (findDuplicate(existingUsers, "userName", values.userName, currentUserId)) {
      form.setError("userName", { message: "Ya existe un usuario con este nombre." });
      return;
    }
    if (findDuplicate(existingUsers, "document", values.document, currentUserId)) {
      form.setError("document", { message: "Ya existe un usuario con este documento." });
      return;
    }

    const selectedRole = rolesQuery.data?.find((role) => role.id === Number(values.idRole));
    const selectedTypeDocument = typeDocumentsQuery.data?.find((typeDocument) => typeDocument.id === Number(values.idTypeDocument));
    const selectedClient = values.idClient ? clientsQuery.data?.find((client) => client.id === Number(values.idClient)) : undefined;

    if (!selectedRole || !selectedTypeDocument) {
      form.setError("root", { message: "Selecciona opciones válidas para rol y tipo de documento." });
      return;
    }

    const userPayload = {
      client: selectedClient?.name ?? null,
      document: values.document,
      email: values.email,
      id: currentUser?.id ?? 0,
      idClient: selectedClient?.id ?? null,
      idRole: selectedRole.id,
      idTypeDocument: selectedTypeDocument.id,
      idUserCreated: currentUser?.idUserCreated ?? 0,
      idUserUpdated: currentUser?.idUserUpdated ?? 0,
      img: currentUser?.img ?? null,
      imgExt: values.imgExt,
      imgList: values.imgList,
      lastName: values.lastName || null,
      name: values.name,
      phone: values.phone,
      role: selectedRole.role ?? null,
      status: Number(values.status),
      typeDocument: selectedTypeDocument.typeDocument ?? null,
      userCreated: currentUser?.userCreated ?? null,
      userName: values.userName,
      userUpdated: currentUser?.userUpdated ?? null,
    };

    try {
      if (values.mode === "create") {
        const createPayload: UserCreateRequest = {
          ...userPayload,
          pwd: values.password,
        };
        await createUserMutation.mutateAsync(createPayload);
        toast.success("Usuario creado con éxito.");
      } else {
        const updatePayload: UserUpdateRequest = {
          ...userPayload,
          pwd: null,
        };
        await updateUserMutation.mutateAsync(updatePayload);
        toast.success("Usuario actualizado con éxito.");
      }
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: getErrorMessage(error) });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())} open={open}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Crear usuario" : "Editar usuario"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Completa los datos del nuevo usuario y define una contraseña inicial."
              : "Actualiza los datos del usuario. El cambio de contraseña se realiza desde su acción específica."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? <ListSkeleton rows={4} /> : null}
        {!isLoading && loadingError ? <ErrorState description={getErrorMessage(loadingError)} onRetry={() => void Promise.all([clientsQuery.refetch(), rolesQuery.refetch(), typeDocumentsQuery.refetch(), userQuery.refetch()])} /> : null}

        {!isLoading && !loadingError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? (
                <Alert role="alert" variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de usuario</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idTypeDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de documento</FormLabel>
                      <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una opción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {typeDocumentsQuery.data?.map((typeDocument) => (
                            <SelectItem key={typeDocument.id} value={String(typeDocument.id)}>
                              {typeDocument.typeDocument ?? `Tipo ${typeDocument.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento</FormLabel>
                      <FormControl>
                        <Input disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input autoComplete="given-name" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido(s)</FormLabel>
                      <FormControl>
                        <Input autoComplete="family-name" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input autoComplete="tel" disabled={isPending} inputMode="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input autoComplete="email" disabled={isPending} inputMode="email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una opción" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rolesQuery.data?.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)}>
                              {role.role ?? `Rol ${role.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idClient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente asociado</FormLabel>
                      <Select
                        disabled={isPending}
                        onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin cliente asociado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin cliente asociado</SelectItem>
                          {clientsQuery.data?.map((client) => (
                            <SelectItem key={client.id} value={String(client.id)}>
                              {client.name ?? `Cliente ${client.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex min-h-11 flex-row items-center justify-between rounded-md border px-3 py-2">
                      <div className="grid gap-1">
                        <FormLabel>Usuario activo</FormLabel>
                        <p className="text-xs text-muted-foreground">Permite el inicio de sesión del usuario.</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} disabled={isPending} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imgList"
                  render={() => (
                    <FormItem>
                      <FormLabel>Imagen de perfil</FormLabel>
                      <FormControl>
                        <Input accept="image/*" disabled={isPending} onChange={(event) => void onImageChange(event)} type="file" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Opcional. Sólo se aceptan archivos de imagen.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {mode === "create" ? (
                <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña inicial</FormLabel>
                        <FormControl>
                          <Input autoComplete="new-password" disabled={isPending} type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="passwordConfirmation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <Input autoComplete="new-password" disabled={isPending} type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              <DialogFooter>
                <Button disabled={isPending} onClick={closeDialog} type="button" variant="outline">
                  Cancelar
                </Button>
                <Button disabled={isPending} type="submit">
                  {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
                  {isPending ? "Guardando…" : mode === "create" ? "Crear usuario" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
