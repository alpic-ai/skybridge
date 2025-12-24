# Stripe Checkout Demo

A demo ChatGPT app showing how to monetize your GPT apps with Stripe using Skybridge.

Based on the [OpenAI Monetization Tutorial](https://developers.openai.com/apps-sdk/guides/stripe-monetization).

## Project Structure

```
checkout-demo/
├── src/
│   ├── server.ts                 # MCP server with Streamable HTTP transport
│   ├── lib/
│   │   └── stripe.ts             # Stripe integration utilities
│   └── widgets/
│       ├── list_products.tsx     # Products widget using Skybridge hooks
│       └── list_products.html    # Widget HTML template
├── scripts/
│   └── create-products.ts        # Helper script to create Stripe products
├── .env.example                  # Environment variables template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Setup

### 1. Install dependencies

```bash
# From the skybridge root directory
pnpm install

# Navigate to the example
cd examples/checkout-demo
```

### 2. Configure Stripe

Copy the environment template and add your Stripe secret key:

```bash
cp .env.example .env
```

Edit `.env` with your Stripe test secret key:

```
STRIPE_SECRET_KEY=sk_test_...
BASE_URL=http://localhost:3001
```

> **Note**: If no Stripe key is configured, the demo uses mock products for testing.

### 3. Create Stripe Products

You can create test products in two ways:

**Option A: Use the helper script**
```bash
npx tsx scripts/create-products.ts
```

**Option B: Manually in Stripe Dashboard**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Enable test mode
3. Create products with prices

## Running the Demo

### 1. Build the widget

```bash
pnpm build
```

### 2. Start the MCP server

```bash
pnpm server
```

The server starts at `http://localhost:3001` with:
- MCP endpoint: `http://localhost:3001/mcp`
- Success page: `http://localhost:3001/success`
- Cancel page: `http://localhost:3001/cancel`

### 3. Test with MCP Inspector

```bash
npx @mcpjam/inspector@latest
```

Connect using:
- Transport: **Streamable HTTP**
- URL: `http://localhost:3001/mcp`

## Testing the Flow

1. **List products**: Call the `list_products` tool
   - The products widget renders showing available items
   - Select quantities using +/- buttons

2. **Checkout**: Click "Checkout" in the widget
   - The widget calls `buy_products` tool internally
   - Opens Stripe checkout in a new tab

3. **Complete payment**: Enter test card details
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

## MCP Tools

### `list_products`

Lists all available products from Stripe (or mock data if not configured).

**Output:**
```json
{
  "products": [
    {
      "id": "prod_...",
      "priceId": "price_...",
      "name": "Product Name",
      "description": "Description",
      "image": "https://...",
      "price": 6499,
      "currency": "USD"
    }
  ]
}
```

### `buy_products`

Creates a Stripe checkout session for selected items.

**Input:**
```json
{
  "items": [
    { "priceId": "price_...", "quantity": 2 }
  ]
}
```

**Output:**
```json
{
  "checkoutSessionId": "cs_...",
  "checkoutSessionUrl": "https://checkout.stripe.com/..."
}
```

## Skybridge Hooks Used

This example demonstrates several Skybridge hooks:

- **`useToolInfo`**: Access the `list_products` tool output (products array)
- **`useCallTool`**: Invoke the `buy_products` tool from the widget
- **`useOpenExternal`**: Open the Stripe checkout URL in a new tab
- **`useTheme`**: Adapt widget styling to dark/light mode

## Deploying to Production

1. Build the widgets:
   ```bash
   pnpm build
   ```

2. Deploy to your hosting platform (Vercel, Railway, etc.)

3. Set environment variables:
   - `STRIPE_SECRET_KEY`: Your live Stripe secret key
   - `BASE_URL`: Your production URL
   - `NODE_ENV`: `production`

4. In ChatGPT:
   - Go to Apps & Connectors → Advanced Settings
   - Enable developer mode
   - Create a new connector with your MCP URL

## Related Docs

- [OpenAI Monetization Guide](https://platform.openai.com/docs/actions/monetization)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Skybridge Documentation](https://skybridge.dev)
