import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { userEditVerificationRequestSchema } from "@/features/users/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { encryptLegacyPassword } from "@/lib/server/password-encryption";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const verificationResponseSchema = httpEnvelopeSchema(z.boolean().or(z.number().int()).or(z.string()).nullable());

function wasVerified(response: z.infer<typeof verificationResponseSchema>): boolean {
  if (typeof response.response === "boolean") {
    return response.response;
  }

  if (typeof response.response === "number") {
    return response.response > 0;
  }

  if (typeof response.response === "string") {
    return response.response.trim().length > 0;
  }

  return response.statusCode >= 200 && response.statusCode < 300;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const credentials = userEditVerificationRequestSchema.parse(body);
    const response = await requestBackend(["Auth", "VerifyPwd"], verificationResponseSchema, {
      body: JSON.stringify({
        password: encryptLegacyPassword(credentials.password),
        userName: credentials.userName,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!wasVerified(response)) {
      return NextResponse.json(
        {
          message: "Usuario y/o contraseña incorrectos.",
          statusCode: 401,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { message: "Contraseña verificada." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
