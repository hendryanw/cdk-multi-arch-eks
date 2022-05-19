#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksInfraMultiArchStack } from '../lib/eks-infra-multi-arch-stack';
import { MultiArchImagePipelineStack } from '../lib/multi-arch-image-pipeline-stack';

const app = new cdk.App();
new EksInfraMultiArchStack(app, 'eks-infra-multi-arch-stack', {
  clusterName: app.node.tryGetContext('app-config/clusterName'),
  vpcId: app.node.tryGetContext('app-config/vpcId'),
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION
  }
});

new MultiArchImagePipelineStack(app, 'multi-arch-image-pipeline-stack', {
  ecrRepositoryName: app.node.tryGetContext('app-config/ecrRepositoryName'),
  gitHubRepo: app.node.tryGetContext('app-config/gitHubRepo'),
  gitHubRepoBranchName: app.node.tryGetContext('app-config/gitHubRepoBranchName'),
  gitHubRepoOwner: app.node.tryGetContext('app-config/gitHubRepoOwner'),
  gitHubTokenAwsSecretsName: app.node.tryGetContext('app-config/gitHubTokenAwsSecretsName')
});