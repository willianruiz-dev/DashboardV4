"use client";

/* eslint-disable @next/next/no-img-element -- Files are authenticated, dynamic legacy assets served by the same-origin /staticfiles proxy. */

import { ImageOff } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface BackendStaticImageProps {
  alt: string;
  className?: string;
  fallback?: ReactNode;
  height: number;
  src: string | null;
  width: number;
}

/**
 * Uses a native image so the browser requests the authenticated same-origin URL directly.
 * Next's optimizer is deliberately bypassed: it cannot forward a dashboard session to an
 * upstream asset and would change the legacy `/staticfiles/...` request contract.
 */
export function BackendStaticImage({ alt, className, fallback, height, src, width }: BackendStaticImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageUnavailable = !src || failedSource === src;

  if (imageUnavailable) {
    return (
      <span
        aria-label={`${alt}: imagen no disponible`}
        className={cn("flex shrink-0 items-center justify-center rounded-md border bg-secondary text-muted-foreground", className)}
        role="img"
        style={{ height, width }}
      >
        {fallback ?? <ImageOff aria-hidden="true" className="size-4" />}
      </span>
    );
  }

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary", className)} style={{ height, width }}>
      <img
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        decoding="async"
        height={height}
        loading="lazy"
        onError={() => setFailedSource(src)}
        src={src}
        width={width}
      />
    </span>
  );
}
