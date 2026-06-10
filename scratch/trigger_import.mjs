import { POST } from "../src/app/api/sponsor/aws/import-demo-packet/route.ts";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".env.local") });

async function run() {
  try {
    console.log("Triggering POST /api/sponsor/aws/import-demo-packet...");
    const req = new Request("http://localhost/api/sponsor/aws/import-demo-packet", {
      method: "POST"
    });
    const res = await POST(req);
    const json = await res.json();
    console.log("Response Status:", res.status);
    console.log("Response Warning:", json.warning);
    console.log("Response Trace:", json.trace);
    console.log("Imported Sources:", json.sources?.map(s => s.title));
  } catch (err) {
    console.error("Error triggering import:", err);
  }
}

run();
