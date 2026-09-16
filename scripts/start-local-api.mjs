import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workingDirectory = process.cwd();
const isDevelopment = process.argv.slice(2).includes("--dev");
const legacyEnvironmentPath = resolve(workingDirectory, "dashboardv2-frontend", ".env.production");
const localEnvironmentPath = resolve(workingDirectory, ".env.local");

/**
 * Reads simple KEY=VALUE environment files without logging their values.
 * The legacy RSA public key uses one physical line (segments separated by `_`).
 */
function readEnvironmentFile(filePath) {
  if (!existsSync(filePath)) {
    return new Map();
  }

  const environment = new Map();
  const content = readFileSync(filePath, "utf8");

  for (const sourceLine of content.split(/\r?\n/u)) {
    const line = sourceLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    environment.set(name, value);
  }

  return environment;
}

function firstConfiguredValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

const localEnvironment = readEnvironmentFile(localEnvironmentPath);
const legacyEnvironment = readEnvironmentFile(legacyEnvironmentPath);

const serverEnvironment = {
  ...process.env,
  API_BASE_ADDRESS: firstConfiguredValue(
    process.env.API_BASE_ADDRESS,
    localEnvironment.get("API_BASE_ADDRESS"),
    legacyEnvironment.get("REACT_APP_BASEADD"),
    "https://apidashboardv2.e-city.co/",
  ),
  STATIC_FILES_BASE_ADDRESS: firstConfiguredValue(
    process.env.STATIC_FILES_BASE_ADDRESS,
    localEnvironment.get("STATIC_FILES_BASE_ADDRESS"),
    "https://dashboardv2.e-city.co/",
  ),
  DASHBOARD_API_KEY_ID: firstConfiguredValue(
    process.env.DASHBOARD_API_KEY_ID,
    localEnvironment.get("DASHBOARD_API_KEY_ID"),
    legacyEnvironment.get("REACT_APP_DKEYID"),
  ),
  DASHBOARD_RSA_PUBLIC_KEY: firstConfiguredValue(
    process.env.DASHBOARD_RSA_PUBLIC_KEY,
    localEnvironment.get("DASHBOARD_RSA_PUBLIC_KEY"),
    legacyEnvironment.get("REACT_APP_PUBKEY"),
  ),
  SESSION_COOKIE_SECURE: firstConfiguredValue(
    process.env.SESSION_COOKIE_SECURE,
    localEnvironment.get("SESSION_COOKIE_SECURE"),
    "false",
  ),
};

const missingConfiguration = [
  ["DASHBOARD_API_KEY_ID", "REACT_APP_DKEYID"],
  ["DASHBOARD_RSA_PUBLIC_KEY", "REACT_APP_PUBKEY"],
].filter(([name]) => !serverEnvironment[name]);

if (missingConfiguration.length > 0) {
  const names = missingConfiguration.map(([currentName, legacyName]) => `${currentName} (${legacyName})`).join(", ");
  throw new Error(
    `No se encontró la configuración local para ${names}. ` +
      "Cree .env.local o mantenga dashboardv2-frontend/.env.production con las variables heredadas.",
  );
}

const nextCliPath = resolve(workingDirectory, "node_modules", "next", "dist", "bin", "next");
const nextCommand = isDevelopment ? "dev" : "start";
const nextProcess = spawn(process.execPath, [nextCliPath, nextCommand, "--hostname", "0.0.0.0"], {
  cwd: workingDirectory,
  env: serverEnvironment,
  stdio: "inherit",
});

nextProcess.on("error", (error) => {
  console.error(`No se pudo iniciar Next.js: ${error.message}`);
  process.exitCode = 1;
});

nextProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
