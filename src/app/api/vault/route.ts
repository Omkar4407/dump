import { NextResponse } from "next/server";

import { auth } from "@/auth";

import {
  findUserVaultFile,
  createUserVaultFile,
  downloadUserVaultFile,
  updateUserVaultFile,
} from "@/lib/google/authenticated-drive";

import type { EncryptedVault } from "@/lib/crypto/vault";

type VaultRequestBody = {
  vault?: unknown;
  fileId?: unknown;
};

const MAX_VAULT_REQUEST_SIZE =
  50 * 1024 * 1024;

const MAX_VAULT_CIPHERTEXT_LENGTH =
  50 * 1024 * 1024;

const MAX_FILE_ID_LENGTH =
  500;

const BASE64_PATTERN =
  /^[A-Za-z0-9+/]*={0,2}$/;

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

function isValidBase64(
  value: unknown,
): value is string {
  if (
    typeof value !==
      "string" ||
    value.length === 0 ||
    value.length % 4 !==
      0 ||
    !BASE64_PATTERN.test(
      value,
    )
  ) {
    return false;
  }

  try {
    atob(value);
    return true;
  } catch {
    return false;
  }
}

function isValidEncryptedVault(
  value: unknown,
): value is EncryptedVault {
  if (
    !isRecord(value)
  ) {
    return false;
  }

  if (
    value.version !==
    1
  ) {
    return false;
  }

  if (
    !isValidBase64(
      value.salt,
    )
  ) {
    return false;
  }

  if (
    !isValidBase64(
      value.iv,
    )
  ) {
    return false;
  }

  if (
    !isValidBase64(
      value.ciphertext,
    )
  ) {
    return false;
  }

  /*
   * The cryptographic layer performs
   * the authoritative length checks.
   *
   * We perform an early size check here
   * to prevent unnecessarily large
   * requests from reaching that layer.
   */
  if (
    value.ciphertext.length >
    MAX_VAULT_CIPHERTEXT_LENGTH
  ) {
    return false;
  }

  return true;
}

function isValidFileId(
  value: unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.length > 0 &&
    value.length <=
      MAX_FILE_ID_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(
      value,
    )
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-store",
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        noStoreHeaders(),
    },
  );
}

async function requireAuth() {
  const session =
    await auth();

  if (!session?.user) {
    return null;
  }

  return session;
}

async function readRequestBody(
  request: Request,
): Promise<
  VaultRequestBody | null
> {
  const contentLength =
    request.headers.get(
      "content-length",
    );

  if (
    contentLength !==
    null
  ) {
    const size =
      Number(
        contentLength,
      );

    if (
      !Number.isSafeInteger(
        size,
      ) ||
      size <= 0
    ) {
      throw new RequestValidationError(
        "Invalid request size.",
        400,
      );
    }

    if (
      size >
      MAX_VAULT_REQUEST_SIZE
    ) {
      throw new RequestValidationError(
        "Vault request is too large.",
        413,
      );
    }
  }

  const contentType =
    request.headers.get(
      "content-type",
    );

  if (
    !contentType ||
    !contentType
      .toLowerCase()
      .startsWith(
        "application/json",
      )
  ) {
    throw new RequestValidationError(
      "Request content type must be application/json.",
      415,
    );
  }

  if (!request.body) {
    throw new RequestValidationError(
      "Request body is missing.",
      400,
    );
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    throw new RequestValidationError(
      "Request body contains invalid JSON.",
      400,
    );
  }

  if (
    !isRecord(body)
  ) {
    throw new RequestValidationError(
      "Request body must be an object.",
      400,
    );
  }

  /*
   * The body has already been bounded
   * through Content-Length where available.
   *
   * This second serialization check protects
   * against requests using transfer encoding
   * without a useful Content-Length.
   */
  let serializedLength: number;

  try {
    serializedLength =
      new TextEncoder().encode(
        JSON.stringify(body),
      ).byteLength;
  } catch {
    throw new RequestValidationError(
      "Request body is invalid.",
      400,
    );
  }

  if (
    serializedLength >
    MAX_VAULT_REQUEST_SIZE
  ) {
    throw new RequestValidationError(
      "Vault request is too large.",
      413,
    );
  }

  return body as VaultRequestBody;
}

