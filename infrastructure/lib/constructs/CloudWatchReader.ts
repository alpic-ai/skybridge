import { SecretValue } from "aws-cdk-lib";
import {
  AccessKey,
  Effect,
  PolicyStatement,
  User,
} from "aws-cdk-lib/aws-iam";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class CloudWatchReader extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const user = new User(this, "User", {
      userName: "skybridge-cloudwatch-reader",
    });

    user.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
        ],
        resources: ["*"],
      }),
    );

    const accessKey = new AccessKey(this, "AccessKey", { user });

    new Secret(this, "AccessKeySecret", {
      secretName: "skybridge/cloudwatch-reader",
      secretObjectValue: {
        accessKeyId: SecretValue.unsafePlainText(accessKey.accessKeyId),
        secretAccessKey: accessKey.secretAccessKey,
      },
      description: "AWS credentials for the skybridge-cloudwatch-reader IAM user",
    });
  }
}
