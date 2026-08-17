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

export type MemoryType = (typeof MEMORY_TYPES)[number];

export type Memory = {
  id: string;
  type: MemoryType;
  data: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Vault = {
  version: 1;
  memories: Memory[];
};