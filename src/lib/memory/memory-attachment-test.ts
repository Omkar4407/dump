import assert from "node:assert/strict";

import {
  createMemoryInVault,
  updateMemoryInVault,
} from "@/lib/memory/memory-service";

import {
  createEmptyVault,
  normalizeVault,
} from "@/lib/vault/vault";

import type { MemoryAttachment } from "@/types/memory";

function createAttachment(
  id: string,
  fileName: string,
): MemoryAttachment {
  return {
    id,
    type: "Image",
    fileName,
    mimeType: "image/png",
    size: 2048,
    driveFileId: `drive-${id}`,
    encryptionVersion: 1,
    iv: "AAAAAAAAAAAAAAAA",
    createdAt: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  /*
   * An attachment memory carries its payload
   * in encrypted attachments, so an empty
   * text body must be accepted.
   */
  {
    const attachment =
      createAttachment("a1", "holiday.png");

    const created =
      createMemoryInVault(
        createEmptyVault(),
        {
          type: "Image",
          data: "",
          description: "Holiday photo",
          attachments: [attachment],
        },
      );

    assert.equal(
      created.memory.attachments?.length,
      1,
      "attachments must be persisted when a memory is created",
    );

    assert.equal(
      created.memory.attachments?.[0].driveFileId,
      "drive-a1",
      "the stored attachment must keep its Drive file reference",
    );

    /*
     * The memory must also survive the
     * normalization performed before the
     * vault is encrypted and uploaded.
     */
    const normalized =
      normalizeVault(created.vault);

    assert.equal(
      normalized.memories[0].attachments?.length,
      1,
      "attachments must survive vault normalization",
    );
  }

  /*
   * Editing an attachment memory must keep,
   * replace and remove attachments exactly
   * as the composer submitted them.
   */
  {
    const first =
      createAttachment("a1", "first.png");

    const second =
      createAttachment("a2", "second.png");

    const created =
      createMemoryInVault(
        createEmptyVault(),
        {
          type: "Image",
          data: "",
          description: "Screenshots",
          attachments: [first],
        },
      );

    const updated =
      updateMemoryInVault(
        created.vault,
        created.memory.id,
        {
          type: "Image",
          data: "",
          description: "Screenshots",
          tags: [],
          attachments: [first, second],
        },
      );

    assert.deepEqual(
      updated.memory.attachments?.map(
        (attachment) => attachment.id,
      ),
      ["a1", "a2"],
      "an update must persist the submitted attachment list",
    );
  }

  /*
   * Duplicate attachments would break the
   * vault schema, so they are collapsed.
   */
  {
    const attachment =
      createAttachment("a1", "duplicate.png");

    const created =
      createMemoryInVault(
        createEmptyVault(),
        {
          type: "Image",
          data: "",
          description: "Duplicate upload",
          attachments: [attachment, attachment],
        },
      );

    assert.equal(
      created.memory.attachments?.length,
      1,
      "duplicate attachment IDs must be collapsed",
    );
  }

  /*
   * Content is still mandatory for every
   * memory type that is not carried by an
   * attachment.
   */
  {
    assert.throws(
      () =>
        createMemoryInVault(
          createEmptyVault(),
          {
            type: "Text",
            data: "   ",
            description: "Empty text memory",
          },
        ),
      /content cannot be empty/i,
      "text memories must still require content",
    );

    assert.throws(
      () =>
        createMemoryInVault(
          createEmptyVault(),
          {
            type: "Image",
            data: "",
            description: "Image without a file",
          },
        ),
      /content cannot be empty/i,
      "attachment memories must require at least one attachment",
    );
  }

  console.log(
    "MEMORY ATTACHMENT PERSISTENCE TESTS PASSED",
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
