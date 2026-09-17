"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changeUserPassword,
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
  userQueryKeys,
  verifyUserPassword,
} from "@/features/users/api";
import type { UserChangePasswordRequest, UserCreateRequest, UserUpdateRequest } from "@/features/users/schemas";

export function useUsers(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getUsers,
    queryKey: userQueryKeys.list(),
  });
}

export function useUser(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un usuario para consultar.");
      }

      return getUser(id);
    },
    queryKey: id === null ? ["users", "detail", "none"] : userQueryKeys.detail(id),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
}

export function useCreateUser() {
  const invalidateUsers = useInvalidateUsers();

  return useMutation({
    mutationFn: (payload: UserCreateRequest) => createUser(payload),
    onSuccess: invalidateUsers,
  });
}

export function useUpdateUser() {
  const invalidateUsers = useInvalidateUsers();

  return useMutation({
    mutationFn: (payload: UserUpdateRequest) => updateUser(payload),
    onSuccess: invalidateUsers,
  });
}

export function useDeleteUser() {
  const invalidateUsers = useInvalidateUsers();

  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: invalidateUsers,
  });
}

export function useVerifyUserPassword() {
  return useMutation({
    mutationFn: (payload: { password: string; userName: string }) => verifyUserPassword(payload),
  });
}

export function useChangeUserPassword() {
  return useMutation({
    mutationFn: (payload: UserChangePasswordRequest) => changeUserPassword(payload),
  });
}