class RequestValidationError
  extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name =
      "RequestValidationError";

    this.status = status;
  }
}

function handleError(
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof
    RequestValidationError
  ) {
    return jsonResponse(
      {
        error:
          error.message,
      },
      error.status,
    );
  }

  console.error(
    `DUMP vault API error:`,
    error,
  );

  /*
   * Do not expose arbitrary internal
   * Google/Drive/crypto errors directly
   * through the API.
   */
  return jsonResponse(
    {
      error:
        fallbackMessage,
    },
    500,
  );
}

export async function GET() {
  const session =
    await requireAuth();

  if (!session) {
    return jsonResponse(
      {
        error:
          "Unauthorized",
      },
      401,
    );
  }

  try {
    const file =
      await findUserVaultFile();

    if (!file) {
      return jsonResponse({
        exists: false,
      });
    }

    /*
     * file.id comes from the authenticated
     * Google Drive query, not from the client.
     */
    const content =
      await downloadUserVaultFile(
        file.id,
      );

    if (
      content.length ===
      0
    ) {
      return jsonResponse(
        {
          error:
            "The DUMP vault file is empty.",
        },
        500,
      );
    }

    if (
      content.length >
      MAX_VAULT_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "The DUMP vault file is too large.",
        },
        500,
      );
    }

    let vault: unknown;

    try {
      vault =
        JSON.parse(content);
    } catch {
      return jsonResponse(
        {
          error:
            "The DUMP vault file contains invalid JSON.",
        },
        500,
      );
    }

    if (
      !isValidEncryptedVault(
        vault,
      )
    ) {
      return jsonResponse(
        {
          error:
            "The DUMP vault file has an invalid format.",
        },
        500,
      );
    }

    return jsonResponse({
      exists: true,
      fileId: file.id,
      vault,
    });
  } catch {
    return jsonResponse(
      {
        error:
          "Failed to load vault.",
      },
      500,
    );
  }
}

export async function POST(
  request: Request,
) {
  const session =
    await requireAuth();

  if (!session) {
    return jsonResponse(
      {
        error:
          "Unauthorized",
      },
      401,
    );
  }

  try {
    const body =
      await readRequestBody(
        request,
      );

    if (
      !body ||
      !isValidEncryptedVault(
        body.vault,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid encrypted vault.",
        },
        400,
      );
    }

    const existing =
      await findUserVaultFile();

    if (existing) {
      return jsonResponse(
        {
          error:
            "A DUMP vault already exists.",
        },
        409,
      );
    }

    const file =
      await createUserVaultFile(
        JSON.stringify(
          body.vault,
        ),
      );

    return jsonResponse(
      {
        success: true,
        fileId: file.id,
      },
      201,
    );
  } catch (error) {
    return handleError(
      error,
      "Failed to create vault.",
    );
  }
}

export async function PUT(
  request: Request,
) {
  const session =
    await requireAuth();

  if (!session) {
    return jsonResponse(
      {
        error:
          "Unauthorized",
      },
      401,
    );
  }

  try {
    const body =
      await readRequestBody(
        request,
      );

    if (
      !body ||
      !isValidEncryptedVault(
        body.vault,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid encrypted vault.",
        },
        400,
      );
    }

    if (
      !isValidFileId(
        body.fileId,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Vault file ID is required.",
        },
        400,
      );
    }

    /*
     * Verify that the supplied ID is
     * actually the authenticated user's
     * current DUMP vault.
     */
    const currentFile =
      await findUserVaultFile();

    if (!currentFile) {
      return jsonResponse(
        {
          error:
            "DUMP vault no longer exists.",
        },
        404,
      );
    }

    if (
      currentFile.id !==
      body.fileId
    ) {
      return jsonResponse(
        {
          error:
            "Vault file ID is stale.",
        },
        409,
      );
    }

    const file =
      await updateUserVaultFile(
        body.fileId,
        JSON.stringify(
          body.vault,
        ),
      );

    return jsonResponse({
      success: true,
      fileId: file.id,
    });
  } catch (error) {
    return handleError(
      error,
      "Failed to update vault.",
    );
  }
}