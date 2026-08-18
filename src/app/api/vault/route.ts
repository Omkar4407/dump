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
  vault?: EncryptedVault;
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
    value as Record<string, unknown>;

  return (
    vault.version === 1 &&
    typeof vault.salt === "string" &&
    typeof vault.iv === "string" &&
    typeof vault.ciphertext === "string"
  );
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
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
      vault = JSON.parse(content);
    } catch {
      return NextResponse.json(
        {
          error:
            "The DUMP vault file is invalid.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !isValidEncryptedVault(vault)
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
      vault,
    });
  } catch (error) {
    console.error(
      "Failed to load DUMP vault:",
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
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
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

    const existingFile =
      await findUserVaultFile();

    if (existingFile) {
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
      "Failed to create DUMP vault:",
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
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
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

    const existingFile =
      await findUserVaultFile();

    if (!existingFile) {
      return NextResponse.json(
        {
          error:
            "DUMP vault does not exist.",
        },
        {
          status: 404,
        },
      );
    }

    const file =
      await updateUserVaultFile(
        existingFile.id,
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
      "Failed to update DUMP vault:",
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