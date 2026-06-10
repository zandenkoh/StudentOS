# StudentOS

**StudentOS is an AI chief of staff for students.**

Students do not live inside neat task managers. Their real commitments arrive as WhatsApp screenshots, PDF worksheets, school portals, voice notes, tuition changes, calendar clashes, half-remembered deadlines, and vague goals like "learn Python by December" or "win the hackathon." StudentOS turns that mess into a plan a student can actually follow.

```txt
Messy sources + vague goals + fixed constraints
  -> extracted commitments
  -> clarified uncertainties
  -> researched goal roadmap
  -> conflict-resolved daily plan
  -> live replanning when the day changes
```

This repository contains a polished mobile-first Next.js demo, a sponsor-tech backend layer, an AWS Lambda agent deployment path, and a resilient fallback system so the product can be judged reliably even when external services are unavailable.

---

## Why StudentOS Exists

Most student productivity tools assume the student already knows what needs to be done. That is the wrong starting point.

The hard part is usually upstream:

- The homework is buried inside a class chat.
- The deadline is on a PDF cover page.
- The group project meeting conflicts with tuition.
- The long-term goal is motivational but not operational.
- The student has ten inputs but no trusted next action.

StudentOS is designed around that reality. It is not another todo list. It is a planning agent that starts with raw student chaos and produces an execution plan with traceable reasoning.

For hackathon judges, the important distinction is this:

> StudentOS does not simply generate tasks. It models the student planning workflow end to end: capture, extraction, research, clarification, conflict detection, scheduling, and replanning.

---

## Core Demo Story

The demo is built as a cinematic product flow:

1. A student starts from a state of overload.
2. They dump every source into one universal inbox.
3. StudentOS extracts commitments from files, text, images, and voice notes.
4. The agent shows its work through a live activity timeline.
5. The student reviews commitments, answers clarifying questions, and resolves conflicts.
6. StudentOS produces a realistic day plan.
7. Broad goals become milestone roadmaps with researched context.
8. If something changes, StudentOS replans without forcing the student to rebuild everything manually.

The demo intentionally feels like a real product, not a thin API showcase. Sponsor technology is visible through proof strips, trace badges, health checks, response headers, and verification scripts.

---

## Features

### Universal Student Inbox

Route: `/input`

Students can add messy source material in several ways:

- Type or paste a raw note.
- Upload files through the AWS-backed upload path.
- Attach images, PDFs, text files, or audio.
- Record a voice note in the browser.
- Load a realistic demo packet that simulates importing school materials.
- Preview uploaded or generated sources before analysis.

The input screen stores captured source context in local browser state and passes it into the agent flow.

### Source Extraction

StudentOS can process source material through:

- AWS S3 upload and presigned retrieval.
- AWS Textract OCR for images, worksheets, and PDFs.
- AWS Bedrock or Vercel AI Gateway-assisted source interpretation when enabled.
- Local fallback extraction when live sponsor services are disabled or unavailable.

The app keeps the demo stable by treating sponsor integrations as progressive enhancements. If an upload or OCR call fails, the student still gets a useful planning experience.

### Agent Activity Timeline

Route: `/agents`

This screen makes the invisible planning process visible. It streams and animates agent events such as:

- Source reading.
- Commitment extraction.
- Goal research.
- Clarification generation.
- Conflict detection.
- Scheduling decisions.
- Sponsor-tech tool usage.

The page calls `/api/sponsor/ai/analyse-student-chaos` and supports newline-delimited streaming responses for a live cockpit feel. It also records sponsor traces so judges can see which services were involved.

### Commitment Review

Route: `/commitments`

The commitment workspace is the heart of the product. It groups extracted work into:

- Tasks.
- Events.
- Deadlines.
- Goals.
- Conflicts.

Each commitment carries useful metadata such as source, confidence, subject, urgency, and explanation. The UI is built for review, not blind automation: students can inspect, clarify, edit, and proceed.

### Clarification Questions

StudentOS recognizes when a source is not specific enough to schedule responsibly. Instead of hallucinating certainty, it asks focused questions.

Examples:

