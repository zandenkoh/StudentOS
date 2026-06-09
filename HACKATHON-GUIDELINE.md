# StudentOS Hackathon Sponsor-Tech Guideline

_Last updated: 2026-06-09, Singapore time._

This file is written for Codex. Use it as the implementation map for adding real sponsor-powered backend features into the current StudentOS demo without destroying the existing polished flow.

The demo is currently a mostly hardcoded, mobile-first Next.js app with these routes:

```txt
/             Landing
/chaos        Auto-running chaos animation
/input        Universal inbox / source capture
/agents       Simulated agent processing timeline
/commitments  Review → conflict solver → final plan
/roadmap      Goal roadmap detail
/goal         Alternate goal entry experiment
```

The product position must stay sharp:

> StudentOS is an AI chief-of-staff for ambitious students. It captures scattered commitments, breaks down vague goals, and turns them into a realistic daily execution plan.

Do **not** turn this into a generic todo app. The core transformation is:

```txt
messy inputs + broad goals + fixed constraints
→ extracted commitments
→ goal roadmap
→ realistic daily execution plan
→ replanning when life changes
```

---

## 0. Integration Philosophy

The current demo already tells the story well. Sponsor tech should make the story more credible, not more fragile.

Use a **progressive enhancement** approach:

1. Keep all existing mock data as fallback.
2. Add server routes behind environment flags.
3. When API keys exist, route real files/goals through sponsor APIs.
4. If any API fails, return a structured fallback object that still lets the demo continue.
5. Surface sponsor usage visually inside `/agents`, not as random logos.

Recommended environment flag:

```env
NEXT_PUBLIC_USE_REAL_SPONSOR_TECH=false
USE_REAL_AWS=false
USE_REAL_EXA=false
USE_REAL_VERCEL_AI=false
USE_REAL_BEDROCK=false
```

During the live demo, enable only what is stable. It is better to demo one real route reliably than three half-broken integrations.

---

## 1. Sponsor-Tech Roles

### Vercel

Use Vercel for:

- hosting the Next.js app
- route handlers under `src/app/api/**/route.ts`
- AI Gateway for model access through one API key
- streaming the final planning output
- observability / usage monitoring

Demo line:

> Vercel streams the planner in real time, so the product feels like a live AI-native app instead of a batch job.

### Exa

Use Exa for:

- researching broad goals
- finding external context for competitions, study goals and sponsor docs
- turning vague goals into grounded roadmaps
- optionally giving the planner web context through Vercel AI SDK tool calling

Demo line:

> Exa gives StudentOS live external context, so a broad goal like “win NEXT hackathon” becomes a grounded execution roadmap instead of generic AI advice.

### AWS

Use AWS for:

- S3 storage for uploaded source files
- Textract OCR / document analysis for screenshots, worksheets and PDFs
- optional Bedrock Converse for structured extraction or planning
- optional Lambda later if upload processing needs background jobs

Demo line:

> AWS handles the messy real-world input layer: screenshots, PDFs and worksheets become machine-readable commitments.

---

## 2. Official Docs To Keep Open

### Exa

- Search API: https://exa.ai/docs/reference/search
- Contents API: https://exa.ai/docs/reference/get-contents
- Answer API: https://exa.ai/docs/reference/answer
- Vercel AI SDK integration: https://exa.ai/docs/reference/vercel
- OpenAI tool calling with Exa: https://exa.ai/docs/reference/openai-tool-calling
- Exa Context / Exa Code for coding agents: https://exa.ai/docs/reference/context

Key details:

- `POST https://api.exa.ai/search` searches the web and can return extracted content.
- Authenticate with `x-api-key: EXA_API_KEY`.
- `POST /contents` retrieves clean text and metadata for URLs.
- `POST /answer` gives a direct answer or cited summary.
- `@exalabs/ai-sdk` exposes `webSearch()` as a tool for the Vercel AI SDK.

### Vercel

- AI Gateway overview: https://vercel.com/docs/ai-gateway
- Text generation quickstart: https://vercel.com/docs/ai-gateway/getting-started/text
- Authentication / BYOK: https://vercel.com/docs/ai-gateway/authentication-and-byok
- Models and providers: https://vercel.com/docs/ai-gateway/models-and-providers
- OpenAI Chat Completions compatibility: https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions

Key details:

