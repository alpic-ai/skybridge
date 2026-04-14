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

const VECTOR_CONFIG = `
[sources.statsd_in]
type = "statsd"
address = "0.0.0.0:8125"
mode = "udp"

[enrichment_tables.allowed_versions]
type = "file"

  [enrichment_tables.allowed_versions.file]
  path = "/etc/vector/allowed-versions.csv"
  encoding.codec = "csv"
  encoding.csv.fields = ["version"]

[transforms.filter_valid_versions]
type = "filter"
inputs = ["statsd_in"]
condition = '''
  tags_array = get_enrichment_table_records("allowed_versions", { "version": to_string(.tags.version) ?? "" }) ?? []
  length(tags_array) > 0
'''

[sinks.cloudwatch]
type = "aws_cloudwatch_metrics"
inputs = ["filter_valid_versions"]
default_namespace = "Skybridge"
region = "us-east-1"
`;

const REFRESH_VERSIONS_SCRIPT = `#!/bin/bash
# Fetch all published skybridge versions from npm and extract unique major.minor pairs.
# Vector reloads enrichment tables automatically when the file changes.
set -euo pipefail

TMP=$(mktemp)
echo "version" > "$TMP"

curl -sf https://registry.npmjs.org/skybridge \
  | jq -r '.versions | keys[]' \
  | awk -F. '{print $1"."$2}' \
  | sort -uV \
  >> "$TMP"

mv "$TMP" /etc/vector/allowed-versions.csv
`;

/**
 * A t4g.nano EC2 instance running Vector as a StatsD receiver with version
 * filtering. Incoming metrics are checked against published skybridge versions
 * (refreshed from npm every 15 minutes) and only forwarded to CloudWatch if the
 * version tag matches a known release.
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
      // Install Vector (ARM64 package for t4g instances)
      "curl -1sLf https://repositories.timber.io/public/vector/cfg/setup/bash.rpm.sh | bash",
      "yum install -y vector jq",

      // Write Vector config
      "mkdir -p /etc/vector",
      `cat > /etc/vector/vector.toml << 'VECTORCFG'${VECTOR_CONFIG}VECTORCFG`,

      // Seed allowed-versions.csv so Vector can start before the first cron run
      `cat > /etc/vector/refresh-versions.sh << 'SCRIPT'${REFRESH_VERSIONS_SCRIPT}SCRIPT`,
      "chmod +x /etc/vector/refresh-versions.sh",
      "/etc/vector/refresh-versions.sh",

      // Schedule version list refresh every 15 minutes
      'echo "*/15 * * * * root /etc/vector/refresh-versions.sh" > /etc/cron.d/refresh-skybridge-versions',

      // Start Vector
      "systemctl enable vector",
      "systemctl start vector",
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
