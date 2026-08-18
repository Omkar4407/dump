import { NextResponse } from "next/server";

import { auth } from "@/auth";

import {
  deleteUserAttachmentFile,
  downloadUserAttachmentFile,
} from "@/lib/google/authenticated-drive";

type RouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

function isValidFileId(
  value: string,
): boolean {
  return (
    value.length > 0 &&
    value.length <= 500 &&
    !value.includes("/") &&
    !value.includes("\\")
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const session =
    await auth();

  if (!session?.user) {
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
    const {
      fileId,
    } = await context.params;

    if (
      !isValidFileId(fileId)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attachment file ID.",
        },
        {
          status: 400,
        },
      );
    }

    const attachment =
      await downloadUserAttachmentFile(
        fileId,
      );

    return new NextResponse(
      attachment.content,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/octet-stream",

          "Content-Disposition":
            `attachment; filename="${encodeURIComponent(
              attachment.name,
            )}"`,

          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "DUMP attachment GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to download attachment.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  const session =
    await auth();

  if (!session?.user) {
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
    const {
      fileId,
    } = await context.params;

    if (
      !isValidFileId(fileId)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attachment file ID.",
        },
        {
          status: 400,
        },
      );
    }

    await deleteUserAttachmentFile(
      fileId,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DUMP attachment DELETE error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete attachment.",
      },
      {
        status: 500,
      },
    );
  }
}