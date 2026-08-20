"use client";

import { useState } from "react";

import { Paperclip, TriangleAlert, Upload, X } from "lucide-react";

import { MemoryTypeIcon } from "@/components/memory/memory-type-icon";

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

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { MEMORY_TYPES } from "@/types/memory";

import type {
  AttachmentType,
  Memory,
  MemoryAttachment,
  MemoryType,
} from "@/types/memory";

import {
  MEMORY_TYPE_DESCRIPTIONS,
  MEMORY_TYPE_STYLES,
  isAttachmentMemoryType,
  parseCredentialData,
} from "@/lib/memory/memory-display";

import {
  validateAttachmentFile,
  createAttachmentMetadata,
  formatAttachmentSize,
} from "@/lib/memory/attachment-service";

import {
  uploadAttachment,
  deleteAttachment,
} from "@/lib/memory/attachment-upload";

type MemoryInput = {
  type: MemoryType;
  data: string;
  description: string;
  metadata?: Record<string, string>;
  attachments?: MemoryAttachment[];
};

type MemoryComposerProps = {
  open: boolean;
  mode?: "create" | "edit";
  initialMemory?: Memory | null;
  onClose: () => void;
  onCreate: (
    input: MemoryInput,
  ) => Promise<void>;
  onUpdate?: (
    memoryId: string,
    input: MemoryInput,
  ) => Promise<void>;
};

