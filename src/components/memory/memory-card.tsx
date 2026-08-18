"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";

import {
  Check,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileIcon,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  Memory,
  MemoryAttachment,
} from "@/types/memory";

import {
  downloadAttachment,
} from "@/lib/memory/attachment-upload";

type MemoryCardProps = {
  memory: Memory;
  onEdit: (
    memory: Memory,
  ) => void;
  onDelete: (
    memory: Memory,
  ) => Promise<void>;
};

type CredentialData = {
  name: string;
  username: string;
  password: string;
  notes: string;
};

type AttachmentPreviewProps = {
  attachment: MemoryAttachment;
};

function isHttpUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(value);

    return (
      url.protocol ===
        "http:" ||
      url.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

function parseCredentialData(
  value: string,
): CredentialData | null {
  try {
    const parsed =
      JSON.parse(value);

    if (
      typeof parsed !==
        "object" ||
      parsed === null
    ) {
      return null;
    }

    return {
      name:
        typeof parsed.name ===
        "string"
          ? parsed.name
          : "",

      username:
        typeof parsed.username ===
        "string"
          ? parsed.username
          : "",

      password:
        typeof parsed.password ===
        "string"
          ? parsed.password
          : "",

      notes:
        typeof parsed.notes ===
        "string"
          ? parsed.notes
          : "",
    };
  } catch {
    return null;
  }
}

function formatAttachmentSize(
  bytes: number,
): string {
  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function AttachmentPreview({
  attachment,
}: AttachmentPreviewProps) {
  const [
    objectUrl,
    setObjectUrl,
  ] = useState<string | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled =
      false;

    let generatedUrl:
      | string
      | null = null;

    async function loadAttachment() {
      setIsLoading(true);
      setError(null);

      try {
        const blob =
          await downloadAttachment(
            attachment.driveFileId,
            attachment.iv,
            attachment.mimeType,
            attachment.fileName,
          );

        if (
          cancelled
        ) {
          return;
        }

        generatedUrl =
          URL.createObjectURL(
            blob,
          );

        setObjectUrl(
          generatedUrl,
        );
      } catch (error) {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load attachment.",
        );
      } finally {
        if (
          !cancelled
        ) {
          setIsLoading(false);
        }
      }
    }

    void loadAttachment();

    return () => {
      cancelled = true;

      if (
        generatedUrl
      ) {
        URL.revokeObjectURL(
          generatedUrl,
        );
      }
    };
  }, [
    attachment.driveFileId,
    attachment.iv,
    attachment.mimeType,
    attachment.fileName,
  ]);

  async function handleDownload() {
    try {
      const blob =
        await downloadAttachment(
          attachment.driveFileId,
          attachment.iv,
          attachment.mimeType,
          attachment.fileName,
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          "a",
        );

      link.href = url;
      link.download =
        attachment.fileName;

      document.body.appendChild(
        link,
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to download attachment.",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/20">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Decrypting attachment...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={
              handleDownload
            }
          >
            <Download className="mr-2 size-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!objectUrl) {
    return null;
  }

  if (
    attachment.type ===
    "Image"
  ) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border bg-muted/20">
        <Image
  src={objectUrl}
  alt={attachment.fileName}
  width={1200}
  height={800}
  unoptimized
  className="max-h-[500px] w-full object-contain"
/>
        </div>

        <AttachmentFooter
          attachment={
            attachment
          }
          onDownload={
            handleDownload
          }
        />
      </div>
    );
  }

  if (
    attachment.type ===
    "Audio"
  ) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <audio
          controls
          src={objectUrl}
          className="w-full"
        />

        <AttachmentFooter
          attachment={
            attachment
          }
          onDownload={
            handleDownload
          }
        />
      </div>
    );
  }

  if (
    attachment.type ===
    "Video"
  ) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border bg-black">
          <video
            controls
            src={objectUrl}
            className="max-h-[500px] w-full"
          />
        </div>

        <AttachmentFooter
          attachment={
            attachment
          }
          onDownload={
            handleDownload
          }
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
          <FileIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {attachment.fileName}
          </p>

          <p className="text-xs text-muted-foreground">
            {formatAttachmentSize(
              attachment.size,
            )}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={
          handleDownload
        }
      >
        <Download className="mr-2 size-4" />
        Download
      </Button>
    </div>
  );
}

