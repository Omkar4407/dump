import assert from "node:assert/strict";

import {
  buildSemanticText,
  canEmbedMemory,
} from "@/lib/memory/search/semantic-text";

import type {
  Memory,
} from "@/types/memory";

function createMemory(
  overrides: Partial<Memory> = {},
): Memory {
  const now =
    new Date().toISOString();

  return {
    id: "test-memory",
    type: "Text",
    data: "Programming notes",
    description:
      "Software development project",
    tags: [
      "programming",
      "development",
    ],
    metadata: {
      language:
        "TypeScript",
      project:
        "DUMP",
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/*
 * 1. Normal memory should include
 * useful searchable information.
 */
{
  const memory =
    createMemory();

  const text =
    buildSemanticText(
      memory,
    );

  assert.ok(
    text.includes(
      "Type: Text",
    ),
    "memory type should be included",
  );

  assert.ok(
    text.includes(
      "Description: Software development project",
    ),
    "description should be included",
  );

  assert.ok(
    text.includes(
      "Content: Programming notes",
    ),
    "normal memory content should be included",
  );

  assert.ok(
    text.includes(
      "Tags: programming, development",
    ),
    "tags should be included",
  );

  assert.ok(
    text.includes(
      "Metadata language: TypeScript",
    ),
    "metadata should be included",
  );
}

/*
 * 2. Credential secret must never
 * enter semantic text.
 */
{
  const secret =
    "SuperSecretPassword123!";

  const credential =
    createMemory({
      type:
        "Credential",

      data:
        secret,

      description:
        "GitHub account",

      tags: [
        "github",
        "developer",
      ],

      metadata: {
        username:
          "omkar",
        service:
          "GitHub",
      },
    });

  const text =
    buildSemanticText(
      credential,
    );

  assert.ok(
    text.includes(
      "Type: Credential",
    ),
    "credential type should be included",
  );

  assert.ok(
    text.includes(
      "Description: GitHub account",
    ),
    "credential description should be included",
  );

  assert.ok(
    text.includes(
      "Tags: github, developer",
    ),
    "credential tags should be included",
  );

  assert.ok(
    text.includes(
      "Metadata username: omkar",
    ),
    "safe credential metadata should be included",
  );

  assert.ok(
    !text.includes(
      secret,
    ),
    "credential secret must NEVER appear in semantic text",
  );
}

/*
 * 3. Attachment filenames and types
 * should be searchable.
 */
{
  const memory =
    createMemory({
      attachments: [
        {
          id:
            "attachment-1",
          type:
            "Image",
          fileName:
            "project-screenshot.png",
          mimeType:
            "image/png",
          size:
            1024,
          driveFileId:
            "drive-file-1",
          encryptionVersion:
            1,
          iv:
            "test-iv",
          createdAt:
            new Date().toISOString(),
        },
      ],
    });

  const text =
    buildSemanticText(
      memory,
    );

  assert.ok(
    text.includes(
      "Attachment: project-screenshot.png",
    ),
    "attachment filename should be included",
  );

  assert.ok(
    text.includes(
      "Attachment type: Image",
    ),
    "attachment type should be included",
  );
}

/*
 * 4. Empty searchable content should
 * not be considered embeddable.
 */
{
  const memory =
    createMemory({
      type:
        "Other",
      data:
        "",
      description:
        "",
      tags: [],
      metadata: {},
      attachments: [],
    });

  assert.equal(
    canEmbedMemory(
      memory,
    ),
    true,
    "memory type itself provides searchable semantic context",
  );
}

/*
 * 5. Whitespace should be normalized.
 */
{
  const memory =
    createMemory({
      description:
        "   machine     learning   project   ",
    });

  const text =
    buildSemanticText(
      memory,
    );

  assert.ok(
    text.includes(
      "Description: machine learning project",
    ),
    "whitespace should be normalized",
  );
}

console.log(
  "STEP 5.12F SEMANTIC TEXT TESTS PASSED",
);