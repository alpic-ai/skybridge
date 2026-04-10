import { UserData } from "aws-cdk-lib";
import {
  AmazonLinuxCpuType,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { IPublicHostedZone } from "aws-cdk-lib/aws-route53";
import { ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

type MonitoringProps = {
  hostedZone: IPublicHostedZone;
};

/**
 * A t4g.nano EC2 instance running the CloudWatch Agent with StatsD receiver.
 * Receives UDP StatsD metrics from Skybridge apps on port 8125 and forwards
 * them to CloudWatch under the "Skybridge" namespace.
 *
 * Accessible at metrics.skybridge.tech:8125 (UDP).
 */
export class Monitoring extends Construct {
  constructor(scope: Construct, id: string, { hostedZone }: MonitoringProps) {
    super(scope, id);

    const vpc = Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"),
      ],
    });

    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
      description: "Skybridge StatsD monitoring ingress",
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.udp(8125),
      "StatsD from Skybridge apps",
    );

    const userData = UserData.forLinux();
    userData.addCommands(
      "yum install -y amazon-cloudwatch-agent",
      `cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "Skybridge",
    "metrics_collected": {
      "statsd": {
        "service_address": ":8125",
        "metrics_collection_interval": 60,
        "metrics_aggregation_interval": 60
      }
    }
  }
}
EOF`,
      "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json",
    );

    const instance = new Instance(this, "Instance", {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.NANO),
      machineImage: MachineImage.latestAmazonLinux2023({
        cpuType: AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup,
      role,
      userData,
      userDataCausesReplacement: true,
    });

    new ARecord(this, "MetricsRecord", {
      zone: hostedZone,
      recordName: "metrics",
      target: RecordTarget.fromIpAddresses(instance.instancePublicIp),
    });
  }
}
