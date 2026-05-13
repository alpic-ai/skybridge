import { CodeDemoSection } from "./components/demo";
import { DevToolsSection } from "./components/devtools";
import { Hero, SiteNav } from "./components/hero";
import { QuotesSection } from "./components/quotes";
import { SocialProofSection } from "./components/social";
import {
  FinalCtaSection,
  SiteFooter,
  TrustSection,
} from "./components/trust-final";
import { ValuesSection } from "./components/values";

export default function Home() {
  return (
    <div className="sb-root" data-theme="dark">
      <SiteNav />
      <Hero />
      <ValuesSection />
      <CodeDemoSection />
      <DevToolsSection />
      <SocialProofSection />
      <QuotesSection />
      <TrustSection />
      <FinalCtaSection />
      <SiteFooter />
    </div>
  );
}
