const PBKDF2_ITERATIONS = 600_000;

const KEY_LENGTH = 256;

const SALT_LENGTH = 16;

const IV_LENGTH = 12;

const MAX_VAULT_PLAINTEXT_LENGTH =
  40 * 1024 * 1024;

const MAX_CIPHERTEXT_LENGTH =
  MAX_VAULT_PLAINTEXT_LENGTH +
  16;

const BASE64_PATTERN =
  /^[A-Za-z0-9+/]*={0,2}$/;

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

  /*
   * Avoid spreading a potentially large
   * Uint8Array into String.fromCharCode().
   */
  const CHUNK_SIZE = 0x8000;

  for (
    let offset = 0;
    offset < bytes.length;
    offset += CHUNK_SIZE
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset + CHUNK_SIZE,
          bytes.length,
        ),
      );

    binary +=
      String.fromCharCode(
        ...chunk,
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

  /*
   * Reject malformed Base64 before
   * passing it to atob().
   */
  if (
    value.length % 4 !== 0 ||
    !BASE64_PATTERN.test(value)
  ) {
    throw new Error(
      "Invalid encrypted vault encoding.",
    );
  }

  /*
   * Padding may only occur at the end.
   */
  const paddingIndex =
    value.indexOf("=");

  if (
    paddingIndex !== -1 &&
    paddingIndex <
      value.length - 2 &&
    value[paddingIndex + 1] !==
      "="
  ) {
    throw new Error(
      "Invalid encrypted vault encoding.",
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
    iv.length !==
    IV_LENGTH
  ) {
    throw new Error(
      "Invalid vault initialization vector.",
    );
  }
}

function validateEncryptedVault(
  encryptedVault: EncryptedVault,
): {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
} {
  if (
    !encryptedVault ||
    encryptedVault.version !==
      1
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

  return {
    salt,
    iv,
    ciphertext,
  };
}

function validatePlaintextLength(
  plaintext: Uint8Array,
): void {
  if (
    plaintext.length === 0
  ) {
    throw new Error(
      "Vault plaintext is empty.",
    );
  }

  if (
    plaintext.length >
    MAX_VAULT_PLAINTEXT_LENGTH
  ) {
    throw new Error(
      "Vault plaintext is too large.",
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

  if (
    !(key instanceof CryptoKey)
  ) {
    throw new Error(
      "Invalid vault encryption key.",
    );
  }

  const plaintext =
    new TextEncoder().encode(
      JSON.stringify(vault),
    );

  validatePlaintextLength(
    plaintext,
  );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(
        IV_LENGTH,
      ),
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
  if (
    !(key instanceof CryptoKey)
  ) {
    throw new Error(
      "Invalid vault decryption key.",
    );
  }

  const {
    iv,
    ciphertext,
  } =
    validateEncryptedVault(
      encryptedVault,
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
      new Uint8Array(
        decrypted,
      );

    validatePlaintextLength(
      plaintext,
    );

    const decoded =
      new TextDecoder(
        "utf-8",
        {
          fatal: true,
        },
      ).decode(
        plaintext,
      );

    return JSON.parse(
      decoded,
    ) as T;
  } catch {
    /*
     * Do not reveal whether the failure
     * came from:
     *
     * - incorrect password
     * - AES-GCM authentication failure
     * - corrupted ciphertext
     * - invalid UTF-8
     * - invalid JSON
     *
     * All are treated as the same
     * decryption failure.
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
  if (
    typeof password !==
      "string" ||
    password.length === 0
  ) {
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
  if (
    typeof password !==
      "string" ||
    password.length === 0
  ) {
    throw new Error(
      "Vault password is required.",
    );
  }

  /*
   * validateEncryptedVault() performs
   * the complete structural validation,
   * including salt length.
   */
  const {
    salt,
  } =
    validateEncryptedVault(
      encryptedVault,
    );

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