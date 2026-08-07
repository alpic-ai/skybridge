import type { SearchInput } from "../tools/search-products.js";
import type {
  Option,
  Price,
  Product,
  SearchResult,
  Spec,
  Variant,
} from "../types.js";

// Shopify Storefront API provider. To use it:
//   1. re-export this module from `./index.js` instead of `./mock.js`
//   2. set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN in .env
//   3. uncomment the `csp` block in `src/tools/render-carousel.ts` with
//      `https://cdn.shopify.com` and your store domain
//
// Product ids are Shopify handles, not GIDs: stable, readable, and far cheaper
// in model context than `gid://shopify/Product/8123456789`.

const API_VERSION = "2026-07";
const PAGE_SIZE = 20;

// Only the fields this app renders. Options are derived from the variants'
// `selectedOptions`, so the product-level `options` field is not queried.
const PRODUCT_FIELDS = `
fragment ProductFields on Product {
  handle
  title
  description
  vendor
  productType
  onlineStoreUrl
  availableForSale
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 10) { nodes { url } }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      price { amount currencyCode }
      image { url }
      selectedOptions { name value }
    }
  }
}`;

type ShopifyMoney = { amount: string; currencyCode: string };

type ShopifyProduct = {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  onlineStoreUrl: string | null;
  availableForSale: boolean;
  priceRange: { minVariantPrice: ShopifyMoney };
  images: { nodes: { url: string }[] };
  variants: {
    nodes: {
      id: string;
      title: string;
      availableForSale: boolean;
      price: ShopifyMoney;
      image: { url: string } | null;
      selectedOptions: { name: string; value: string }[];
    }[];
  };
};

async function storefront(query: string, variables: Record<string, unknown>) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) {
    throw new Error(
      "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_TOKEN in the environment.",
    );
  }

  const response = await fetch(
    `https://${domain}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!response.ok) {
    throw new Error(`Shopify ${response.status}: ${await response.text()}`);
  }

  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(`Shopify: ${JSON.stringify(errors)}`);
  }
  return data;
}

function toPrice(money: ShopifyMoney): Price {
  return { amount: Number(money.amount), currency: money.currencyCode };
}

// @todo: Shopify has no generic "specs" field. Vendor and product type are a
// starting point; swap in your own metafields once you know their namespace.
function toSpecs(node: ShopifyProduct): Spec[] {
  const specs: Spec[] = [];
  if (node.vendor) {
    specs.push({ label: "Brand", value: node.vendor });
  }
  if (node.productType) {
    specs.push({ label: "Type", value: node.productType });
  }
  return specs;
}

function toProduct(node: ShopifyProduct): Product {
  const specs = toSpecs(node);
  const images: string[] = [];
  for (const image of node.images.nodes) {
    images.push(image.url);
  }

  // Walk the variants once, building both the variants and the axes they vary
  // on. Shopify option names are used as-is for ids, so a variant's
  // `selectedOptions` maps straight onto `selection`.
  const options: Option[] = [];
  const variants: Variant[] = [];
  for (const variant of node.variants.nodes) {
    const selection: Record<string, string> = {};
    for (const selected of variant.selectedOptions) {
      selection[selected.name] = selected.value;

      let option: Option | undefined;
      for (const candidate of options) {
        if (candidate.id === selected.name) {
          option = candidate;
          break;
        }
      }
      if (!option) {
        option = { id: selected.name, label: selected.name, values: [] };
        options.push(option);
      }

      let known = false;
      for (const value of option.values) {
        if (value.id === selected.value) {
          known = true;
          break;
        }
      }
      if (!known) {
        option.values.push({
          id: selected.value,
          label: selected.value,
          media: variant.image?.url,
        });
      }
    }

    variants.push({
      id: variant.id,
      selection,
      title: variant.title === "Default Title" ? node.title : variant.title,
      description: node.description,
      price: toPrice(variant.price),
      media: variant.image ? [variant.image.url] : images,
      url: node.onlineStoreUrl ?? undefined,
      outOfStock: !variant.availableForSale,
      specs,
    });
  }

  // A single-variant product has no axes to pick from.
  if (variants.length < 2) {
    options.length = 0;
  }

  return {
    id: node.handle,
    options,
    variants,
    card: {
      title: node.title,
      description: node.description,
      price: toPrice(node.priceRange.minVariantPrice),
      media: images,
      url: node.onlineStoreUrl ?? undefined,
      outOfStock: !node.availableForSale,
      specs,
    },
  };
}

export async function search({
  keyword,
  sort,
  priceRange,
}: SearchInput): Promise<SearchResult> {
  // Shopify's search DSL: a bare term matches title, vendor, type and tags;
  // extra clauses narrow it. @todo: add your own (`tag:`, `product_type:`…).
  let query = keyword;
  if (priceRange) {
    const [min, max] = priceRange.split("-");
    query += ` variants.price:>=${min} variants.price:<=${max}`;
  }

  const data = await storefront(
    `${PRODUCT_FIELDS}
    query Search($query: String!, $sortKey: ProductSortKeys!, $reverse: Boolean!, $first: Int!) {
      products(query: $query, sortKey: $sortKey, reverse: $reverse, first: $first) {
        nodes { ...ProductFields }
      }
    }`,
    {
      query,
      sortKey: sort ? "PRICE" : "RELEVANCE",
      reverse: sort === "price-desc",
      first: PAGE_SIZE,
    },
  );

  const products: Product[] = [];
  for (const node of data.products.nodes) {
    products.push(toProduct(node));
  }
  // Storefront paginates by cursor and reports no total, so both counts are
  // left out rather than faked.
  return { products };
}

export async function getProducts(ids: string[]): Promise<Product[]> {
  // One aliased lookup per handle, so the response comes back in the order the
  // model asked for.
  const declarations: string[] = [];
  const fields: string[] = [];
  const variables: Record<string, string> = {};
  for (let index = 0; index < ids.length; index++) {
    declarations.push(`$h${index}: String!`);
    fields.push(`p${index}: product(handle: $h${index}) { ...ProductFields }`);
    variables[`h${index}`] = ids[index];
  }

  const data = await storefront(
    `${PRODUCT_FIELDS}
    query Products(${declarations.join(", ")}) {
      ${fields.join("\n      ")}
    }`,
    variables,
  );

  const products: Product[] = [];
  for (let index = 0; index < ids.length; index++) {
    const node = data[`p${index}`];
    if (node) {
      products.push(toProduct(node));
    }
  }
  return products;
}
