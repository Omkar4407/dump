"use client";

import {
  useState,
} from "react";

import {
  Code2,
  File,
  FileAudio,
  FileImage,
  FileText,
  KeyRound,
  Link as LinkIcon,
  MoreHorizontal,
  Paperclip,
  Upload,
  Video,
  X,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Textarea,
} from "@/components/ui/textarea";

import type {
  Memory,
  MemoryAttachment,
  MemoryType,
} from "@/types/memory";

import type {
  AttachmentType,
} from "@/types/memory";

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
  tags: string[];
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

const COMPOSER_TYPES: {
  type: MemoryType;
  label: string;
  icon: typeof FileText;
}[] = [
  {
    type: "Text",
    label: "Text",
    icon: FileText,
  },
  {
    type: "Link",
    label: "Link",
    icon: LinkIcon,
  },
  {
    type: "Code",
    label: "Code",
    icon: Code2,
  },
  {
    type: "Credential",
    label: "Credential",
    icon: KeyRound,
  },
  {
    type: "Image",
    label: "Image",
    icon: FileImage,
  },
  {
    type: "File",
    label: "File",
    icon: File,
  },
  {
    type: "Audio",
    label: "Audio",
    icon: FileAudio,
  },
  {
    type: "Video",
    label: "Video",
    icon: Video,
  },
  {
    type: "Other",
    label: "Other",
    icon: MoreHorizontal,
  },
];

function isValidUrl(
  value: string,
): boolean {
  try {
    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function parseTags(
  value: string,
): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) =>
          tag
            .trim()
            .replace(/^#/, ""),
        )
        .filter(Boolean),
    ),
  ];
}

type CredentialData = {
  name: string;
  username: string;
  password: string;
  notes: string;
};

function parseCredentialData(
  value: string,
): CredentialData {
  try {
    const parsed =
      JSON.parse(value);

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
    return {
      name: "",
      username: "",
      password: "",
      notes: "",
    };
  }
}

function getInitialState(
  mode: "create" | "edit",
  memory?: Memory | null,
) {
  if (
    mode === "edit" &&
    memory
  ) {
    const metadata =
      memory.metadata ?? {};

    if (
      memory.type ===
      "Credential"
    ) {
      const credential =
        parseCredentialData(
          memory.data,
        );

      return {
        type: memory.type,
        description:
          memory.description,
        data: "",
        tags: (
          memory.tags ?? []
        ).join(", "),
        codeLanguage:
          metadata.language ??
          "plaintext",
        credentialName:
          credential.name,
        credentialUsername:
          credential.username,
        credentialPassword:
          credential.password,
        credentialNotes:
          credential.notes,
        selectedFiles:
          [] as File[],
        existingAttachments:
          (memory.attachments ??
            []) as MemoryAttachment[],
      };
    }

    return {
      type: memory.type,
      description:
        memory.description,
      data: memory.data,
      tags: (
        memory.tags ?? []
      ).join(", "),
      codeLanguage:
        metadata.language ??
        "plaintext",
      credentialName: "",
      credentialUsername: "",
      credentialPassword: "",
      credentialNotes: "",
      selectedFiles:
        [] as File[],
      existingAttachments:
        (memory.attachments ??
          []) as MemoryAttachment[],
    };
  }

  return {
    type: "Text" as MemoryType,
    description: "",
    data: "",
    tags: "",
    codeLanguage: "plaintext",
    credentialName: "",
    credentialUsername: "",
    credentialPassword: "",
    credentialNotes: "",
    selectedFiles:
      [] as File[],
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

    case "File":
      return undefined;

    default:
      return undefined;
  }
}

