import { App } from "aws-cdk-lib";
import { InfrastructureStack } from "../lib/infrastructure-stack";

const infrastructure = new App();

new InfrastructureStack(infrastructure, "SkybridgeInfrastructureStack", {
  env: {
    account: process.env.AWS_ACCOUNT,
    region: "us-east-1",
  }
});
