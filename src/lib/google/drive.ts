import "server-only";

const DRIVE_API_BASE =
  "https://www.googleapis.com/drive/v3";

const DRIVE_UPLOAD_BASE =
  "https://www.googleapis.com/upload/drive/v3";

const DUMP_VAULT_FILENAME =
  "DUMP Vault.json";

const DUMP_VAULT_MIME_TYPE =
  "application/json";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

type DriveFileListResponse = {
  files?: DriveFile[];
};

export type DriveVaultFile = {
  id: string;
  name: string;
  mimeType: string;
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
      "Google Drive authorization has expired.",
    );
  }

  if (response.status === 403) {
    throw new Error(
      "Google Drive access was denied.",
    );
  }

  throw new Error(
    `Google Drive ${operation} failed.`,
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

  const metadata = JSON.stringify({
    name: DUMP_VAULT_FILENAME,
    mimeType: DUMP_VAULT_MIME_TYPE,
  });

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    `Content-Type: ${DUMP_VAULT_MIME_TYPE}`,
    "",
    encryptedVault,
    `--${boundary}--`,
    "",
  ].join("\r\n");

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
      },
      body,
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
      },
      body: encryptedVault,
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