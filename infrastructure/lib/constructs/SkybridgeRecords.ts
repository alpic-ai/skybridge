import { CnameRecord, PublicHostedZone } from "aws-cdk-lib/aws-route53";
import { HttpsRedirect } from "aws-cdk-lib/aws-route53-patterns";
import { Construct } from "constructs";

type SkybridgeRecordsProps = {
  domain: string;
};

export class SkybridgeRecords extends Construct {
  public readonly hostedZone: PublicHostedZone;

  constructor(scope: Construct, id: string, { domain }: SkybridgeRecordsProps) {
    super(scope, id);

    this.hostedZone = new PublicHostedZone(this, "HostedZone", {
      zoneName: domain,
    });

    // Redirect apex and www to docs
    new HttpsRedirect(this, "ApexRedirect", {
      zone: this.hostedZone,
      recordNames: [domain, `www.${domain}`],
      targetDomain: `docs.${domain}`,
    });

    // Showcase apps pointing to alpic.ai
    for (const subdomain of [
      "capitals",
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
        zone: this.hostedZone,
        recordName: subdomain,
        domainName: "cname.alpic.ai",
      });
    }

    // Docs (Mintlify)
    new CnameRecord(this, "Docs", {
      zone: this.hostedZone,
      recordName: "docs",
      domainName: "cname.mintlify-dns.com",
    });
    new CnameRecord(this, "DocsStaging", {
      zone: this.hostedZone,
      recordName: "docs-staging",
      domainName: "cname.mintlify-dns.com",
    });
  }
}
