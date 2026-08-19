import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

const EMBEDDING_MODEL =
  "Xenova/all-MiniLM-L6-v2";

const EMBEDDING_DIMENSIONS =
  384;

type EmbeddingPipeline =
  FeatureExtractionPipeline;

let extractorPromise:
  Promise<EmbeddingPipeline> | null =
  null;

function getExtractor(): Promise<EmbeddingPipeline> {
  if (
    !extractorPromise
  ) {
    extractorPromise =
      pipeline(
        "feature-extraction",
        EMBEDDING_MODEL,
        {
          dtype: "q8",
        },
      ) as Promise<EmbeddingPipeline>;
  }

  return extractorPromise;
}

function normalizeVector(
  vector: Float32Array,
): Float32Array {
  let magnitudeSquared =
    0;

  for (
    let index = 0;
    index < vector.length;
    index++
  ) {
    const value =
      vector[index] ?? 0;

    magnitudeSquared +=
      value * value;
  }

  const magnitude =
    Math.sqrt(
      magnitudeSquared,
    );

  if (
    magnitude === 0
  ) {
    return vector;
  }

  const normalized =
    new Float32Array(
      vector.length,
    );

  for (
    let index = 0;
    index < vector.length;
    index++
  ) {
    normalized[index] =
      (vector[index] ?? 0) /
      magnitude;
  }

  return normalized;
}

function validateEmbedding(
  embedding: Float32Array,
): Float32Array {
  if (
    embedding.length !==
    EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Unexpected embedding dimension. Expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}.`,
    );
  }

  for (
    let index = 0;
    index < embedding.length;
    index++
  ) {
    const value =
      embedding[index];

    if (
      value === undefined ||
      !Number.isFinite(
        value,
      )
    ) {
      throw new Error(
        "Embedding contains an invalid numeric value.",
      );
    }
  }

  return embedding;
}

function extractVector(
  output: unknown,
): Float32Array {
  /*
   * Transformers.js returns a Tensor
   * for feature extraction.
   *
   * The tensor exposes its underlying
   * numeric data through `.data`.
   */
  if (
    typeof output !==
      "object" ||
    output === null
  ) {
    throw new Error(
      "Embedding model returned an invalid result.",
    );
  }

  const tensor =
    output as {
      data?: unknown;
      dims?: unknown;
    };

  if (
    !(
      tensor.data instanceof
      Float32Array
    )
  ) {
    throw new Error(
      "Embedding model returned an unsupported tensor format.",
    );
  }

  if (
    tensor.data.length ===
    0
  ) {
    throw new Error(
      "Embedding model returned an empty vector.",
    );
  }

  /*
   * For a single input with
   * pooling enabled, Transformers.js
   * should return a single 384-value
   * embedding.
   */
  return new Float32Array(
    tensor.data,
  );
}

export async function generateEmbedding(
  text: string,
): Promise<Float32Array> {
  const normalized =
    text.trim();

  if (!normalized) {
    throw new Error(
      "Cannot generate an embedding for empty text.",
    );
  }

  const extractor =
    await getExtractor();

  const output =
    await extractor(
      normalized,
      {
        pooling:
          "mean",
        normalize:
          true,
      },
    );

  const vector =
    extractVector(
      output,
    );

  const validated =
    validateEmbedding(
      vector,
    );

  return normalizeVector(
    validated,
  );
}

export function cosineSimilarity(
  first: Float32Array,
  second: Float32Array,
): number {
  if (
    first.length !==
    second.length
  ) {
    throw new Error(
      `Cannot compare embeddings with different dimensions: ${first.length} and ${second.length}.`,
    );
  }

  if (
    first.length === 0
  ) {
    return 0;
  }

  let dotProduct =
    0;

  let firstMagnitudeSquared =
    0;

  let secondMagnitudeSquared =
    0;

  for (
    let index = 0;
    index < first.length;
    index++
  ) {
    const firstValue =
      first[index] ?? 0;

    const secondValue =
      second[index] ?? 0;

    dotProduct +=
      firstValue *
      secondValue;

    firstMagnitudeSquared +=
      firstValue *
      firstValue;

    secondMagnitudeSquared +=
      secondValue *
      secondValue;
  }

  if (
    firstMagnitudeSquared ===
      0 ||
    secondMagnitudeSquared ===
      0
  ) {
    return 0;
  }

  const similarity =
    dotProduct /
    (
      Math.sqrt(
        firstMagnitudeSquared,
      ) *
      Math.sqrt(
        secondMagnitudeSquared,
      )
    );

  return Math.max(
    -1,
    Math.min(
      1,
      similarity,
    ),
  );
}

export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}