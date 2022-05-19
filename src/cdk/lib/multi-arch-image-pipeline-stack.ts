import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

export interface MultiArchImagePipelineStackProps extends StackProps {
  ecrRepositoryName: string
  gitHubRepoOwner: string
  gitHubRepo: string
  gitHubRepoBranchName: string
  gitHubTokenAwsSecretsName: string
}

export class MultiArchImagePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: MultiArchImagePipelineStackProps) {
    super(scope, id, props);
    
    // Container Registry
    const repository = new ecr.Repository(this, 'ecr-repo', {
      imageScanOnPush: true,
      repositoryName: props.ecrRepositoryName
    });

    // CI Pipeline
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();
    const x86ImageBuildProject = this.constructImageBuildProject(repository, 'x86');
    const arm64ImageBuildProject = this.constructImageBuildProject(repository, 'arm64');
    const manifestBuildProject = this.constructManifestBuildProject(repository);

    const pipeline = new codepipeline.Pipeline(this, 'multi-arch-pipeline', {
      pipelineName: 'MultiArchPipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub',
              owner: props.gitHubRepoOwner,
              repo: props.gitHubRepo,
              branch: props.gitHubRepoBranchName,
              oauthToken: cdk.SecretValue.secretsManager(props.gitHubTokenAwsSecretsName),
              output: sourceOutput
            })
          ]
        },
        {
          stageName: 'ImageBuild',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'x86-build',
              input: sourceOutput,
              project: x86ImageBuildProject,
              outputs: [ buildOutput ]
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: 'arm64-build',
              input: sourceOutput,
              project: arm64ImageBuildProject,
              outputs: [ buildOutput ]
            })
          ]
        },
        {
          stageName: 'ManifestBuild',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CodeBuild',
              input: sourceOutput,
              project: manifestBuildProject,
              outputs: [ buildOutput ]
            })
          ]
        }
      ]
    });
   
  }

  constructImageBuildProject(repository: ecr.Repository, arch: string): codebuild.PipelineProject {
    var buildImage;
    if (arch == 'x86') {
      buildImage = codebuild.LinuxBuildImage.AMAZON_LINUX_2;
    } else if (arch == 'arm64') {
      buildImage = codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0;
    } else {
      throw 'Invalid arch';
    }
    
    const buildProject = new codebuild.PipelineProject(this, `${arch}-build`, {
      environment: {
        privileged: true,
        buildImage: buildImage
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: 0.2,
        env: {
          "exported-variables": [
            "CODEBUILD_RESOLVED_SOURCE_VERSION"
          ]
        },
        phases: {
          install: {
            commands: [

            ]
          },
          pre_build: {
            commands: [
              `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${this.account}.dkr.ecr.${this.region}.amazonaws.com`,
              'imageversion="$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-8)"',
              `imageuri="${this.account}.dkr.ecr.${this.region}.amazonaws.com/${repository.repositoryName}:${arch}-$imageversion"`
            ]
          },
          build: {
            commands: [
              'cd src/MultiArchApp/',
              `docker build . -f Dockerfile.${arch} -t "$imageuri"`,
              `docker push $imageuri`
            ]
          },
          post_build: {
            commands: [
              
            ]
          }
        },
        artifacts: {
          files: [
              'src/MultiArchApp/*'
          ]
        }
      })
    });

    repository.grantPullPush(buildProject);
    return buildProject;
  }

  constructManifestBuildProject(repository: ecr.Repository): codebuild.PipelineProject {
    const buildProject = new codebuild.PipelineProject(this, 'manifest-build', {
      environment: {
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: 0.2,
        env: {
          "exported-variables": [
            "CODEBUILD_RESOLVED_SOURCE_VERSION"
          ]
        },
        phases: {
          install: {
            commands: [

            ]
          },
          pre_build: {
            commands: [
              `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${this.account}.dkr.ecr.${this.region}.amazonaws.com`,
              'version="$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-8)"',
              `manifesturi="${this.account}.dkr.ecr.${this.region}.amazonaws.com/${repository.repositoryName}:$version"`,
              `x86imageuri="${this.account}.dkr.ecr.${this.region}.amazonaws.com/${repository.repositoryName}:x86-$version"`,
              `arm64imageuri="${this.account}.dkr.ecr.${this.region}.amazonaws.com/${repository.repositoryName}:arm64-$version"`
            ]
          },
          build: {
            commands: [
              'cd src/MultiArchApp/',
              `docker manifest create "$manifesturi" "$x86imageuri" "$arm64imageuri"`,
              `docker manifest push $manifesturi`
            ]
          },
          post_build: {
            commands: [
              
            ]
          }
        },
        artifacts: {
          files: [
              'src/MultiArchApp/*'
          ]
        }
      })
    });

    repository.grantPullPush(buildProject);
    return buildProject;
  }
}
