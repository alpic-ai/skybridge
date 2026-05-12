import {
  CnameRecord,
  PublicHostedZone,
  TxtRecord,
} from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

type SkybridgeRecordsProps = {
  domain: string;
};

export class SkybridgeRecords extends Construct {
  constructor(scope: Construct, id: string, { domain }: SkybridgeRecordsProps) {
    super(scope, id);

    const hostedZone = new PublicHostedZone(this, "HostedZone", {
      zoneName: domain,
    });

    // Apex + www: intentionally empty during the GitHub Pages migration.
    // CloudFormation creates before deleting, so coexisting old (HttpsRedirect)
    // and new (GitHub Pages) records on the same name would conflict at Route 53.
    // Step 1 (this commit): remove the HttpsRedirect.
    // Step 2 (follow-up commit): add the GitHub Pages A/AAAA + www CNAME.

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
