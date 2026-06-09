import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  ".env.example",
  "serverless.yml",
  "src/aws/analyse-student-chaos-handler.ts",
  "src/lib/sponsor-tech/ai-gateway-model.ts",
  "src/app/api/sponsor/ai/analyse-student-chaos/route.ts",
  "src/components/sponsor-proof-strip.tsx",
];

const activeSponsorFiles = [
  "src/lib/sponsor-tech/vercel-gateway.ts",
  "src/lib/sponsor-tech/source-interpreter.ts",
  "src/lib/sponsor-tech/replan-agent.ts",
  "src/lib/sponsor-tech/studentos-agent.ts",
  "src/lib/sponsor-tech/exa.ts",
];

const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function requireFile(file) {
  if (!exists(file)) {
    failures.push(`Missing ${file}`);
  }
}

for (const file of requiredFiles) {
  requireFile(file);
}

if (exists("package.json")) {
  const pkg = JSON.parse(read("package.json"));
  if (!pkg.dependencies?.["@ai-sdk/gateway"] && !pkg.devDependencies?.["@ai-sdk/gateway"]) {
    failures.push("Missing @ai-sdk/gateway in package.json");
  }
} else {
  failures.push("Missing package.json");
}

for (const file of activeSponsorFiles) {
  if (!exists(file)) {
    failures.push(`Missing active sponsor-tech file ${file}`);
    continue;
  }

  const source = read(file);
  if (source.includes("generateText(") && !source.includes("gatewayLanguageModel(")) {
    failures.push(`${file} calls generateText without gatewayLanguageModel`);
  }
}

if (exists("src/app/api/sponsor/ai/analyse-student-chaos/route.ts")) {
  const route = read("src/app/api/sponsor/ai/analyse-student-chaos/route.ts");
  const routeChecks = [
    ["AWS_AGENT_ENDPOINT", "route does not reference AWS_AGENT_ENDPOINT"],
    ["ALLOW_LOCAL_AGENT_FALLBACK", "route does not reference ALLOW_LOCAL_AGENT_FALLBACK"],
    ["X-StudentOS-Agent-Compute", "route does not set X-StudentOS-Agent-Compute"],
  ];

  for (const [needle, message] of routeChecks) {
    if (!route.includes(needle)) {
      failures.push(message);
    }
  }
}

if (failures.length) {
  console.error("Sponsor verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Sponsor verification passed.");
