import assert from "node:assert/strict";

import {
  cosineSimilarity,
  generateEmbedding,
  getEmbeddingDimensions,
  getEmbeddingModel,
} from "@/lib/memory/search/embedding";

function getMagnitude(
  vector: Float32Array,
): number {
  let sum = 0;

  for (
    let index = 0;
    index < vector.length;
    index++
  ) {
    const value =
      vector[index] ?? 0;

    sum +=
      value * value;
  }

  return Math.sqrt(sum);
}

async function main(): Promise<void> {
  /*
   * 1. Model metadata.
   */
  {
    assert.equal(
      getEmbeddingDimensions(),
      384,
      "MiniLM embedding dimension must be 384",
    );

    assert.equal(
      getEmbeddingModel(),
      "Xenova/all-MiniLM-L6-v2",
      "unexpected embedding model",
    );
  }

  /*
   * 2. Generate an embedding.
   *
   * This is the first test that actually
   * loads the local model.
   */
  const programming =
    await generateEmbedding(
      "I am learning programming and software development.",
    );

  assert.equal(
    programming.length,
    384,
    "embedding must contain exactly 384 dimensions",
  );

  /*
   * 3. Every component must be finite.
   */
  for (
    const value of programming
  ) {
    assert.ok(
      Number.isFinite(value),
      "embedding must contain only finite values",
    );
  }

  /*
   * 4. Embedding must be normalized.
   */
  {
    const magnitude =
      getMagnitude(
        programming,
      );

    assert.ok(
      Math.abs(
        magnitude - 1,
      ) < 0.0001,
      `embedding must be normalized. Magnitude: ${magnitude}`,
    );
  }

  /*
   * 5. Same text should produce
   * effectively identical embeddings.
   */
  {
    const same =
      await generateEmbedding(
        "I am learning programming and software development.",
      );

    const similarity =
      cosineSimilarity(
        programming,
        same,
      );

    assert.ok(
      similarity >
        0.999,
      `identical text should have similarity close to 1. Received ${similarity}`,
    );
  }

  /*
   * 6. Semantically related text
   * should have strong similarity.
   */
  {
    const related =
      await generateEmbedding(
        "I am studying software engineering and coding.",
      );

    const similarity =
      cosineSimilarity(
        programming,
        related,
      );

    assert.ok(
      similarity >
        0.65,
      `related programming concepts should have strong similarity. Received ${similarity}`,
    );
  }

  /*
   * 7. Clearly unrelated text should
   * be substantially less similar.
   */
  {
    const unrelated =
      await generateEmbedding(
        "The recipe requires tomatoes, onions, and olive oil.",
      );

    const similarity =
      cosineSimilarity(
        programming,
        unrelated,
      );

    assert.ok(
      similarity <
        0.65,
      `unrelated concepts should have lower similarity. Received ${similarity}`,
    );
  }

  /*
   * 8. Identical vectors must have
   * cosine similarity of 1.
   */
  {
    const similarity =
      cosineSimilarity(
        programming,
        programming,
      );

    assert.ok(
      Math.abs(
        similarity - 1,
      ) < 0.000001,
      `a vector compared with itself must equal 1. Received ${similarity}`,
    );
  }

  /*
   * 9. Different dimensions must
   * be rejected.
   */
  {
    const invalid =
      new Float32Array(
        10,
      );

    assert.throws(
      () =>
        cosineSimilarity(
          programming,
          invalid,
        ),
      /different dimensions/,
      "different embedding dimensions must be rejected",
    );
  }

  /*
   * 10. Zero vectors must not produce
   * NaN or Infinity.
   */
  {
    const zero =
      new Float32Array(
        384,
      );

    const similarity =
      cosineSimilarity(
        programming,
        zero,
      );

    assert.equal(
      similarity,
      0,
      "similarity with a zero vector must be 0",
    );

    assert.ok(
      Number.isFinite(
        similarity,
      ),
      "zero-vector similarity must remain finite",
    );
  }

  /*
   * 11. Empty input must be rejected.
   */
  {
    await assert.rejects(
      () =>
        generateEmbedding(
          "   ",
        ),
      /empty text/,
      "empty text must not be embedded",
    );
  }

  console.log(
    `STEP 5.12E EMBEDDING TESTS PASSED — ${getEmbeddingModel()} / ${getEmbeddingDimensions()} dimensions`,
  );
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exitCode = 1;
  },
);