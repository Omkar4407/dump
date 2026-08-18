const PBKDF2_ITERATIONS = 600_000;

const KEY_LENGTH = 256;

const SALT_LENGTH = 16;

const IV_LENGTH = 12;

const MAX_CIPHERTEXT_LENGTH =
  50 * 1024 * 1024;

export type EncryptedVault = {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};

function bytesToBase64(
  bytes: Uint8Array,
): string {
  let binary = "";

  for (
    const byte of bytes
  ) {
    binary += String.fromCharCode(
      byte,
    );
  }

  return btoa(binary);
}

function base64ToBytes(
  value: string,
): Uint8Array {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    throw new Error(
      "Invalid encrypted vault data.",
    );
  }

  let binary: string;

  try {
    binary = atob(value);
  } catch {
    throw new Error(
      "Invalid encrypted vault encoding.",
    );
  }

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index <
    binary.length;
    index++
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return bytes;
}

function toArrayBuffer(
  bytes: Uint8Array,
): ArrayBuffer {
  const buffer =
    new ArrayBuffer(
      bytes.byteLength,
    );

  new Uint8Array(
    buffer,
  ).set(bytes);

  return buffer;
}

function validateSalt(
  salt: Uint8Array,
): void {
  if (
    salt.length !==
    SALT_LENGTH
  ) {
    throw new Error(
      "Invalid vault salt.",
    );
  }
}

function validateIv(
  iv: Uint8Array,
): void {
  if (
    iv.length !== IV_LENGTH
  ) {
    throw new Error(
      "Invalid vault initialization vector.",
    );
  }
}

function validateEncryptedVault(
  encryptedVault: EncryptedVault,
): void {
  if (
    !encryptedVault ||
    encryptedVault.version !== 1
  ) {
    throw new Error(
      "Unsupported vault encryption version.",
    );
  }

  if (
    typeof encryptedVault.salt !==
    "string" ||
    typeof encryptedVault.iv !==
    "string" ||
    typeof encryptedVault.ciphertext !==
    "string"
  ) {
    throw new Error(
      "Invalid encrypted vault format.",
    );
  }

  const salt =
    base64ToBytes(
      encryptedVault.salt,
    );

  const iv =
    base64ToBytes(
      encryptedVault.iv,
    );

  const ciphertext =
    base64ToBytes(
      encryptedVault.ciphertext,
    );

  validateSalt(salt);

  validateIv(iv);

  if (
    ciphertext.length === 0
  ) {
    throw new Error(
      "Encrypted vault ciphertext is empty.",
    );
  }

  if (
    ciphertext.length >
    MAX_CIPHERTEXT_LENGTH
  ) {
    throw new Error(
      "Encrypted vault is too large.",
    );
  }
}

export async function deriveVaultKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  if (
    typeof password !==
    "string" ||
    password.length === 0
  ) {
    throw new Error(
      "Vault password is required.",
    );
  }

  validateSalt(salt);

  const passwordBytes =
    new TextEncoder().encode(
      password,
    );

  const passwordKey =
    await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(
        passwordBytes,
      ),
      "PBKDF2",
      false,
      [
        "deriveKey",
      ],
    );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(
        salt,
      ),
      iterations:
        PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: KEY_LENGTH,
    },
    false,
    [
      "encrypt",
      "decrypt",
    ],
  );
}

export function generateVaultSalt():
  Uint8Array {
  return crypto.getRandomValues(
    new Uint8Array(
      SALT_LENGTH,
    ),
  );
}

export async function encryptVaultWithKey(
  key: CryptoKey,
  salt: Uint8Array,
  vault: unknown,
): Promise<EncryptedVault> {
  validateSalt(salt);

  const iv =
    crypto.getRandomValues(
      new Uint8Array(
        IV_LENGTH,
      ),
    );

  const plaintext =
    new TextEncoder().encode(
      JSON.stringify(vault),
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(
          iv,
        ),
      },
      key,
      toArrayBuffer(
        plaintext,
      ),
    );

  const ciphertext =
    new Uint8Array(
      encrypted,
    );

  if (
    ciphertext.length >
    MAX_CIPHERTEXT_LENGTH
  ) {
    throw new Error(
      "Vault is too large to encrypt.",
    );
  }

  return {
    version: 1,
    salt: bytesToBase64(
      salt,
    ),
    iv: bytesToBase64(
      iv,
    ),
    ciphertext:
      bytesToBase64(
        ciphertext,
      ),
  };
}

export async function decryptVaultWithKey<T>(
  key: CryptoKey,
  encryptedVault: EncryptedVault,
): Promise<T> {
  validateEncryptedVault(
    encryptedVault,
  );

  const iv =
    base64ToBytes(
      encryptedVault.iv,
    );

  const ciphertext =
    base64ToBytes(
      encryptedVault.ciphertext,
    );

  try {
    const decrypted =
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: toArrayBuffer(
            iv,
          ),
        },
        key,
        toArrayBuffer(
          ciphertext,
        ),
      );

    const plaintext =
      new TextDecoder().decode(
        decrypted,
      );

    return JSON.parse(
      plaintext,
    ) as T;
  } catch {
    /*
     * Don't reveal whether failure came from
     * authentication/tag validation or malformed
     * plaintext.
     */
    throw new Error(
      "Unable to decrypt the vault. The password or vault data may be invalid.",
    );
  }
}

export async function encryptVault(
  password: string,
  vault: unknown,
): Promise<EncryptedVault> {
  if (!password) {
    throw new Error(
      "Vault password is required.",
    );
  }

  const salt =
    generateVaultSalt();

  const key =
    await deriveVaultKey(
      password,
      salt,
    );

  return encryptVaultWithKey(
    key,
    salt,
    vault,
  );
}

export async function decryptVault<T>(
  password: string,
  encryptedVault: EncryptedVault,
): Promise<T> {
  if (!password) {
    throw new Error(
      "Vault password is required.",
    );
  }

  const salt =
    base64ToBytes(
      encryptedVault.salt,
    );

  validateSalt(salt);

  const key =
    await deriveVaultKey(
      password,
      salt,
    );

  return decryptVaultWithKey<T>(
    key,
    encryptedVault,
  );
}