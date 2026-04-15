import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CfnOutput, Stack } from "aws-cdk-lib";
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

const VECTOR_CONFIG = readFileSync(
  join(__dirname, "vector", "vector.toml"),
  "utf-8",
);

const REFRESH_VERSIONS_SCRIPT = readFileSync(
  join(__dirname, "vector", "refresh-versions.sh"),
  "utf-8",
);

/**
 * A t4g.nano EC2 instance running Vector as a StatsD receiver with version
 * filtering. Incoming metrics are checked against published skybridge versions
 * (refreshed from npm every minute) and only forwarded to CloudWatch if the
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
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
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
      // Install Vector (pinned ARM64 RPM) and jq
      "yum install -y jq",
      "rpm -i https://yum.vector.dev/stable/vector-0/aarch64/vector-0.46.1-1.aarch64.rpm",

      // Write Vector config (remove default demo config shipped with the RPM)
      "rm -f /etc/vector/vector.yaml",
      "mkdir -p /etc/vector",
      `cat > /etc/vector/vector.toml << 'VECTORCFG'\n${VECTOR_CONFIG.replace("__REGION__", Stack.of(this).region).trim()}\nVECTORCFG`,

      // Seed allowed-versions.csv so Vector can start even if npm is unreachable
      "echo 'version' > /etc/vector/allowed-versions.csv",
      "chmod 644 /etc/vector/allowed-versions.csv",
      `cat > /etc/vector/refresh-versions.sh << 'SCRIPT'\n${REFRESH_VERSIONS_SCRIPT.trim()}\nSCRIPT`,
      "chmod +x /etc/vector/refresh-versions.sh",
      "/etc/vector/refresh-versions.sh || true",

      // Schedule version list refresh every minute via systemd timer (cronie not available on AL2023)
      `cat > /etc/systemd/system/refresh-versions.service << 'UNIT'\n[Unit]\nDescription=Refresh skybridge allowed versions\n[Service]\nType=oneshot\nExecStart=/etc/vector/refresh-versions.sh\nUNIT`,
      `cat > /etc/systemd/system/refresh-versions.timer << 'UNIT'\n[Unit]\nDescription=Refresh skybridge allowed versions every minute\n[Timer]\nOnBootSec=60\nOnUnitActiveSec=60\n[Install]\nWantedBy=timers.target\nUNIT`,
      "systemctl enable --now refresh-versions.timer",

      // Point Vector at our config (the RPM default is vector.yaml which we removed)
      "mkdir -p /etc/default",
      "echo 'VECTOR_CONFIG=/etc/vector/vector.toml' > /etc/default/vector",
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
