import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import { Metrics } from "./constructs/Metrics";
import { SkybridgeRecords } from "./constructs/SkybridgeRecords";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new SkybridgeRecords(this, "SkybridgeRecords", {
      domain: "skybridge.tech",
    });

    new Metrics(this, "Metrics");
  }
}
