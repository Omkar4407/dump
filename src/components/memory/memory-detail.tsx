"use client";

import { useEffect, useState } from "react";

import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";

import { AttachmentView } from "@/components/memory/attachment-view";

import { MemoryTypeIcon } from "@/components/memory/memory-type-icon";

import { Confetti, Squiggle } from "@/components/decor/memphis";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  MEMORY_TYPE_STYLES,
  formatMemoryDateTime,
  getLinkHost,
  isAttachmentMemoryType,
  isHttpUrl,
  parseCredentialData,
} from "@/lib/memory/memory-display";

import type { Memory } from "@/types/memory";

type MemoryDetailProps = {
  memory: Memory | null;
  onClose: () => void;
  onEdit: (memory: Memory) => void;
};

function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  async function handleCopy() {
    setFailed(false);

    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Button
      type="button"
      variant={copied ? "mint" : "outline"}
      size="sm"
      onClick={handleCopy}
      aria-label={label}
      className={className}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}

      <span aria-live="polite">
        {failed ? "Copy failed" : copied ? "Copied" : "Copy"}
      </span>
    </Button>
  );
}

function SectionLabel({
  children,
  dot = "bg-violet",
}: {
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <h3 className="label-mono flex items-center gap-2 text-muted-foreground">
      <span
        className={`size-2 rounded-full ${dot}`}
        aria-hidden="true"
      />
      {children}
    </h3>
  );
}