function isAttachmentMemoryType(
  type: MemoryType,
): type is AttachmentType {
  return (
    type === "Image" ||
    type === "File" ||
    type === "Audio" ||
    type === "Video"
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
  const [
    draftKey,
    setDraftKey,
  ] = useState(
    () =>
      `${mode}:${initialMemory?.id ?? "new"}`,
  );

  const [
    draft,
    setDraft,
  ] = useState(() =>
    getInitialState(
      mode,
      initialMemory,
    ),
  );

  const [error, setError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    uploadStatus,
    setUploadStatus,
  ] = useState("");

  const currentKey =
    `${mode}:${initialMemory?.id ?? "new"}`;

  if (
    draftKey !== currentKey
  ) {
    setDraftKey(
      currentKey,
    );

    setDraft(
      getInitialState(
        mode,
        initialMemory,
      ),
    );

    setError("");
    setUploadStatus("");
    setIsSaving(false);
  }

  if (!open) {
    return null;
  }

  const {
    type,
    description,
    data,
    tags,
    codeLanguage,
    credentialName,
    credentialUsername,
    credentialPassword,
    credentialNotes,
    selectedFiles,
    existingAttachments,
  } = draft;

  const isEdit =
    mode === "edit";

  function updateDraft(
    updates: Partial<typeof draft>,
  ) {
    setDraft(
      (current) => ({
        ...current,
        ...updates,
      }),
    );

    setError("");
  }

  function handleFileSelection(
    files: FileList | null,
  ) {
    if (!files) {
      return;
    }

    if (
      !isAttachmentMemoryType(
        type,
      )
    ) {
      return;
    }

    const incoming =
      Array.from(files);

    try {
      for (
        const file of incoming
      ) {
        validateAttachmentFile(
          file,
          type,
        );
      }

      setDraft(
        (current) => ({
          ...current,
          selectedFiles: [
            ...current.selectedFiles,
            ...incoming,
          ],
        }),
      );

      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Invalid attachment.",
      );
    }
  }

  function removeSelectedFile(
    index: number,
  ) {
    setDraft(
      (current) => ({
        ...current,
        selectedFiles:
          current.selectedFiles.filter(
            (
              _,
              currentIndex,
            ) =>
              currentIndex !==
              index,
          ),
      }),
    );
  }

  function removeExistingAttachment(
    attachmentId: string,
  ) {
    setDraft(
      (current) => ({
        ...current,
        existingAttachments:
          current.existingAttachments.filter(
            (attachment) =>
              attachment.id !==
              attachmentId,
          ),
      }),
    );

    setError("");
  }

  async function uploadSelectedFiles(): Promise<{
    attachments: MemoryAttachment[];
    uploadedFileIds: string[];
  }> {
    if (
      selectedFiles.length ===
      0
    ) {
      return {
        attachments: [],
        uploadedFileIds: [],
      };
    }

    const attachments:
      MemoryAttachment[] = [];

    const uploadedFileIds:
      string[] = [];

    try {
      for (
        let index = 0;
        index <
        selectedFiles.length;
        index++
      ) {
        const file =
          selectedFiles[index];

        setUploadStatus(
          `Encrypting and uploading ${index + 1} of ${selectedFiles.length}...`,
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

        const metadata =
          createAttachmentMetadata(
            file,
            uploaded.fileId,
            uploaded.iv,
          );

        attachments.push(
          metadata,
        );
      }

      return {
        attachments,
        uploadedFileIds,
      };
    } catch (error) {
      for (
        const fileId of
        uploadedFileIds
      ) {
        try {
          await deleteAttachment(
            fileId,
          );
        } catch {
          console.error(
            "Failed to clean up attachment:",
            fileId,
          );
        }
      }

      throw error;
    }
  }

  async function handleSave() {
    setError("");
    setUploadStatus("");

    const trimmedDescription =
      description.trim();

    if (!trimmedDescription) {
      setError(
        "Give this memory a short description.",
      );
      return;
    }

    let finalData =
      data.trim();

    const metadata: Record<
      string,
      string
    > = {};

    if (
      type === "Credential"
    ) {
      const name =
        credentialName.trim();

      const username =
        credentialUsername.trim();

      const password =
        credentialPassword;

      const notes =
        credentialNotes.trim();

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

      finalData =
        JSON.stringify({
          name,
          username,
          password,
          notes,
        });
    }

    const isAttachmentType =
      isAttachmentMemoryType(
        type,
      );

    if (
      !isAttachmentType &&
      !finalData
    ) {
      setError(
        type === "Link"
          ? "Paste a link to save."
          : "Enter something to remember.",
      );
      return;
    }

    if (
      isAttachmentType &&
      selectedFiles.length ===
        0 &&
      existingAttachments.length ===
        0
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

    if (
      type === "Code"
    ) {
      metadata.language =
        codeLanguage.trim() ||
        "plaintext";
    }

    setIsSaving(true);

    try {
      const uploadResult =
        await uploadSelectedFiles();

      const combinedAttachments =
        [
          ...existingAttachments,
          ...uploadResult.attachments,
        ];

      const input: MemoryInput = {
        type,
        data: finalData,
        description:
          trimmedDescription,
        tags: parseTags(tags),
        metadata,
        ...(combinedAttachments.length >
          0 && {
          attachments:
            combinedAttachments,
        }),
      };

      try {
        if (
          isEdit &&
          initialMemory &&
          onUpdate
        ) {
          await onUpdate(
            initialMemory.id,
            input,
          );
        } else {
          await onCreate(
            input,
          );
        }
      } catch (error) {
        for (
          const fileId of
          uploadResult.uploadedFileIds
        ) {
          try {
            await deleteAttachment(
              fileId,
            );
          } catch {
            console.error(
              "Failed to clean up attachment after save failure:",
              fileId,
            );
          }
        }

        throw error;
      }

      /*
       * At this point the vault has
       * successfully saved the new
       * attachment list.
       *
       * Any existing attachments that
       * were removed from the editor
       * can now safely be deleted from
       * Google Drive.
       */
      if (
        isEdit &&
        initialMemory?.attachments
      ) {
        const nextIds =
          new Set(
            combinedAttachments.map(
              (attachment) =>
                attachment.id,
            ),
          );

        const removedAttachments =
          initialMemory.attachments.filter(
            (attachment) =>
              !nextIds.has(
                attachment.id,
              ),
          );

        for (
          const attachment of
          removedAttachments
        ) {
          try {
            await deleteAttachment(
              attachment.driveFileId,
            );
          } catch (error) {
            console.error(
              "Failed to delete removed attachment from Google Drive:",
              attachment.driveFileId,
              error,
            );
          }
        }
      }

      setUploadStatus("");
      onClose();
    } catch (error) {
      setUploadStatus("");

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save memory.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderAttachmentField() {
    if (
      !isAttachmentMemoryType(
        type,
      )
    ) {
      return null;
    }

    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {type} Attachment
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Files are encrypted on your device before upload.
            </p>
          </div>

          <Paperclip className="size-4 text-muted-foreground" />
        </div>

        {existingAttachments.length >
          0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              Existing attachments
            </p>

            {existingAttachments.map(
              (attachment) => (
                <div
                  key={
                    attachment.id
                  }
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {
                        attachment.fileName
                      }
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatAttachmentSize(
                        attachment.size,
                      )}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeExistingAttachment(
                        attachment.id,
                      )
                    }
                    disabled={
                      isSaving
                    }
                    aria-label={`Remove ${attachment.fileName}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ),
            )}
          </div>
        )}

        <label
          htmlFor="memory-attachment"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/50"
        >
          <Upload className="mb-2 size-5 text-muted-foreground" />

          <span className="text-sm font-medium">
            Choose {type.toLowerCase()} files
          </span>

          <span className="mt-1 text-xs text-muted-foreground">
            Maximum 100 MB per file
          </span>

          <input
            id="memory-attachment"
            type="file"
            className="sr-only"
            multiple
            accept={getAcceptForType(
              type,
            )}
            onChange={(
              event,
            ) => {
              handleFileSelection(
                event.target.files,
              );

              event.target.value =
                "";
            }}
            disabled={isSaving}
          />
        </label>

        {selectedFiles.length >
          0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              Ready to upload
            </p>

            {selectedFiles.map(
              (
                file,
                index,
              ) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {file.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatAttachmentSize(
                        file.size,
                      )}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeSelectedFile(
                        index,
                      )
                    }
                    disabled={
                      isSaving
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ),
            )}
          </div>
        )}

        {uploadStatus && (
          <p className="text-xs text-muted-foreground">
            {uploadStatus}
          </p>
        )}
      </div>
    );
  }

  function renderContentField() {
    if (
      isAttachmentMemoryType(
        type,
      )
    ) {
      return renderAttachmentField();
    }

    if (
      type === "Credential"
    ) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="credential-name"
              className="text-sm font-medium"
            >
              Credential Name
            </label>

            <Input
              id="credential-name"
              placeholder="GitHub"
              value={
                credentialName
              }
              onChange={(
                event,
              ) =>
                updateDraft({
                  credentialName:
                    event.target.value,
                })
              }
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="credential-username"
              className="text-sm font-medium"
            >
              Username / Email
            </label>

            <Input
              id="credential-username"
              placeholder="you@example.com"
              value={
                credentialUsername
              }
              onChange={(
                event,
              ) =>
                updateDraft({
                  credentialUsername:
                    event.target.value,
                })
              }
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="credential-password"
              className="text-sm font-medium"
            >
              Password
            </label>

            <Input
              id="credential-password"
              type="password"
              placeholder="Credential password"
              value={
                credentialPassword
              }
              onChange={(
                event,
              ) =>
                updateDraft({
                  credentialPassword:
                    event.target.value,
                })
              }
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="credential-notes"
              className="text-sm font-medium"
            >
              Notes
            </label>

            <Textarea
              id="credential-notes"
              placeholder="Optional notes"
              value={
                credentialNotes
              }
              onChange={(
                event,
              ) =>
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

    if (
      type === "Code"
    ) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="code-language"
              className="text-sm font-medium"
            >
              Language
            </label>

            <Input
              id="code-language"
              placeholder="python"
              value={
                codeLanguage
              }
              onChange={(
                event,
              ) =>
                updateDraft({
                  codeLanguage:
                    event.target.value,
                })
              }
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="memory-data"
              className="text-sm font-medium"
            >
              Code
            </label>

            <Textarea
              id="memory-data"
              placeholder="Paste your code..."
              value={data}
              onChange={(
                event,
              ) =>
                updateDraft({
                  data:
                    event.target.value,
                })
              }
              disabled={isSaving}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );
    }

    if (
      type === "Link"
    ) {
      return (
        <div className="space-y-2">
          <label
            htmlFor="memory-data"
            className="text-sm font-medium"
          >
            Link
          </label>

          <Input
            id="memory-data"
            type="url"
            placeholder="https://example.com"
            value={data}
            onChange={(
              event,
            ) =>
              updateDraft({
                data:
                  event.target.value,
              })
            }
            disabled={isSaving}
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
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
      <div className="space-y-2">
        <label
          htmlFor="memory-data"
          className="text-sm font-medium"
        >
          {type === "Other"
            ? "Content"
            : "Memory"}
        </label>

        <Textarea
          id="memory-data"
          placeholder={
            type === "Other"
              ? "Dump anything else..."
              : "Dump anything you want to remember..."
          }
          value={data}
          onChange={(
            event,
          ) =>
            updateDraft({
              data:
                event.target.value,
            })
          }
          disabled={isSaving}
          rows={7}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/80 p-6 backdrop-blur-sm">
      <Card className="my-8 w-full max-w-xl shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>
            {isEdit
              ? "Edit Memory"
              : "Add Memory"}
          </CardTitle>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPOSER_TYPES.map(
              ({
                type: memoryType,
                label,
                icon: Icon,
              }) => {
                const selected =
                  type ===
                  memoryType;

                return (
                  <Button
                    key={
                      memoryType
                    }
                    type="button"
                    variant={
                      selected
                        ? "default"
                        : "outline"
                    }
                    className="h-12 justify-start"
                    onClick={() =>
                      updateDraft({
                        type: memoryType,
                        selectedFiles:
                          [],
                      })
                    }
                    disabled={
                      isSaving
                    }
                  >
                    <Icon className="mr-2 size-4" />
                    {label}
                  </Button>
                );
              },
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="memory-description"
              className="text-sm font-medium"
            >
              Description
            </label>

            <Input
              id="memory-description"
              placeholder="What is this?"
              value={
                description
              }
              onChange={(
                event,
              ) =>
                updateDraft({
                  description:
                    event.target.value,
                })
              }
              disabled={isSaving}
              autoFocus
            />
          </div>

          {renderContentField()}

          <div className="space-y-2">
            <label
              htmlFor="memory-tags"
              className="text-sm font-medium"
            >
              Tags
            </label>

            <Input
              id="memory-tags"
              placeholder="college, project, important"
              value={tags}
              onChange={(
                event,
              ) =>
                updateDraft({
                  tags:
                    event.target.value,
                })
              }
              disabled={isSaving}
            />

            <p className="text-xs text-muted-foreground">
              Separate tags with commas.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              onClick={
                handleSave
              }
              disabled={isSaving}
            >
              {isSaving
                ? uploadStatus
                  ? "Uploading..."
                  : "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Save Memory"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}