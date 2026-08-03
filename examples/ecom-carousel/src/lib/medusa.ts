// Shared Medusa v2 Store API client + mapping helpers. Both tools go through
// here so id handling stays consistent between search-products and
// render-carousel. See docs/medusa-store-api.md for the verified API shape.

// Read lazily: server.ts loads .env in its module body, which runs AFTER this
// module is imported, so reading at import time would see undefined.
function env(): { base: string; key: string } {
  const base = process.env.MEDUSA_BASE_URL;
  const key = process.env.MEDUSA_PUBLISHABLE_KEY;
  if (!base || !key) {
    throw new Error(
      "MEDUSA_BASE_URL and MEDUSA_PUBLISHABLE_KEY must be set (see .env.template).",
    );
  }
  return { base, key };
}

// The imagery-driving axis (put first in options; drives color-image pairing).
export const COLOR_AXIS = "Color";

// --- raw shapes (only the fields we read; Medusa returns much more) ---

type RawPrice = { calculated_amount: number; currency_code: string };
type RawVariantOption = { value: string; option?: { title: string } };
export type RawVariant = {
  id: string;
  title: string;
  sku: string | null;
  options: RawVariantOption[];
  calculated_price?: RawPrice | null;
  metadata?: Record<string, unknown> | null;
};
type RawImage = { url: string; rank?: number };
type RawOption = { title: string; values: { value: string }[] };
export type RawProduct = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  thumbnail: string | null;
  images?: RawImage[];
  options?: RawOption[];
  variants?: RawVariant[];
  categories?: { id: string; name: string; handle: string }[];
  metadata?: Record<string, unknown> | null;
};

// --- HTTP ---

async function fetchJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const { base, key } = env();
  const url = `${base}${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, { headers: { "x-publishable-api-key": key } });
  if (!res.ok) {
    throw new Error(`Medusa ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Single Europe/EUR region; fetched once and memoized. Prices require it —
// never invent the id (docs/medusa-store-api.md pricing quirk).
let regionIdPromise: Promise<string> | undefined;
function getRegionId(): Promise<string> {
  regionIdPromise ??= fetchJson<{ regions: { id: string }[] }>(
    "/store/regions",
  ).then((r) => {
    const id = r.regions[0]?.id;
    if (!id) throw new Error("No Medusa region available for pricing.");
    return id;
  });
  return regionIdPromise;
}

// Category handle -> id, fetched once and memoized. The handle (e.g. "skis") is
// the stable public identifier; the id is store-specific, so never hardcode it.
let categoryIdsPromise: Promise<Map<string, string>> | undefined;
function getCategoryId(handle: string): Promise<string | undefined> {
  categoryIdsPromise ??= fetchJson<{
    product_categories: { id: string; handle: string }[];
  }>(
    "/store/product-categories",
    new URLSearchParams({ fields: "id,handle", limit: "100" }),
  ).then((r) => new Map(r.product_categories.map((c) => [c.handle, c.id])));
  return categoryIdsPromise.then((m) => m.get(handle));
}

const SEARCH_FIELDS =
  "id,title,handle,description,thumbnail,metadata,*categories,*variants.calculated_price,*variants.metadata";
const DETAIL_FIELDS =
  "id,title,handle,description,thumbnail,metadata,*images,*options,*options.values,*variants,*variants.options,*variants.calculated_price,*variants.metadata";

export type ProductQuery = { keyword?: string; category?: string; order?: string };

export async function fetchSearch(
  q: ProductQuery,
): Promise<{ products: RawProduct[]; count: number }> {
  const region = await getRegionId();
  const params = new URLSearchParams({
    region_id: region,
    fields: SEARCH_FIELDS,
    limit: "50",
  });
  if (q.keyword) params.set("q", q.keyword);
  if (q.order) params.set("order", q.order);
  if (q.category) {
    const catId = await getCategoryId(q.category);
    if (catId) params.append("category_id[]", catId);
  }
  return fetchJson<{ products: RawProduct[]; count: number }>(
    "/store/products",
    params,
  );
}

export async function fetchByIds(ids: string[]): Promise<RawProduct[]> {
  if (ids.length === 0) return [];
  const region = await getRegionId();
  const params = new URLSearchParams({
    region_id: region,
    fields: DETAIL_FIELDS,
    limit: String(ids.length),
  });
  for (const id of ids) params.append("id[]", id);
  const { products } = await fetchJson<{ products: RawProduct[] }>(
    "/store/products",
    params,
  );
  // Medusa doesn't preserve id[] order — restore the requested order.
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is RawProduct => Boolean(p));
}

// --- mapping helpers ---

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// metadata readers: ratings/badges/specs live in metadata, not native fields.
type Meta = Record<string, unknown> | null | undefined;

export function readNumber(meta: Meta, key: string): number | undefined {
  const v = meta?.[key];
  return typeof v === "number" ? v : undefined;
}

export function readBadges(meta: Meta): string[] {
  const v = meta?.tags;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function readSpecs(meta: Meta): { label?: string; value: string }[] {
  const v = meta?.specs;
  if (!Array.isArray(v)) return [];
  const out: { label?: string; value: string }[] = [];
  for (const s of v) {
    if (s && typeof s === "object" && typeof (s as { value?: unknown }).value === "string") {
      const label = (s as { label?: unknown }).label;
      out.push({
        value: (s as { value: string }).value,
        ...(typeof label === "string" ? { label } : {}),
      });
    }
  }
  return out;
}

// A variant's value on a given option axis (matched by axis title).
export function variantValue(v: RawVariant, axisTitle: string): string | undefined {
  return v.options.find((o) => o.option?.title === axisTitle)?.value;
}

export function priceOf(v: RawVariant): number | undefined {
  return v.calculated_price?.calculated_amount;
}

export function currencyOf(v: RawVariant): string {
  return (v.calculated_price?.currency_code ?? "eur").toUpperCase();
}

// "From" price: min across variants, falling back to metadata.from_price.
export function fromPrice(p: RawProduct): number | undefined {
  const amounts = (p.variants ?? [])
    .map(priceOf)
    .filter((n): n is number => typeof n === "number");
  if (amounts.length) return Math.min(...amounts);
  return readNumber(p.metadata, "from_price");
}

// Variant-image pairing (D4): product images whose filename encodes one of the
// variant's option values (`*-{value}-*.webp`), falling back to all images when
// none match. No structured variant↔image link exists — this is the filename
// heuristic. Matching ALL the variant's values (not just color) catches cases
// where the photo is named by another axis, e.g. Chapka's `chapka-fur-1.webp`
// (Material) for the Natural/Fur variant. Numeric axes (length 160/170) never
// appear in filenames, so they match nothing and cause no false positives.
export function imagesForValues(
  images: RawImage[] | undefined,
  values: (string | undefined)[],
): string[] {
  const urls = (images ?? []).map((i) => i.url);
  const slugs = values
    .filter((v): v is string => Boolean(v))
    .map(slug)
    .filter(Boolean);
  if (!slugs.length) return urls;
  const matched = urls.filter((u) => {
    const lower = u.toLowerCase();
    return slugs.some((s) => lower.includes(`-${s}-`) || lower.includes(`-${s}.`));
  });
  return matched.length ? matched : urls;
}
