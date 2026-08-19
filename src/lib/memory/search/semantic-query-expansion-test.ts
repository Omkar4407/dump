import assert from "node:assert/strict";

import {
  expandSemanticQuery,
} from "./semantic-query-expansion";

function includesExpanded(
  query: string,
  expected: string[],
): void {
  const expanded =
    expandSemanticQuery(query);

  for (const value of expected) {
    assert(
      expanded.includes(value),
      `"${query}" should expand to "${value}"`,
    );
  }
}

function excludesUnrelated(
  query: string,
  forbidden: string[],
): void {
  const expanded =
    expandSemanticQuery(query);

  for (const value of forbidden) {
    assert(
      !expanded.includes(value),
      `"${query}" must not expand to unrelated "${value}"`,
    );
  }
}

/*
 * Clothing / apparel concepts.
 */
includesExpanded(
    "pants",
    [
      "pants",
      "pant",
      "trousers",
      "clothing measurements",
      "clothing size",
      "body measurements",
    ],
  );


  includesExpanded(
    "clothes",
    [
      "clothes",
      "clothing",
      "clothing measurements",
      "clothing size",
      "body measurements",
    ],
  );
  
  includesExpanded(
    "pants",
    [
      "clothing measurements",
      "clothing size",
      "body measurements",
    ],
  );
  
  includesExpanded(
    "measurement",
    [
      "measurement",
      "measurements",
      "body measurements",
      "body size",
      "clothing measurements",
      "clothing size",
      "waist measurement",
      "waist size",
      "length measurement",
    ],
  );

includesExpanded(
  "clothes",
  [
    "clothes",
    "clothing",
    "apparel",
    "garments",
  ],
);

/*
 * Measurement concepts.
 */
includesExpanded(
  "measurement",
  [
    "measurement",
    "measurements",
    "body measurements",
  ],
);

includesExpanded(
    "body measurements",
    [
      "body measurements",
      "measurement",
      "body size",
      "clothing measurements",
      "clothing size",
      "waist measurement",
      "waist size",
      "length measurement",
    ],
  );

/*
 * Existing specific queries must
 * remain present.
 */
for (const query of [
  "pants",
  "clothes",
  "measurement",
  "waist size",
]) {
  const expanded =
    expandSemanticQuery(query);

  assert(
    expanded.includes(query),
    `"${query}" must always remain in its own expansion`,
  );
}

/*
 * Do not turn arbitrary queries into
 * unrelated clothing searches.
 */
excludesUnrelated(
  "github",
  [
    "pants",
    "clothing",
    "apparel",
    "body measurements",
  ],
);

excludesUnrelated(
  "birthday",
  [
    "pants",
    "measurement",
    "clothing",
  ],
);

console.log(
  "STEP 5.13A SEMANTIC QUERY EXPANSION TESTS PASSED",
);