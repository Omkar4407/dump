import {
    decryptAttachment,
    encryptAttachment,
    type EncryptedAttachment,
  } from "@/lib/crypto/attachment";
  
  import {
    requireVaultSession,
  } from "@/lib/vault/session";
  
  export type UploadedAttachment = {
    fileId: string;
    iv: string;
  };
  
  async function parseResponse(
    response: Response,
  ): Promise<{
    fileId?: string;
    error?: string;
  }> {
    try {
      return (await response.json()) as {
        fileId?: string;
        error?: string;
      };
    } catch {
      return {};
    }
  }
  
  export async function uploadAttachment(
    file: File,
    attachmentId: string,
  ): Promise<UploadedAttachment> {
    if (!attachmentId) {
      throw new Error(
        "Attachment ID is required.",
      );
    }
  
    const session =
      requireVaultSession();
  
    const encrypted =
      await encryptAttachment(
        session.key,
        file,
      );
  
    const response =
      await fetch(
        "/api/attachments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/octet-stream",
  
            "X-DUMP-Attachment-ID":
              attachmentId,
          },
  
          body:
            encrypted.ciphertext,
        },
      );
  
    const result =
      await parseResponse(
        response,
      );
  
    if (
      !response.ok
    ) {
      throw new Error(
        result.error ??
          "Failed to upload attachment.",
      );
    }
  
    if (
      !result.fileId
    ) {
      throw new Error(
        "Attachment upload did not return a file ID.",
      );
    }
  
    return {
      fileId:
        result.fileId,
      iv: encrypted.iv,
    };
  }
  
  export async function downloadAttachment(
    fileId: string,
    iv: string,
    mimeType: string,
    fileName: string,
  ): Promise<Blob> {
    if (!fileId) {
      throw new Error(
        "Attachment file ID is missing.",
      );
    }
  
    if (!iv) {
      throw new Error(
        "Attachment encryption IV is missing.",
      );
    }
  
    const response =
      await fetch(
        `/api/attachments/${encodeURIComponent(
          fileId,
        )}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
  
    if (
      !response.ok
    ) {
      let errorMessage =
        "Failed to download attachment.";
  
      try {
        const result =
          (await response.json()) as {
            error?: string;
          };
  
        if (
          result.error
        ) {
          errorMessage =
            result.error;
        }
      } catch {
        // Keep the default error.
      }
  
      throw new Error(
        errorMessage,
      );
    }
  
    const encryptedBlob =
      await response.blob();
  
    if (
      encryptedBlob.size <=
      0
    ) {
      throw new Error(
        "Downloaded attachment is empty.",
      );
    }
  
    const session =
      requireVaultSession();
  
    const encrypted: EncryptedAttachment =
      {
        version: 1,
        iv,
        ciphertext:
          encryptedBlob,
        mimeType:
          mimeType ||
          "application/octet-stream",
        fileName:
          fileName ||
          "DUMP Attachment",
        size:
          encryptedBlob.size,
      };
  
    return decryptAttachment(
      session.key,
      encrypted,
    );
  }
  
  export async function deleteAttachment(
    fileId: string,
  ): Promise<void> {
    if (!fileId) {
      return;
    }
  
    const response =
      await fetch(
        `/api/attachments/${encodeURIComponent(
          fileId,
        )}`,
        {
          method: "DELETE",
        },
      );
  
    if (
      response.ok
    ) {
      return;
    }
  
    const result =
      await parseResponse(
        response,
      );
  
    throw new Error(
      result.error ??
        "Failed to delete attachment.",
    );
  }