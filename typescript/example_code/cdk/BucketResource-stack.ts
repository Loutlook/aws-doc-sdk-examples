// snippet-comment:[These are tags for the AWS doc team's sample catalog. Do not remove.]
// snippet-comment:[This goes in the lib dir.]
// snippet-comment:[This is a full sample when you include BucketResource.ts, which goes in the bin dir.]
// snippet-sourceauthor:[Doug-AWS]
// snippet-sourcedescription:[HelloCdk-stack.ts creates a stack with an S3 bucket that has replication.]
// snippet-keyword:[CDK V0.27.0]
// snippet-keyword:[TypeScript]
// snippet-service:[cdk]
// snippet-keyword:[Code Sample]
// snippet-sourcetype:[full-example]
// snippet-sourcedate:[2019-4-3]
// Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
//
// This file is licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License. A copy of the
// License is located at
//
// http://aws.amazon.com/apache2.0/
//
// This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS
// OF ANY KIND, either express or implied. See the License for the specific
// language governing permissions and limitations under the License.
// snippet-start:[cdk.typescript.BucketResource-stack]
import cdk = require("@aws-cdk/cdk");
import iam = require("@aws-cdk/aws-iam");
import s3 = require("@aws-cdk/aws-s3");

export class BucketResourceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Since our S3.Bucket class does not expose ReplicationConfiguration,
    // we must add override that property at the low-level CloudFormation level.
    // For details on the format of ReplicationConfiguration, see:
    //   https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-replicationconfiguration.html

    // Create an IAM role that Amazon S3 assumes when replicating objects.
    // The role must contain two policies:
    //   a trust policy that identify Amazon S3 as the service principal who can assume the role
    //   an access policy, which grants the role permissions to perform replication tasks

    // Create the trust policy
    const trustStatement = new iam.PolicyStatement(
      iam.PolicyStatementEffect.Allow
    );
    trustStatement.addServicePrincipal("s3.amazonaws.com");
    trustStatement.addAction("sts:AssumeRole");

    const trustPolicy = new iam.Policy(this, "TrustPolicy");
    trustPolicy.addStatement(trustStatement);

    // Now the access policy
    const accessStatement1 = new iam.PolicyStatement(
      iam.PolicyStatementEffect.Allow
    );
    accessStatement1.addAction("s3:GetReplicationConfiguration");
    accessStatement1.addAction("s3:ListBucket");
    accessStatement1.addResource("arn:aws:s3:::source-bucket");

    const accessStatement2 = new iam.PolicyStatement(
      iam.PolicyStatementEffect.Allow
    );
    accessStatement2.addAction("s3:GetObjectVersion");
    accessStatement2.addAction("s3:GetObjectVersionAcl");
    accessStatement2.addAction("s3:GetObjectVersionTagging");
    accessStatement1.addResource("arn:aws:s3:::source-bucket/*");

    const accessStatement3 = new iam.PolicyStatement(
      iam.PolicyStatementEffect.Allow
    );
    accessStatement3.addAction("s3:ReplicateObject");
    accessStatement3.addAction("s3:ReplicateDelete");
    accessStatement3.addAction("s3:ReplicateTags");
    accessStatement3.addResource("arn:aws:s3:::destination-bucket/*");

    const accessPolicy = new iam.Policy(this, "AccessPolicy");
    accessPolicy.addStatement(accessStatement1);
    accessPolicy.addStatement(accessStatement2);
    accessPolicy.addStatement(accessStatement3);

    const role = new iam.Role(this, "MyRole", {
      assumedBy: new iam.ServicePrincipal("sns.amazonaws.com")
    });

    role.attachInlinePolicy(trustPolicy);
    role.attachInlinePolicy(accessPolicy);

    // Now a low-level S3 bucket
    const bucketResource = new s3.CfnBucket(this, "MyCfnBucket");

    // Get name of bucket to which we replicate from config file:
    const bucketName = this.node.tryGetContext("bucketName");

    // snippet-start:[cdk.typescript.BucketResource-stack.replication_configuration]
    bucketResource.addPropertyOverride("ReplicationConfiguration", {
      Role: role.roleArn,
      Rules: [
        {
          Id: "replicateEverything",
          Destination: {
            Bucket: "arn:aws:s3:::" + bucketName
          },
          Prefix: "",
          Status: "Enabled"
        }
      ]
    });
    // snippet-end:[cdk.typescript.BucketResource-stack.replication_configuration]

    // snippet-start:[cdk.typescript.BucketResource-stack.analytics-configurations]
    bucketResource.addPropertyOverride("AnalyticsConfigurations", {
      Id: "config1",
      StorageClassAnalysis: {
        dataExport: {
          OutputSchemaVersion: "1",
          Destination: {
            Format: "html",
            BucketArn: "arn:aws:s3:::" + bucketName // use tokens freely
          }
        }
      }
    });
    // snippet-end:[cdk.typescript.BucketResource-stack.analytics-configurations]
  }
}
// snippet-end:[cdk.typescript.BucketResource-stack]
