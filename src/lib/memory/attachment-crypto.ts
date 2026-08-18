import {
  encryptAttachment,
  decryptAttachment,
  type EncryptedAttachment,
} from "@/lib/crypto/attachment";

import {
  requireVaultSession,
} from "@/lib/vault/session";

export async function encryptFileForVault(
  file: File,
): Promise<EncryptedAttachment> {
  const session =
    requireVaultSession();

  return encryptAttachment(
    session.key,
    file,
  );
}

export async function decryptFileForVault(
  encrypted: EncryptedAttachment,
): Promise<Blob> {
  const session =
    requireVaultSession();

  return decryptAttachment(
    session.key,
    encrypted,
  );
}