- AI Gateway base URL: `https://ai-gateway.vercel.sh/v1`
- Env var: `AI_GATEWAY_API_KEY`
- Model IDs use `provider/model-name`, for example `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, etc.
- Works with Vercel AI SDK `generateText` / `streamText`.
- Also works with OpenAI-compatible SDKs by changing the `baseURL`.

### AWS

- AWS SDK for JavaScript v3 S3 examples: https://docs.aws.amazon.com/code-library/latest/ug/javascript_3_s3_code_examples.html
- Textract JavaScript SDK v3 examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_textract_code_examples.html
- Textract synchronous processing: https://docs.aws.amazon.com/textract/latest/dg/sync.html
- Textract quotas and file limits: https://docs.aws.amazon.com/textract/latest/dg/limits-document.html
- DetectDocumentText API: https://docs.aws.amazon.com/textract/latest/APIReference/API_DetectDocumentText.html
- AnalyzeDocument API: https://docs.aws.amazon.com/textract/latest/APIReference/API_AnalyzeDocument.html
- Textract async processing: https://docs.aws.amazon.com/textract/latest/dg/async.html
- Bedrock Converse API: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-call.html
- Bedrock structured output: https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html

Key details:

- Textract synchronous operations are good for single-page JPEG, PNG, PDF and TIFF files.
- Synchronous Textract limit: 10 MB; PDF/TIFF also limited to 1 page.
- Multipage PDFs/TIFFs should use asynchronous Textract operations.
- Textract returns `Blocks`; filter `BlockType === "LINE"` for simple OCR text.
- Use `AnalyzeDocument` with `FeatureTypes: ["FORMS", "TABLES"]` when layout/relationships matter.
- Bedrock Converse standardises message-based model calls across Bedrock models.
- Bedrock structured outputs can enforce JSON schema on supported models.

---

## 3. Install Packages

Run from project root:

```bash
pnpm add ai @ai-sdk/gateway @ai-sdk/openai-compatible @exalabs/ai-sdk openai zod
pnpm add @aws-sdk/client-s3 @aws-sdk/client-textract @aws-sdk/client-bedrock-runtime @aws-sdk/s3-request-presigner
```

If the repo uses `npm`, convert the command accordingly:

```bash
npm install ai @ai-sdk/gateway @ai-sdk/openai-compatible @exalabs/ai-sdk openai zod
npm install @aws-sdk/client-s3 @aws-sdk/client-textract @aws-sdk/client-bedrock-runtime @aws-sdk/s3-request-presigner
```

---

## 4. Environment Variables

Create or update `.env.local`:

```env
# Feature flags
NEXT_PUBLIC_USE_REAL_SPONSOR_TECH=false
USE_REAL_AWS=false
USE_REAL_EXA=false
USE_REAL_VERCEL_AI=false
USE_REAL_BEDROCK=false

# Vercel AI Gateway
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL=openai/gpt-5.5
AI_GATEWAY_FALLBACK_MODEL=anthropic/claude-opus-4.7

# Exa
EXA_API_KEY=

# AWS
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Optional Bedrock
AWS_BEDROCK_MODEL_ID=
```

Important:

- Do not expose secret env vars to client components.
- Only variables prefixed with `NEXT_PUBLIC_` are safe for browser code.
- All sponsor calls should happen in `src/app/api/**/route.ts` or server-only utilities.

---

## 5. Recommended File Structure

Add these files:

```txt
src/lib/sponsor-tech/env.ts
src/lib/sponsor-tech/types.ts
src/lib/sponsor-tech/fallbacks.ts
src/lib/sponsor-tech/exa.ts
src/lib/sponsor-tech/vercel-gateway.ts
src/lib/sponsor-tech/aws-s3.ts
src/lib/sponsor-tech/aws-textract.ts
src/lib/sponsor-tech/aws-bedrock.ts

src/app/api/sponsor/exa/research-goal/route.ts
src/app/api/sponsor/ai/classify-commitments/route.ts
src/app/api/sponsor/ai/plan-day/route.ts
src/app/api/sponsor/aws/upload-source/route.ts
src/app/api/sponsor/aws/extract-source/route.ts
src/app/api/sponsor/aws/analyse-document/route.ts
```

Do not rewrite existing pages first. Add API routes and utilities first, then integrate them one screen at a time.

---

## 6. Shared Types

Create `src/lib/sponsor-tech/types.ts`.

```ts
export type SourceKind = "text" | "image" | "pdf" | "audio" | "unknown";

export type UploadedSource = {
  id: string;
  name: string;
  kind: SourceKind;
  mimeType?: string;
  size?: number;
  s3Key?: string;
  url?: string;
  rawText?: string;
  extractionProvider?: "mock" | "aws-textract" | "manual";
};