function CredentialContent({
  memory,
}: {
  memory: Memory;
}) {
  const [revealed, setRevealed] = useState(false);

  const credential = parseCredentialData(memory.data);

  if (!credential) {
    return (
      <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
        This credential could not be read.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="tile-flat min-w-0 bg-secondary p-4">
          <p className="label-mono text-muted-foreground">
            Service
          </p>

          <p className="mt-2 text-lg font-bold break-words">
            {credential.name || "Unnamed service"}
          </p>
        </div>

        <div className="tile-flat min-w-0 bg-secondary p-4">
          <p className="label-mono text-muted-foreground">
            Username
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-lg font-bold break-all">
              {credential.username || "—"}
            </p>

            {credential.username && (
              <CopyButton
                value={credential.username}
                label="Copy username"
              />
            )}
          </div>
        </div>
      </div>

      <div className="tile-flat bg-coral/15 p-4">
        <p className="label-mono text-muted-foreground">
          Password
        </p>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <p
            className="min-w-0 flex-1 rounded-2xl bg-card px-4 py-3 font-mono text-base break-all"
            data-testid="credential-password"
          >
            {revealed
              ? credential.password
              : "•".repeat(12)}
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevealed((value) => !value)}
              aria-pressed={revealed}
            >
              {revealed ? (
                <EyeOff className="size-3.5" aria-hidden="true" />
              ) : (
                <Eye className="size-3.5" aria-hidden="true" />
              )}

              {revealed ? "Hide" : "Reveal"}
            </Button>

            <CopyButton
              value={credential.password}
              label="Copy password"
            />
          </div>
        </div>
      </div>

      {credential.notes && (
        <div className="tile-flat bg-secondary p-4">
          <p className="label-mono text-muted-foreground">
            Notes
          </p>

          <p className="mt-2 text-base leading-relaxed font-medium whitespace-pre-wrap">
            {credential.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function MemoryContent({
  memory,
}: {
  memory: Memory;
}) {
  const attachments = memory.attachments ?? [];

  if (memory.type === "Credential") {
    /*
     * Keyed by memory so the password is
     * always re-hidden when a different
     * credential is opened.
     */
    return (
      <CredentialContent
        key={memory.id}
        memory={memory}
      />
    );
  }

  if (isAttachmentMemoryType(memory.type)) {
    if (attachments.length === 0) {
      return (
        <p className="label-mono text-muted-foreground">
          This memory has no attachment.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {attachments.map((attachment) => (
          <AttachmentView
            key={attachment.id}
            attachment={attachment}
          />
        ))}
      </div>
    );
  }

  if (memory.type === "Link") {
    const host = getLinkHost(memory.data);

    const isSafeLink = isHttpUrl(memory.data);

    return (
      <div className="tile-flat flex flex-col gap-3 bg-sky/15 p-4">
        {host && (
          <p className="display text-2xl break-words">
            {host}
          </p>
        )}

        <p className="rounded-2xl bg-card px-4 py-3 font-mono text-sm break-all">
          {memory.data}
        </p>

        <div className="flex flex-wrap gap-2">
          {isSafeLink && (
            <Button asChild size="sm">
              <a
                href={memory.data}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Open link
              </a>
            </Button>
          )}

          <CopyButton value={memory.data} label="Copy link" />
        </div>
      </div>
    );
  }

  if (memory.type === "Code") {
    const language = memory.metadata?.language ?? "plaintext";

    return (
      <div className="tile-flat overflow-hidden bg-ink">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="label-mono text-mint">
            {language}
          </span>

          <CopyButton value={memory.data} label="Copy code" />
        </div>

        <pre className="max-h-[45dvh] overflow-auto px-4 pb-4 text-sm leading-relaxed text-cream">
          <code>{memory.data}</code>
        </pre>
      </div>
    );
  }

  if (!memory.data) {
    return (
      <p className="label-mono text-muted-foreground">
        This memory has no content.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="tile-flat max-w-prose bg-secondary p-4 text-base leading-relaxed font-medium whitespace-pre-wrap">
        {memory.data}
      </p>

      <div>
        <CopyButton value={memory.data} label="Copy content" />
      </div>
    </div>
  );
}

export function MemoryDetail({
  memory,
  onClose,
  onEdit,
}: MemoryDetailProps) {
  const open = memory !== null;

  if (!memory) {
    return null;
  }

  const tags = memory.tags ?? [];

  const style = MEMORY_TYPE_STYLES[memory.type];

  const extraMetadata = Object.entries(
    memory.metadata ?? {},
  ).filter(([key]) => key !== "language");

  /*
   * Attachments can also be present on
   * non-attachment memory types.
   */
  const extraAttachments = isAttachmentMemoryType(memory.type)
    ? []
    : (memory.attachments ?? []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent
        size="lg"
        aria-describedby={undefined}
      >
        <DialogHeader className={style.tint}>
          <Squiggle className="pointer-events-none absolute -top-1 right-20 h-8 w-24 text-violet/25" />

          <Confetti className="pointer-events-none absolute -right-2 -bottom-4 size-16 text-ink/10" />

          <div className="relative min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${style.chip}`}
              >
                <MemoryTypeIcon
                  type={memory.type}
                  className="size-4"
                />
              </span>

              <span className="label-mono text-muted-foreground">
                {memory.type}
              </span>
            </div>

            <DialogTitle className="mt-2.5">
              {memory.description}
            </DialogTitle>

            <p className="label-mono mt-2 text-muted-foreground">
              Updated {formatMemoryDateTime(memory.updatedAt)}
            </p>
          </div>

          <DialogCloseButton label="Close memory" />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <SectionLabel>Content</SectionLabel>

            <MemoryContent memory={memory} />
          </section>

          {extraAttachments.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel dot="bg-mint">
                Attachments
              </SectionLabel>

              <div className="flex flex-col gap-4">
                {extraAttachments.map((attachment) => (
                  <AttachmentView
                    key={attachment.id}
                    attachment={attachment}
                  />
                ))}
              </div>
            </section>
          )}

          {extraMetadata.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel dot="bg-sky">Details</SectionLabel>

              <dl className="flex flex-col gap-2">
                {extraMetadata.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-secondary px-4 py-2.5"
                  >
                    <dt className="label-mono text-muted-foreground">
                      {key}
                    </dt>

                    <dd className="text-sm font-medium break-words">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <SectionLabel dot="bg-lemon">Tags</SectionLabel>

            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="label-mono rounded-full bg-lemon px-3 py-2 text-ink"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="label-mono text-muted-foreground">
                No tags
              </p>
            )}
          </section>

          <p className="label-mono text-muted-foreground">
            Created {formatMemoryDateTime(memory.createdAt)}
          </p>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={() => onEdit(memory)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