- Which worksheet questions are actually assigned?
- Is this event confirmed or tentative?
- What outcome should this broad goal target?
- Which deadline matters most?

The clarification flow is implemented with reusable bottom-sheet components and feeds the answers back into replanning.

### Conflict Detection and Resolution

StudentOS validates the timeline for overlapping fixed events and scheduling conflicts.

The demo includes conflict logic for cases like:

- Tuition overlapping with a CCA briefing.
- Fixed events blocking study sessions.
- Ambiguous commitments that cannot be safely scheduled yet.

Resolution options include:

- Keep a fixed event.
- Move flexible work.
- Request notes for a missed briefing.
- Record a manual conflict instruction.
- Replan after a new source or decision is added.

The relevant scheduling logic lives in `src/lib/schedule-conflicts.ts`, `src/lib/time-scheduling.ts`, and `src/lib/session-splitting.ts`.

### Daily Execution Plan

The final plan is not a motivational checklist. It is a time-aware plan with:

- Fixed events.
- Focus blocks.
- Estimated durations.
- Source-backed reasoning.
- Completion states.
- Rescheduling and task edit flows.
- Conflict-aware placement.

StudentOS aims to answer the practical student question: "What should I do next, and when?"

### Goal Roadmaps

Routes: `/roadmap` and `/goal`

Broad goals are turned into milestone plans. StudentOS can use Exa research to ground goals in external context, then translate that context into monthly or phased roadmap steps.

Examples:

- "Learn coding by December."
- "Win the NEXT hackathon."
- "Build a portfolio project before applications close."

The roadmap view shows milestone phases, scheduled subtasks, research takeaways, and citations when live research is available.

### Replanning

Route: `/api/sponsor/ai/replan`

StudentOS supports the reality that plans change. Replanning can be triggered after:

- A student answers a clarification question.
- A new source is added.
- A task is edited.
- A conflict is manually resolved.
- A commitment is created, updated, or removed.

The replan agent attempts a Vercel AI Gateway call when configured and falls back to deterministic grounded planning logic when needed.

### End and Share Screen

Route: `/end`

The end screen summarizes the transformation from chaos to plan and includes a share link / QR-oriented demo finish. This helps turn the product flow into a complete judgeable story.

---

## Judge-Facing Highlights

StudentOS was built to be evaluated as a product and as an engineering system.

### 1. Clear User Pain

The product targets a real student workflow: fragmented academic and extracurricular commitments. It does not depend on users manually cleaning their lives before the software becomes useful.

### 2. Full Workflow, Not a Single Prompt

The app covers the full planning lifecycle:

- Capture raw sources.
- Extract structured commitments.
- Ask clarifying questions.
- Research broad goals.
- Detect conflicts.
- Generate a day plan.
- Replan when inputs change.

### 3. Responsible AI Behavior

StudentOS avoids pretending to know what it cannot know. Ambiguity becomes a clarification question. Weak OCR becomes a fallback interpretation. Conflicts become explicit decisions. Generated outputs are coerced through schemas and grounded against source text where possible.

### 4. Sponsor Technology Is Product-Native

AWS, Exa, and Vercel AI are not pasted on as logos. Each one has a specific job:

- **AWS** handles the messy source layer: uploaded files, storage, OCR, optional Bedrock interpretation, and Lambda agent compute.
- **Exa** grounds broad goals with live external context and citations.
- **Vercel AI Gateway** powers model calls, streaming planning, fallback model routing, and AI-native deployment ergonomics.

### 5. Demo Reliability

Hackathon demos are fragile. StudentOS is intentionally built with progressive enhancement:

- Works with local fallback data.
- Uses feature flags for live integrations.
- Includes strict judge mode.
- Exposes health checks.
- Provides a sponsor verification script.
- Fails closed in strict mode instead of silently pretending sponsor calls worked.

### 6. Real Engineering Surface Area

This project includes:

- Next.js App Router pages and route handlers.
- TypeScript schemas and coercion.
- Streaming API responses.
- AWS Lambda packaging with Serverless.
- Sponsor health checks.
- OCR and file upload paths.
- Goal research pipeline.
- Conflict validation utilities.
- Replanning agent.
- Mobile-first interaction design.

