import type {
  Memory,
} from "@/types/memory";

import {
  generateEmbedding,
} from "@/lib/memory/search/embedding";

import {
  buildSemanticText,
  buildWeightedSemanticFacets,
  canEmbedMemory,
} from "@/lib/memory/search/semantic-text";

export type SemanticIndexEntry = {
  memoryId: string;

  /*
   * Embedding of the whole memory document.
   */
  embedding: Float32Array;

  /*
   * Embeddings of focused views of the same
   * memory — its identity, its description
   * and its content chunks.
   *
   * Retrieval scores a query against the
   * best-matching view instead of against a
   * single averaged vector.
   */
  facetEmbeddings: Float32Array[];

  /*
   * Evidence weight of each facet, aligned by
   * index with `facetEmbeddings`.
   */
  facetWeights: number[];

  text: string;
};

export type SemanticIndexStats = {
  size: number;
};

export class SemanticIndex {
  private readonly entries =
    new Map<
      string,
      SemanticIndexEntry
    >();

  private generation = 0;

  public get size(): number {
    return this.entries.size;
  }

  public getStats():
    SemanticIndexStats {
    return {
      size:
        this.entries.size,
    };
  }

  public has(
    memoryId: string,
  ): boolean {
    return this.entries.has(
      memoryId,
    );
  }

  public get(
    memoryId: string,
  ):
    | SemanticIndexEntry
    | undefined {
    return this.entries.get(
      memoryId,
    );
  }

  public clear(): void {
    this.entries.clear();

    this.generation += 1;
  }

  public remove(
    memoryId: string,
  ): boolean {
    return this.entries.delete(
      memoryId,
    );
  }

  public async indexMemory(
    memory: Memory,
  ): Promise<SemanticIndexEntry | null> {
    if (
      !canEmbedMemory(
        memory,
      )
    ) {
      this.entries.delete(
        memory.id,
      );

      return null;
    }

    const text =
      buildSemanticText(
        memory,
      );

    if (!text) {
      this.entries.delete(
        memory.id,
      );

      return null;
    }

    const generation =
      this.generation;

    const facets =
      buildWeightedSemanticFacets(
        memory,
      );

    const [
      embedding,
      ...facetEmbeddings
    ] = await Promise.all([
      generateEmbedding(text),
      ...facets.map(
        (facet) =>
          generateEmbedding(facet.text),
      ),
    ]);

    /*
     * The index may have been
     * cleared while the model was
     * generating the embedding.
     *
     * Do not allow a stale async
     * operation to repopulate a
     * cleared index.
     */
    if (
      generation !==
      this.generation
    ) {
      return null;
    }

    const entry: SemanticIndexEntry =
      {
        memoryId:
          memory.id,

        embedding,

        facetEmbeddings,

        facetWeights: facets.map(
          (facet) => facet.weight,
        ),

        text,
      };

    this.entries.set(
      memory.id,
      entry,
    );

    return entry;
  }

  public async indexMemories(
    memories: Memory[],
  ): Promise<
    SemanticIndexEntry[]
  > {
    const indexed: SemanticIndexEntry[] =
      [];

    /*
     * Process sequentially for now.
     *
     * This prevents a large vault from
     * creating many simultaneous model
     * inference requests and excessive
     * memory pressure.
     */
    for (
      const memory of memories
    ) {
      const entry =
        await this.indexMemory(
          memory,
        );

      if (entry) {
        indexed.push(
          entry,
        );
      }
    }

    return indexed;
  }

  public async rebuild(
    memories: Memory[],
  ): Promise<
    SemanticIndexEntry[]
  > {
    this.clear();

    return this.indexMemories(
      memories,
    );
  }
}