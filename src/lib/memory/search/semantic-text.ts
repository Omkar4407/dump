import type {
  Memory,
} from "@/types/memory";

import {
  getSearchableCredentialText,
} from "@/lib/memory/search/credential-fields";

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
   * in semantic embeddings. Only the
   * service name and username are — the
   * password and notes never are.
   */
  if (
    memory.type === "Credential"
  ) {
    appendPart(
      parts,
      "Account",
      getSearchableCredentialText(memory),
    );
  } else {
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


/*
 * Focused facets of a memory.
 *
 * A single embedding of the whole document
 * dilutes short, conceptual queries: the
 * identity of a memory ("Shirt measurements")
 * gets averaged together with its long body
 * text, and the resulting vector matches a
 * two-word query weakly.
 *
 * Indexing a few focused views alongside the
 * full document lets retrieval score a query
 * against whichever part of the memory it
 * actually refers to. It also gives long
 * memories a chance: the embedding model
 * truncates its input, so content past the
 * limit is invisible unless it is chunked.
 */

const MAX_CONTENT_CHUNKS = 3;

const CONTENT_CHUNK_SIZE = 480;

function chunkContent(
  value: string,
): string[] {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  if (
    normalized.length <= CONTENT_CHUNK_SIZE
  ) {
    return [normalized];
  }

  const chunks: string[] = [];

  for (
    let start = 0;
    start < normalized.length &&
    chunks.length < MAX_CONTENT_CHUNKS;
    start += CONTENT_CHUNK_SIZE
  ) {
    const chunk = normalized
      .slice(start, start + CONTENT_CHUNK_SIZE)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export type WeightedSemanticFacet = {
  text: string;

  /*
   * How much this view is worth as evidence.
   *
   * A structural facet only says what kind of
   * thing a memory is, not what it is about,
   * so it bridges domain queries without being
   * allowed to outrank a real description or
   * content match.
   */
  weight: number;
};

const STRUCTURAL_FACET_WEIGHT = 0.82;

export function buildWeightedSemanticFacets(
  memory: Memory,
): WeightedSemanticFacet[] {
  const facets: WeightedSemanticFacet[] = [];

  /*
   * Identity facet: what this memory is,
   * without its body. This is what a short
   * conceptual query actually looks like.
   */
  const identity: string[] = [];

  appendPart(
    identity,
    "Type",
    memory.type,
  );

  appendPart(
    identity,
    "Description",
    memory.description,
  );

  appendList(
    identity,
    "Tags",
    memory.tags,
  );

  if (memory.type === "Credential") {
    appendPart(
      identity,
      "Account",
      getSearchableCredentialText(memory),
    );
  }

  if (identity.length > 0) {
    facets.push({
      text: identity.join("\n"),
      weight: 1,
    });
  }

  /*
   * The bare description carries the
   * strongest signal for conceptual
   * queries, so it is also indexed alone.
   */
  const description = normalizeText(
    memory.description,
  );

  if (description) {
    facets.push({
      text: description,
      weight: 1,
    });
  }

  /*
   * Structural facet.
   *
   * A memory's type combined with what it
   * declares about itself ("Code javascript",
   * "Image") bridges jargon-heavy content to
   * domain queries that its prose never uses:
   * a debounce snippet reads nothing like
   * "software development", but its structure
   * does.
   *
   * This is only emitted when the structure
   * carries something distinguishing. A bare
   * generic type word is close to almost any
   * query in embedding space, so indexing one
   * alone would turn every plain memory into
   * an attractor and destroy precision.
   */
  const structuralExtras = [
    ...new Set(
      [
        ...Object.values(
          memory.metadata ?? {},
        ),
        ...(memory.attachments ?? []).map(
          (attachment) => attachment.type,
        ),
      ]
        .map(normalizeText)
        .filter(Boolean),
    ),
  ];

  /*
   * "Text" and "Other" say nothing about a
   * memory — measured against unrelated
   * queries they carry no discriminating
   * signal at all, so indexing them would
   * turn every plain memory into an
   * attractor. Every other type is strongly
   * discriminating and is always indexed,
   * even with no metadata to accompany it,
   * so a snippet saved without a language
   * is still reachable by "coding".
   */
  const isGenericType =
    memory.type === "Text" ||
    memory.type === "Other";

  const structural = isGenericType
    ? structuralExtras
    : [
        ...new Set([
          normalizeText(memory.type),
          ...structuralExtras,
        ]),
      ];

  if (structural.length > 0) {
    facets.push({
      text: structural.join(" "),
      weight: STRUCTURAL_FACET_WEIGHT,
    });
  }

  /*
   * Body facets. Credentials never expose
   * their payload here.
   */
  if (memory.type !== "Credential") {
    for (
      const chunk of chunkContent(memory.data)
    ) {
      facets.push({
        text: chunk,
        weight: 1,
      });
    }
  }

  const seen = new Set<string>();

  return facets.filter((facet) => {
    if (!facet.text || seen.has(facet.text)) {
      return false;
    }

    seen.add(facet.text);

    return true;
  });
}

export function buildSemanticFacets(
  memory: Memory,
): string[] {
  return buildWeightedSemanticFacets(
    memory,
  ).map((facet) => facet.text);
}
