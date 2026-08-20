import {
  Code2,
  FileText,
  ImageIcon,
  KeyRound,
  Link2,
  Paperclip,
  Shapes,
  Video,
  Volume2,
} from "lucide-react";

import type { MemoryType } from "@/types/memory";

type MemoryTypeIconProps = {
  type: MemoryType;
  className?: string;
};

/*
 * Declared at module scope on purpose.
 *
 * Resolving an icon component during render
 * would remount it on every state change.
 */
export function MemoryTypeIcon({
  type,
  className,
}: MemoryTypeIconProps) {
  switch (type) {
    case "Credential":
      return (
        <KeyRound className={className} aria-hidden="true" />
      );

    case "Link":
      return (
        <Link2 className={className} aria-hidden="true" />
      );

    case "Code":
      return (
        <Code2 className={className} aria-hidden="true" />
      );

    case "Image":
      return (
        <ImageIcon className={className} aria-hidden="true" />
      );

    case "Audio":
      return (
        <Volume2 className={className} aria-hidden="true" />
      );

    case "Video":
      return (
        <Video className={className} aria-hidden="true" />
      );

    case "File":
      return (
        <Paperclip className={className} aria-hidden="true" />
      );

    case "Other":
      return (
        <Shapes className={className} aria-hidden="true" />
      );

    default:
      return (
        <FileText className={className} aria-hidden="true" />
      );
  }
}
