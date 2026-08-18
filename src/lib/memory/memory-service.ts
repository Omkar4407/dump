import type {
    Memory,
    MemoryAttachment,
    MemoryMetadata,
    MemoryType,
    Vault,
  } from "@/types/memory";
  
  import {
    addMemory,
    createMemory,
    deleteMemory,
    updateMemory,
  } from "@/lib/vault/vault";
  
  export type CreateMemoryInput = {
    type: MemoryType;
    data: string;
    description: string;
    tags?: string[];
    metadata?: MemoryMetadata;
    attachments?: MemoryAttachment[];
  };
  
  export type UpdateMemoryInput = {
    type?: MemoryType;
    data?: string;
    description?: string;
    tags?: string[];
    metadata?: MemoryMetadata;
    attachments?: MemoryAttachment[];
  };
  
  function normalizeTags(
    tags: string[] = [],
  ): string[] {
    return [
      ...new Set(
        tags
          .map((tag) =>
            tag.trim(),
          )
          .filter(Boolean)
          .map((tag) =>
            tag
              .replace(
                /^#/,
                "",
              )
              .trim(),
          )
          .filter(Boolean),
      ),
    ];
  }
  
  function normalizeMetadata(
    metadata: MemoryMetadata = {},
  ): MemoryMetadata {
    const normalized: MemoryMetadata =
      {};
  
    for (
      const [key, value] of
      Object.entries(metadata)
    ) {
      const normalizedKey =
        key.trim();
  
      if (!normalizedKey) {
        continue;
      }
  
      normalized[
        normalizedKey
      ] = value;
    }
  
    return normalized;
  }
  
  function normalizeAttachments(
    attachments:
      MemoryAttachment[] = [],
  ): MemoryAttachment[] {
    return [
      ...attachments,
    ];
  }
  
  function validateDescription(
    description: string,
  ): string {
    const value =
      description.trim();
  
    if (!value) {
      throw new Error(
        "Memory description cannot be empty.",
      );
    }
  
    return value;
  }
  
  function validateData(
    data: string,
  ): string {
    return data.trim();
  }
  
  function validateRequiredData(
    data: string,
  ): string {
    const value =
      validateData(data);
  
    if (!value) {
      throw new Error(
        "Memory content cannot be empty.",
      );
    }
  
    return value;
  }
  
  function validateLink(
    value: string,
  ): void {
    let url: URL;
  
    try {
      url = new URL(value);
    } catch {
      throw new Error(
        "Invalid link.",
      );
    }
  
    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      throw new Error(
        "Only HTTP and HTTPS links are supported.",
      );
    }
  }
  
  function validateCredential(
    value: string,
  ): void {
    let credential: unknown;
  
    try {
      credential =
        JSON.parse(value);
    } catch {
      throw new Error(
        "Credential data is invalid.",
      );
    }
  
    if (
      typeof credential !==
        "object" ||
      credential === null
    ) {
      throw new Error(
        "Credential data is invalid.",
      );
    }
  
    const record =
      credential as Record<
        string,
        unknown
      >;
  
    if (
      typeof record.name !==
        "string" ||
      !record.name.trim()
    ) {
      throw new Error(
        "Credential name is required.",
      );
    }
  
    if (
      typeof record.username !==
        "string" ||
      !record.username.trim()
    ) {
      throw new Error(
        "Credential username is required.",
      );
    }
  
    if (
      typeof record.password !==
        "string" ||
      !record.password
    ) {
      throw new Error(
        "Credential password is required.",
      );
    }
  }
  
  function validateAttachments(
    attachments:
      MemoryAttachment[],
  ): void {
    for (
      const attachment of
      attachments
    ) {
      if (
        !attachment.id.trim()
      ) {
        throw new Error(
          "Attachment ID is required.",
        );
      }
  
      if (
        !attachment.driveFileId.trim()
      ) {
        throw new Error(
          "Attachment Drive file ID is required.",
        );
      }
  
      if (
        attachment.encryptionVersion !==
        1
      ) {
        throw new Error(
          "Unsupported attachment encryption version.",
        );
      }
  
      if (
        !attachment.iv.trim()
      ) {
        throw new Error(
          "Attachment encryption metadata is missing.",
        );
      }
    }
  }
  
  function requiresMemoryData(
    type: MemoryType,
  ): boolean {
    return ![
      "Image",
      "File",
      "Audio",
      "Video",
    ].includes(type);
  }
  
  function validateCreateInput(
    input: CreateMemoryInput,
  ): {
    type: MemoryType;
    data: string;
    description: string;
    tags: string[];
    metadata: MemoryMetadata;
    attachments: MemoryAttachment[];
  } {
    const description =
      validateDescription(
        input.description,
      );
  
    const data =
      requiresMemoryData(input.type)
        ? validateRequiredData(
            input.data,
          )
        : validateData(
            input.data,
          );
  
    if (
      input.type ===
      "Link"
    ) {
      validateLink(data);
    }
  
    if (
      input.type ===
      "Credential"
    ) {
      validateCredential(
        data,
      );
    }
  
    const metadata =
      normalizeMetadata(
        input.metadata,
      );
  
    if (
      input.type ===
        "Code" &&
      !metadata.language
    ) {
      metadata.language =
        "plaintext";
    }
  
    const attachments =
      normalizeAttachments(
        input.attachments,
      );
  
    validateAttachments(
      attachments,
    );
  
    if (
      [
        "Image",
        "File",
        "Audio",
        "Video",
      ].includes(input.type) &&
      attachments.length === 0
    ) {
      throw new Error(
        `${input.type} memory requires an attachment.`,
      );
    }
  
    return {
      type: input.type,
      data,
      description,
      tags: normalizeTags(
        input.tags,
      ),
      metadata,
      attachments,
    };
  }
  
  export function createMemoryInVault(
    vault: Vault,
    input: CreateMemoryInput,
  ): {
    vault: Vault;
    memory: Memory;
  } {
    const validated =
      validateCreateInput(
        input,
      );
  
    const memory =
      createMemory(
        validated.type,
        validated.data,
        validated.description,
        validated.tags,
        validated.metadata,
        validated.attachments,
      );
  
    const updatedVault =
      addMemory(
        vault,
        memory,
      );
  
    return {
      vault: updatedVault,
      memory,
    };
  }
  
  export function getMemoryFromVault(
    vault: Vault,
    memoryId: string,
  ): Memory | null {
    return (
      vault.memories.find(
        (memory) =>
          memory.id ===
          memoryId,
      ) ?? null
    );
  }
  
  export function getAllMemoriesFromVault(
    vault: Vault,
  ): Memory[] {
    return [
      ...vault.memories,
    ];
  }
  
  export function updateMemoryInVault(
    vault: Vault,
    memoryId: string,
    updates: UpdateMemoryInput,
  ): {
    vault: Vault;
    memory: Memory;
  } {
    const existing =
      getMemoryFromVault(
        vault,
        memoryId,
      );
  
    if (!existing) {
      throw new Error(
        `Memory "${memoryId}" was not found.`,
      );
    }
  
    const nextType =
      updates.type ??
      existing.type;
  
    const nextData =
      updates.data !==
      undefined
        ? requiresMemoryData(
            nextType,
          )
          ? validateRequiredData(
              updates.data,
            )
          : validateData(
              updates.data,
            )
        : existing.data;
  
    const nextDescription =
      updates.description !==
      undefined
        ? validateDescription(
            updates.description,
          )
        : existing.description;
  
    const nextTags =
      updates.tags !==
      undefined
        ? normalizeTags(
            updates.tags,
          )
        : existing.tags;
  
    const nextMetadata =
      updates.metadata !==
      undefined
        ? normalizeMetadata(
            updates.metadata,
          )
        : existing.metadata;
  
    const nextAttachments =
      updates.attachments !==
      undefined
        ? normalizeAttachments(
            updates.attachments,
          )
        : existing.attachments ??
          [];
  
    if (
      nextType ===
      "Link"
    ) {
      validateLink(
        nextData,
      );
    }
  
    if (
      nextType ===
      "Credential"
    ) {
      validateCredential(
        nextData,
      );
    }
  
    validateAttachments(
      nextAttachments,
    );
  
    if (
      [
        "Image",
        "File",
        "Audio",
        "Video",
      ].includes(nextType) &&
      nextAttachments.length === 0
    ) {
      throw new Error(
        `${nextType} memory requires an attachment.`,
      );
    }
  
    const finalMetadata =
      normalizeMetadata(
        nextMetadata,
      );
  
    if (
      nextType === "Code" &&
      !finalMetadata.language
    ) {
      finalMetadata.language =
        "plaintext";
    }
  
    const updatedVault =
      updateMemory(
        vault,
        memoryId,
        {
          type: nextType,
          data: nextData,
          description:
            nextDescription,
          tags: nextTags,
          metadata:
            finalMetadata,
          attachments:
            nextAttachments,
        },
      );
  
    const memory =
      getMemoryFromVault(
        updatedVault,
        memoryId,
      );
  
    if (!memory) {
      throw new Error(
        `Memory "${memoryId}" was not found after update.`,
      );
    }
  
    return {
      vault: updatedVault,
      memory,
    };
  }
  
  export function deleteMemoryFromVault(
    vault: Vault,
    memoryId: string,
  ): {
    vault: Vault;
    deletedMemory: Memory;
  } {
    const memory =
      getMemoryFromVault(
        vault,
        memoryId,
      );
  
    if (!memory) {
      throw new Error(
        `Memory "${memoryId}" was not found.`,
      );
    }
  
    const updatedVault =
      deleteMemory(
        vault,
        memoryId,
      );
  
    return {
      vault: updatedVault,
      deletedMemory: memory,
    };
  }
  
  export function searchMemoriesInVault(
    vault: Vault,
    query: string,
  ): Memory[] {
    const normalizedQuery =
      query
        .trim()
        .toLowerCase();
  
    if (!normalizedQuery) {
      return getAllMemoriesFromVault(
        vault,
      );
    }
  
    return vault.memories.filter(
      (memory) => {
        const attachmentText =
          (
            memory.attachments ??
            []
          )
            .map(
              (attachment) =>
                [
                  attachment.fileName,
                  attachment.mimeType,
                  attachment.type,
                ].join(" "),
            )
            .join(" ");
  
        const searchableText =
          [
            memory.description,
            memory.data,
            memory.type,
            ...(memory.tags ??
              []),
            ...Object.entries(
              memory.metadata ??
                {},
            ).flat(),
            attachmentText,
          ]
            .join(" ")
            .toLowerCase();
  
        return searchableText.includes(
          normalizedQuery,
        );
      },
    );
  }