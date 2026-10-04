import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

// Application-level encryption for sensitive health values such as weight and
// body measurements (security item 5). The database only ever sees ciphertext.
// Format: "v1.<iv>.<tag>.<ciphertext>", each part base64url.

const VERSION = "v1";

export function parseKey(raw: string | undefined): Buffer {
  if (!raw) throw new Error("HEALTH_DATA_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("HEALTH_DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function encryptWith(key: Buffer, plaintext: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function decryptWith(key: Buffer, payload: string, aad: string): string {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error("Unrecognised ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

let cachedKey: Buffer | undefined;
function healthDataKey() {
  cachedKey ??= parseKey(serverEnv().healthDataEncryptionKey);
  return cachedKey;
}

/**
 * The user id is bound in as associated data, so a ciphertext copied into
 * another user's row fails to decrypt.
 */
export function encryptHealthValue(userId: string, value: string) {
  return encryptWith(healthDataKey(), value, userId);
}

export function decryptHealthValue(userId: string, payload: string) {
  return decryptWith(healthDataKey(), payload, userId);
}

export function hasHealthDataKey() {
  return Boolean(serverEnv().healthDataEncryptionKey);
}
