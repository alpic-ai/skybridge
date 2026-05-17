import type { Metadata, Viewport } from "next";
import { Mozilla_Text } from "next/font/google";
import "./globals.css";

const mozillaText = Mozilla_Text({
  subsets: ["latin"],
  variable: "--font-mozilla-text",
  display: "swap",
});

const OG_IMAGE = {
  url: "/assets/banner.jpg",
  width: 1200,
  height: 630,
  alt: "Skybridge — the full-stack React framework for MCP Apps",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://skybridge.tech"),
  title:
    "Skybridge — the full-stack React framework for MCP Apps | Claude & ChatGPT",
  description:
    "Skybridge is the open-source TypeScript framework for building MCP Apps. Write once, run in Claude, ChatGPT, VSCode, and any MCP client. 100K monthly downloads.",
  authors: [{ name: "Alpic" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Skybridge",
    title: "Skybridge — the full-stack React framework for MCP Apps",
    description:
      "Open-source TypeScript framework for building MCP Apps. Write once, run in Claude, ChatGPT, VSCode, and any MCP client. 100K monthly downloads.",
    url: "/",
    images: [OG_IMAGE],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@skybridgedev",
    title: "Skybridge — the full-stack React framework for MCP Apps",
    description:
      "Open-source TypeScript framework for building MCP Apps. Write once, run in Claude, ChatGPT, VSCode, and any MCP client.",
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#050d0e",
  colorScheme: "dark",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Alpic",
    url: "https://alpic.ai",
    logo: "https://skybridge.tech/assets/alpic-logo-light.svg",
    sameAs: ["https://github.com/alpic-ai"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Skybridge",
    url: "https://skybridge.tech",
    description:
      "Open-source TypeScript framework for building MCP Apps that run in Claude, ChatGPT, VSCode, and any MCP client.",
    publisher: { "@type": "Organization", name: "Alpic" },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Skybridge",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cross-platform",
    url: "https://skybridge.tech",
    description:
      "Full-stack React framework for MCP Apps. Write once, run in Claude, ChatGPT, VSCode, and any MCP client.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={mozillaText.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