export type ExtractedCommitment = {
  id: string;
  type: "task" | "event" | "goal" | "reminder" | "thing_to_bring" | "unclear";
  title: string;
  description?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  estimatedMinutes?: number;
  subject?: string;
  priority: "low" | "medium" | "high";
  confidence: number;
  needsClarification: boolean;
  sourceEvidence?: string;
  sourceId?: string;
};

export type GoalResearchResult = {
  goal: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    publishedDate?: string;
    highlights?: string[];
  }>;
  suggestedMilestones: string[];
  risks: string[];
};

export type DailyPlanBlock = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  reason: string;
  type: "fixed" | "suggested" | "confirmed";
  risk?: string;
};

export type DailyPlanResult = {
  date: string;
  topTasks: ExtractedCommitment[];
  timeBlocks: DailyPlanBlock[];
  easyToForget: ExtractedCommitment[];
  risks: string[];
  sponsorTrace: Array<{
    provider: "aws" | "exa" | "vercel" | "bedrock" | "mock";
    action: string;
    status: "success" | "fallback" | "skipped" | "error";
  }>;
};
```

---

## 7. Env Helper

Create `src/lib/sponsor-tech/env.ts`.

```ts
export const sponsorEnv = {
  useRealSponsorTech: process.env.NEXT_PUBLIC_USE_REAL_SPONSOR_TECH === "true",
  useAws: process.env.USE_REAL_AWS === "true",
  useExa: process.env.USE_REAL_EXA === "true",
  useVercelAi: process.env.USE_REAL_VERCEL_AI === "true",
  useBedrock: process.env.USE_REAL_BEDROCK === "true",

  aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY,
  aiGatewayModel: process.env.AI_GATEWAY_MODEL || "openai/gpt-5.5",
  aiGatewayFallbackModel: process.env.AI_GATEWAY_FALLBACK_MODEL,

  exaApiKey: process.env.EXA_API_KEY,

  awsRegion: process.env.AWS_REGION || "ap-southeast-1",
  awsBucket: process.env.AWS_S3_BUCKET,
  bedrockModelId: process.env.AWS_BEDROCK_MODEL_ID,
};

export function assertServerEnv(name: keyof typeof sponsorEnv) {
  const value = sponsorEnv[name];
  if (!value) throw new Error(`Missing environment variable for ${name}`);
  return value;
}
```

---

## 8. Vercel AI Gateway Integration

### Purpose in StudentOS

Use Vercel AI Gateway for:

- commitment classification from extracted text
- daily planning from commitments and constraints
- streaming the final plan on `/commitments` plan step

### Server utility

Create `src/lib/sponsor-tech/vercel-gateway.ts`.

```ts
import OpenAI from "openai";
import { sponsorEnv } from "./env";

export function getGatewayClient() {
  if (!sponsorEnv.aiGatewayApiKey) {
    throw new Error("Missing AI_GATEWAY_API_KEY");
  }

  return new OpenAI({
    apiKey: sponsorEnv.aiGatewayApiKey,
    baseURL: "https://ai-gateway.vercel.sh/v1",
  });
}
```

### Route: classify commitments

Create `src/app/api/sponsor/ai/classify-commitments/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getGatewayClient } from "@/lib/sponsor-tech/vercel-gateway";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

const RequestSchema = z.object({
  sources: z.array(z.object({
    id: z.string(),
    name: z.string(),
    rawText: z.string().optional(),
    kind: z.string().optional(),
  })),
  currentDate: z.string().default("2026-06-09"),
});

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json());

  if (!sponsorEnv.useVercelAi) {
    return NextResponse.json({
      provider: "mock",
      items: [],
      warning: "USE_REAL_VERCEL_AI=false; caller should use demo fallback.",
    });
  }

  const client = getGatewayClient();

  const completion = await client.chat.completions.create({
    model: sponsorEnv.aiGatewayModel,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You extract student commitments from messy school inputs.",
          "Return strict JSON only.",
          "Classify each item as task, event, goal, reminder, thing_to_bring, or unclear.",
          "Infer dates relative to currentDate when possible.",
          "Ask for clarification only if the missing info changes scheduling.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          currentDate: body.currentDate,
          sources: body.sources,
          outputShape: {
            items: [
              {
                type: "task | event | goal | reminder | thing_to_bring | unclear",
                title: "string",
                description: "string",
                dueDate: "ISO date or undefined",
                startTime: "ISO datetime or undefined",
                endTime: "ISO datetime or undefined",
                estimatedMinutes: "number or undefined",
                subject: "string or undefined",
                priority: "low | medium | high",
                confidence: "0..1",
                needsClarification: "boolean",
                sourceEvidence: "short quote",
                sourceId: "source id",
              },
            ],
          },
        }),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  return NextResponse.json(JSON.parse(text));
}
```

### Route: plan day

Create `src/app/api/sponsor/ai/plan-day/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

