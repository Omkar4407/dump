import {
  decryptVault,
  encryptVault,
  type EncryptedVault,
} from "@/lib/crypto/vault";

import type {
  Memory,
  Vault,
} from "@/types/memory";

export function createEmptyVault(): Vault {
  return {
    version: 1,
    memories: [],
  };
}

export async function encryptDUMPVault(
  password: string,
  vault: Vault,
): Promise<EncryptedVault> {
  return encryptVault(password, vault);
}

export async function decryptDUMPVault(
  password: string,
  encryptedVault: EncryptedVault,
): Promise<Vault> {
  return decryptVault<Vault>(
    password,
    encryptedVault,
  );
}

export function createMemory(
  type: Memory["type"],
  data: string,
  description: string,
): Memory {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type,
    data,
    description,
    createdAt: now,
    updatedAt: now,
  };
}

export function addMemory(
  vault: Vault,
  memory: Memory,
): Vault {
  return {
    ...vault,
    memories: [
      memory,
      ...vault.memories,
    ],
  };
}

export function updateMemory(
  vault: Vault,
  memoryId: string,
  updates: Partial<
    Pick<
      Memory,
      "type" | "data" | "description"
    >
  >,
): Vault {
  return {
    ...vault,
    memories: vault.memories.map(
      (memory) =>
        memory.id === memoryId
          ? {
              ...memory,
              ...updates,
              updatedAt:
                new Date().toISOString(),
            }
          : memory,
    ),
  };
}

export function deleteMemory(
  vault: Vault,
  memoryId: string,
): Vault {
  return {
    ...vault,
    memories: vault.memories.filter(
      (memory) =>
        memory.id !== memoryId,
    ),
  };
}