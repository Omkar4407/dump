const ATTACHMENT_ENCRYPTION_VERSION = 1;

const IV_LENGTH = 12;

const MAX_ATTACHMENT_SIZE =
  100 * 1024 * 1024;

export type EncryptedAttachment = {
  version: 1;
  iv: string;
  ciphertext: Blob;
  mimeType: string;
  fileName: string;
  size: number;
};

function bytesToBase64(
  bytes: Uint8Array,
): string {
  let binary = "";

  const CHUNK_SIZE =
    0x8000;

  for (
    let offset = 0;
    offset < bytes.length;
    offset += CHUNK_SIZE
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset +
            CHUNK_SIZE,
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
    typeof value !==
      "string" ||
    !value
  ) {
    throw new Error(
      "Invalid attachment encryption metadata.",
    );
  }

  let binary: string;

  try {
    binary =
      atob(value);
  } catch {
    throw new Error(
      "Invalid attachment encryption metadata.",
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

function validateFile(
  file: File,
): void {
  if (!(file instanceof File)) {
    throw new Error(
      "Invalid attachment.",
    );
  }

  if (
    file.size <= 0
  ) {
    throw new Error(
      "Attachment cannot be empty.",
    );
  }

  if (
    file.size >
    MAX_ATTACHMENT_SIZE
  ) {
    throw new Error(
      "Attachment exceeds the 100 MB limit.",
    );
  }

  if (
    !file.name.trim()
  ) {
    throw new Error(
      "Attachment filename cannot be empty.",
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
      "Invalid attachment encryption IV.",
    );
  }
}

export async function encryptAttachment(
  key: CryptoKey,
  file: File,
): Promise<EncryptedAttachment> {
  validateFile(file);

  const plaintext =
    new Uint8Array(
      await file.arrayBuffer(),
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
    new Blob(
      [
        encrypted,
      ],
      {
        type:
          "application/octet-stream",
      },
    );

  return {
    version:
      ATTACHMENT_ENCRYPTION_VERSION,

    iv: bytesToBase64(
      iv,
    ),

    ciphertext,

    mimeType:
      file.type ||
      "application/octet-stream",

    fileName: file.name,

    size: file.size,
  };
}

export async function decryptAttachment(
  key: CryptoKey,
  encrypted: EncryptedAttachment,
): Promise<Blob> {
  if (
    encrypted.version !==
    ATTACHMENT_ENCRYPTION_VERSION
  ) {
    throw new Error(
      "Unsupported attachment encryption version.",
    );
  }

  const iv =
    base64ToBytes(
      encrypted.iv,
    );

  validateIv(iv);

  const ciphertext =
    new Uint8Array(
      await encrypted.ciphertext.arrayBuffer(),
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

    return new Blob(
      [decrypted],
      {
        type:
          encrypted.mimeType ||
          "application/octet-stream",
      },
    );
  } catch {
    throw new Error(
      "Unable to decrypt the attachment.",
    );
  }
}

export function getAttachmentEncryptionVersion():
  1 {
  return ATTACHMENT_ENCRYPTION_VERSION;
}