function AttachmentFooter({
  attachment,
  onDownload,
}: {
  attachment: MemoryAttachment;
  onDownload: () => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {attachment.fileName}
        </p>

        <p className="text-xs text-muted-foreground">
          {formatAttachmentSize(
            attachment.size,
          )}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={
          onDownload
        }
      >
        <Download className="mr-2 size-4" />
        Download
      </Button>
    </div>
  );
}

export function MemoryCard({
  memory,
  onEdit,
  onDelete,
}: MemoryCardProps) {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    credentialVisible,
    setCredentialVisible,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const isLink =
    memory.type ===
      "Link" &&
    isHttpUrl(memory.data);

  const credential =
    memory.type ===
    "Credential"
      ? parseCredentialData(
          memory.data,
        )
      : null;

  const language =
    memory.metadata
      ?.language ??
    "plaintext";

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Delete this memory? This cannot be undone.",
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete(
        memory,
      );
    } finally {
      setIsDeleting(false);
      setMenuOpen(false);
    }
  }

  async function handleCopyPassword() {
    if (
      !credential?.password
    ) {
      return;
    }

    await navigator.clipboard.writeText(
      credential.password,
    );

    setCopied(true);

    window.setTimeout(
      () => {
        setCopied(false);
      },
      1500,
    );
  }

  function renderContent() {
    if (
      memory.type ===
      "Credential"
    ) {
      if (!credential) {
        return (
          <p className="text-sm text-destructive">
            Unable to read credential data.
          </p>
        );
      }

      return (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">
              Service
            </span>

            <span className="text-sm font-medium">
              {credential.name}
            </span>
          </div>

          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">
              Username
            </span>

            <span className="break-all text-sm">
              {credential.username}
            </span>
          </div>

          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">
              Password
            </span>

            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-3 py-2 text-sm">
                {credentialVisible
                  ? credential.password
                  : "••••••••••••"}
              </code>

              <Button
                variant="outline"
                size="icon"
                aria-label={
                  credentialVisible
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setCredentialVisible(
                    (value) =>
                      !value,
                  )
                }
              >
                {credentialVisible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                aria-label="Copy password"
                onClick={
                  handleCopyPassword
                }
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <span className="text-xs">
                    Copy
                  </span>
                )}
              </Button>
            </div>
          </div>

          {credential.notes && (
            <div className="grid gap-1">
              <span className="text-xs text-muted-foreground">
                Notes
              </span>

              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {credential.notes}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (
      memory.type ===
      "Code"
    ) {
      return (
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {language}
            </span>
          </div>

          <pre className="max-h-96 overflow-auto bg-muted/20 p-4">
            <code className="font-mono text-sm">
              {memory.data}
            </code>
          </pre>
        </div>
      );
    }

    if (isLink) {
      return (
        <a
          href={memory.data}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 break-all text-sm underline underline-offset-4"
        >
          <span>
            {memory.data}
          </span>

          <ExternalLink className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </a>
      );
    }

    if (
      memory.attachments &&
      memory.attachments.length >
        0
    ) {
      return (
        <div className="space-y-4">
          {memory.data && (
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {memory.data}
            </p>
          )}

          {memory.attachments.map(
            (attachment) => (
              <AttachmentPreview
                key={
                  attachment.id
                }
                attachment={
                  attachment
                }
              />
            ),
          )}
        </div>
      );
    }

    return (
      <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
        {memory.data}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-lg">
              {memory.description}
            </CardTitle>

            <CardDescription>
              {new Date(
                memory.updatedAt,
              ).toLocaleString()}
            </CardDescription>
          </div>

          <div className="relative flex shrink-0 items-center gap-2">
            <span className="rounded-full border px-2 py-1 text-xs">
              {memory.type}
            </span>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Memory actions"
              onClick={() =>
                setMenuOpen(
                  (value) =>
                    !value,
                )
              }
              disabled={
                isDeleting
              }
            >
              <MoreHorizontal className="size-4" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-40 rounded-md border bg-background p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(
                      false,
                    );

                    onEdit(
                      memory,
                    );
                  }}
                >
                  <Edit3 className="mr-2 size-4" />
                  Edit
                </button>

                <button
                  type="button"
                  className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-destructive hover:bg-muted"
                  onClick={
                    handleDelete
                  }
                  disabled={
                    isDeleting
                  }
                >
                  <Trash2 className="mr-2 size-4" />

                  {isDeleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {renderContent()}

        {memory.tags &&
          memory.tags.length >
            0 && (
            <div className="flex flex-wrap gap-2">
              {memory.tags.map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ),
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}