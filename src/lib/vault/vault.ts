import type {
  Memory,
  MemoryAttachment,
  MemoryMetadata,
  MemoryType,
  Vault,
} from "@/types/memory";

import {
  CURRENT_VAULT_VERSION,
} from "@/types/memory";

export function createEmptyVault(): Vault {
  return {
    version:
      CURRENT_VAULT_VERSION,
    memories: [],
  };
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeTags(
  tags: unknown,
): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .filter(
          (tag): tag is string =>
            typeof tag ===
            "string",
        )
        .map((tag) =>
          tag
            .trim()
            .replace(
              /^#/,
              "",
            ),
        )
        .filter(Boolean),
    ),
  ];
}

function normalizeMetadata(
  metadata: unknown,
): MemoryMetadata {
  if (
    !isRecord(metadata)
  ) {
    return {};
  }

  const result: MemoryMetadata =
    {};

  for (
    const [key, value] of
    Object.entries(metadata)
  ) {
    if (
      typeof value !==
      "string"
    ) {
      continue;
    }

    const normalizedKey =
      key.trim();

    if (!normalizedKey) {
      continue;
    }

    result[
      normalizedKey
    ] = value;
  }

  return result;
}

function isMemoryType(
  value: unknown,
): value is MemoryType {
  return [
    "Text",
    "Link",
    "Image",
    "File",
    "Audio",
    "Video",
    "Credential",
    "Code",
    "Other",
  ].includes(
    value as MemoryType,
  );
}

function isAttachmentType(
  value: unknown,
): value is MemoryAttachment["type"] {
  return [
    "Image",
    "File",
    "Audio",
    "Video",
  ].includes(
    value as MemoryAttachment["type"],
  );
}

function normalizeAttachment(
  value: unknown,
): MemoryAttachment | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !==
    "string"
  ) {
    return null;
  }

  if (
    !isAttachmentType(
      value.type,
    )
  ) {
    return null;
  }

  if (
    typeof value.fileName !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.mimeType !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.size !==
      "number" ||
    !Number.isFinite(
      value.size,
    ) ||
    value.size < 0
  ) {
    return null;
  }

  if (
    typeof value.driveFileId !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.encryptionVersion !==
      "number" ||
    value.encryptionVersion !==
      1
  ) {
    return null;
  }

  if (
    typeof value.iv !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.createdAt !==
    "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    type: value.type,
    fileName:
      value.fileName,
    mimeType:
      value.mimeType,
    size: value.size,
    driveFileId:
      value.driveFileId,
    encryptionVersion: 1,
    iv: value.iv,
    createdAt:
      value.createdAt,
  };
}

function normalizeAttachments(
  attachments: unknown,
): MemoryAttachment[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  const normalized: MemoryAttachment[] =
    [];

  for (
    const rawAttachment of
    attachments
  ) {
    const attachment =
      normalizeAttachment(
        rawAttachment,
      );

    if (!attachment) {
      throw new Error(
        "Vault contains an invalid attachment.",
      );
    }

    normalized.push(
      attachment,
    );
  }

  return normalized;
}

function normalizeMemory(
  value: unknown,
): Memory | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !==
    "string"
  ) {
    return null;
  }

  if (
    !isMemoryType(
      value.type,
    )
  ) {
    return null;
  }

  if (
    typeof value.data !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.description !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.createdAt !==
    "string"
  ) {
    return null;
  }

  if (
    typeof value.updatedAt !==
    "string"
  ) {
    return null;
  }

  const attachments =
    normalizeAttachments(
      value.attachments,
    );

  return {
    id: value.id,
    type: value.type,
    data: value.data,
    description:
      value.description,
    tags: normalizeTags(
      value.tags,
    ),
    metadata:
      normalizeMetadata(
        value.metadata,
      ),
    ...(attachments.length >
      0 && {
      attachments,
    }),
    createdAt:
      value.createdAt,
    updatedAt:
      value.updatedAt,
  };
}

export function normalizeVault(
  value: unknown,
): Vault {
  if (!isRecord(value)) {
    throw new Error(
      "Vault data is invalid.",
    );
  }

  if (
    value.version !==
    CURRENT_VAULT_VERSION
  ) {
    throw new Error(
      `Unsupported vault version: ${String(
        value.version,
      )}`,
    );
  }

  if (
    !Array.isArray(
      value.memories,
    )
  ) {
    throw new Error(
      "Vault memories data is invalid.",
    );
  }

  const memories: Memory[] =
    [];

  for (
    const rawMemory of
    value.memories
  ) {
    const memory =
      normalizeMemory(
        rawMemory,
      );

    if (!memory) {
      throw new Error(
        "Vault contains an invalid memory.",
      );
    }

    memories.push(
      memory,
    );
  }

  return {
    version:
      CURRENT_VAULT_VERSION,
    memories,
  };
}

export function createMemory(
  type: MemoryType,
  data: string,
  description: string,
  tags: string[] = [],
  metadata: MemoryMetadata = {},
  attachments: MemoryAttachment[] = [],
): Memory {
  const now =
    new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    type,
    data,
    description,
    tags: [
      ...new Set(
        tags
          .map((tag) =>
            tag.trim(),
          )
          .filter(Boolean),
      ),
    ],
    metadata: {
      ...metadata,
    },
    ...(attachments.length >
      0 && {
      attachments: [
        ...attachments,
      ],
    }),
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
      | "type"
      | "data"
      | "description"
      | "tags"
      | "metadata"
      | "attachments"
    >
  >,
): Vault {
  const memoryExists =
    vault.memories.some(
      (memory) =>
        memory.id ===
        memoryId,
    );

  if (!memoryExists) {
    throw new Error(
      `Memory "${memoryId}" was not found.`,
    );
  }

  return {
    ...vault,
    memories:
      vault.memories.map(
        (memory) =>
          memory.id ===
          memoryId
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
  const memoryExists =
    vault.memories.some(
      (memory) =>
        memory.id ===
        memoryId,
    );

  if (!memoryExists) {
    throw new Error(
      `Memory "${memoryId}" was not found.`,
    );
  }

  return {
    ...vault,
    memories:
      vault.memories.filter(
        (memory) =>
          memory.id !==
          memoryId,
      ),
  };
}