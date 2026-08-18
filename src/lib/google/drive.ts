import "server-only";

const DRIVE_API_BASE =
  "https://www.googleapis.com/drive/v3";

const DRIVE_UPLOAD_BASE =
  "https://www.googleapis.com/upload/drive/v3";

const DUMP_VAULT_FILENAME =
  "DUMP Vault.json";

const DUMP_VAULT_MIME_TYPE =
  "application/json";

const DUMP_ATTACHMENT_PREFIX =
  "DUMP Attachment";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  appProperties?: Record<
    string,
    string
  >;
};

type DriveFileListResponse = {
  files?: DriveFile[];
};

export type DriveVaultFile = {
  id: string;
  name: string;
  mimeType: string;
};

export type DriveAttachmentFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
};

function createAuthorizationHeader(
  accessToken: string,
) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function handleDriveResponse(
  response: Response,
  operation: string,
) {
  if (response.ok) {
    return;
  }

  const errorText =
    await response.text();

  console.error(
    `Google Drive ${operation} failed:`,
    response.status,
    errorText,
  );

  if (response.status === 401) {
    throw new Error(
      `Google Drive authorization has expired. ${errorText}`,
    );
  }

  if (response.status === 403) {
    throw new Error(
      `Google Drive access was denied. ${errorText}`,
    );
  }

  if (response.status === 404) {
    throw new Error(
      `Google Drive file was not found. ${errorText}`,
    );
  }

  throw new Error(
    `Google Drive ${operation} failed (${response.status}): ${errorText}`,
  );
}

export async function findVaultFile(
  accessToken: string,
): Promise<DriveVaultFile | null> {
  const query = [
    `name = '${DUMP_VAULT_FILENAME}'`,
    `trashed = false`,
  ].join(" and ");

  const url = new URL(
    `${DRIVE_API_BASE}/files`,
  );

  url.searchParams.set(
    "q",
    query,
  );

  url.searchParams.set(
    "spaces",
    "drive",
  );

  url.searchParams.set(
    "pageSize",
    "10",
  );

  url.searchParams.set(
    "fields",
    "files(id,name,mimeType)",
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers:
        createAuthorizationHeader(
          accessToken,
        ),
      cache: "no-store",
    },
  );

  await handleDriveResponse(
    response,
    "file search",
  );

  const data =
    (await response.json()) as DriveFileListResponse;

  const file = data.files?.find(
    (item) =>
      item.name ===
        DUMP_VAULT_FILENAME &&
      item.mimeType ===
        DUMP_VAULT_MIME_TYPE,
  );

  if (!file) {
    return null;
  }

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
  };
}

export async function createVaultFile(
  accessToken: string,
  encryptedVault: string,
): Promise<DriveVaultFile> {
  const boundary =
    `dump-${crypto.randomUUID()}`;

  const metadata =
    JSON.stringify({
      name: DUMP_VAULT_FILENAME,
      mimeType:
        DUMP_VAULT_MIME_TYPE,
    });

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    "",
    `--${boundary}`,
    `Content-Type: ${DUMP_VAULT_MIME_TYPE}`,
    "",
    encryptedVault,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const bodyBytes =
    new TextEncoder().encode(
      body,
    );

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        ...createAuthorizationHeader(
          accessToken,
        ),
        "Content-Type":
          `multipart/related; boundary=${boundary}`,
        "Content-Length":
          String(
            bodyBytes.byteLength,
          ),
      },
      body: bodyBytes,
    },
  );

  await handleDriveResponse(
    response,
    "vault creation",
  );

  const file =
    (await response.json()) as DriveFile;

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
  };
}

