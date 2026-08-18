import type {
    AttachmentType,
    MemoryAttachment,
  } from "@/types/memory";
  
  const MAX_ATTACHMENT_SIZE =
    100 * 1024 * 1024;
  
  const MIME_TYPE_MAP: Record<
    AttachmentType,
    string[]
  > = {
    Image: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ],
  
    File: [],
  
    Audio: [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "audio/aac",
    ],
  
    Video: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/mpeg",
    ],
  };
  
  export function validateAttachmentFile(
    file: File,
    type: AttachmentType,
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
        "Attachment is too large. Maximum size is 100 MB.",
      );
    }
  
    if (
      type !== "File" &&
      !MIME_TYPE_MAP[
        type
      ].includes(file.type)
    ) {
      throw new Error(
        `Invalid ${type.toLowerCase()} file type.`,
      );
    }
  }
  
  export function getAttachmentTypeFromMimeType(
    mimeType: string,
  ): AttachmentType {
    const normalized =
      mimeType
        .trim()
        .toLowerCase();
  
    if (
      normalized.startsWith(
        "image/",
      )
    ) {
      return "Image";
    }
  
    if (
      normalized.startsWith(
        "audio/",
      )
    ) {
      return "Audio";
    }
  
    if (
      normalized.startsWith(
        "video/",
      )
    ) {
      return "Video";
    }
  
    return "File";
  }
  
  export function createAttachmentMetadata(
    file: File,
    driveFileId: string,
    iv: string,
  ): MemoryAttachment {
    const type =
      getAttachmentTypeFromMimeType(
        file.type,
      );
  
    return {
      id: crypto.randomUUID(),
  
      type,
  
      fileName: file.name,
  
      mimeType:
        file.type ||
        "application/octet-stream",
  
      size: file.size,
  
      driveFileId,
  
      encryptionVersion: 1,
  
      iv,
  
      createdAt:
        new Date().toISOString(),
    };
  }
  
  export function formatAttachmentSize(
    bytes: number,
  ): string {
    if (
      bytes < 1024
    ) {
      return `${bytes} B`;
    }
  
    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }
  
    if (
      bytes <
      1024 *
        1024 *
        1024
    ) {
      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    }
  
    return `${(
      bytes /
      (1024 *
        1024 *
        1024)
    ).toFixed(1)} GB`;
  }