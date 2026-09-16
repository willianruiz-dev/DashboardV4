/**
 * Converts a database-backed legacy file path into the same-origin static-file route.
 * This module deliberately has no client directive so it can be used by both server
 * layouts and interactive components without turning a server import into a client
 * reference.
 */
function decodeStaticPathSegment(segment: string): string {
  let decodedSegment = segment;

  // Treat repeatedly encoded path separators and traversal as unsafe too.
  for (let index = 0; index < 4; index += 1) {
    try {
      const nextSegment = decodeURIComponent(decodedSegment);
      if (nextSegment === decodedSegment) {
        break;
      }
      decodedSegment = nextSegment;
    } catch {
      break;
    }
  }

  return decodedSegment;
}

export function backendStaticFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null;
  }

  const normalizedPath = filePath.trim().replaceAll("\\", "/").split(/[?#]/u, 1)[0] ?? "";
  const normalizedValue = normalizedPath.toLocaleLowerCase("en-US");
  if (!normalizedPath || normalizedValue === "null" || normalizedValue === "undefined") {
    return null;
  }

  const pathWithoutOrigin = normalizedPath.replace(/^https?:\/\/[^/]+/iu, "");
  const allSegments = pathWithoutOrigin.split("/").filter(Boolean).map(decodeStaticPathSegment);
  const staticfilesIndex = allSegments.findIndex((segment) => segment.toLocaleLowerCase("en-US") === "staticfiles");
  const segments = staticfilesIndex >= 0 ? allSegments.slice(staticfilesIndex + 1) : allSegments;

  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return null;
  }

  return `/staticfiles/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}
