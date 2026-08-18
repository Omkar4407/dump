import {
    CURRENT_VAULT_VERSION,
    MEMORY_TYPES,
    type Memory,
    type MemoryAttachment,
    type MemoryMetadata,
    type MemoryType,
    type Vault,
  } from "@/types/memory";
  
  export class VaultValidationError
    extends Error
  {
    constructor(
      message: string,
    ) {
      super(message);
  
      this.name =
        "VaultValidationError";
    }
  }
  
  const MAX_MEMORIES = 100_000;
  
  const MAX_MEMORY_DATA_LENGTH =
    10 * 1024 * 1024;
  
  const MAX_MEMORY_DESCRIPTION_LENGTH =
    10_000;
  
  const MAX_TAGS_PER_MEMORY =
    100;
  
  const MAX_TAG_LENGTH =
    200;
  
  const MAX_METADATA_ENTRIES =
    100;
  
  const MAX_METADATA_KEY_LENGTH =
    200;
  
  const MAX_METADATA_VALUE_LENGTH =
    10_000;
  
  const MAX_ATTACHMENTS_PER_MEMORY =
    100;
  
  const MAX_ATTACHMENT_FILENAME_LENGTH =
    1_000;
  
  const MAX_ATTACHMENT_MIME_TYPE_LENGTH =
    255;
  
  const MAX_ATTACHMENT_SIZE =
    100 * 1024 * 1024;
  
  const EXPECTED_ATTACHMENT_IV_LENGTH =
    12;
  
  function isRecord(
    value: unknown,
  ): value is Record<
    string,
    unknown
  > {
    return (
      typeof value ===
        "object" &&
      value !== null &&
      !Array.isArray(value)
    );
  }
  
  function isMemoryType(
    value: unknown,
  ): value is MemoryType {
    return (
      typeof value ===
        "string" &&
      (
        MEMORY_TYPES as readonly string[]
      ).includes(value)
    );
  }
  
  function isAttachmentType(
    value: unknown,
  ): value is MemoryAttachment["type"] {
    return (
      value === "Image" ||
      value === "File" ||
      value === "Audio" ||
      value === "Video"
    );
  }
  
  function requireString(
    value: unknown,
    field: string,
  ): string {
    if (
      typeof value !==
      "string"
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" must be a string.`,
      );
    }
  
    return value;
  }
  
  function validateTimestamp(
    value: string,
    field: string,
  ): void {
    const timestamp =
      Date.parse(value);
  
    if (
      Number.isNaN(timestamp)
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" must be a valid timestamp.`,
      );
    }
  }
  
  function validateBase64(
    value: string,
    field: string,
  ): Uint8Array {
    if (!value) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" cannot be empty.`,
      );
    }
  
    try {
      const binary =
        atob(value);
  
      const bytes =
        new Uint8Array(
          binary.length,
        );
  
      for (
        let index = 0;
        index < binary.length;
        index++
      ) {
        bytes[index] =
          binary.charCodeAt(
            index,
          );
      }
  
      return bytes;
    } catch {
      throw new VaultValidationError(
        `Invalid vault: "${field}" must be valid base64.`,
      );
    }
  }
  
  function validateTags(
    value: unknown,
    field: string,
  ): string[] {
    if (
      value === undefined
    ) {
      return [];
    }
  
    if (
      !Array.isArray(value)
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" must be an array.`,
      );
    }
  
    if (
      value.length >
      MAX_TAGS_PER_MEMORY
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" contains too many tags.`,
      );
    }
  
    const tags: string[] = [];
  
    for (
      let index = 0;
      index < value.length;
      index++
    ) {
      const tag =
        value[index];
  
      if (
        typeof tag !==
        "string"
      ) {
        throw new VaultValidationError(
          `Invalid vault: "${field}[${index}]" must be a string.`,
        );
      }
  
      const normalized =
        tag
          .trim()
          .replace(
            /^#/,
            "",
          );
  
      if (
        !normalized
      ) {
        continue;
      }
  
      if (
        normalized.length >
        MAX_TAG_LENGTH
      ) {
        throw new VaultValidationError(
          `Invalid vault: "${field}[${index}]" is too long.`,
        );
      }
  
      if (
        !tags.includes(
          normalized,
        )
      ) {
        tags.push(
          normalized,
        );
      }
    }
  
    return tags;
  }
  
  function validateMetadata(
    value: unknown,
    field: string,
  ): MemoryMetadata {
    if (
      value === undefined
    ) {
      return {};
    }
  
    if (
      !isRecord(value)
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" must be an object.`,
      );
    }
  
    const entries =
      Object.entries(value);
  
    if (
      entries.length >
      MAX_METADATA_ENTRIES
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" contains too many entries.`,
      );
    }
  
    const metadata:
      MemoryMetadata = {};
  
    for (
      const [
        key,
        rawValue,
      ] of entries
    ) {
      const normalizedKey =
        key.trim();
  
      if (
        !normalizedKey
      ) {
        throw new VaultValidationError(
          `Invalid vault: "${field}" contains an empty key.`,
        );
      }
  
      if (
        normalizedKey.length >
        MAX_METADATA_KEY_LENGTH
      ) {
        throw new VaultValidationError(
          `Invalid vault: "${field}.${normalizedKey}" key is too long.`,
        );
      }
  
      if (
        typeof rawValue !==
        "string"
      ) {
        throw new VaultValidationError(
          `Invalid vault: "${field}.${normalizedKey}" must be a string.`,
        );
      }
  
      if (
        rawValue.length >
        MAX_METADATA_VALUE_LENGTH
      ) {
        throw new VaultValidationError(
          `Invalid vault: "${field}.${normalizedKey}" value is too large.`,
        );
      }
  
      metadata[
        normalizedKey
      ] = rawValue;
    }
  
    return metadata;
  }
  
  function validateAttachment(
    value: unknown,
    index: number,
    memoryIndex: number,
  ): MemoryAttachment {
    const field =
      `memories[${memoryIndex}].attachments[${index}]`;
  
    if (
      !isRecord(value)
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field} is malformed.`,
      );
    }
  
    const id =
      requireString(
        value.id,
        `${field}.id`,
      );
  
    const fileName =
      requireString(
        value.fileName,
        `${field}.fileName`,
      );
  
    const mimeType =
      requireString(
        value.mimeType,
        `${field}.mimeType`,
      );
  
    const driveFileId =
      requireString(
        value.driveFileId,
        `${field}.driveFileId`,
      );
  
    const iv =
      requireString(
        value.iv,
        `${field}.iv`,
      );
  
    const createdAt =
      requireString(
        value.createdAt,
        `${field}.createdAt`,
      );
  
    if (
      !id.trim()
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.id cannot be empty.`,
      );
    }
  
    if (
      !fileName.trim()
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.fileName cannot be empty.`,
      );
    }
  
    if (
      fileName.length >
      MAX_ATTACHMENT_FILENAME_LENGTH
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.fileName is too long.`,
      );
    }
  
    if (
      !mimeType.trim()
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.mimeType cannot be empty.`,
      );
    }
  
    if (
      mimeType.length >
      MAX_ATTACHMENT_MIME_TYPE_LENGTH
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.mimeType is too long.`,
      );
    }
  
    if (
      !driveFileId.trim()
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.driveFileId cannot be empty.`,
      );
    }
  
    if (
      !isAttachmentType(
        value.type,
      )
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.type is not supported.`,
      );
    }
  
    if (
      value.encryptionVersion !==
      1
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.encryptionVersion is not supported.`,
      );
    }
  
    const ivBytes =
      validateBase64(
        iv,
        `${field}.iv`,
      );
  
    if (
      ivBytes.length !==
      EXPECTED_ATTACHMENT_IV_LENGTH
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.iv has an invalid length.`,
      );
    }
  
    if (
      typeof value.size !==
        "number" ||
      !Number.isFinite(
        value.size,
      ) ||
      value.size < 0
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.size must be a valid non-negative number.`,
      );
    }
  
    if (
      value.size >
      MAX_ATTACHMENT_SIZE
    ) {
      throw new VaultValidationError(
        `Invalid vault: ${field}.size exceeds the maximum attachment size.`,
      );
    }
  
    validateTimestamp(
      createdAt,
      `${field}.createdAt`,
    );
  
    return {
      id,
      type: value.type,
      fileName,
      mimeType,
      size: value.size,
      driveFileId,
      encryptionVersion: 1,
      iv,
      createdAt,
    };
  }
  
  function validateAttachments(
    value: unknown,
    memoryIndex: number,
  ): MemoryAttachment[] {
    if (
      value === undefined
    ) {
      return [];
    }
  
    const field =
      `memories[${memoryIndex}].attachments`;
  
    if (
      !Array.isArray(value)
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" must be an array.`,
      );
    }
  
    if (
      value.length >
      MAX_ATTACHMENTS_PER_MEMORY
    ) {
      throw new VaultValidationError(
        `Invalid vault: "${field}" contains too many attachments.`,
      );
    }
  
    const attachments:
      MemoryAttachment[] = [];
  
    const ids =
      new Set<string>();
  
    for (
      let index = 0;
      index < value.length;
      index++
    ) {
      const attachment =
        validateAttachment(
          value[index],
          index,
          memoryIndex,
        );
  
      if (
        ids.has(
          attachment.id,
        )
      ) {
        throw new VaultValidationError(
          `Invalid vault: duplicate attachment ID "${attachment.id}".`,
        );
      }
  
      ids.add(
        attachment.id,
      );
  
      attachments.push(
        attachment,
      );
    }
  
    return attachments;
  }
  
  function validateMemory(
    value: unknown,
    index: number,
  ): Memory {
    if (
      !isRecord(value)
    ) {
      throw new VaultValidationError(
        `Invalid vault: memory at index ${index} is malformed.`,
      );
    }
  
    const id =
      requireString(
        value.id,
        `memories[${index}].id`,
      );
  
    const data =
      requireString(
        value.data,
        `memories[${index}].data`,
      );
  
    const description =
      requireString(
        value.description,
        `memories[${index}].description`,
      );
  
    const createdAt =
      requireString(
        value.createdAt,
        `memories[${index}].createdAt`,
      );
  
    const updatedAt =
      requireString(
        value.updatedAt,
        `memories[${index}].updatedAt`,
      );
  
    if (
      !isMemoryType(
        value.type,
      )
    ) {
      throw new VaultValidationError(
        `Invalid vault: memories[${index}].type is not supported.`,
      );
    }
  
    if (
      !id.trim()
    ) {
      throw new VaultValidationError(
        `Invalid vault: memories[${index}].id cannot be empty.`,
      );
    }
  
    if (
      data.length >
      MAX_MEMORY_DATA_LENGTH
    ) {
      throw new VaultValidationError(
        `Invalid vault: memories[${index}].data is too large.`,
      );
    }
  
    if (
      description.length >
      MAX_MEMORY_DESCRIPTION_LENGTH
    ) {
      throw new VaultValidationError(
        `Invalid vault: memories[${index}].description is too large.`,
      );
    }
  
    validateTimestamp(
      createdAt,
      `memories[${index}].createdAt`,
    );
  
    validateTimestamp(
      updatedAt,
      `memories[${index}].updatedAt`,
    );
  
    const tags =
      validateTags(
        value.tags,
        `memories[${index}].tags`,
      );
  
    const metadata =
      validateMetadata(
        value.metadata,
        `memories[${index}].metadata`,
      );
  
    const attachments =
      validateAttachments(
        value.attachments,
        index,
      );
  
    return {
      id,
      type: value.type,
      data,
      description,
      tags,
      metadata,
      ...(attachments.length >
        0 && {
        attachments,
      }),
      createdAt,
      updatedAt,
    };
  }
  
  function validateVaultV1(
    value: unknown,
  ): Vault {
    if (
      !isRecord(value)
    ) {
      throw new VaultValidationError(
        "Invalid vault: root value must be an object.",
      );
    }
  
    if (
      value.version !== 1
    ) {
      throw new VaultValidationError(
        "Invalid vault: unsupported version.",
      );
    }
  
    if (
      !Array.isArray(
        value.memories,
      )
    ) {
      throw new VaultValidationError(
        "Invalid vault: memories must be an array.",
      );
    }
  
    if (
      value.memories.length >
      MAX_MEMORIES
    ) {
      throw new VaultValidationError(
        "Invalid vault: too many memories.",
      );
    }
  
    const memories =
      value.memories.map(
        (
          memory,
          index,
        ) =>
          validateMemory(
            memory,
            index,
          ),
      );
  
    const ids =
      new Set<string>();
  
    for (
      const memory of memories
    ) {
      if (
        ids.has(memory.id)
      ) {
        throw new VaultValidationError(
          `Invalid vault: duplicate memory ID "${memory.id}".`,
        );
      }
  
      ids.add(memory.id);
    }
  
    return {
      version: 1,
      memories,
    };
  }
  
  function migrateVault(
    value: unknown,
  ): unknown {
    if (
      !isRecord(value)
    ) {
      throw new VaultValidationError(
        "Invalid vault: root value must be an object.",
      );
    }
  
    const version =
      value.version;
  
    if (
      typeof version !==
      "number"
    ) {
      throw new VaultValidationError(
        "Invalid vault: version is missing.",
      );
    }
  
    switch (version) {
      case 1:
        return value;
  
      default:
        throw new VaultValidationError(
          `Vault version ${version} is not supported by this version of DUMP.`,
        );
    }
  }
  
  export function validateAndMigrateVault(
    value: unknown,
  ): Vault {
    const migrated =
      migrateVault(value);
  
    if (
      CURRENT_VAULT_VERSION !==
      1
    ) {
      throw new VaultValidationError(
        "Current vault migration configuration is invalid.",
      );
    }
  
    return validateVaultV1(
      migrated,
    );
  }
  
  export function isValidVault(
    value: unknown,
  ): value is Vault {
    try {
      validateAndMigrateVault(
        value,
      );
  
      return true;
    } catch {
      return false;
    }
  }