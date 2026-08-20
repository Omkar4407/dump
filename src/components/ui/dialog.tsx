"use client";

import * as React from "react";

import { Dialog as DialogPrimitive } from "radix-ui";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * Rounded bento sheet.
 *
 * Desktop — a floating panel with a soft 3D
 *           lift.
 * Mobile  — a full-screen sheet.
 *
 * Radix supplies the accessible dialog
 * semantics: focus trap, Escape, restored
 * focus, aria-modal and labelling.
 */

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogClose = DialogPrimitive.Close;

const DIALOG_SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
} as const;

type DialogSize = keyof typeof DIALOG_SIZES;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: DialogSize;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />

      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-background",
          "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97",
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[86dvh] sm:w-[calc(100%-3rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl sm:shadow-[0_30px_60px_-24px_color-mix(in_oklch,var(--ink)_60%,transparent)]",
          DIALOG_SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "relative flex shrink-0 items-start justify-between gap-4 overflow-hidden bg-secondary px-5 py-4 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "tile-scroll flex-1 overflow-x-hidden px-5 py-5 sm:px-6 sm:py-6",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "display text-2xl break-words sm:text-3xl",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogCloseButton({
  className,
  label = "Close",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close> & {
  label?: string;
}) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      aria-label={label}
      className={cn(
        "press-3d relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground [--edge:var(--border)] outline-none hover:bg-coral hover:text-ink disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
    </DialogPrimitive.Close>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
