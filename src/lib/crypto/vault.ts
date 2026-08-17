const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export type EncryptedVault = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

/**
 * Creates a plain ArrayBuffer so TypeScript's Web Crypto
 * BufferSource types are satisfied consistently.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(buffer).set(bytes);

  return buffer;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(passwordBytes),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: KEY_LENGTH,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVault(
  password: string,
  vault: unknown,
): Promise<EncryptedVault> {
  if (!password) {
    throw new Error("Vault password is required.");
  }

  const salt = crypto.getRandomValues(
    new Uint8Array(SALT_LENGTH),
  );

  const iv = crypto.getRandomValues(
    new Uint8Array(IV_LENGTH),
  );

  const key = await deriveKey(password, salt);

  const plaintext = new TextEncoder().encode(
    JSON.stringify(vault),
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
    },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(
      new Uint8Array(encrypted),
    ),
  };
}

export async function decryptVault<T>(
  password: string,
  encryptedVault: EncryptedVault,
): Promise<T> {
  if (!password) {
    throw new Error("Vault password is required.");
  }

  if (encryptedVault.version !== 1) {
    throw new Error(
      "Unsupported vault encryption version.",
    );
  }

  const salt = base64ToBytes(encryptedVault.salt);
  const iv = base64ToBytes(encryptedVault.iv);
  const ciphertext = base64ToBytes(
    encryptedVault.ciphertext,
  );

  const key = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
      },
      key,
      toArrayBuffer(ciphertext),
    );

    const plaintext = new TextDecoder().decode(
      decrypted,
    );

    return JSON.parse(plaintext) as T;
  } catch {
    throw new Error("Incorrect vault password.");
  }
}