---

## Tech Stack

- **Framework:** Next.js 15 App Router.
- **UI:** React 19 with TypeScript.
- **Styling:** Tailwind CSS with custom global styles.
- **Animation:** Framer Motion.
- **Icons:** Lucide React.
- **Validation:** Zod.
- **AI SDK:** Vercel AI SDK and AI Gateway packages.
- **Search:** Exa API integration.
- **AWS:** S3, Textract, optional Bedrock Runtime, optional Lambda.
- **Deployment Support:** Vercel frontend and Serverless Framework for AWS agent deployment.

---

## Application Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page and product setup. Clears old demo state and starts the cinematic flow. |
| `/chaos` | Animated representation of student overload before routing into the inbox. |
| `/input` | Universal source capture: text, files, voice notes, and demo packet import. |
| `/agents` | Live agent processing timeline with sponsor traces and analysis streaming. |
| `/commitments` | Main review workspace for commitments, clarifications, conflicts, and daily planning. |
| `/roadmap` | Goal roadmap detail view with milestones and research citations. |
| `/goal` | Focused natural-language goal command experiment. |
| `/conflicts` | Reserved route for conflict-specific flow work. |
| `/end` | Final summary and share screen. |

---

## API Routes

### AI Routes

| Route | Purpose |
| --- | --- |
| `POST /api/sponsor/ai/analyse-student-chaos` | Main analysis endpoint. Streams or returns a full StudentOS agent footprint. Can delegate to AWS Lambda when configured. |
| `POST /api/sponsor/ai/plan-day` | Generates or falls back to a daily plan through Vercel AI Gateway planning logic. |
| `POST /api/sponsor/ai/replan` | Applies CRUD operations, clarification answers, manual conflict instructions, or new source context and returns an updated plan. |

### AWS Routes

| Route | Purpose |
| --- | --- |
| `POST /api/sponsor/aws/upload-source` | Uploads a file to S3 when AWS is enabled; otherwise returns a fallback-safe response. |
| `POST /api/sponsor/aws/extract-source` | Extracts text from an uploaded source using Textract or fallback logic. |
| `POST /api/sponsor/aws/analyse-document` | Uses Textract document analysis for richer forms/tables extraction. |
| `POST /api/sponsor/aws/import-demo-packet` | Imports a realistic cached demo packet for stable judging. |
| `POST /api/sponsor/aws/process-text-source` | Interprets manually entered text into structured source context. |
| `GET /api/sponsor/aws/demo-asset/[filename]` | Serves bundled demo assets safely. |

### Exa and Health Routes

| Route | Purpose |
| --- | --- |
| `POST /api/sponsor/exa/research-goal` | Researches a broad goal and returns summaries, milestones, and citations. |
| `GET /api/sponsor/health` | Reports sponsor readiness and optional live checks. Supports judge/strict verification modes. |

---

## Sponsor-Tech Architecture

```txt
Browser UI
  |
  | captures text, file, audio, goal, clarification, edits
  v
Next.js App Router
  |
  +-- /api/sponsor/aws/*       -> S3, Textract, demo source cache
  +-- /api/sponsor/exa/*       -> Exa goal research
  +-- /api/sponsor/ai/*        -> Vercel AI Gateway, local agent, AWS Lambda agent
  +-- /api/sponsor/health      -> sponsor readiness and judge checks
  |
  v
StudentOS Agent Footprint
  |
  +-- commitments
  +-- timeline events
  +-- plan tasks
  +-- clarification questions
  +-- conflict recommendation
  +-- goal roadmap
  +-- sponsor trace
  +-- agent logs
```

### Progressive Enhancement

The application is designed to run in two modes:

1. **Demo-safe fallback mode**
   - No external credentials required.
   - Uses bundled data, deterministic fallbacks, and local state.
   - Best for quick review, UI testing, and offline demos.

2. **Live sponsor mode**
   - Enables AWS, Exa, Vercel AI Gateway, AWS Lambda, and/or Bedrock selectively.
   - Shows sponsor traces in the UI.
   - Can be verified through health checks and scripts.

