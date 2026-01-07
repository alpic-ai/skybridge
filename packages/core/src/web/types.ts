import "react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { WidgetHostType } from "../server/index.js";

declare module "react" {
  // biome-ignore lint/correctness/noUnusedVariables: HTMLAttributes must have the same signature and requires a type parameter
  interface HTMLAttributes<T> {
    "data-llm"?: string;
  }
}

export type UnknownObject = Record<string, unknown>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type Objectify<T> = T & UnknownObject;

type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? never : K;
}[keyof T];
export type HasRequiredKeys<T> = RequiredKeys<T> extends never ? false : true;

type WidgetState = UnknownObject;

type FileMetadata = { fileId: string };

export const TOOL_RESPONSE_EVENT_TYPE = "openai:tool_response";
export class ToolResponseEvent extends CustomEvent<{
  tool: { name: string; args: UnknownObject };
}> {
  override readonly type = TOOL_RESPONSE_EVENT_TYPE;
}

declare global {
  interface Window {
    skybridge: SkybridgeProperties;
    openai: OpenAiMethods<WidgetState> & OpenAiProperties;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

export type SkybridgeProperties = {
  hostType: WidgetHostType;
};

export type OpenAiProperties<
  ToolInput extends UnknownObject = Record<never, unknown>,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject,
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  view: View;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | { text: string } | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
};

export type CallToolArgs = Record<string, unknown> | null;

export type CallToolResponse = {
  content: CallToolResult["content"];
  structuredContent: Record<string, unknown>;
  isError: boolean;
  result: string;
  _meta?: CallToolResult["_meta"];
};

export type RequestModalOptions = {
  title?: string;
  params?: Record<string, unknown>;
  anchor?: { top?: number; left?: number; width?: number; height?: number };
};

export type OpenAiMethods<WidgetState extends UnknownObject = UnknownObject> = {
  /** Calls a tool on your MCP. Returns the full response. */
  callTool: <
    ToolArgs extends CallToolArgs = null,
    ToolResponse extends CallToolResponse = CallToolResponse,
  >(
    name: string,
    args: ToolArgs,
  ) => Promise<ToolResponse>;

  /** Triggers a followup turn in the ChatGPT conversation */
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;

  /** Opens an external link, redirects web page or mobile app */
  openExternal(args: { href: string }): void;

  /** For transitioning an app from inline to fullscreen or pip */
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
    /**
     * The granted display mode. The host may reject the request.
     * For mobile, PiP is always coerced to fullscreen.
     */
    mode: DisplayMode;
  }>;

  /**
   * Sets the widget state.
   * This state is persisted across widget renders.
   */
  setWidgetState: (state: WidgetState) => Promise<void>;

  /**
   * Opens a modal portaled outside of the widget iFrame.
   * This ensures the modal is correctly displayed and not limited to the widget's area.
   */
  requestModal: (args: RequestModalOptions) => Promise<void>;

  /** Uploads a new file to the host */
  uploadFile: (file: File) => Promise<FileMetadata>;

  /**
   * Downloads a file from the host that was previously uploaded.
   * Only files uploaded by the same connector instance can be downloaded.
   */
  downloadFile: (file: FileMetadata) => Promise<{ downloadUrl: string }>;

  /**
   * Opens the Instant Checkout UI for payment processing.
   * This is part of the ChatGPT Apps Monetization (private beta).
   *
   * The promise resolves with the order result after successful payment,
   * or rejects on error/cancellation.
   *
   * @see https://developers.openai.com/commerce/specs/checkout
   */
  requestCheckout?: <
    TSession extends CheckoutSessionRequest = CheckoutSessionRequest,
    TResponse extends CheckoutResponse = CheckoutResponse,
  >(
    session: TSession,
  ) => Promise<TResponse>;
};

/**
 * Supported payment methods for instant checkout.
 */
export type SupportedPaymentMethod = "card" | "apple_pay" | "google_pay";

/**
 * Payment provider configuration for instant checkout.
 */
export type CheckoutPaymentProvider = {
  provider: string;
  merchant_id: string;
  supported_payment_methods?: SupportedPaymentMethod[];
};

/**
 * Line item in the checkout session.
 */
export type CheckoutLineItem = {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_amount: number;
  image_url?: string;
};

/**
 * Type of total line in the checkout summary.
 */
export type CheckoutTotalType =
  | "subtotal"
  | "tax"
  | "discount"
  | "fee"
  | "shipping"
  | "total";

/**
 * Total line in the checkout summary.
 */
export type CheckoutTotal = {
  type: CheckoutTotalType;
  display_text: string;
  amount: number;
};

/**
 * Type of legal/policy link for checkout.
 */
export type CheckoutLinkType =
  | "terms_of_use"
  | "privacy_policy"
  | "refund_policy"
  | "shipping_policy"
  | "merchant_terms";

/**
 * Legal/policy link for checkout.
 */
export type CheckoutLink = {
  type: CheckoutLinkType;
  url: string;
};

/**
 * Checkout session status.
 */
export type CheckoutSessionStatus =
  | "pending"
  | "ready_for_payment"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed";

/**
 * Payment mode for the checkout session.
 */
export type CheckoutPaymentMode = "live" | "test";

/**
 * Checkout session request payload following the ACP specification.
 */
export type CheckoutSessionRequest = {
  id: string;
  payment_provider: CheckoutPaymentProvider;
  status: CheckoutSessionStatus;
  currency: string;
  totals: CheckoutTotal[];
  links?: CheckoutLink[];
  payment_mode?: CheckoutPaymentMode;
  line_items?: CheckoutLineItem[];
  merchant_name?: string;
  order_reference?: string;
};

/**
 * Order status after checkout completion.
 */
export type CheckoutOrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

/**
 * Order details returned after successful checkout.
 */
export type CheckoutOrder = {
  id: string;
  checkout_session_id: string;
  permalink_url?: string;
  created_at?: string;
  status?: CheckoutOrderStatus;
};

/**
 * Successful checkout response.
 */
export type CheckoutSuccessResponse = {
  id: string;
  status: "completed";
  currency: string;
  order: CheckoutOrder;
};

/**
 * Error code returned from checkout.
 */
export type CheckoutErrorCode =
  | "payment_declined"
  | "requires_3ds"
  | "invalid_session"
  | "expired_session"
  | "cancelled"
  | "unknown_error";

/**
 * Error response from checkout.
 */
export type CheckoutErrorResponse = {
  code: CheckoutErrorCode;
  message: string;
};

/**
 * Checkout response - either success or error.
 */
export type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;

// Dispatched when any global changes in the host page
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiProperties>;
}> {
  override readonly type = SET_GLOBALS_EVENT_TYPE;
}

export type CallTool = (
  name: string,
  args: Record<string, unknown>,
) => Promise<CallToolResponse>;

export type DisplayMode = "pip" | "inline" | "fullscreen" | "modal";

export type View = {
  mode: DisplayMode;
  params?: Record<string, unknown>;
};

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};
