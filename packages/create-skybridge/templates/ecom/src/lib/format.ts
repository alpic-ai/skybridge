export type NarrateSearchResultsInput = {
  keyword: string;
  products: { id: string; properties: { name: string; value: string[] }[] }[];
  pages?: { current: number; total: number };
  totalHits?: number;
  carouselMaxSize: number;
};

export function narrateSearchResults({
  keyword,
  pages,
  products,
  totalHits,
  carouselMaxSize,
}: NarrateSearchResultsInput) {
  const size = products.length;
  if (size <= 0) {
    return { content: "No product found." };
  }

  let header = `${size} product${size === 1 ? "" : "s"} found for ${keyword}.`;
  if (pages) {
    header += ` Page ${pages.current} of ${pages.total}.`;
  }
  if (totalHits) {
    header += ` Total hits: ${totalHits}.`;
  }

  const body: string[] = [header];
  for (const { id, properties } of products) {
    const item = [`# ID: ${id}`];
    for (const { name, value } of properties) {
      item.push(`- ${name}: ${value.join(", ")}`);
    }
    body.push(item.join("\n"));
  }

  const footer =
    size < carouselMaxSize
      ? [
          "",
          "NEXT STEP: Only a few results found.",
          "If the client asked for a specific product by name, these are fine: curate and call render-carousel with selected IDs.",
          "Otherwise, search again with broader terms before rendering.",
        ].join("\n")
      : [
          "",
          "NEXT STEP:",
          "1. Curate the best matches for the client's intent from the list above.",
          "2. Write your recommendation mentioning the selected products.",
          "3. Call render-carousel with the selected IDs.",
        ].join("\n");

  const content = [header, ...body, footer].join("\n\n");
  return { content };
}
