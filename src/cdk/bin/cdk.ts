#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksInfraMultiArchStack } from '../lib/eks-infra-multi-arch-stack';

const app = new cdk.App();
new EksInfraMultiArchStack(app, 'eks-infra-multi-arch-stack', {
  clusterName: 'multi-arch-eks-cluster',
  vpcId: 'vpc-0ac9149c85f34c8f8',
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'ap-southeast-1'
  }
});