This matters because a judge can still experience the entire product even if one external sponsor service has temporary issues.

---

## Important Source Files

```txt
src/app/
  page.tsx                                      Landing page
  chaos/page.tsx                                Cinematic chaos animation
  input/page.tsx                                Universal inbox and source capture
  agents/page.tsx                               Agent timeline and streaming analysis UI
  commitments/page.tsx                          Review, clarify, resolve, plan, replan
  roadmap/page.tsx                              Goal roadmap and citations
  goal/page.tsx                                 Goal command lab
  end/page.tsx                                  Summary/share finish

src/app/api/sponsor/
  health/route.ts                               Sponsor health endpoint
  ai/analyse-student-chaos/route.ts             Main agent endpoint and AWS Lambda delegation
  ai/plan-day/route.ts                          Daily planning endpoint
  ai/replan/route.ts                            Replanning endpoint
  aws/upload-source/route.ts                    S3 upload handler
  aws/extract-source/route.ts                   Textract extraction handler
  aws/analyse-document/route.ts                 Textract forms/tables handler
  aws/import-demo-packet/route.ts               Demo packet importer
  aws/process-text-source/route.ts              Text source interpreter
  exa/research-goal/route.ts                    Goal research endpoint

src/lib/
  demo-data.ts                                  Fallback commitments, plans, and roadmap data
  demo-state.ts                                 Local demo state helpers
  schedule-conflicts.ts                         Conflict detection
  session-splitting.ts                          Study block splitting helpers
  time-scheduling.ts                            Time parsing and scheduling helpers
  studentos-ai-types.ts                         Shared AI-facing types

src/lib/sponsor-tech/
  env.ts                                        Feature flags and readiness checks
  studentos-agent.ts                            Core analysis orchestration and schema coercion
  replan-agent.ts                               Replanning logic
  vercel-gateway.ts                             Vercel AI Gateway planning helpers
  ai-gateway-model.ts                           Gateway model client selection
  exa.ts                                        Exa research and query generation
  aws-s3.ts                                     S3 upload/read/presign utilities
  aws-textract.ts                               Textract OCR/document analysis utilities
  source-interpreter.ts                         Source interpretation and fallback extraction
  source-cache.ts                               Cached source manifest support
  sponsor-proof.ts                              Sponsor trace helpers
```

---

## Getting Started

### Prerequisites

- Node.js 18+ recommended.
- npm.
- Optional: AWS, Exa, and Vercel credentials for live sponsor mode.

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open the local URL printed by Next.js, usually:

```txt
http://localhost:3000
```

### Build

```bash
npm run build
```

### Start Production Build

```bash
npm run start
```

### Lint

```bash
npm run lint
```

---

## Environment Configuration

Copy `.env.example` to `.env.local` and fill only the services you want to enable.

```bash
cp .env.example .env.local
```

### Demo-Safe Defaults

For a stable local demo without external credentials:

```env
NEXT_PUBLIC_USE_REAL_SPONSOR_TECH=false
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_NAME=StudentOS

USE_REAL_AWS=false
USE_REAL_EXA=false
USE_REAL_VERCEL_AI=false
USE_REAL_BEDROCK=false

ALLOW_LOCAL_AGENT_FALLBACK=true
STUDENTOS_STRICT_JUDGE=false
```

### Live Sponsor Mode

Enable only the integrations you can verify reliably:

```env
NEXT_PUBLIC_USE_REAL_SPONSOR_TECH=true
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_NAME=StudentOS

USE_REAL_VERCEL_AI=true
AI_GATEWAY_API_KEY=
VERCEL_OIDC_TOKEN=
AI_GATEWAY_AUTH_MODE=api-key
AI_GATEWAY_MODEL=google/gemini-3.5-flash
AI_GATEWAY_FALLBACK_MODEL=
AI_GATEWAY_RESEARCH_MODEL=anthropic/claude-sonnet-4.6
AI_GATEWAY_MULTIMODAL_MODEL=google/gemini-3.5-flash
VERCEL_TOKEN=

USE_REAL_EXA=true
EXA_API_KEY=

USE_REAL_AWS=true
AWS_REGION=us-west-2
AWS_DEFAULT_REGION=us-west-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_S3_BUCKET=
AWS_TEXTRACT_REGION=us-west-2

USE_REAL_BEDROCK=false
AWS_BEDROCK_REGION=us-west-2
AWS_BEDROCK_MODEL_ID=

AWS_AGENT_ENDPOINT=
AWS_AGENT_FUNCTION_NAME=
ALLOW_LOCAL_AGENT_FALLBACK=true
STUDENTOS_STRICT_JUDGE=false
```

