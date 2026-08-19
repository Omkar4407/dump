import type {
  Memory,
} from "@/types/memory";

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function appendPart(
  parts: string[],
  label: string,
  value: string,
): void {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return;
  }

  parts.push(
    `${label}: ${normalized}`,
  );
}

function appendList(
  parts: string[],
  label: string,
  values: string[],
): void {
  const normalized =
    values
      .map(normalizeText)
      .filter(Boolean);

  if (normalized.length === 0) {
    return;
  }

  parts.push(
    `${label}: ${normalized.join(", ")}`,
  );
}

function appendMetadata(
  parts: string[],
  memory: Memory,
): void {
  for (
    const [key, value] of Object.entries(
      memory.metadata,
    )
  ) {
    const normalizedKey =
      normalizeText(key);

    const normalizedValue =
      normalizeText(value);

    if (
      !normalizedKey &&
      !normalizedValue
    ) {
      continue;
    }

    if (
      normalizedKey &&
      normalizedValue
    ) {
      parts.push(
        `Metadata ${normalizedKey}: ${normalizedValue}`,
      );
    } else if (normalizedKey) {
      parts.push(
        `Metadata key: ${normalizedKey}`,
      );
    } else {
      parts.push(
        `Metadata value: ${normalizedValue}`,
      );
    }
  }
}

function appendAttachments(
  parts: string[],
  memory: Memory,
): void {
  if (
    !memory.attachments ||
    memory.attachments.length === 0
  ) {
    return;
  }

  for (
    const attachment of memory.attachments
  ) {
    appendPart(
      parts,
      "Attachment",
      attachment.fileName,
    );

    appendPart(
      parts,
      "Attachment type",
      attachment.type,
    );
  }
}

/**
 * Builds the complete semantic representation
 * used by the embedding/indexing layer.
 *
 * This representation is intentionally generic:
 * it does not contain domain-specific vocabulary,
 * synonyms, or hardcoded concepts.
 */
export function buildSemanticText(
  memory: Memory,
): string {
  const parts: string[] = [];

  appendPart(
    parts,
    "Type",
    memory.type,
  );

  appendPart(
    parts,
    "Description",
    memory.description,
  );

  /*
   * SECURITY BOUNDARY:
   *
   * Credential secrets are never included
   * in semantic embeddings.
   */
  if (
    memory.type !== "Credential"
  ) {
    appendPart(
      parts,
      "Content",
      memory.data,
    );
  }

  appendList(
    parts,
    "Tags",
    memory.tags,
  );

  appendMetadata(
    parts,
    memory,
  );

  appendAttachments(
    parts,
    memory,
  );

  return parts.join("\n");
}

export function canEmbedMemory(
  memory: Memory,
): boolean {
  return (
    buildSemanticText(memory).length > 0
  );
}