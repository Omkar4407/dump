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

function isValidEncryptedVault(
  value: unknown,
): value is EncryptedVault {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const vault =
    value as Record<
      string,
      unknown
    >;

  return (
    vault.version === 1 &&
    typeof vault.salt ===
      "string" &&
    typeof vault.iv ===
      "string" &&
    typeof vault.ciphertext ===
      "string"
  );
}

function isValidFileId(
  value: unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length > 0
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

export async function GET() {
  const session =
    await requireAuth();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const file =
      await findUserVaultFile();

    if (!file) {
      return NextResponse.json({
        exists: false,
      });
    }

    const content =
      await downloadUserVaultFile(
        file.id,
      );

    let vault: unknown;

    try {
      vault =
        JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          error:
            "The DUMP vault file contains invalid JSON.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !isValidEncryptedVault(
        vault,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The DUMP vault file has an invalid format.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      exists: true,
      fileId: file.id,
      vault,
    });
  } catch (error) {
    console.error(
      "DUMP vault GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load vault.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const session =
    await requireAuth();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      (await request.json()) as VaultRequestBody;

    if (
      !isValidEncryptedVault(
        body.vault,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid encrypted vault.",
        },
        {
          status: 400,
        },
      );
    }

    const existing =
      await findUserVaultFile();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A DUMP vault already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const file =
      await createUserVaultFile(
        JSON.stringify(
          body.vault,
        ),
      );

    return NextResponse.json({
      success: true,
      fileId: file.id,
    });
  } catch (error) {
    console.error(
      "DUMP vault POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create vault.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: Request,
) {
  const session =
    await requireAuth();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      (await request.json()) as VaultRequestBody;

    if (
      !isValidEncryptedVault(
        body.vault,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid encrypted vault.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidFileId(
        body.fileId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Vault file ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Verify that the supplied ID is actually
     * the user's current DUMP vault.
     *
     * We search only when validating the ID.
     * The normal successful path remains a
     * direct file update.
     */
    const currentFile =
      await findUserVaultFile();

    if (!currentFile) {
      return NextResponse.json(
        {
          error:
            "DUMP vault no longer exists.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      currentFile.id !==
      body.fileId
    ) {
      return NextResponse.json(
        {
          error:
            "Vault file ID is stale.",
        },
        {
          status: 409,
        },
      );
    }

    const file =
      await updateUserVaultFile(
        body.fileId,
        JSON.stringify(
          body.vault,
        ),
      );

    return NextResponse.json({
      success: true,
      fileId: file.id,
    });
  } catch (error) {
    console.error(
      "DUMP vault PUT error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update vault.",
      },
      {
        status: 500,
      },
    );
  }
}