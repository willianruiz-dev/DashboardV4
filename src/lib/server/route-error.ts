import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { BackendApiError, isBackendConfigurationError } from "@/lib/server/backend-client";

export function createApiRouteError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Los datos enviados no son válidos.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  if (error instanceof BackendApiError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        statusCode: error.status,
      },
      { status: error.status },
    );
  }

  if (isBackendConfigurationError(error)) {
    return NextResponse.json(
      {
        message: "La conexión con Dashboard API no está configurada en el servidor.",
        statusCode: 503,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      message: "No fue posible completar la solicitud al servicio.",
      statusCode: 502,
    },
    { status: 502 },
  );
}