### Strict Judge Mode

Strict judge mode is intended for verification. It prevents the app from silently passing if critical sponsor services are expected but unavailable.

```env
STUDENTOS_STRICT_JUDGE=true
ALLOW_LOCAL_AGENT_FALLBACK=false
```

You can also trigger judge behavior on supported routes with `?judge=1` or the `x-studentos-strict-judge: true` header.

---

## Sponsor Verification

Run:

```bash
npm run verify:sponsors
```

For stricter checks:

```bash
npm run verify:sponsors -- --strict
```

Recommended full verification sequence:

```bash
npm run verify:sponsors
npm run lint
npm run build
npm run build:aws-agent
```

The verification script performs static checks every time. When live environment variables are present, it also checks sponsor readiness for the configured services.

The health endpoint can be checked locally:

```bash
curl "http://localhost:3000/api/sponsor/health?live=1"
```

Useful response headers from the main analysis route include:

```txt
X-StudentOS-Agent-Compute: local
X-StudentOS-Agent-Compute: local-agent
X-StudentOS-Agent-Compute: aws-lambda
X-StudentOS-Agent-Compute: aws-lambda-error
X-StudentOS-Agent-Compute: strict-judge-failed
```

These headers make it clear whether the agent ran locally, through Lambda, or failed strict sponsor verification.

More detail is available in `SPONSOR-VERIFICATION.md`.

---

## AWS Lambda Agent

StudentOS can run the main analysis agent through AWS Lambda.

Relevant files:

- `serverless.yml`
- `src/aws/analyse-student-chaos-handler.ts`
- `src/aws/server-only-shim.ts`
- `scripts/build-aws-agent.mjs`
- `src/app/api/sponsor/ai/analyse-student-chaos/route.ts`

Build the Lambda bundle:

```bash
npm run build:aws-agent
```

Deploy with Serverless:

```bash
npm run deploy:aws-agent
```

Then configure:

```env
AWS_AGENT_ENDPOINT=https://<api-id>.execute-api.us-west-2.amazonaws.com/analyse-student-chaos
ALLOW_LOCAL_AGENT_FALLBACK=false
```

To verify the Lambda path:

1. Run the demo.
2. Submit sources from `/input`.
3. Watch `/agents`.
4. Check the response header from `/api/sponsor/ai/analyse-student-chaos`.
5. Confirm `X-StudentOS-Agent-Compute: aws-lambda`.
6. Check AWS CloudWatch logs for the Lambda function.

---

## Demo Script for Judges

Use this flow for a clear three-to-five-minute demo:

1. **Start at `/`**
   - "StudentOS is an AI chief of staff for students. It starts where students actually are: scattered inputs."

2. **Run the chaos animation**
   - Show the cognitive overload and transition into one inbox.

3. **Open `/input`**
   - Load the demo packet or add a custom student goal.
   - Mention that real files can route through S3 and Textract when enabled.

4. **Analyse sources**
   - Move to `/agents`.
   - Point out live agent logs and sponsor traces.
   - If live mode is enabled, mention the exact services being used.

5. **Review `/commitments`**
   - Show extracted tasks, events, deadlines, and goals.
   - Open a clarification sheet.
   - Show the conflict recommendation.

6. **Show the daily plan**
   - Emphasize that the output is time-aware, not just a generated checklist.

7. **Open `/roadmap`**
   - Show how broad goals become researched milestone plans.
   - Point out citations when Exa research is enabled.

