import "server-only";

const DEFAULT_API_BASE_ADDRESS = "https://apidashboardv2.e-city.co/";
// The legacy React app resolves `/staticfiles${IMG}` from its own deployed origin.
// This is intentionally separate from the API origin, which does not host these files.
const DEFAULT_STATIC_FILES_BASE_ADDRESS = "https://dashboardv2.e-city.co/";

export const BACKEND_API_KEY_HEADER = "DashboardKeyId";

export interface BackendConfig {
  apiBaseAddress: URL;
  apiKeyId: string;
}

export interface StaticFilesConfig {
  staticFilesBaseAddress: URL;
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

function parseServerBaseAddress(variableName: "API_BASE_ADDRESS" | "STATIC_FILES_BASE_ADDRESS", value: string): URL {
  let baseAddress: URL;

  try {
    baseAddress = new URL(value);
  } catch {
    throw new BackendConfigurationError(`${variableName} must be a valid absolute URL.`);
  }

  if (baseAddress.protocol !== "https:") {
    throw new BackendConfigurationError(`${variableName} must use HTTPS.`);
  }

  if (baseAddress.username || baseAddress.password || baseAddress.search || baseAddress.hash) {
    throw new BackendConfigurationError(`${variableName} cannot include credentials, a query string, or a hash.`);
  }

  if (!baseAddress.pathname.endsWith("/")) {
    baseAddress.pathname = `${baseAddress.pathname}/`;
  }

  return baseAddress;
}

function createServerUrl(baseAddress: URL, pathSegments: readonly string[], search: string, targetName: string): URL {
  if (pathSegments.length === 0) {
    throw new BackendConfigurationError(`A ${targetName} path is required.`);
  }

  if (pathSegments.some(isUnsafePathSegment)) {
    throw new BackendConfigurationError(`The ${targetName} path contains an invalid segment.`);
  }

  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = new URL(encodedPath, baseAddress);
  targetUrl.search = search;

  return targetUrl;
}

export function getBackendConfig(): BackendConfig {
  const apiKeyId = process.env.DASHBOARD_API_KEY_ID?.trim();

  if (!apiKeyId) {
    throw new BackendConfigurationError("DASHBOARD_API_KEY_ID is not configured on the server.");
  }

  return {
    apiBaseAddress: parseServerBaseAddress("API_BASE_ADDRESS", process.env.API_BASE_ADDRESS ?? DEFAULT_API_BASE_ADDRESS),
    apiKeyId,
  };
}

export function getStaticFilesConfig(): StaticFilesConfig {
  return {
    staticFilesBaseAddress: parseServerBaseAddress(
      "STATIC_FILES_BASE_ADDRESS",
      process.env.STATIC_FILES_BASE_ADDRESS ?? DEFAULT_STATIC_FILES_BASE_ADDRESS,
    ),
  };
}

export function createBackendUrl(config: BackendConfig, pathSegments: readonly string[], search: string): URL {
  return createServerUrl(config.apiBaseAddress, pathSegments, search, "backend");
}

export function createStaticFilesUrl(config: StaticFilesConfig, pathSegments: readonly string[], search: string): URL {
  return createServerUrl(config.staticFilesBaseAddress, pathSegments, search, "static-file");
}
