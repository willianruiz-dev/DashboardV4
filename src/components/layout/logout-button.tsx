"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { requestApi } from "@/lib/api/client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout(): Promise<void> {
    setIsPending(true);

    try {
      await requestApi("/api/auth/logout", logoutResponseSchema, {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setIsPending(false);
    }
  }

  return (
    <Button disabled={isPending} onClick={handleLogout} type="button" variant="ghost">
      {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <LogOut aria-hidden="true" className="size-4" />}
      <span>{isPending ? "Cerrando…" : "Salir"}</span>
    </Button>
  );
}

const logoutResponseSchema = z.object({
  message: z.string(),
});