8. **Trigger replanning**
   - Add or edit a source, answer a clarification, or resolve a conflict.
   - Explain that StudentOS updates the plan instead of making the student restart.

9. **Finish on `/end`**
   - Summarize the transformation: messy school life became a clear execution plan.

---

## Data and State Model

The demo uses browser local storage to preserve the flow between screens. Important state includes:

- Captured sources from `/input`.
- Sponsor traces from uploads, OCR, Exa, Gateway, and Lambda.
- The active StudentOS agent footprint.
- Commitment overrides.
- Plan task overrides.
- Completed task IDs.
- Clarification answers.
- End-screen summary.

This lets the demo feel continuous across route transitions while keeping the implementation lightweight enough for hackathon iteration.

---

## Reliability and Fallback Strategy

StudentOS uses fallbacks deliberately, not as an afterthought.

| Failure Case | Product Behavior |
| --- | --- |
| S3 upload unavailable | Keep local source metadata and continue with fallback data. |
| Textract unavailable | Use fallback text interpretation and flag the trace. |
| Exa unavailable | Use the fallback roadmap and mark research as fallback. |
| Vercel AI Gateway unavailable | Use deterministic source-driven planning fallback. |
| AWS Lambda unavailable | Use local agent fallback unless strict judge mode disables it. |
| Invalid AI output | Coerce through schemas and repair with safe defaults. |

The goal is to preserve the student workflow while still being honest about which services ran live.

---

## Available Scripts

```bash
npm run dev
```

Starts the Next.js development server.

```bash
npm run build
```

Builds the production Next.js app.

```bash
npm run start
```

Starts the production server after a successful build.

```bash
npm run lint
```

Runs ESLint across the project.

```bash
npm run verify:sponsors
```

Runs sponsor integration verification checks.

```bash
npm run build:aws-agent
```

Bundles the AWS Lambda agent.

```bash
npm run deploy:aws-agent
```

Builds and deploys the AWS Lambda agent through Serverless.

---

## Design Principles

StudentOS is intentionally mobile-first because most student chaos is captured on a phone.

Key design choices:

- Cinematic route transitions to make the transformation memorable.
- Bottom sheets for mobile-native review and clarification.
- Dense but readable cards for commitments and schedules.
- Visible agent activity to build trust.
- Sponsor proof integrated into the workflow instead of hidden in logs.
- Soft fallback states so the demo does not collapse under network or API issues.

The design goal is not just to look polished. It is to make a complex AI planning workflow understandable to a student in the moment they are overwhelmed.

---

## Security and Environment Notes

- Do not expose secret keys to client components.
- Only `NEXT_PUBLIC_*` variables are safe in browser code.
- AWS, Exa, Vercel, and Bedrock calls should stay inside server routes or server-only utilities.
- Uploaded source handling should be treated as sensitive student data in any production version.
- The current app is a hackathon/demo implementation and should receive authentication, database persistence, access controls, retention policies, and audit logging before real student deployment.

---

## What Makes This More Than a Demo

StudentOS already has the architecture of a real product:

- A source ingestion layer.
- A structured agent output contract.
- A planning and replanning loop.
- Sponsor service abstraction.
- Health and verification tooling.
- A route-by-route user journey.
- A fallback strategy that keeps the app usable.

The next production steps would be:

- Add authenticated student accounts.
- Persist sources, plans, and clarification history in a database.
- Add calendar integrations.
- Support email and chat imports.
- Add background processing for larger files.
- Expand async Textract support for multipage PDFs.
- Add notification and reminder flows.
- Add privacy controls for deleting uploaded student data.

---

## Project Positioning

StudentOS is built around a simple belief:

> The best student productivity tool is not the one with the most checkboxes. It is the one that can look at the student's actual mess and calmly turn it into the next right action.

That is what this project demonstrates.

It captures real-world student inputs, uses sponsor technology where it genuinely helps, exposes its reasoning, handles ambiguity responsibly, and produces a plan that respects time, constraints, and goals.

For judges, StudentOS is meant to show both product imagination and engineering discipline: a useful AI-native workflow, a polished interaction model, and a backend designed to prove what ran live without making the demo brittle.
