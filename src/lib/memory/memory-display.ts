import type { Memory, MemoryType } from "@/types/memory";

/*
 * Shared, presentation-only helpers.
 *
 * These are used by the memory card, the
 * memory detail view and the composer so
 * that every surface describes a memory in
 * exactly the same way.
 */

export type CredentialData = {
  name: string;
  username: string;
  password: string;
  notes: string;
};

export const EMPTY_CREDENTIAL: CredentialData = {
  name: "",
  username: "",
  password: "",
  notes: "",
};

export function isHttpUrl(
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

/*
 * Credentials are stored as a JSON payload
 * inside the encrypted memory body.
 */
export function parseCredentialData(
  value: string,
): CredentialData | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed !== "object" ||
      parsed === null
    ) {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    return {
      name:
        typeof record.name === "string"
          ? record.name
          : "",

      username:
        typeof record.username === "string"
          ? record.username
          : "",

      password:
        typeof record.password === "string"
          ? record.password
          : "",

      notes:
        typeof record.notes === "string"
          ? record.notes
          : "",
    };
  } catch {
    return null;
  }
}

/*
 * A link memory shows its host, never the
 * full URL, on summary surfaces.
 */
export function getLinkHost(
  value: string,
): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function formatMemoryDate(
  value: string,
): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "Unknown date";
  }

  return new Date(timestamp).toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

export function formatMemoryDateTime(
  value: string,
): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "Unknown date";
  }

  return new Date(timestamp).toLocaleString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export const MEMORY_TYPE_DESCRIPTIONS: Record<
  MemoryType,
  string
> = {
  Text: "Notes & thoughts",
  Link: "Web references",
  Code: "Snippets",
  Credential: "Accounts & passwords",
  Image: "Photos",
  File: "Documents",
  Audio: "Voice",
  Video: "Clips",
  Other: "Anything else",
};

/*
 * Colour carries meaning in DUMP: every
 * memory type keeps the same hue on its
 * card chip, in the composer selector and
 * in the detail header, so a type becomes
 * recognisable before the label is read.
 */
export type MemoryTypeStyle = {
  chip: string;
  edge: string;
  tint: string;
};

export const MEMORY_TYPE_STYLES: Record<
  MemoryType,
  MemoryTypeStyle
> = {
  Text: {
    chip: "bg-violet text-white",
    edge: "[--edge:var(--violet-deep)]",
    tint: "bg-violet/12",
  },
  Link: {
    chip: "bg-sky text-ink",
    edge: "[--edge:var(--sky-deep)]",
    tint: "bg-sky/16",
  },
  Code: {
    chip: "bg-ink text-cream",
    edge: "[--edge:color-mix(in_oklch,var(--ink),black_35%)]",
    tint: "bg-ink/10",
  },
  Credential: {
    chip: "bg-coral text-ink",
    edge: "[--edge:var(--coral-deep)]",
    tint: "bg-coral/16",
  },
  Image: {
    chip: "bg-mint text-ink",
    edge: "[--edge:var(--mint-deep)]",
    tint: "bg-mint/18",
  },
  File: {
    chip: "bg-lemon text-ink",
    edge: "[--edge:var(--lemon-deep)]",
    tint: "bg-lemon/20",
  },
  Audio: {
    chip: "bg-violet text-white",
    edge: "[--edge:var(--violet-deep)]",
    tint: "bg-violet/12",
  },
  Video: {
    chip: "bg-coral text-ink",
    edge: "[--edge:var(--coral-deep)]",
    tint: "bg-coral/16",
  },
  Other: {
    chip: "bg-secondary text-ink",
    edge: "[--edge:var(--border)]",
    tint: "bg-secondary",
  },
};

export const ATTACHMENT_MEMORY_TYPES = [
  "Image",
  "File",
  "Audio",
  "Video",
] as const;

export function isAttachmentMemoryType(
  type: MemoryType,
): type is (typeof ATTACHMENT_MEMORY_TYPES)[number] {
  return (
    type === "Image" ||
    type === "File" ||
    type === "Audio" ||
    type === "Video"
  );
}

/*
 * A short, content-free summary line.
 *
 * IMPORTANT:
 *
 * This must never leak memory content.
 * It describes the shape of a memory, not
 * what is inside it.
 */
export function getMemorySummaryLine(
  memory: Memory,
): string {
  const attachments = memory.attachments ?? [];

  if (isAttachmentMemoryType(memory.type)) {
    if (attachments.length === 0) {
      return "No attachment";
    }

    return attachments.length === 1
      ? attachments[0].fileName
      : `${attachments.length} files`;
  }

  switch (memory.type) {
    case "Credential":
      return "Protected credential";

    case "Link": {
      const host = getLinkHost(memory.data);

      return host ?? "Saved link";
    }

    case "Code":
      return memory.metadata?.language ?? "plaintext";

    default:
      return attachments.length > 0
        ? `${attachments.length} attached`
        : "";
  }
}
