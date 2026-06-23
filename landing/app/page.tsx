import { CodeDemoSection } from "./components/demo";
import { DevToolsSection } from "./components/devtools";
import { Hero } from "./components/hero";
import { ProductHuntBanner } from "./components/ph-banner";
import { QuotesSection } from "./components/quotes";
import { SiteNav } from "./components/site-nav";
import { SocialProofSection } from "./components/social";
import {
  FinalCtaSection,
  SiteFooter,
  TrustSection,
} from "./components/trust-final";
import { ValuesSection } from "./components/values";
import { VideoSection } from "./components/video";

export default function Home() {
  return (
    <div className="sb-root" data-theme="dark">
      <ProductHuntBanner />
      <SiteNav />
      <Hero />
      <ValuesSection />
      <CodeDemoSection />
      <DevToolsSection />
      <SocialProofSection />
      <VideoSection />
      <QuotesSection />
      <TrustSection />
      <FinalCtaSection />
      <SiteFooter />
    </div>
  );
}
