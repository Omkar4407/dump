"use client";

import { useEffect, useState } from "react";

import { Download, FileIcon, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatAttachmentSize } from "@/lib/memory/attachment-service";

import { downloadAttachment } from "@/lib/memory/attachment-upload";

import type { MemoryAttachment } from "@/types/memory";

type AttachmentViewProps = {
  attachment: MemoryAttachment;
};

/*
 * Attachments are decrypted in the browser
 * using the existing attachment pipeline.
 *
 * Only media types are decrypted eagerly for
 * preview. Plain files are decrypted on
 * demand when the user downloads them.
 */
export function AttachmentView({
  attachment,
}: AttachmentViewProps) {
  const [objectUrl, setObjectUrl] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [isDownloading, setIsDownloading] =
    useState(false);

  const isImage = attachment.type === "Image";

  const isAudio = attachment.type === "Audio";

  const isVideo = attachment.type === "Video";

  const isPreviewable = isImage || isAudio || isVideo;

  useEffect(() => {
    if (!isPreviewable) {
      return;
    }

    let cancelled = false;

    let generatedUrl: string | null = null;

    async function load() {
      try {
        const blob = await downloadAttachment(
          attachment.driveFileId,
          attachment.iv,
          attachment.mimeType,
          attachment.fileName,
        );

        if (cancelled) {
          return;
        }

        generatedUrl = URL.createObjectURL(blob);

        setObjectUrl(generatedUrl);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to open this attachment.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;

      if (generatedUrl) {
        URL.revokeObjectURL(generatedUrl);
      }
    };
  }, [
    isPreviewable,
    attachment.driveFileId,
    attachment.iv,
    attachment.mimeType,
    attachment.fileName,
  ]);

  async function handleDownload() {
    setError(null);
    setIsDownloading(true);

    try {
      const blob = await downloadAttachment(
        attachment.driveFileId,
        attachment.iv,
        attachment.mimeType,
        attachment.fileName,
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = attachment.fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download this attachment.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <figure className="tile-flat overflow-hidden bg-secondary">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-mint/25 px-4 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {attachment.fileName}
        </span>

        <span className="label-mono shrink-0 text-muted-foreground">
          {attachment.type} · {formatAttachmentSize(attachment.size)}
        </span>
      </figcaption>

      {error ? (
        <div className="flex items-center gap-3 px-4 py-4 text-sm font-medium text-destructive">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : isImage ? (
        objectUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Attachments are decrypted in the browser to a blob URL, which the Next.js image optimizer cannot read.
          <img
            src={objectUrl}
            alt={attachment.fileName}
            className="max-h-[45dvh] w-full bg-card object-contain"
          />
        ) : (
          <AttachmentLoading />
        )
      ) : isAudio ? (
        objectUrl ? (
          <div className="p-4">
            <audio
              controls
              src={objectUrl}
              className="w-full"
            >
              <track kind="captions" />
            </audio>
          </div>
        ) : (
          <AttachmentLoading />
        )
      ) : isVideo ? (
        objectUrl ? (
          <video
            controls
            src={objectUrl}
            className="max-h-[45dvh] w-full bg-ink"
          >
            <track kind="captions" />
          </video>
        ) : (
          <AttachmentLoading />
        )
      ) : (
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lemon text-ink">
            <FileIcon className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {attachment.fileName}
            </p>

            <p className="label-mono mt-1 text-muted-foreground">
              {attachment.mimeType}
            </p>
          </div>
        </div>
      )}

      <div className="bg-card p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="size-3.5" aria-hidden="true" />
          {isDownloading ? "Decrypting…" : "Download"}
        </Button>
      </div>
    </figure>
  );
}

function AttachmentLoading() {
  return (
    <div
      className="label-mono flex min-h-28 items-center justify-center px-4 text-muted-foreground"
      role="status"
    >
      Decrypting…
    </div>
  );
}
