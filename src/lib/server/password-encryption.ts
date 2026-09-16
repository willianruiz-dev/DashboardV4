import "server-only";

import { constants, publicEncrypt } from "node:crypto";

import { BackendConfigurationError } from "@/lib/server/backend-config";

function normalizePublicKey(value: string): string {
  const normalizedValue = value.trim().replace(/\\n/g, "\n");

  if (normalizedValue.includes("-----BEGIN PUBLIC KEY-----")) {
    return normalizedValue;
  }

  const legacyKeyLines = normalizedValue.split("_").filter((line) => line.length > 0);
  if (legacyKeyLines.length === 0) {
    throw new BackendConfigurationError("DASHBOARD_RSA_PUBLIC_KEY is empty.");
  }

  return ["-----BEGIN PUBLIC KEY-----", ...legacyKeyLines, "-----END PUBLIC KEY-----"].join("\n");
}

function getPublicKey(): string {
  const configuredPublicKey = process.env.DASHBOARD_RSA_PUBLIC_KEY;

  if (!configuredPublicKey) {
    throw new BackendConfigurationError("DASHBOARD_RSA_PUBLIC_KEY is not configured on the server.");
  }

  return normalizePublicKey(configuredPublicKey);
}

/**
 * Matches RSACryptoServiceProvider.Decrypt(ciphertext, true) in Dashboard V2:
 * RSA-OAEP with SHA-1, encoded as Base64.
 */
export function encryptLegacyPassword(password: string): string {
  try {
    return publicEncrypt(
      {
        key: getPublicKey(),
        oaepHash: "sha1",
        padding: constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(password, "utf8"),
    ).toString("base64");
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      throw error;
    }

    throw new BackendConfigurationError("DASHBOARD_RSA_PUBLIC_KEY could not be used for RSA-OAEP encryption.");
  }
}