const RequestSchema = z.object({
  commitments: z.array(z.any()),
  goals: z.array(z.any()).default([]),
  fixedEvents: z.array(z.any()).default([]),
  currentDate: z.string().default("2026-06-09"),
  mode: z.enum(["json", "stream"]).default("json"),
});

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json());

  if (!sponsorEnv.useVercelAi) {
    return NextResponse.json({
      provider: "mock",
      warning: "USE_REAL_VERCEL_AI=false; caller should use demo fallback.",
    });
  }

  const result = streamText({
    model: sponsorEnv.aiGatewayModel,
    system: [
      "You are StudentOS, an AI chief-of-staff for ambitious students.",
      "Generate a realistic daily execution plan, not a maximal productivity fantasy.",
      "Respect fixed events, near deadlines, fatigue and conflict risks.",
      "Prioritise top 3 tasks and explain why each matters.",
      "Return concise, UI-ready content.",
    ].join("\n"),
    prompt: JSON.stringify(body),
  });

  return result.toTextStreamResponse();
}
```

Notes:

- Use `streamText` for the final plan because the UI can show “Building your day…” and stream blocks progressively.
- For extraction/classification, non-streamed JSON is easier and safer.
- If `streamText` plain-string model IDs fail in your installed SDK version, install `@ai-sdk/gateway` and use `gateway(sponsorEnv.aiGatewayModel)` instead.

---

## 9. Exa Integration

### Purpose in StudentOS

Do **not** use Exa for every homework item. Use it when the input is a broad goal or needs external context.

Good Exa use cases:

- “I want to win NEXT hackathon.”
- “Learn coding by December.”
- “Prepare for physics electricity test.”
- “Use Vercel, Exa and AWS in the demo.”
- “Am I on track for NEXT?”

### Direct REST helper

Create `src/lib/sponsor-tech/exa.ts`.

```ts
import { sponsorEnv } from "./env";

