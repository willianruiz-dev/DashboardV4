import "server-only";

const DEFAULT_API_BASE_ADDRESS = "https://apidashboardv2.e-city.co/";

export const BACKEND_API_KEY_HEADER = "DashboardKeyId";

export interface BackendConfig {
  apiBaseAddress: URL;
  apiKeyId: string;
}

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

function isUnsafePathSegment(segment: string): boolean {
  let decodedSegment = segment;

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

  return decodedSegment.length === 0 || decodedSegment === "." || decodedSegment === ".." || decodedSegment.includes("/") || decodedSegment.includes("\\");
}

function parseApiBaseAddress(value: string): URL {
  let apiBaseAddress: URL;

  try {
    apiBaseAddress = new URL(value);
  } catch {
    throw new BackendConfigurationError("API_BASE_ADDRESS must be a valid absolute URL.");
  }

  if (apiBaseAddress.protocol !== "https:") {
    throw new BackendConfigurationError("API_BASE_ADDRESS must use HTTPS.");
  }

  if (apiBaseAddress.username || apiBaseAddress.password || apiBaseAddress.search || apiBaseAddress.hash) {
    throw new BackendConfigurationError("API_BASE_ADDRESS cannot include credentials, a query string, or a hash.");
  }

  if (!apiBaseAddress.pathname.endsWith("/")) {
    apiBaseAddress.pathname = `${apiBaseAddress.pathname}/`;
  }

  return apiBaseAddress;
}

export function getBackendConfig(): BackendConfig {
  const apiKeyId = process.env.DASHBOARD_API_KEY_ID?.trim();

  if (!apiKeyId) {
    throw new BackendConfigurationError("DASHBOARD_API_KEY_ID is not configured on the server.");
  }

  return {
    apiBaseAddress: parseApiBaseAddress(process.env.API_BASE_ADDRESS ?? DEFAULT_API_BASE_ADDRESS),
    apiKeyId,
  };
}

export function createBackendUrl(config: BackendConfig, pathSegments: readonly string[], search: string): URL {
  if (pathSegments.length === 0) {
    throw new BackendConfigurationError("A backend path is required.");
  }

  if (pathSegments.some(isUnsafePathSegment)) {
    throw new BackendConfigurationError("The backend path contains an invalid segment.");
  }

  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = new URL(encodedPath, config.apiBaseAddress);
  targetUrl.search = search;

  return targetUrl;
}
