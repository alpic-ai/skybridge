import {
  AaaaRecord,
  ARecord,
  CnameRecord,
  PublicHostedZone,
  RecordTarget,
  TxtRecord,
} from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

type SkybridgeRecordsProps = {
  domain: string;
};

// GitHub Pages anycast IPs — https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
const GITHUB_PAGES_IPV4 = [
  "185.199.108.153",
  "185.199.109.153",
  "185.199.110.153",
  "185.199.111.153",
];
const GITHUB_PAGES_IPV6 = [
  "2606:50c0:8000::153",
  "2606:50c0:8001::153",
  "2606:50c0:8002::153",
  "2606:50c0:8003::153",
];

export class SkybridgeRecords extends Construct {
  constructor(scope: Construct, id: string, { domain }: SkybridgeRecordsProps) {
    super(scope, id);

    const hostedZone = new PublicHostedZone(this, "HostedZone", {
      zoneName: domain,
    });

    new ARecord(this, "ApexGitHubPagesA", {
      zone: hostedZone,
      target: RecordTarget.fromIpAddresses(...GITHUB_PAGES_IPV4),
    });
    new AaaaRecord(this, "ApexGitHubPagesAAAA", {
      zone: hostedZone,
      target: RecordTarget.fromIpAddresses(...GITHUB_PAGES_IPV6),
    });
    new CnameRecord(this, "WwwGitHubPages", {
      zone: hostedZone,
      recordName: "www",
      domainName: "alpic-ai.github.io",
    });

    // Showcase apps pointing to alpic.ai
    for (const subdomain of [
      "capitals",
      "chatgpt-files",
      "chess",
      "conformance",
      "ecommerce",
      "flight-booking",
      "generative-ui",
      "everything",
      "investigation-game",
      "magic-8-ball",
      "manifest-ui",
      "productivity",
      "times-up",
      "auth0",
      "clerk",
      "stytch",
      "workos",
    ]) {
      new CnameRecord(this, `${subdomain}App`, {
        zone: hostedZone,
        recordName: subdomain,
        domainName: "cname.alpic.ai",
      });
    }

    // Docs (Mintlify)
    new CnameRecord(this, "Docs", {
      zone: hostedZone,
      recordName: "docs",
      domainName: "cname.mintlify-dns.com",
    });
    new CnameRecord(this, "DocsStaging", {
      zone: hostedZone,
      recordName: "docs-staging",
      domainName: "cname.mintlify-dns.com",
    });

    new TxtRecord(this, "GoogleSiteVerification", {
      zone: hostedZone,
      values: [
        "google-site-verification=0w7sA9_Qh5zLQ6XmUYMGaxiyBoZRXs_pRir0Hm5va1I",
      ],
    });
  }
}
