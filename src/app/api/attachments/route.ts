import { NextResponse } from "next/server";

import { auth } from "@/auth";

import {
  createUserAttachmentFile,
} from "@/lib/google/authenticated-drive";

const MAX_ENCRYPTED_ATTACHMENT_SIZE =
  100 * 1024 * 1024 +
  16;

function isValidAttachmentId(
  value: string,
): boolean {
  return (
    value.length >= 10 &&
    value.length <= 100 &&
    /^[a-zA-Z0-9_-]+$/.test(
      value,
    )
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
    const attachmentId =
      request.headers.get(
        "x-dump-attachment-id",
      );

    if (
      !attachmentId ||
      !isValidAttachmentId(
        attachmentId,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attachment ID.",
        },
        {
          status: 400,
        },
      );
    }

    const contentLength =
      request.headers.get(
        "content-length",
      );

    if (contentLength) {
      const size =
        Number(contentLength);

      if (
        !Number.isFinite(size) ||
        size <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid attachment size.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        size >
        MAX_ENCRYPTED_ATTACHMENT_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Attachment exceeds the maximum allowed size.",
          },
          {
            status: 413,
          },
        );
      }
    }

    if (!request.body) {
      return NextResponse.json(
        {
          error:
            "Attachment body is missing.",
        },
        {
          status: 400,
        },
      );
    }

    const encryptedBlob =
      await request.blob();

    if (
      encryptedBlob.size <=
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Attachment cannot be empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      encryptedBlob.size >
      MAX_ENCRYPTED_ATTACHMENT_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Attachment exceeds the maximum allowed size.",
        },
        {
          status: 413,
        },
      );
    }

    const file =
      await createUserAttachmentFile(
        encryptedBlob,
        attachmentId,
      );

    return NextResponse.json({
      success: true,
      fileId: file.id,
      size: file.size,
    });
  } catch (error) {
    console.error(
      "DUMP attachment POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload attachment.",
      },
      {
        status: 500,
      },
    );
  }
}