import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import { Monitoring } from "./constructs/Monitoring";
import { SkybridgeRecords } from "./constructs/SkybridgeRecords";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const records = new SkybridgeRecords(this, "SkybridgeRecords", {
      domain: "skybridge.tech",
    });

    new Monitoring(this, "Monitoring", {
      hostedZone: records.hostedZone,
    });
  }
}
