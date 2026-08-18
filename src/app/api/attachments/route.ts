import { NextResponse } from "next/server";

import { auth } from "@/auth";

import {
  createUserAttachmentFile,
} from "@/lib/google/authenticated-drive";

const MAX_ENCRYPTED_ATTACHMENT_SIZE =
  100 * 1024 * 1024 +
  16;

const MIN_ATTACHMENT_ID_LENGTH =
  10;

const MAX_ATTACHMENT_ID_LENGTH =
  100;

function isValidAttachmentId(
  value: string,
): boolean {
  return (
    value.length >=
      MIN_ATTACHMENT_ID_LENGTH &&
    value.length <=
      MAX_ATTACHMENT_ID_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(
      value,
    )
  );
}

export async function POST(
  request: Request,
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

    return NextResponse.json(
      {
        success: true,
        fileId: file.id,
        size: file.size,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
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