const SEMANTIC_QUERY_GROUPS = [
    {
      terms: [
        "pant",
        "pants",
        "trousers",
      ],
  
      expansions: [
        "clothing measurements",
        "clothing size",
        "body measurements",
        "body size",
      ],
    },
  
    {
      terms: [
        "clothes",
        "clothing",
        "apparel",
        "garments",
      ],
  
      expansions: [
        "clothing measurements",
        "clothing size",
        "body measurements",
      ],
    },
  
    {
      terms: [
        "measurement",
        "measurements",
        "dimension",
        "dimensions",
      ],
  
      expansions: [
        "body measurements",
        "body size",
        "clothing measurements",
        "clothing size",
        "waist measurement",
        "waist size",
        "length measurement",
      ],
    },
  
    {
      terms: [
        "waist",
        "waist size",
        "waist measurement",
      ],
  
      expansions: [
        "body measurements",
        "body size",
        "clothing measurements",
      ],
    },
  
    {
      terms: [
        "length",
        "length measurement",
      ],
  
      expansions: [
        "body measurements",
        "clothing measurements",
        "clothing size",
      ],
    },
  ] as const;
  
  function normalizeQuery(
    query: string,
  ): string {
    return query
      .trim()
      .replace(
        /\s+/g,
        " ",
      )
      .toLowerCase();
  }
  
  export function expandSemanticQuery(
    query: string,
  ): string[] {
    const normalized =
      normalizeQuery(query);
  
    if (!normalized) {
      return [];
    }
  
    const results =
      new Set<string>();
  
    results.add(
      normalized,
    );
  
    for (
      const group of
        SEMANTIC_QUERY_GROUPS
    ) {
      const matchesGroup =
        group.terms.some(
          (term) =>
            normalized === term ||
            normalized.includes(
              term,
            ),
        );
  
      if (!matchesGroup) {
        continue;
      }
  
      for (
        const term of group.terms
      ) {
        results.add(term);
      }
  
      for (
        const expansion of
          group.expansions
      ) {
        results.add(
          expansion,
        );
      }
    }
  
    return [
      ...results,
    ];
  }