export async function downloadVaultFile(
  accessToken: string,
  fileId: string,
): Promise<string> {
  const url = new URL(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(
      fileId,
    )}`,
  );

  url.searchParams.set(
    "alt",
    "media",
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers:
        createAuthorizationHeader(
          accessToken,
        ),
      cache: "no-store",
    },
  );

  await handleDriveResponse(
    response,
    "vault download",
  );

  return response.text();
}

export async function updateVaultFile(
  accessToken: string,
  fileId: string,
  encryptedVault: string,
): Promise<DriveVaultFile> {
  const url = new URL(
    `${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(
      fileId,
    )}`,
  );

  url.searchParams.set(
    "uploadType",
    "media",
  );

  const bodyBytes =
    new TextEncoder().encode(
      encryptedVault,
    );

  const response = await fetch(
    url.toString(),
    {
      method: "PATCH",
      headers: {
        ...createAuthorizationHeader(
          accessToken,
        ),
        "Content-Type":
          DUMP_VAULT_MIME_TYPE,
        "Content-Length":
          String(
            bodyBytes.byteLength,
          ),
      },
      body: bodyBytes,
    },
  );

  await handleDriveResponse(
    response,
    "vault update",
  );

  const file =
    (await response.json()) as DriveFile;

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
  };
}

export async function createAttachmentFile(
  accessToken: string,
  encryptedContent: Blob,
  attachmentId: string,
): Promise<DriveAttachmentFile> {
  if (
    encryptedContent.size <=
    0
  ) {
    throw new Error(
      "Encrypted attachment is empty.",
    );
  }

  const boundary =
    `dump-${crypto.randomUUID()}`;

  const metadata =
    JSON.stringify({
      name: `${DUMP_ATTACHMENT_PREFIX} ${attachmentId}.bin`,
      mimeType:
        "application/octet-stream",
      appProperties: {
        dumpType:
          "attachment",
        dumpAttachmentId:
          attachmentId,
      },
    });

  const encoder =
    new TextEncoder();

  /*
   * Part 1:
   *
   * --boundary
   * Content-Type: application/json; charset=UTF-8
   *
   * {metadata}
   *
   */

  const metadataPart =
    [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      metadata,
      "",
    ].join("\r\n");

  /*
   * Part 2:
   *
   * --boundary
   * Content-Type: application/octet-stream
   *
   * {encrypted bytes}
   */

  const mediaPartHeader =
    [
      `--${boundary}`,
      "Content-Type: application/octet-stream",
      "",
      "",
    ].join("\r\n");

  /*
   * Final boundary must be preceded
   * by CRLF after the binary media.
   */

  const closingBoundary =
    [
      "",
      `--${boundary}--`,
      "",
    ].join("\r\n");

  const metadataBytes =
    encoder.encode(
      metadataPart,
    );

  const mediaHeaderBytes =
    encoder.encode(
      mediaPartHeader,
    );

  const encryptedBytes =
    new Uint8Array(
      await encryptedContent.arrayBuffer(),
    );

  const closingBytes =
    encoder.encode(
      closingBoundary,
    );

  const totalLength =
    metadataBytes.byteLength +
    mediaHeaderBytes.byteLength +
    encryptedBytes.byteLength +
    closingBytes.byteLength;

  const body =
    new Uint8Array(
      totalLength,
    );

  let offset = 0;

  body.set(
    metadataBytes,
    offset,
  );

  offset +=
    metadataBytes.byteLength;

  body.set(
    mediaHeaderBytes,
    offset,
  );

  offset +=
    mediaHeaderBytes.byteLength;

  body.set(
    encryptedBytes,
    offset,
  );

  offset +=
    encryptedBytes.byteLength;

  body.set(
    closingBytes,
    offset,
  );

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        ...createAuthorizationHeader(
          accessToken,
        ),
        "Content-Type":
          `multipart/related; boundary=${boundary}`,
        "Content-Length":
          String(
            body.byteLength,
          ),
      },
      body,
    },
  );

  await handleDriveResponse(
    response,
    "attachment creation",
  );

  const file =
    (await response.json()) as DriveFile;

  return {
    id: file.id,
    name: file.name,
    mimeType:
      file.mimeType ||
      "application/octet-stream",
    size:
      Number(file.size) ||
      encryptedContent.size,
  };
}

export async function downloadAttachmentFile(
  accessToken: string,
  fileId: string,
): Promise<{
  content: ArrayBuffer;
  mimeType: string;
  name: string;
}> {
  const metadataUrl =
    new URL(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(
        fileId,
      )}`,
    );

  metadataUrl.searchParams.set(
    "fields",
    "id,name,mimeType,size,appProperties",
  );

  const metadataResponse =
    await fetch(
      metadataUrl.toString(),
      {
        method: "GET",
        headers:
          createAuthorizationHeader(
            accessToken,
          ),
        cache: "no-store",
      },
    );

  await handleDriveResponse(
    metadataResponse,
    "attachment metadata lookup",
  );

  const file =
    (await metadataResponse.json()) as DriveFile;

  if (
    file.appProperties?.dumpType !==
    "attachment"
  ) {
    throw new Error(
      "The requested Drive file is not a DUMP attachment.",
    );
  }

  const contentUrl =
    new URL(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(
        fileId,
      )}`,
    );

  contentUrl.searchParams.set(
    "alt",
    "media",
  );

  const contentResponse =
    await fetch(
      contentUrl.toString(),
      {
        method: "GET",
        headers:
          createAuthorizationHeader(
            accessToken,
          ),
        cache: "no-store",
      },
    );

  await handleDriveResponse(
    contentResponse,
    "attachment download",
  );

  return {
    content:
      await contentResponse.arrayBuffer(),
    mimeType:
      file.mimeType ||
      "application/octet-stream",
    name:
      file.name ||
      "DUMP Attachment.bin",
  };
}

export async function deleteAttachmentFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  const metadataUrl =
    new URL(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(
        fileId,
      )}`,
    );

  metadataUrl.searchParams.set(
    "fields",
    "id,appProperties",
  );

  const metadataResponse =
    await fetch(
      metadataUrl.toString(),
      {
        method: "GET",
        headers:
          createAuthorizationHeader(
            accessToken,
          ),
        cache: "no-store",
      },
    );

  await handleDriveResponse(
    metadataResponse,
    "attachment metadata lookup",
  );

  const file =
    (await metadataResponse.json()) as DriveFile;

  if (
    file.appProperties?.dumpType !==
    "attachment"
  ) {
    throw new Error(
      "The requested Drive file is not a DUMP attachment.",
    );
  }

  const response =
    await fetch(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(
        fileId,
      )}`,
      {
        method: "DELETE",
        headers:
          createAuthorizationHeader(
            accessToken,
          ),
      },
    );

  await handleDriveResponse(
    response,
    "attachment deletion",
  );
}