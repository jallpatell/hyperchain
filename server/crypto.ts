import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32; 
// binary operating at 62 Bits

// Get or create encryption key from environment
function getEncryptionKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY;
  if (!keyStr) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY environment variable is required in production"
      );
    }
    // Development: Use a default key (NOT SECURE - DO NOT USE IN PRODUCTION)
    return crypto.scryptSync("default-dev-key", "salt", 32);
  }

  // If key is hex (64 chars = 32 bytes in hex), decode it
  if (keyStr.length === 64 && /^[a-f0-9]+$/i.test(keyStr)) {
    return Buffer.from(keyStr, "hex");
  }

  // Otherwise, use scrypt to derive key from string
  return crypto.scryptSync(keyStr, "salt", 32);
}


export function encrypt(data: any): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  const stringData = typeof data === "string" ? data : JSON.stringify(data);
  const encrypted = cipher.update(stringData, "utf8", "hex") +
    cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  const combined = iv.toString("hex") +
    authTag.toString("hex") +
    encrypted;

  return Buffer.from(combined, "hex").toString("base64");
}


export function decrypt(encryptedData: string, asJSON: boolean = true): any {
  const key = getEncryptionKey();

  const combined = Buffer.from(encryptedData, "base64").toString("hex");

  // Extract IV (24 hex chars = 12 bytes)
  const iv = Buffer.from(combined.slice(0, 24), "hex");

  // Extract auth tag (32 hex chars = 16 bytes)
  const authTag = Buffer.from(combined.slice(24, 56), "hex");

  // Extract encrypted data
  const encrypted = combined.slice(56);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(encrypted, "hex", "utf8") +
    decipher.final("utf8");

  return asJSON ? JSON.parse(decrypted) : decrypted;
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
