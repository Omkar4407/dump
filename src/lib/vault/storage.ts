import type { EncryptedVault } from "@/lib/crypto/vault";

function getStorageKey(userId: string) {
  return `dump-encrypted-vault:${userId}`;
}

export function saveEncryptedVault(
  userId: string,
  vault: EncryptedVault,
): void {
  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(vault),
  );
}

export function getEncryptedVault(
  userId: string,
): EncryptedVault | null {
  const stored = localStorage.getItem(
    getStorageKey(userId),
  );

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as EncryptedVault;
  } catch {
    return null;
  }
}

export function deleteStoredVault(
  userId: string,
): void {
  localStorage.removeItem(
    getStorageKey(userId),
  );
}