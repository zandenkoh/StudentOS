import "server-only";

import {
  AnalyzeDocumentCommand,
  DetectDocumentTextCommand,
  TextractClient,
  type Block,
} from "@aws-sdk/client-textract";
import { sponsorEnv } from "./env";

export function getTextractClient() {
  return new TextractClient({ region: sponsorEnv.awsTextractRegion });
}

export function linesFromTextractBlocks(blocks: Block[] = []) {
  return blocks
    .filter((block) => block.BlockType === "LINE" && block.Text)
    .map((block) => block.Text)
    .join("\n");
}

export async function detectTextFromS3(key: string) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getTextractClient();
  const response = await client.send(
    new DetectDocumentTextCommand({
      Document: {
        S3Object: {
          Bucket: sponsorEnv.awsBucket,
          Name: key,
        },
      },
    }),
  );

  return {
    raw: response,
    text: linesFromTextractBlocks(response.Blocks),
  };
}

export async function analyseDocumentFromS3(key: string) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getTextractClient();
  const response = await client.send(
    new AnalyzeDocumentCommand({
      Document: {
        S3Object: {
          Bucket: sponsorEnv.awsBucket,
          Name: key,
        },
      },
      FeatureTypes: ["FORMS", "TABLES"],
    }),
  );

  return {
    raw: response,
    text: linesFromTextractBlocks(response.Blocks),
  };
}
