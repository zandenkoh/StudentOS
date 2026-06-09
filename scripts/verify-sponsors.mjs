import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const requiredFiles = [
  ".env.example",
  "serverless.yml",
  "src/aws/analyse-student-chaos-handler.ts",
  "src/lib/sponsor-tech/ai-gateway-model.ts",
  "src/app/api/sponsor/ai/analyse-student-chaos/route.ts",
  "src/app/api/sponsor/health/route.ts",
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
const liveNotes = [];

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

function loadEnvFile(file) {
  if (!exists(file)) return;

  for (const line of read(file).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function envFlag(name) {
  return process.env[name] === "true";
}

function hasValue(name) {
  return Boolean(process.env[name]?.trim());
}

function statusLabel(ok, fallbackDetail) {
  const detail = String(fallbackDetail || "not verified")
    .replace(/\s+/g, " ")
    .trim();
  const compact = detail.length > 180 ? `${detail.slice(0, 177)}...` : detail;

  return ok ? "verified" : `fallback (${compact})`;
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
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
    ["strictJudgeMode", "route does not support strict judge mode"],
  ];

  for (const [needle, message] of routeChecks) {
    if (!route.includes(needle)) {
      failures.push(message);
    }
  }
}

if (exists("src/aws/analyse-student-chaos-handler.ts")) {
  const handler = read("src/aws/analyse-student-chaos-handler.ts");
  for (const [needle, message] of [
    ["healthCheck", "AWS Lambda handler does not expose health/preflight mode"],
    ["gatewayHealthTrace", "AWS Lambda handler does not verify Vercel AI Gateway preflight"],
  ]) {
    if (!handler.includes(needle)) {
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

loadEnvFile(".env.local");
loadEnvFile(".env");

const liveRequested = args.has("--live") || process.env.VERIFY_SPONSORS_LIVE === "true";
const strictLiveRequested = args.has("--strict") || process.env.STUDENTOS_STRICT_JUDGE === "true";
const gatewayConfigured =
  envFlag("USE_REAL_VERCEL_AI") &&
  (hasValue("AI_GATEWAY_API_KEY") || hasValue("VERCEL_OIDC_TOKEN") || process.env.VERCEL === "1");
const lambdaConfigured = hasValue("AWS_AGENT_ENDPOINT");
const awsSourceConfigured =
  ((envFlag("USE_REAL_AWS") && hasValue("AWS_S3_BUCKET")) || (envFlag("USE_REAL_BEDROCK") && hasValue("AWS_BEDROCK_MODEL_ID"))) &&
  hasValue("AWS_ACCESS_KEY_ID") &&
  hasValue("AWS_SECRET_ACCESS_KEY");
const exaConfigured = envFlag("USE_REAL_EXA") && hasValue("EXA_API_KEY");
const shouldRunLive = liveRequested || gatewayConfigured || lambdaConfigured || awsSourceConfigured || exaConfigured;
let liveCriticalFailure = false;

async function verifyGatewayLive() {
  if (!gatewayConfigured) {
    liveNotes.push(`Vercel AI Gateway: ${statusLabel(false, "Gateway auth not configured")}`);
    return false;
  }

  try {
    const [{ generateText }, { gateway }] = await Promise.all([
      import("ai"),
      import("@ai-sdk/gateway"),
    ]);
    const model = process.env.AI_GATEWAY_MODEL || "openai/gpt-5.4";
    const result = await withTimeout(
      generateText({
        model: gateway(model),
        prompt: "Reply with exactly: StudentOS Gateway OK",
        temperature: 0,
        maxOutputTokens: 16,
      }),
      10000,
      "Vercel AI Gateway live check",
    );
    const ok = /studentos gateway ok/i.test(result.text || "");

    liveNotes.push(`Vercel AI Gateway: ${statusLabel(ok, ok ? "" : "unexpected response")}`);
    if (!ok) liveCriticalFailure = true;
    return ok;
  } catch (error) {
    liveCriticalFailure = true;
    liveNotes.push(`Vercel AI Gateway: fallback (${error instanceof Error ? error.message : "live check failed"})`);
    return false;
  }
}

async function verifyLambdaLive() {
  if (!lambdaConfigured) {
    liveNotes.push(`AWS Lambda: ${statusLabel(false, "AWS_AGENT_ENDPOINT not configured")}`);
    return false;
  }

  try {
    const response = await withTimeout(
      fetch(process.env.AWS_AGENT_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ healthCheck: true, strictJudgeMode: true }),
      }),
      12000,
      "AWS Lambda live health check",
    );
    const payload = await response.json().catch(() => ({}));
    const proofTraces = [
      ...(Array.isArray(payload.traces) ? payload.traces : []),
      ...(Array.isArray(payload.sponsorTrace) ? payload.sponsorTrace : []),
    ];
    const lambdaTrace = proofTraces.find((trace) => /aws lambda/i.test(trace.provider || ""));
    const gatewayTrace = proofTraces.find((trace) => /vercel ai gateway/i.test(trace.provider || ""));
    const lambdaOk = response.ok && lambdaTrace?.status === "success";
    const gatewayInLambdaOk = gatewayTrace?.status === "success";
    const ok = strictLiveRequested ? lambdaOk && gatewayInLambdaOk : lambdaOk;

    liveNotes.push(`AWS Lambda: ${statusLabel(Boolean(lambdaOk), payload.error || `HTTP ${response.status}`)}`);
    liveNotes.push(`Gateway inside Lambda: ${statusLabel(Boolean(gatewayTrace?.status === "success"), gatewayTrace?.detail || "not verified")}`);
    if (!ok) liveCriticalFailure = true;
    return ok;
  } catch (error) {
    liveCriticalFailure = true;
    liveNotes.push(`AWS Lambda: fallback (${error instanceof Error ? error.message : "live health check failed"})`);
    return false;
  }
}

async function verifyExaLive() {
  if (!exaConfigured) {
    liveNotes.push(`Exa: ${statusLabel(false, "EXA_API_KEY not configured")}`);
    return false;
  }

  try {
    const response = await withTimeout(
      fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXA_API_KEY,
        },
        body: JSON.stringify({
          query: "StudentOS sponsor verification health check",
          numResults: 1,
          contents: { text: { maxCharacters: 120 } },
        }),
      }),
      10000,
      "Exa live check",
    );
    const payload = await response.json().catch(() => ({}));
    const ok = response.ok && Array.isArray(payload.results);

    liveNotes.push(`Exa: ${statusLabel(ok, response.ok ? "no result array" : `HTTP ${response.status}`)}`);
    return ok;
  } catch (error) {
    liveNotes.push(`Exa: fallback (${error instanceof Error ? error.message : "live check failed"})`);
    return false;
  }
}

if (shouldRunLive) {
  await verifyLambdaLive();
  await verifyGatewayLive();
  liveNotes.push(`Bedrock/Textract: ${statusLabel(awsSourceConfigured, "AWS source credentials not fully configured")}`);
  await verifyExaLive();

  if (liveCriticalFailure) {
    console.error("Sponsor verification failed during live critical checks:");
    for (const note of liveNotes) {
      console.error(`- ${note}`);
    }
    process.exit(1);
  }
}

console.log("Sponsor verification passed.");
if (shouldRunLive) {
  for (const note of liveNotes) {
    console.log(`- ${note}`);
  }
} else {
  console.log("- Live sponsor verification skipped: no live sponsor environment variables detected.");
}
