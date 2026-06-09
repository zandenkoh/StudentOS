import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sponsorEnv } from "./env";

export function getS3Client() {
  return new S3Client({ region: sponsorEnv.awsRegion });
}

export async function uploadBufferToS3(params: {
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: sponsorEnv.awsBucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  return {
    bucket: sponsorEnv.awsBucket,
    key: params.key,
  };
}

export async function getReadUrl(key: string, expiresIn = 3600) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: sponsorEnv.awsBucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export async function getObjectText(key: string) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: sponsorEnv.awsBucket,
      Key: key,
    }),
  );

  return response.Body?.transformToString() ?? "";
}

export async function getObjectBytes(key: string) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: sponsorEnv.awsBucket,
      Key: key,
    }),
  );

  return response.Body?.transformToByteArray() ?? new Uint8Array();
}
