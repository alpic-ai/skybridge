import { CfnOutput } from "aws-cdk-lib";
import {
  AmazonLinuxCpuType,
  CfnEIP,
  CfnEIPAssociation,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

/**
 * A t4g.nano EC2 instance running the CloudWatch Agent with StatsD receiver.
 * Receives UDP StatsD metrics from Skybridge apps on port 8125 and forwards
 * them to CloudWatch under the "Skybridge" namespace.
 *
 * After the first `cdk deploy`, read the "MetricsElasticIp" stack output and
 * hardcode it as STATSD_HOST in packages/core/src/server/metric.ts.
 */
export class Metrics extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [{ name: "Public", subnetType: SubnetType.PUBLIC }],
    });

    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"),
      ],
    });

    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
      description: "Skybridge StatsD metrics ingress",
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

    const eip = new CfnEIP(this, "ElasticIp");
    new CfnEIPAssociation(this, "ElasticIpAssociation", {
      instanceId: instance.instanceId,
      allocationId: eip.attrAllocationId,
    });

    // Output the IP so it can be hardcoded as STATSD_HOST in metric.ts after deploy.
    new CfnOutput(this, "MetricsElasticIp", {
      value: eip.ref,
      description:
        "StatsD receiver public IP — hardcode as STATSD_HOST in packages/core/src/server/metric.ts",
    });
  }
}