function isValidUrl(
  value: string,
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function getInitialState(
  mode: "create" | "edit",
  memory?: Memory | null,
) {
  if (mode === "edit" && memory) {
    const metadata = memory.metadata ?? {};

    const isCredential = memory.type === "Credential";

    const credential = isCredential
      ? parseCredentialData(memory.data)
      : null;

    return {
      type: memory.type,
      description: memory.description,
      data: isCredential ? "" : memory.data,
      codeLanguage:
        metadata.language ?? "plaintext",
      credentialName: credential?.name ?? "",
      credentialUsername: credential?.username ?? "",
      credentialPassword: credential?.password ?? "",
      credentialNotes: credential?.notes ?? "",
      selectedFiles: [] as File[],
      existingAttachments:
        (memory.attachments ??
          []) as MemoryAttachment[],
    };
  }

  return {
    type: "Text" as MemoryType,
    description: "",
    data: "",
    codeLanguage: "plaintext",
    credentialName: "",
    credentialUsername: "",
    credentialPassword: "",
    credentialNotes: "",
    selectedFiles: [] as File[],
    existingAttachments:
      [] as MemoryAttachment[],
  };
}

function getAcceptForType(
  type: MemoryType,
): string | undefined {
  switch (type) {
    case "Image":
      return "image/*";

    case "Audio":
      return "audio/*";

    case "Video":
      return "video/*";

    default:
      return undefined;
  }
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="label-mono"
      >
        {children}
      </label>

      {hint && (
        <span className="label-mono text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

export function MemoryComposer({
  open,
  mode = "create",
  initialMemory = null,
  onClose,
  onCreate,
  onUpdate,
}: MemoryComposerProps) {
  const [draftKey, setDraftKey] = useState(
    () => `${mode}:${initialMemory?.id ?? "new"}`,
  );

  const [draft, setDraft] = useState(() =>
    getInitialState(mode, initialMemory),
  );

  const [error, setError] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const [uploadStatus, setUploadStatus] =
    useState("");

  const [isDragging, setIsDragging] =
    useState(false);

  const currentKey =
    `${mode}:${initialMemory?.id ?? "new"}`;

  /*
   * Reset the draft when the composer is
   * pointed at a different memory.
   */
  if (draftKey !== currentKey) {
    setDraftKey(currentKey);

    setDraft(
      getInitialState(mode, initialMemory),
    );

    setError("");
    setUploadStatus("");
    setIsDragging(false);
    setIsSaving(false);
  }

  const {
    type,
    description,
    data,
    codeLanguage,
    credentialName,
    credentialUsername,
    credentialPassword,
    credentialNotes,
    selectedFiles,
    existingAttachments,
  } = draft;

  const isEdit = mode === "edit";

  function updateDraft(
    updates: Partial<typeof draft>,
  ) {
    setDraft((current) => ({
      ...current,
      ...updates,
    }));

    setError("");
  }

  function handleRequestClose() {
    if (isSaving) {
      return;
    }

    onClose();
  }

  function addFiles(
    files: FileList | File[] | null,
  ) {
    if (!files) {
      return;
    }

    if (!isAttachmentMemoryType(type)) {
      return;
    }

    const incoming = Array.from(files);

    if (incoming.length === 0) {
      return;
    }

    try {
      for (const file of incoming) {
        validateAttachmentFile(
          file,
          type as AttachmentType,
        );
      }

      setDraft((current) => ({
        ...current,
        selectedFiles: [
          ...current.selectedFiles,
          ...incoming,
        ],
      }));

      setError("");
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "That file cannot be attached.",
      );
    }
  }

  function removeSelectedFile(
    index: number,
  ) {
    setDraft((current) => ({
      ...current,
      selectedFiles:
        current.selectedFiles.filter(
          (_, currentIndex) =>
            currentIndex !== index,
        ),
    }));
  }

  function removeExistingAttachment(
    attachmentId: string,
  ) {
    setDraft((current) => ({
      ...current,
      existingAttachments:
        current.existingAttachments.filter(
          (attachment) =>
            attachment.id !== attachmentId,
        ),
    }));

    setError("");
  }

  async function uploadSelectedFiles(): Promise<{
    attachments: MemoryAttachment[];
    uploadedFileIds: string[];
  }> {
    if (selectedFiles.length === 0) {
      return {
        attachments: [],
        uploadedFileIds: [],
      };
    }

    const attachments: MemoryAttachment[] = [];

    const uploadedFileIds: string[] = [];

    try {
      for (
        let index = 0;
        index < selectedFiles.length;
        index++
      ) {
        const file = selectedFiles[index];

        setUploadStatus(
          `Encrypting ${index + 1} of ${selectedFiles.length} — ${file.name}`,
        );

        const attachmentId =
          crypto.randomUUID();

        const uploaded =
          await uploadAttachment(
            file,
            attachmentId,
          );

        uploadedFileIds.push(
          uploaded.fileId,
        );

        attachments.push(
          createAttachmentMetadata(
            file,
            uploaded.fileId,
            uploaded.iv,
          ),
        );
      }

      return {
        attachments,
        uploadedFileIds,
      };
    } catch (uploadError) {
      for (const fileId of uploadedFileIds) {
        try {
          await deleteAttachment(fileId);
        } catch {
          console.error(
            "Failed to clean up attachment:",
            fileId,
          );
        }
      }

      throw uploadError;
    }
  }

  async function handleSave() {
    setError("");
    setUploadStatus("");

    const trimmedDescription =
      description.trim();

    if (!trimmedDescription) {
      setError(
        "Give this memory a name so you can find it later.",
      );
      return;
    }

    let finalData = data.trim();

    const metadata: Record<string, string> = {};

    if (type === "Credential") {
      const name = credentialName.trim();

      const username =
        credentialUsername.trim();

      const password = credentialPassword;

      const notes = credentialNotes.trim();

      if (!name) {
        setError(
          "Enter a name for this credential.",
        );
        return;
      }

      if (!username) {
        setError(
          "Enter the username or email.",
        );
        return;
      }

      if (!password) {
        setError(
          "Enter the credential password.",
        );
        return;
      }

      finalData = JSON.stringify({
        name,
        username,
        password,
        notes,
      });
    }

    const isAttachmentType =
      isAttachmentMemoryType(type);

    if (!isAttachmentType && !finalData) {
      setError(
        type === "Link"
          ? "Paste a link to save."
          : "Enter something to remember.",
      );
      return;
    }

    if (
      isAttachmentType &&
      selectedFiles.length === 0 &&
      existingAttachments.length === 0
    ) {
      setError(
        `Select at least one ${type.toLowerCase()} file.`,
      );
      return;
    }

    if (
      type === "Link" &&
      !isValidUrl(finalData)
    ) {
      setError(
        "Enter a valid http or https link.",
      );
      return;
    }

    if (type === "Code") {
      metadata.language =
        codeLanguage.trim() || "plaintext";
    }

    setIsSaving(true);

    try {
      const uploadResult =
        await uploadSelectedFiles();

      const combinedAttachments = [
        ...existingAttachments,
        ...uploadResult.attachments,
      ];

      setUploadStatus(
        combinedAttachments.length > 0
          ? "Saving encrypted vault…"
          : "",
      );

      const input: MemoryInput = {
        type,
        data: finalData,
        description: trimmedDescription,
        metadata,
        attachments: combinedAttachments,
      };

      try {
        if (isEdit && initialMemory && onUpdate) {
          await onUpdate(
            initialMemory.id,
            input,
          );
        } else {
          await onCreate(input);
        }
      } catch (saveError) {
        for (
          const fileId of
          uploadResult.uploadedFileIds
        ) {
          try {
            await deleteAttachment(fileId);
          } catch {
            console.error(
              "Failed to clean up attachment after save failure:",
              fileId,
            );
          }
        }

        throw saveError;
      }

      setUploadStatus("");
      onClose();
    } catch (saveError) {
      setUploadStatus("");

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this memory.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderAttachmentField() {
    if (!isAttachmentMemoryType(type)) {
      return null;
    }

    const totalAttachments =
      existingAttachments.length +
      selectedFiles.length;

    return (
      <div className="flex flex-col gap-4">
        <FieldLabel
          htmlFor="memory-attachment"
          hint={
            totalAttachments > 0
              ? `${totalAttachments} attached`
              : "Max 100 MB per file"
          }
        >
          {type} files
        </FieldLabel>

        {existingAttachments.length > 0 && (
          <ul className="flex flex-col gap-2">
            {existingAttachments.map(
              (attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {attachment.fileName}
                    </p>

                    <p className="label-mono mt-0.5 text-muted-foreground">
                      Saved · {formatAttachmentSize(attachment.size)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      removeExistingAttachment(
                        attachment.id,
                      )
                    }
                    disabled={isSaving}
                    aria-label={`Remove ${attachment.fileName}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}

        <label
          htmlFor="memory-attachment"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);

            if (!isSaving) {
              addFiles(event.dataTransfer.files);
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-violet bg-violet/15"
              : "border-border bg-secondary/60 hover:border-violet hover:bg-violet/10"
          }`}
        >
          <Upload className="size-6 text-violet" aria-hidden="true" />

          <span className="display text-lg">
            Drop {type.toLowerCase()} files
          </span>

          <span className="label-mono text-muted-foreground">
            or click to choose · encrypted on your device
          </span>

          <input
            id="memory-attachment"
            type="file"
            className="sr-only"
            multiple
            accept={getAcceptForType(type)}
            onChange={(event) => {
              addFiles(event.target.files);

              event.target.value = "";
            }}
            disabled={isSaving}
          />
        </label>

        {selectedFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="label-mono text-muted-foreground">
              Ready to upload
            </p>

            <ul className="flex flex-col gap-2">
              {selectedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-mint/20 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {file.name}
                    </p>

                    <p className="label-mono mt-0.5 text-muted-foreground">
                      {formatAttachmentSize(file.size)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      removeSelectedFile(index)
                    }
                    disabled={isSaving}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Paperclip
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <p className="label-mono text-muted-foreground">
            Files are encrypted before they leave your device
          </p>
        </div>
      </div>
    );
  }

  function renderContentField() {
    if (isAttachmentMemoryType(type)) {
      return renderAttachmentField();
    }

    if (type === "Credential") {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="credential-name">
              Service
            </FieldLabel>

            <Input
              id="credential-name"
              placeholder="GitHub"
              value={credentialName}
              onChange={(event) =>
                updateDraft({
                  credentialName:
                    event.target.value,
                })
              }
              disabled={isSaving}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="credential-username">
              Username / Email
            </FieldLabel>

            <Input
              id="credential-username"
              placeholder="you@example.com"
              value={credentialUsername}
              onChange={(event) =>
                updateDraft({
                  credentialUsername:
                    event.target.value,
                })
              }
              disabled={isSaving}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="credential-password"
              hint="Encrypted"
            >
              Password
            </FieldLabel>

            <Input
              id="credential-password"
              type="password"
              placeholder="••••••••••••"
              value={credentialPassword}
              onChange={(event) =>
                updateDraft({
                  credentialPassword:
                    event.target.value,
                })
              }
              disabled={isSaving}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="credential-notes"
              hint="Optional"
            >
              Notes
            </FieldLabel>

            <Textarea
              id="credential-notes"
              placeholder="Recovery codes, security questions, anything else."
              value={credentialNotes}
              onChange={(event) =>
                updateDraft({
                  credentialNotes:
                    event.target.value,
                })
              }
              disabled={isSaving}
              rows={4}
            />
          </div>
        </div>
      );
    }

    if (type === "Code") {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="code-language">
              Language
            </FieldLabel>

            <Input
              id="code-language"
              placeholder="typescript"
              value={codeLanguage}
              onChange={(event) =>
                updateDraft({
                  codeLanguage:
                    event.target.value,
                })
              }
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="memory-data">
              Code
            </FieldLabel>

            <Textarea
              id="memory-data"
              placeholder="Paste your snippet…"
              value={data}
              onChange={(event) =>
                updateDraft({
                  data: event.target.value,
                })
              }
              disabled={isSaving}
              rows={12}
              className="min-h-48 font-mono text-sm"
              spellCheck={false}
            />
          </div>
        </div>
      );
    }

    if (type === "Link") {
      return (
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="memory-data">
            Link
          </FieldLabel>

          <Input
            id="memory-data"
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            value={data}
            onChange={(event) =>
              updateDraft({
                data: event.target.value,
              })
            }
            disabled={isSaving}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="memory-data">
          {type === "Other" ? "Content" : "Memory"}
        </FieldLabel>

        <Textarea
          id="memory-data"
          placeholder={
            type === "Other"
              ? "Dump anything else…"
              : "Dump anything you want to remember…"
          }
          value={data}
          onChange={(event) =>
            updateDraft({
              data: event.target.value,
            })
          }
          disabled={isSaving}
          rows={7}
          className="min-h-40"
        />
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleRequestClose();
        }
      }}
    >
      <DialogContent
        size="md"
        aria-describedby={undefined}
        onInteractOutside={(event) => {
          if (isSaving) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isSaving) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="bg-violet/12">
          <div className="min-w-0">
            <p className="label-mono text-muted-foreground">
              {isEdit ? "Edit" : "New"}
            </p>

            <DialogTitle className="mt-1.5">
              {isEdit ? "Edit memory" : "Dump something."}
            </DialogTitle>
          </div>

          <DialogCloseButton
            label="Close composer"
            disabled={isSaving}
          />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-7">
          <fieldset
            className="flex flex-col gap-3"
            disabled={isSaving}
          >
            <legend className="label-mono mb-3 text-muted-foreground">
              01 — What is it?
            </legend>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MEMORY_TYPES.map((memoryType) => {
                const selected = type === memoryType;

                const style =
                  MEMORY_TYPE_STYLES[memoryType];

                return (
                  <button
                    key={memoryType}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      updateDraft({
                        type: memoryType,
                        selectedFiles: [],
                      })
                    }
                    disabled={isSaving}
                    className={`flex min-w-0 flex-col items-start gap-1.5 rounded-2xl p-2.5 text-left transition-all outline-none disabled:pointer-events-none disabled:opacity-45 ${
                      selected
                        ? `${style.chip} shadow-[0_4px_0_0_var(--edge)] ${style.edge}`
                        : "bg-secondary text-foreground hover:bg-violet/12"
                    }`}
                  >
                    <MemoryTypeIcon
                      type={memoryType}
                      className="size-4 shrink-0"
                    />

                    <span className="label-mono w-full truncate">
                      {memoryType}
                    </span>

                    <span
                      className={`w-full truncate text-[0.6875rem] ${
                        selected
                          ? "opacity-75"
                          : "text-muted-foreground"
                      }`}
                    >
                      {MEMORY_TYPE_DESCRIPTIONS[memoryType]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <p className="label-mono text-muted-foreground">
              02 — Name it
            </p>

            <FieldLabel htmlFor="memory-description">
              Description
            </FieldLabel>

            <Input
              id="memory-description"
              placeholder="What is this?"
              value={description}
              onChange={(event) =>
                updateDraft({
                  description: event.target.value,
                })
              }
              disabled={isSaving}
              className="text-lg font-bold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="label-mono text-muted-foreground">
              03 — Content
            </p>

            {renderContentField()}
          </div>

          {uploadStatus && (
            <p
              className="label-mono rounded-2xl bg-mint/30 px-4 py-3 text-ink"
              role="status"
            >
              {uploadStatus}
            </p>
          )}

          {error && (
            <p
              className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
              role="alert"
            >
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {error}
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleRequestClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Save memory"}
            <span aria-hidden="true">→</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
