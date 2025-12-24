import Stripe from "stripe";

// Initialize Stripe client only if a valid secret key is provided
const stripeKey = process.env.STRIPE_SECRET_KEY;
const isValidStripeKey =
  stripeKey &&
  (stripeKey.startsWith("sk_test_") || stripeKey.startsWith("sk_live_"));

export const stripe: Stripe | null = isValidStripeKey
  ? new Stripe(stripeKey)
  : null;

export type CheckoutItem = { priceId: string; quantity: number };

/**
 * Create a Stripe checkout session for the given items
 */
export async function getCheckoutSession(items: CheckoutItem[]) {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...).",
    );
  }

  // Merge duplicate priceIds so Stripe receives a single line item per price
  const quantityByPriceId = items.reduce<Record<string, number>>(
    (acc, { priceId, quantity }) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      acc[priceId] = (acc[priceId] ?? 0) + safeQuantity;
      return acc;
    },
    {},
  );

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: Object.entries(quantityByPriceId).map(
      ([priceId, quantity]) => ({
        price: priceId,
        quantity,
      }),
    ),
    success_url: `${baseUrl}/success`,
    cancel_url: `${baseUrl}/cancel`,
  });

  return session;
}

export type FormattedProduct = {
  id: string;
  priceId: string;
  image: string | null;
  name: string;
  description: string | null;
  price: number;
  currency: string;
};

/**
 * Get all products from Stripe with their prices
 */
export async function getProducts(): Promise<FormattedProduct[]> {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...).",
    );
  }

  const { data: products } = await stripe.products.list({
    active: true,
    expand: ["data.default_price"],
  });

  return products
    .filter((product) => product.default_price)
    .map((product) => {
      const price = product.default_price as Stripe.Price;
      return {
        id: product.id,
        priceId: price.id,
        image: product.images?.[0] ?? null,
        name: product.name,
        description: product.description,
        price: price.unit_amount ?? 0,
        currency: price.currency.toUpperCase(),
      };
    });
}

/**
 * Mock products for testing without Stripe
 */
export function getMockProducts(): FormattedProduct[] {
  return [
    {
      id: "prod_1",
      priceId: "price_1",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200",
      name: "Wilson Basketball",
      description: "Official NBA game ball",
      price: 6499,
      currency: "USD",
    },
    {
      id: "prod_2",
      priceId: "price_2",
      image:
        "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200",
      name: "Nike Soccer Ball",
      description: "FIFA approved match ball",
      price: 3999,
      currency: "USD",
    },
    {
      id: "prod_3",
      priceId: "price_3",
      image:
        "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=200",
      name: "Tennis Racket",
      description: "Professional grade racket",
      price: 12999,
      currency: "USD",
    },
  ];
}
