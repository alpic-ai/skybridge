import {
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

export class SkybridgeRecords extends Construct {
  constructor(scope: Construct, id: string, { domain }: SkybridgeRecordsProps) {
    super(scope, id);

    const hostedZone = new PublicHostedZone(this, "HostedZone", {
      zoneName: domain,
    });

    new ARecord(this, "Apex", {
      zone: hostedZone,
      target: RecordTarget.fromIpAddresses("216.150.1.1"),
    });

    // Showcase apps pointing to alpic.ai
    for (const subdomain of [
      "capitals",
      "ecommerce",
      "everything",
      "investigation-game",
      "manifest-ui",
      "productivity",
      "times-up",
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

    // Vercel (www)
    new CnameRecord(this, "Www", {
      zone: hostedZone,
      recordName: "www",
      domainName: "44f9629b15320aaa.vercel-dns-016.com",
    });

    // Vercel domain verification
    new TxtRecord(this, "VercelVerification", {
      zone: hostedZone,
      recordName: "_vercel",
      values: [
        "vc-domain-verify=docs.skybridge.tech,8df71e22aab606baf87f",
        "vc-domain-verify=docs-staging.skybridge.tech,f0c8eabfab603987299e",
      ],
    });
  }
}
