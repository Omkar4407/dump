export const MEMORY_TYPES = [
  "Text",
  "Link",
  "Image",
  "File",
  "Audio",
  "Video",
  "Credential",
  "Code",
  "Other",
] as const;

export type MemoryType =
  (typeof MEMORY_TYPES)[number];

export const CURRENT_VAULT_VERSION = 1;

export type AttachmentType =
  | "Image"
  | "File"
  | "Audio"
  | "Video";

export type MemoryMetadata =
  Record<string, string>;

export type MemoryAttachment = {
  id: string;

  type: AttachmentType;

  fileName: string;

  mimeType: string;

  size: number;

  driveFileId: string;

  encryptionVersion: 1;

  iv: string;

  createdAt: string;
};

export type Memory = {
  id: string;

  type: MemoryType;

  data: string;

  description: string;

  tags: string[];

  metadata: MemoryMetadata;

  attachments?: MemoryAttachment[];

  createdAt: string;

  updatedAt: string;
};

export type Vault = {
  version:
    typeof CURRENT_VAULT_VERSION;

  memories: Memory[];
};