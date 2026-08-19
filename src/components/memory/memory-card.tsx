"use client";

import {
  memo,
  useEffect,
  useState,
} from "react";

import {
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileIcon,
  FileText,
  ImageIcon,
  KeyRound,
  Link2,
  MoreHorizontal,
  Paperclip,
  Trash2,
  Video,
  Volume2,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
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
  searchMatches?: string[];
  onEdit: (memory: Memory) => void;
  onDelete: (memory: Memory) => Promise<void>;
};

type CredentialData = {
  name: string;
  username: string;
  password: string;
  notes: string;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseCredentialData(value: string): CredentialData | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    return {
      name: typeof record.name === "string" ? record.name : "",
      username:
        typeof record.username === "string" ? record.username : "",
      password:
        typeof record.password === "string" ? record.password : "",
      notes: typeof record.notes === "string" ? record.notes : "",
    };
  } catch {
    return null;
  }
}

function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getTypeIcon(type: Memory["type"]) {
  switch (type) {
    case "Credential":
      return KeyRound;
    case "Link":
      return Link2;
    case "Code":
      return Code2;
    case "Image":
      return ImageIcon;
    case "Audio":
      return Volume2;
    case "Video":
      return Video;
    case "File":
      return Paperclip;
    default:
      return FileText;
  }
}

function AttachmentPreview({
  attachment,
}: {
  attachment: MemoryAttachment;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
              : "Unable to load attachment.",
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
    attachment.driveFileId,
    attachment.iv,
    attachment.mimeType,
    attachment.fileName,
  ]);

  async function handleDownload() {
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
          : "Unable to download attachment.",
      );
    }
  }

  const isImage = attachment.type === "Image";
  const isAudio = attachment.type === "Audio";
  const isVideo = attachment.type === "Video";

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      {error ? (
        <div className="flex min-h-24 items-center justify-center px-4 text-center text-xs text-destructive">
          {error}
        </div>
      ) : objectUrl && isImage ? (
        <img
          src={objectUrl}
          alt={attachment.fileName}
          loading="lazy"
          className="max-h-[420px] w-full object-contain bg-muted/10"
        />
      ) : objectUrl && isAudio ? (
        <div className="p-4">
          <audio
            controls
            src={objectUrl}
            className="w-full"
          />
        </div>
      ) : objectUrl && isVideo ? (
        <video
          controls
          src={objectUrl}
          className="max-h-[420px] w-full bg-black"
        />
      ) : !isImage && !isAudio && !isVideo ? (
        <div className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
            <FileIcon className="size-5 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {attachment.fileName}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatAttachmentSize(attachment.size)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-24 items-center justify-center text-xs text-muted-foreground">
          Loading attachment…
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">
            {attachment.fileName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatAttachmentSize(attachment.size)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={handleDownload}
        >
          <Download className="mr-2 size-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}

function SearchMatchContext({
  matches,
}: {
  matches: string[];
}) {
  if (matches.length === 0) {
    return null;
  }

  const labels: Record<string, string> = {
    exact: "Exact match",
    description: "Title",
    content: "Content",
    tag: "Tag",
    metadata: "Metadata",
    attachment: "Attachment",
    type: "Type",
    semantic: "Related",
  };

  const visible = matches
    .map((match) => labels[match] ?? match)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 4);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">
        Matched in
      </span>

      {visible.map((label) => (
        <span
          key={label}
          className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export const MemoryCard = memo(function MemoryCard({
  memory,
  searchMatches = [],
  onEdit,
  onDelete,
}: MemoryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [credentialVisible, setCredentialVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const credential =
    memory.type === "Credential"
      ? parseCredentialData(memory.data)
      : null;

  const TypeIcon = getTypeIcon(memory.type);

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this memory? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete(memory);
    } finally {
      setIsDeleting(false);
      setMenuOpen(false);
    }
  }

  async function handleCopyPassword() {
    if (!credential?.password) {
      return;
    }

    await navigator.clipboard.writeText(credential.password);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  function renderContent() {
    if (memory.type === "Credential") {
      if (!credential) {
        return (
          <p className="text-sm text-destructive">
            Unable to read credential data.
          </p>
        );
      }

      return (
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Service
              </p>
              <p className="mt-1 truncate text-sm font-medium">
                {credential.name || "Unnamed service"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Username
              </p>
              <p className="mt-1 truncate text-sm">
                {credential.username}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Password
            </p>

            <div className="mt-1.5 flex gap-2">
              <code className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-background px-3 py-2 text-sm">
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
                title={
                  credentialVisible
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setCredentialVisible((value) => !value)
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
                title="Copy password"
                onClick={handleCopyPassword}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {credential.notes && (
            <div className="mt-4 border-t pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {credential.notes}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (memory.type === "Link" && isHttpUrl(memory.data)) {
      return (
        <a
          href={memory.data}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Link2 className="size-5 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              Link
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">
              {memory.data}
            </p>
          </div>

          <ExternalLink className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </a>
      );
    }

    if (memory.type === "Code") {
      const language = memory.metadata?.language ?? "plaintext";

      return (
        <div className="overflow-hidden rounded-xl border bg-zinc-950">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              {language}
            </span>
            <Code2 className="size-3.5 text-zinc-500" />
          </div>

          <pre className="max-h-80 overflow-auto p-4 text-xs leading-6 text-zinc-200">
            <code>{memory.data}</code>
          </pre>
        </div>
      );
    }

    if (
      ["Image", "File", "Audio", "Video"].includes(memory.type) &&
      memory.attachments?.length
    ) {
      return (
        <div className="grid gap-3">
          {memory.attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
            />
          ))}
        </div>
      );
    }

    if (!memory.data) {
      return (
        <p className="text-sm italic text-muted-foreground">
          No text content
        </p>
      );
    }

    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
        {memory.data}
      </p>
    );
  }

  return (
    <Card className="overflow-visible border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
            <TypeIcon className="size-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg">
                {memory.description}
              </h2>

              <span className="shrink-0 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {memory.type}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(memory.updatedAt).toLocaleString()}
            </p>

            <SearchMatchContext matches={searchMatches} />
          </div>

          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Memory actions"
              title="Memory actions"
              onClick={() => setMenuOpen((value) => !value)}
              disabled={isDeleting}
            >
              <MoreHorizontal className="size-4" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-30 w-40 rounded-lg border bg-background p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(memory);
                  }}
                >
                  <Edit3 className="mr-2 size-4" />
                  Edit
                </button>

                <button
                  type="button"
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-muted"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="mr-2 size-4" />
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {renderContent()}

        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t pt-4">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});