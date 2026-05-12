import { SBDemo } from "./components/demo";
import { SBHero, SBNav } from "./components/hero";
import { SBQuotes } from "./components/quotes";
import { SBCode, SBValues } from "./components/sections-top";
import { SBSocial } from "./components/social";
import { SBFinal, SBFooter, SBTrust } from "./components/trust-final";

export default function Home() {
  return (
    <div className="sb-root" data-theme="dark">
      <SBNav />
      <SBHero />
      <SBValues />
      <SBDemo />
      <SBCode />
      <SBSocial />
      <SBQuotes quotesVariant="social" />
      <SBTrust trustVariant="inline" communityVariant="segmented" />
      <SBFinal finalBg="aurora" />
      <SBFooter />
    </div>
  );
}
