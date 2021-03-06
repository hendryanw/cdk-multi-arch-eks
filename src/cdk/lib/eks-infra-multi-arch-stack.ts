import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';

export interface EksInfraMultiArchStackProps extends StackProps {
  vpcId: string
  clusterName: string
}

export class EksInfraMultiArchStack extends Stack {
  constructor(scope: Construct, id: string, props: EksInfraMultiArchStackProps) {
    super(scope, id, props);

    // Import existing main-vpc
    const vpc = ec2.Vpc.fromLookup(this, 'main-vpc', {
      vpcId: props.vpcId
    });

    // IAM identities that will be given access to the cluster
    var eksConsoleAdminRole = iam.Role.fromRoleArn(this, 'eks-console-admin-role', 'arn:aws:iam::545983628851:role/EKSConsoleAdministrator');
    var cliUser = iam.User.fromUserArn(this, 'cli-user', 'arn:aws:iam::545983628851:user/hendryaw')

    // EKS Cluster
    var secretsKey = new kms.Key(this, 'secretsKey', {});
    const cluster = new eks.Cluster(this, 'eks-cluster', {
      clusterName: props.clusterName,
      version: eks.KubernetesVersion.V1_22,
      vpc: vpc,
      defaultCapacity: 0,
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      mastersRole: eksConsoleAdminRole,
      secretsEncryptionKey: secretsKey
    });
    cluster.awsAuth.addUserMapping(cliUser, { groups: [ 'system:masters' ] });

    const x86SpotMediumNodeGroup = cluster.addNodegroupCapacity('x86-spot-medium-node-group', {
      nodegroupName: 'x86-spot-medium-node-group',
      instanceTypes: [new ec2.InstanceType('t3.medium'), new ec2.InstanceType('t2.medium'), new ec2.InstanceType('t3a.medium')],
      capacityType: eks.CapacityType.SPOT,
      minSize: 1,
      desiredSize: 1,
      maxSize: 5,
      diskSize: 50
    });
    x86SpotMediumNodeGroup.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    const armSpotMediumNodeGroup = cluster.addNodegroupCapacity('arm-spot-medium-node-group', {
      nodegroupName: 'arm-spot-medium-node-group',
      instanceTypes: [new ec2.InstanceType('t4g.medium')],
      capacityType: eks.CapacityType.SPOT,
      minSize: 1,
      desiredSize: 1,
      maxSize: 5,
      diskSize: 50,
      taints: [
        {
          effect: eks.TaintEffect.NO_SCHEDULE,
          key: 'graviton',
          value: 'true'
        }
      ]
    });
    armSpotMediumNodeGroup.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    new CfnOutput(this, 'EKS-CLUSTER-NAME', {
      value: cluster.clusterName
    });
  }
}
