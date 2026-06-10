import { loadSourceCache } from "../src/lib/sponsor-tech/source-cache.ts";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".env.local") });

async function run() {
  try {
    const manifest = await loadSourceCache();
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