export async function exaSearch(query: string) {
  if (!sponsorEnv.exaApiKey) throw new Error("Missing EXA_API_KEY");

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "x-api-key": sponsorEnv.exaApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      type: "auto",
      numResults: 6,
      contents: {
        highlights: true,
        summary: true,
        text: { maxCharacters: 1000 },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Exa search failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function exaAnswer(query: string) {
  if (!sponsorEnv.exaApiKey) throw new Error("Missing EXA_API_KEY");

  const res = await fetch("https://api.exa.ai/answer", {
    method: "POST",
    headers: {
      "x-api-key": sponsorEnv.exaApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, text: true }),
  });

  if (!res.ok) {
    throw new Error(`Exa answer failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
```

### Route: research goal

Create `src/app/api/sponsor/exa/research-goal/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { exaSearch } from "@/lib/sponsor-tech/exa";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

const RequestSchema = z.object({
  goal: z.string().min(1),
  context: z.string().optional(),
});

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json());

  if (!sponsorEnv.useExa) {
    return NextResponse.json({
      provider: "mock",
      goal: body.goal,
      summary: "Exa disabled. Use demo fallback roadmap.",
      sources: [],
      suggestedMilestones: [],
      risks: [],
    });
  }

  const query = [
    `Research this student goal and return useful context for planning: ${body.goal}`,
    body.context ? `Student context: ${body.context}` : "",
    "Focus on actionable constraints, deadlines, preparation strategy and credible sources.",
  ].filter(Boolean).join("\n");

  const data = await exaSearch(query);

  const sources = (data.results || []).map((result: any) => ({
    title: result.title,
    url: result.url,
    publishedDate: result.publishedDate,
    highlights: result.highlights || [],
    summary: result.summary,
  }));

  return NextResponse.json({
    provider: "exa",
    goal: body.goal,
    summary: sources.map((s: any) => s.summary).filter(Boolean).slice(0, 3).join("\n"),
    sources,
    suggestedMilestones: [],
    risks: [],
  });
}
```

### Optional: Exa as a Vercel AI SDK tool

Use this if you want the planner to choose when to search.

```ts
import { generateText, stepCountIs } from "ai";
import { webSearch } from "@exalabs/ai-sdk";

const result = await generateText({
  model: "openai/gpt-5.5",
  system: "You are StudentOS. Search only when external context changes the plan.",
  prompt: "Break down the goal: win NEXT hackathon using Vercel, Exa and AWS.",
  tools: {
    webSearch: webSearch({
      type: "auto",
      numResults: 6,
      contents: {
        text: { maxCharacters: 1000 },
        summary: true,
      },
    }),
  },
  stopWhen: stepCountIs(4),
});
```

For the hackathon, the direct REST route is probably easier to debug than autonomous tool calling.

---

## 10. AWS S3 Integration

### Purpose in StudentOS

Use S3 as the raw source store for uploaded screenshots, PDFs, audio files and future source attachments.

### Helper

Create `src/lib/sponsor-tech/aws-s3.ts`.

```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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
  await client.send(new PutObjectCommand({
    Bucket: sponsorEnv.awsBucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  }));

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
```

### Route: upload source

Create `src/app/api/sponsor/aws/upload-source/route.ts`.

```ts
import { NextResponse } from "next/server";
import { uploadBufferToS3, getReadUrl } from "@/lib/sponsor-tech/aws-s3";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

export async function POST(req: Request) {
  if (!sponsorEnv.useAws) {
    return NextResponse.json({
      provider: "mock",
      warning: "USE_REAL_AWS=false; file not uploaded.",
    });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `studentos-demo/${Date.now()}-${safeName}`;

  const uploaded = await uploadBufferToS3({
    key,
    body: buffer,
    contentType: file.type,
  });

  const readUrl = await getReadUrl(key);

  return NextResponse.json({
    provider: "aws-s3",
    name: file.name,
    mimeType: file.type,
    size: file.size,
    bucket: uploaded.bucket,
    key: uploaded.key,
    readUrl,
  });
}
```

Notes:

- This route uploads through your Next.js server. It is simpler for the hackathon.
- Later, use presigned upload URLs so the browser uploads directly to S3.
- Keep file sizes small for live demo reliability.

---

## 11. AWS Textract Integration

### Purpose in StudentOS

Use Textract for OCR on screenshots, worksheet photos and single-page PDFs.

For the hackathon:

- `DetectDocumentText` is enough for most screenshots and worksheet text.
- `AnalyzeDocument` is stronger if you need tables/forms/layout.
- Multipage PDFs should either fall back to mock text or use async Textract later.

### Helper

Create `src/lib/sponsor-tech/aws-textract.ts`.

```ts
import {
  TextractClient,
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";
import { sponsorEnv } from "./env";

export function getTextractClient() {
  return new TextractClient({ region: sponsorEnv.awsRegion });
}

export function linesFromTextractBlocks(blocks: any[] = []) {
  return blocks
    .filter((block) => block.BlockType === "LINE" && block.Text)
    .map((block) => block.Text)
    .join("\n");
}

export async function detectTextFromS3(key: string) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getTextractClient();
  const response = await client.send(new DetectDocumentTextCommand({
    Document: {
      S3Object: {
        Bucket: sponsorEnv.awsBucket,
        Name: key,
      },
    },
  }));

  return {
    raw: response,
    text: linesFromTextractBlocks(response.Blocks),
  };
}

export async function analyseDocumentFromS3(key: string) {
  if (!sponsorEnv.awsBucket) throw new Error("Missing AWS_S3_BUCKET");

  const client = getTextractClient();
  const response = await client.send(new AnalyzeDocumentCommand({
    Document: {
      S3Object: {
        Bucket: sponsorEnv.awsBucket,
        Name: key,
      },
    },
    FeatureTypes: ["FORMS", "TABLES"],
  }));

  return {
    raw: response,
    text: linesFromTextractBlocks(response.Blocks),
  };
}
```

### Route: extract source

Create `src/app/api/sponsor/aws/extract-source/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { detectTextFromS3 } from "@/lib/sponsor-tech/aws-textract";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

const RequestSchema = z.object({
  key: z.string().min(1),
});

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json());

  if (!sponsorEnv.useAws) {
    return NextResponse.json({
      provider: "mock",
      text: "AWS Textract disabled. Use demo fallback OCR text.",
      blocks: [],
    });
  }

  const result = await detectTextFromS3(body.key);

  return NextResponse.json({
    provider: "aws-textract",
    text: result.text,
    blockCount: result.raw.Blocks?.length || 0,
  });
}
```

### Route: analyse document

Create `src/app/api/sponsor/aws/analyse-document/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyseDocumentFromS3 } from "@/lib/sponsor-tech/aws-textract";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

const RequestSchema = z.object({
  key: z.string().min(1),
});

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json());

  if (!sponsorEnv.useAws) {
    return NextResponse.json({
      provider: "mock",
      text: "AWS AnalyzeDocument disabled. Use fallback.",
      blocks: [],
    });
  }

  const result = await analyseDocumentFromS3(body.key);

  return NextResponse.json({
    provider: "aws-textract-analyze-document",
    text: result.text,
    blockCount: result.raw.Blocks?.length || 0,
    raw: result.raw,
  });
}
```

---

## 12. AWS Bedrock Integration

### Purpose in StudentOS

Use Bedrock only if enabled and stable. It is optional because Vercel AI Gateway can already handle the main planner.

Good Bedrock uses:

- structured extraction from Textract text into commitment JSON
- a sponsor-visible “AWS Bedrock reasoning pass” inside `/agents`
- comparing Bedrock extraction with Vercel AI Gateway extraction

### Helper

Create `src/lib/sponsor-tech/aws-bedrock.ts`.

```ts
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { sponsorEnv } from "./env";

export function getBedrockClient() {
  return new BedrockRuntimeClient({ region: sponsorEnv.awsRegion });
}

export async function bedrockConverseText(prompt: string) {
  if (!sponsorEnv.bedrockModelId) throw new Error("Missing AWS_BEDROCK_MODEL_ID");

  const client = getBedrockClient();
  const response = await client.send(new ConverseCommand({
    modelId: sponsorEnv.bedrockModelId,
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.2,
      topP: 0.9,
    },
  }));

  return response.output?.message?.content?.map((part: any) => part.text).filter(Boolean).join("\n") || "";
}
```

### Route: Bedrock extraction

Create `src/app/api/sponsor/aws/bedrock-extract/route.ts`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { bedrockConverseText } from "@/lib/sponsor-tech/aws-bedrock";
import { sponsorEnv } from "@/lib/sponsor-tech/env";

const RequestSchema = z.object({
  rawText: z.string().min(1),
  currentDate: z.string().default("2026-06-09"),
});

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json());

  if (!sponsorEnv.useBedrock) {
    return NextResponse.json({
      provider: "mock",
      warning: "USE_REAL_BEDROCK=false; use Vercel AI Gateway or demo fallback.",
    });
  }

  const prompt = `
You extract structured student commitments.
Current date: ${body.currentDate}

Return JSON only with this shape:
{
  "items": [
    {
      "type": "task | event | goal | reminder | thing_to_bring | unclear",
      "title": "string",
      "dueDate": "ISO date or null",
      "estimatedMinutes": 30,
      "priority": "low | medium | high",
      "confidence": 0.8,
      "needsClarification": false,
      "sourceEvidence": "short quote"
    }
  ]
}

Raw source text:
${body.rawText}
`;

  const text = await bedrockConverseText(prompt);
  return NextResponse.json({ provider: "aws-bedrock", text });
}
```

If you can use Bedrock structured outputs with your chosen model, replace prompt-only JSON with the Bedrock `outputConfig.textFormat` schema. Verify model support first.

---

## 13. One-Pass Analysis Pipeline

Create a route that chains the APIs in a single call for easy integration with `/input` or `/agents`.

Recommended route:

```txt
src/app/api/sponsor/analyse-source/route.ts
```

Expected request:

```json
{
  "sources": [
    { "id": "s1", "name": "teacher-whatsapp.png", "kind": "image", "s3Key": "studentos-demo/..." },
    { "id": "s2", "name": "goal.txt", "kind": "text", "rawText": "I want to win NEXT hackathon..." }
  ],
  "currentDate": "2026-06-09"
}
```

Expected response:

```json
{
  "sources": [
    { "id": "s1", "rawText": "Physics worksheet due tomorrow 8am...", "extractionProvider": "aws-textract" }
  ],
  "commitments": [],
  "goalResearch": [],
  "sponsorTrace": [
    { "provider": "aws", "action": "Textract OCR", "status": "success" },
    { "provider": "exa", "action": "Goal research", "status": "success" },
    { "provider": "vercel", "action": "Planner model", "status": "success" }
  ]
}
```

Implementation logic:

1. For each source with `s3Key`, call Textract.
2. For each text source, keep `rawText` as-is.
3. Send all raw text to `classify-commitments`.
4. Detect broad goals from classified items.
5. Send broad goals to Exa.
6. Return structured data plus `sponsorTrace`.
7. On any failure, append trace item with `status: "fallback"` and return mock-compatible data.

---

## 14. Integrating With Existing Routes

### `/input/page.tsx`

Current behaviour:

- `Import student chaos packet` trickles in 7 mock files.
- Typed custom text is local only.
- Paperclip creates random mock files.
- Analyse always progresses to mocked `/agents` flow.

Upgrade path:

1. Keep the mock import button.
2. Add real upload support behind `NEXT_PUBLIC_USE_REAL_SPONSOR_TECH`.
3. When a user uploads a real file, call `/api/sponsor/aws/upload-source`.
4. Store returned `s3Key` on the source object.
5. On Analyse, call `/api/sponsor/analyse-source` with all real + mock sources.
6. Save result to `localStorage.studentos_commitment_footprint`.
7. Navigate to `/agents` as before.

Do not remove the existing hardcoded packet. Make it the fallback.

### `/agents/page.tsx`

Current behaviour:

- Simulated timeline with agent steps.
- Auto-redirects to `/commitments` after ~10 seconds.

Upgrade path:

- Inject sponsor trace items into the timeline if available.
- Show statuses like:

```txt
AWS S3 stored uploaded sources
AWS Textract extracted 23 lines from worksheet
Exa researched “learn coding by December”
Vercel AI Gateway generated schedule reasoning
```

If no real trace exists, keep current animated mock timeline.

### `/commitments/page.tsx`

Current behaviour:

- Hardcoded commitments/goals from `demo-data.ts`.
- Clarification bottom sheets update local state.
- Conflict solver and final plan use fixed arrays with local overrides.

Upgrade path:

1. On load, read `studentos_commitment_footprint`.
2. If it contains real extracted commitments, merge them into existing demo commitments.
3. Preserve the known CCA/tuition conflict because it is a strong demo moment.
4. If planner output exists, show it in the plan step as an “AI-generated variant”.
5. Do not let real API output destroy the core demo narrative.

### `/roadmap/page.tsx`

Current behaviour:

- Hardcoded goal roadmap for “Learn coding by December”.

Upgrade path:

- If `goalResearch` from Exa exists, show:
  - “External context used” card
  - source links
  - risks found
  - revised milestones

Keep the original roadmap as fallback.

---

## 15. UI Copy For Sponsor Transparency

Use small, tasteful labels in the UI:

```txt
Powered by AWS Textract
Live context from Exa
Streamed via Vercel AI Gateway
```

For `/agents`, use a pipeline card:

```txt
Source pipeline
1. S3 stores raw packet
2. Textract reads files
3. Exa researches vague goals
4. AI Gateway builds the plan
```

Do not overdo sponsor badges. Judges should understand the system architecture, not feel like the UI is an ad board.

---

## 16. Minimal Working Implementation Order

### Step 1 — Add env + packages

- Add `.env.local.example`.
- Add sponsor env helper.
- Ensure app still boots.

### Step 2 — Add Exa goal research route

- Implement `/api/sponsor/exa/research-goal`.
- Test with `curl` or browser console.
- Connect only to `/roadmap` or `/agents` trace first.

### Step 3 — Add Vercel AI Gateway planner route

- Implement `/api/sponsor/ai/plan-day`.
- Test streaming route separately.
- Add streamed “Why this plan?” content first before touching the main plan list.

### Step 4 — Add AWS S3 upload route

- Implement `/api/sponsor/aws/upload-source`.
- Upload a small image from `/input`.
- Show returned file metadata on the card.

### Step 5 — Add Textract extraction route

- Implement `/api/sponsor/aws/extract-source`.
- Test with a single screenshot or single-page PDF under 10 MB.
- Show OCR text in the bottom sheet preview.

### Step 6 — Chain into `/agents`

- Add `sponsorTrace` to localStorage.
- Display sponsor trace in agent timeline.
- Keep existing auto-redirect.

### Step 7 — Chain into `/commitments`

- Merge real extracted commitments into the review step.
- Preserve the demo’s conflict and final plan.

---

## 17. Test Commands

### Exa

```bash
curl -X POST http://localhost:3000/api/sponsor/exa/research-goal \
  -H "Content-Type: application/json" \
  -d '{"goal":"Win NEXT hackathon using Vercel, Exa and AWS"}'
```

### Vercel AI Gateway planner

```bash
curl -N -X POST http://localhost:3000/api/sponsor/ai/plan-day \
  -H "Content-Type: application/json" \
  -d '{
    "currentDate":"2026-06-09",
    "commitments":[{"title":"Physics worksheet due tomorrow 8am","priority":"high"}],
    "goals":[{"title":"Win NEXT hackathon","deadline":"2026-06-11"}],
    "fixedEvents":[{"title":"Tuition","startTime":"2026-06-09T17:00:00+08:00","endTime":"2026-06-09T18:30:00+08:00"}]
  }'
```

### AWS upload

```bash
curl -X POST http://localhost:3000/api/sponsor/aws/upload-source \
  -F "file=@./sample.png"
```

### AWS Textract

```bash
curl -X POST http://localhost:3000/api/sponsor/aws/extract-source \
  -H "Content-Type: application/json" \
  -d '{"key":"studentos-demo/YOUR_FILE_KEY.png"}'
```

---

## 18. Failure Handling Rules

Every sponsor API route must return a valid JSON object even on fallback.

Bad:

```ts
throw new Error("Missing API key");
```

Good:

```ts
return NextResponse.json({
  provider: "mock",
  status: "fallback",
  reason: "Missing API key",
  data: fallbackData,
});
```

Use thrown errors only in internal helpers. Catch them at the route boundary.

Recommended route pattern:

```ts
try {
  // real sponsor call
} catch (error) {
  console.error(error);
  return NextResponse.json({
    provider: "mock",
    status: "fallback",
    reason: error instanceof Error ? error.message : "Unknown error",
  });
}
```

---

## 19. Pitchable Architecture

Use this exact architecture in the pitch:

```txt
StudentOS sponsor stack

AWS
Stores and reads messy school inputs.
S3 receives source files. Textract extracts text from screenshots, worksheets and PDFs.

Exa
Adds live external context for broad goals.
When a student says “win NEXT” or “learn coding”, Exa researches what actually matters.

Vercel
Turns the intelligence into a fast product.
Next.js hosts the app. AI Gateway streams the planner and lets us switch models without rewrites.
```

One-line version:

> AWS reads the chaos, Exa understands the outside world, Vercel makes the plan feel instant.

---

## 20. What Not To Build During Hackathon

Do not build these unless everything above is already stable:

- full Gmail sync
- full WhatsApp integration
- Google Classroom integration
- autonomous calendar editing
- user accounts / auth polish
- complex database migration
- parent/teacher dashboard
- social features
- gamification
- multi-week analytics

The winning demo is not “we integrated everything”. The winning demo is:

```txt
A student dumps chaos.
StudentOS extracts commitments.
It researches broad goals.
It resolves clashes.
It gives the student the next best action.
```

---

## 21. Codex Implementation Instructions

When implementing this file:

1. First inspect existing `src/app`, `src/components`, `src/lib/demo-data.ts`, and `src/lib/demo-state.ts`.
2. Do not delete existing demo data.
3. Add sponsor routes in isolation.
4. Test each route with curl before wiring UI.
5. Add UI integration only after route returns stable JSON.
6. Preserve the current route flow:

```txt
/ → /chaos → /input → /agents → /commitments → /roadmap
```

7. Ensure `pnpm build` passes after each major step.
8. Prefer small commits:

```txt
feat: add sponsor env helpers
feat: add Exa goal research route
feat: add AI Gateway planner route
feat: add S3 upload route
feat: add Textract extraction route
feat: surface sponsor trace in agents screen
feat: merge extracted commitments into review flow
```

---

## 22. Demo-Safe Fallback Data

If real API calls fail, return this fallback trace:

```ts
export const fallbackSponsorTrace = [
  { provider: "aws", action: "Stored source packet in S3", status: "fallback" },
  { provider: "aws", action: "Extracted worksheet text with Textract", status: "fallback" },
  { provider: "exa", action: "Researched broad goal context", status: "fallback" },
  { provider: "vercel", action: "Generated daily plan with AI Gateway", status: "fallback" },
] as const;
```

Fallback commitment:

```ts
export const fallbackExtractedCommitments = [
  {
    id: "fallback-physics",
    type: "task",
    title: "Finish Physics worksheet",
    dueDate: "2026-06-10",
    estimatedMinutes: 45,
    subject: "Physics",
    priority: "high",
    confidence: 0.86,
    needsClarification: false,
    sourceEvidence: "Physics worksheet due tomorrow 8am",
  },
  {
    id: "fallback-coding-goal",
    type: "goal",
    title: "Learn coding by December",
    dueDate: "2026-12-01",
    estimatedMinutes: 300,
    subject: "Personal goal",
    priority: "medium",
    confidence: 0.72,
    needsClarification: true,
    sourceEvidence: "Learn coding by December with weekly commitment",
  },
];
```

---

## 23. Final Acceptance Criteria

The sponsor integration is successful when:

- `pnpm build` passes.
- App still loads from `/` and completes the whole demo flow.
- `/input` can upload a file when AWS env is enabled.
- Textract-extracted text can appear inside a source preview or agent log.
- Exa can produce a research result for at least one broad goal.
- Vercel AI Gateway can stream a planner explanation or daily plan.
- `/agents` visibly shows AWS → Exa → Vercel pipeline activity.
- If all keys are disabled, the demo still works exactly as before.

