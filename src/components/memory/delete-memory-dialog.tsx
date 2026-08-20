"use client";

import { useState } from "react";

import { Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Memory } from "@/types/memory";

type DeleteMemoryDialogProps = {
  memory: Memory | null;
  onCancel: () => void;
  onConfirm: (memory: Memory) => Promise<void>;
};

export function DeleteMemoryDialog({
  memory,
  onCancel,
  onConfirm,
}: DeleteMemoryDialogProps) {
  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] = useState("");

  if (!memory) {
    return null;
  }

  const attachmentCount =
    memory.attachments?.length ?? 0;

  async function handleConfirm() {
    if (!memory) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      await onConfirm(memory);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this memory.",
      );

      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !isDeleting) {
          onCancel();
        }
      }}
    >
      <DialogContent
        size="sm"
        role="alertdialog"
        aria-describedby="delete-memory-description"
        onInteractOutside={(event) => {
          if (isDeleting) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (isDeleting) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="bg-coral text-ink">
          <div className="min-w-0">
            <p className="label-mono opacity-70">
              Destructive
            </p>

            <DialogTitle className="mt-1.5">
              Delete this memory?
            </DialogTitle>
          </div>

          <Trash2
            className="size-6 shrink-0"
            aria-hidden="true"
          />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <p className="tile-flat bg-secondary px-4 py-3 text-base font-bold break-words">
            {memory.description}
          </p>

          <p
            id="delete-memory-description"
            className="text-base leading-relaxed font-medium"
          >
            This can&apos;t be undone.
            {attachmentCount > 0 &&
              ` ${attachmentCount} encrypted ${
                attachmentCount === 1 ? "file" : "files"
              } will be removed from your Drive as well.`}
          </p>

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
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
