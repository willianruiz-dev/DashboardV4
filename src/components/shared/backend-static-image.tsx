"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
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
 * Keeps legacy static assets on a same-origin route. The route resolves the protected
 * upstream server-side, so session credentials and the upstream URL never reach the browser.
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
      <Image
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        height={height}
        loading="lazy"
        onError={() => setFailedSource(src)}
        src={src}
        unoptimized
        width={width}
      />
    </span>
  );
}
