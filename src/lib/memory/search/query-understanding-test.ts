import assert from "node:assert/strict";

import {
  getQueryTexts,
  understandQuery,
} from "./query-understanding";

function assertIncludes(
  values: string[],
  expected: string,
  message: string,
): void {
  assert(
    values.includes(expected),
    message,
  );
}

/*
 * Empty query
 */
{
  const result =
    understandQuery("");

  assert.equal(
    result.normalizedQuery,
    "",
  );

  assert.deepEqual(
    result.concepts,
    [],
  );

  assert.equal(
    result.confidence,
    0,
  );
}

/*
 * Whitespace normalization
 */
{
  const result =
    understandQuery(
      "  body    measurements  ",
    );

  assert.equal(
    result.normalizedQuery,
    "body measurements",
  );

  assertIncludes(
    result.concepts,
    "body measurements",
    "normalized query should become a concept",
  );
}

/*
 * Arbitrary query
 */
{
  const result =
    understandQuery(
      "things I need for my trip",
    );

  assert.equal(
    result.originalQuery,
    "things I need for my trip",
  );

  assert.equal(
    result.normalizedQuery,
    "things i need for my trip",
  );

  assertIncludes(
    result.concepts,
    "things i need for my trip",
    "original semantic query should be preserved",
  );
}

/*
 * Query text extraction
 */
{
  const result =
    understandQuery(
      "my college project",
    );

  const texts =
    getQueryTexts(result);

  assertIncludes(
    texts,
    "my college project",
    "query text should contain the normalized query",
  );

  assert.equal(
    new Set(texts).size,
    texts.length,
    "query texts should be unique",
  );
}

const conceptual =
  understandQuery("fashion");

assert.equal(
  conceptual.intent,
  "conceptual",
);

const naturalLanguage =
  understandQuery(
    "where did I save my internship information",
  );

assert.equal(
  naturalLanguage.intent,
  "natural-language",
);

const empty =
  understandQuery("");

assert.equal(
  empty.intent,
  "unknown",
);

console.log(
  "STEP 5.14B QUERY UNDERSTANDING TESTS PASSED",
);