import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".env.local") });

const SOURCE_CACHE_MANIFEST_KEY = "studentos-demo/cache/source-manifest.json";

async function run() {
  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: SOURCE_CACHE_MANIFEST_KEY,
      })
    );

    const bodyText = await response.Body.transformToString();
    const manifest = JSON.parse(bodyText);

    console.log("CACHE VERSION:", manifest.version);
    console.log("CACHE KEYS:", Object.keys(manifest.records));
    for (const [key, value] of Object.entries(manifest.records)) {
      console.log("-----------------------------------------");
      console.log("KEY:", key);
      console.log("TITLE:", value.title);
      console.log("SOURCE:", value.source);
      console.log("FILE TYPE:", value.fileType);
      console.log("SNIPPET:", value.snippet);
      console.log("SUMMARY:", value.sourceSummary);
      console.log("TASKS:", value.extractedTasks);
    }
  } catch (err) {
    console.error("Error loading cache:", err);
  }
}

run();
