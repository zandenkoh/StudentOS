# StudentOS

**StudentOS is an AI chief of staff for ambitious students.**

Students do not organize their lives in perfect todo lists. Their real work arrives through WhatsApp screenshots, PDF worksheets, school portals, voice notes, tuition updates, calendar clashes, class announcements, and vague goals like "learn Python by December" or "win the hackathon."

StudentOS turns that chaos into a plan the student can actually follow.

```txt
Messy sources + vague goals + fixed commitments
  -> extracted tasks, events, deadlines, and goals
  -> clarified uncertainties
  -> researched goal roadmaps
  -> conflict-resolved daily execution plans
  -> live replanning when the day changes
```

The product is built as a mobile-first AI planning system: capture everything, understand what matters, resolve constraints, and guide the student to the next right action.

---

## The Problem

Students are not short on productivity apps. They are short on systems that understand the messy way school life actually reaches them.

A typical student might have:

- A worksheet deadline hidden in a PDF.
- A CCA briefing announced in a chat screenshot.
- Tuition moved at the last minute.
- A voice note from a friend about project work.
- A competition goal with no concrete roadmap.
- Multiple commitments competing for the same evening.

Most tools ask the student to manually convert all of this into clean tasks. StudentOS does that work for them.

> StudentOS starts where students actually are: overloaded, scattered, and trying to make sense of competing priorities.

---

## What StudentOS Does

StudentOS is not a generic todo app. It is an end-to-end planning agent for student life.

It can:

- Capture raw student inputs from text, files, screenshots, PDFs, and voice notes.
- Extract structured commitments from messy sources.
- Identify tasks, deadlines, events, goals, and conflicts.
- Ask clarifying questions instead of guessing when information is incomplete.
- Research broad goals with live external context.
- Build milestone roadmaps for long-term ambitions.
- Detect schedule conflicts between fixed commitments.
- Generate a realistic daily execution plan.
- Replan when the student adds new information or changes a decision.
- Show the AI agent's reasoning and tool usage in a visible activity timeline.

The result is a student planning experience that feels less like maintaining a database and more like having a chief of staff.

---

## Why It Matters

StudentOS is designed around a real behavioral insight: the hardest part of student productivity is not checking boxes. It is translating messy life into trusted action.

The product creates value at the exact moment students usually lose momentum:

- When they do not know what is actually due.
- When their schedule has conflicts.
- When a broad goal feels too large to start.
- When school inputs are scattered across formats.
- When a plan breaks and they need a new one quickly.

That is why the core output is not just a list. It is a source-aware, time-aware, conflict-aware execution plan.

---

## Demo Flow

The app is built as a cinematic mobile-first product demo.

### 1. Landing

Route: `/`

The landing page introduces the promise: turn school chaos into a plan a student can follow. Starting the demo clears previous local state and moves into the chaos sequence.

### 2. Chaos Animation

Route: `/chaos`

StudentOS visualizes the student's overloaded reality: screenshots, worksheets, reminders, CCA plans, voice notes, tuition details, and homework fragments fly into view before collapsing into one organized inbox.

This screen sets up the product story clearly: the app is not starting from clean data.

### 3. Universal Inbox

Route: `/input`

The student can dump everything into one place:

- Typed notes.
- Uploaded files.
- Images.
- PDFs.
- Audio recordings.
- Demo packet sources.
- Natural language goals.

This is the front door of StudentOS: one capture layer for all the scattered commitments students normally keep in their head.

### 4. Agent Timeline

Route: `/agents`

The AI agent processes the student's sources and shows its work through a live activity timeline.

The timeline includes:

- Source reading.
- OCR and document extraction.
- Commitment classification.
- Goal research.
- Clarification generation.
- Conflict checks.
- Plan construction.
- Sponsor technology traces.

This gives judges and users a transparent view into how StudentOS moves from raw inputs to structured output.

### 5. Commitments Workspace

Route: `/commitments`

This is the main cockpit.

StudentOS groups the extracted information into:

- Tasks.
- Events.
- Deadlines.
- Goals.
- Conflicts.

Students can review what the agent found, answer clarifying questions, resolve conflicts, edit tasks, and move toward a finalized daily plan.

### 6. Goal Roadmap

Route: `/roadmap`

Long-term goals become milestone plans. For example, a vague goal like "learn coding by December" becomes a structured roadmap with phases, tasks, and research-backed context.

When live research is enabled, StudentOS uses Exa to ground the roadmap with external sources and citations.

### 7. Goal Command Lab

Route: `/goal`

This experimental route lets a student start directly from a natural language goal. The goal is passed into the inbox and transformed into a roadmap and daily plan.

### 8. End Screen

Route: `/end`

The final screen summarizes the transformation: scattered student chaos became a clear execution system.

---

## Core Product Capabilities

### Universal Capture

StudentOS accepts the formats students actually use:

- Chat-style text.
- Uploaded files.
- Images and screenshots.
- PDF worksheets.
- Browser-recorded voice notes.
- Preloaded demo packets for fast judging.

The interface is intentionally mobile-first because many student commitments are captured on a phone.

### Commitment Extraction

StudentOS converts unstructured material into planning objects:

- "Finish Biology worksheet" becomes a task.
- "CCA briefing at 5 PM" becomes an event.
- "Submit project by Friday" becomes a deadline.
- "Learn Python by December" becomes a goal.
- "Tuition overlaps with briefing" becomes a conflict.

Each commitment can carry metadata such as source, subject, confidence, urgency, and explanation.

### Clarification Instead of Guessing

When information is ambiguous, StudentOS asks useful questions.

Examples:

- Which worksheet questions are assigned?
- Is this meeting confirmed?
- What outcome should this goal target?
- Which deadline matters first?

This is an important product decision. StudentOS is designed to be helpful without pretending uncertainty does not exist.

### Conflict Resolution

StudentOS checks fixed commitments against the timeline and highlights conflicts.

It can reason through situations like:

- A tuition session overlapping with CCA.
- A study block placed during a fixed appointment.
- A vague assignment that cannot be scheduled yet.
- A deadline that requires splitting work into multiple sessions.

The app then recommends practical next steps, such as moving flexible study time, keeping fixed tuition, or requesting briefing notes.

### Daily Plan Generation

The daily plan is time-aware, not just task-aware.

It includes:

- Focus blocks.
- Fixed events.
- Estimated durations.
- Scheduled study sessions.
- Plan sections.
- Source-backed reasons.
- Completion states.
- Edit and reschedule controls.

StudentOS aims to answer: "What should I do next, and when should I do it?"

### Goal Roadmapping

StudentOS can turn large goals into smaller phases.

For a goal like "win the NEXT hackathon," StudentOS can break the path into:

- Research and rules understanding.
- Product concept definition.
- Technical prototype milestones.
- Sponsor-tech integration.
- Demo polish.
- Pitch preparation.

This makes ambitious goals operational rather than inspirational.

### Replanning

Student plans change constantly. StudentOS supports replanning after:

- A new source is added.
- A task is edited.
- A clarification is answered.
- A conflict is manually resolved.
- A commitment changes.

The plan updates around the student's latest reality instead of forcing them to start again.

---

## Sponsor Technology

StudentOS uses sponsor technology in ways that are central to the product experience.

### AWS

AWS powers the messy real-world input layer.

StudentOS uses AWS for:

- S3 upload and storage of student source files.
- Presigned access to uploaded documents.
- Textract OCR for screenshots, worksheets, and PDFs.
- Document analysis for forms and tables.
- Optional Bedrock-powered source interpretation.
- AWS Lambda deployment for the main analysis agent.

Why this matters: AWS helps StudentOS convert real student artifacts into machine-readable planning context.

### Exa

Exa powers goal research.

StudentOS uses Exa to:

- Research broad goals.
- Find external context for competitions, study goals, and application targets.
- Produce grounded roadmap takeaways.
- Attach citations to goal plans.

Why this matters: Exa helps StudentOS avoid generic advice. A broad ambition becomes a researched execution plan.

### Vercel AI Gateway

Vercel AI Gateway powers the AI planning layer.

StudentOS uses it for:

- Structured model calls.
- Streaming planning responses.
- Goal and commitment reasoning.
- Replanning after changes.
- Centralized model access through a clean Gateway interface.

Why this matters: Vercel AI Gateway gives StudentOS an AI-native backend path that fits naturally into the Next.js app.

---

## Architecture

```txt
Student Input
  |
  | text, files, images, PDFs, audio, goals
  v
Universal Inbox
  |
  | source capture and upload
  v
Sponsor Processing Layer
  |
  +-- AWS S3 / Textract       document storage and OCR
  +-- Exa                     live goal research
  +-- Vercel AI Gateway       structured planning and replanning
  +-- AWS Lambda              agent compute deployment path
  |
  v
StudentOS Agent
  |
  +-- extracts commitments
  +-- asks clarifying questions
  +-- detects conflicts
  +-- builds roadmap milestones
  +-- creates daily plan
  +-- records sponsor traces
  |
  v
Student Cockpit
  |
  +-- review commitments
  +-- resolve conflicts
  +-- edit tasks
  +-- follow the day plan
  +-- replan when life changes
```

---

## Technical Stack

- **Next.js 15** with the App Router.
- **React 19** for the interface.
- **TypeScript** across the app and backend routes.
- **Tailwind CSS** for styling.
- **Framer Motion** for cinematic transitions and mobile interactions.
- **Lucide React** for icons.
- **Zod** for structured AI output validation.
- **Vercel AI SDK / AI Gateway** for model calls and planning.
- **AWS SDK for JavaScript v3** for S3, Textract, Bedrock Runtime, and presigned URLs.
- **Exa API** for goal research.
- **Serverless Framework** for AWS Lambda deployment.

---

## Route Map

| Route | Purpose |
| --- | --- |
| `/` | Product landing and demo start. |
| `/chaos` | Cinematic visualization of scattered student inputs. |
| `/input` | Universal inbox for text, files, voice notes, and goals. |
| `/agents` | Live AI agent activity timeline. |
| `/commitments` | Main workspace for review, clarification, conflict resolution, and planning. |
| `/roadmap` | Goal roadmap with milestones and research context. |
| `/goal` | Natural-language goal command lab. |
| `/conflicts` | Conflict-focused route reserved for workflow expansion. |
| `/end` | Final transformation summary and share screen. |

---

## API Surface

### AI

| Endpoint | Purpose |
| --- | --- |
| `POST /api/sponsor/ai/analyse-student-chaos` | Main agent analysis endpoint for turning captured sources into a StudentOS plan. |
| `POST /api/sponsor/ai/plan-day` | Daily planning endpoint. |
| `POST /api/sponsor/ai/replan` | Updates the plan after edits, new sources, clarifications, or conflict decisions. |

### AWS

| Endpoint | Purpose |
| --- | --- |
| `POST /api/sponsor/aws/upload-source` | Uploads a student source file. |
| `POST /api/sponsor/aws/extract-source` | Extracts text from uploaded source material. |
| `POST /api/sponsor/aws/analyse-document` | Runs document analysis for forms and tables. |
| `POST /api/sponsor/aws/import-demo-packet` | Loads the curated StudentOS demo packet. |
| `POST /api/sponsor/aws/process-text-source` | Interprets a manually entered source. |
| `GET /api/sponsor/aws/demo-asset/[filename]` | Serves bundled demo assets. |

### Research and System

| Endpoint | Purpose |
| --- | --- |
| `POST /api/sponsor/exa/research-goal` | Researches a broad goal and returns roadmap context. |
| `GET /api/sponsor/health` | Reports integration readiness for local development and deployment checks. |

---

## Project Structure

```txt
src/app/
  page.tsx                                      Landing page
  chaos/page.tsx                                Chaos animation
  input/page.tsx                                Universal inbox
  agents/page.tsx                               Agent activity timeline
  commitments/page.tsx                          Main planning cockpit
  roadmap/page.tsx                              Goal roadmap
  goal/page.tsx                                 Goal command lab
  end/page.tsx                                  Final summary

src/app/api/sponsor/
  ai/analyse-student-chaos/route.ts             Main analysis route
  ai/plan-day/route.ts                          Daily planning route
  ai/replan/route.ts                            Replanning route
  aws/upload-source/route.ts                    Source upload route
  aws/extract-source/route.ts                   OCR extraction route
  aws/analyse-document/route.ts                 Document analysis route
  aws/import-demo-packet/route.ts               Demo packet route
  aws/process-text-source/route.ts              Text source route
  exa/research-goal/route.ts                    Goal research route
  health/route.ts                               Integration health route

src/components/
  app-shell.tsx                                 Shared mobile app frame
  agent-activity-panel.tsx                      Agent timeline UI
  input-inbox.tsx                               Capture experience
  commitment-card.tsx                           Commitment display
  conflict-summary-card.tsx                     Conflict UI
  clarification-bottom-sheet.tsx                Clarification flow
  manual-conflict-sheet.tsx                     Manual conflict handling
  task-edit-bottom-sheet.tsx                    Task editing flow
  goal-roadmap-card.tsx                         Roadmap card UI
  sponsor-proof-strip.tsx                       Sponsor trace display

src/lib/
  demo-data.ts                                  Curated demo data
  demo-state.ts                                 Browser state helpers
  schedule-conflicts.ts                         Conflict detection
  session-splitting.ts                          Study session splitting
  time-scheduling.ts                            Time parsing and scheduling
  studentos-ai-types.ts                         Shared AI data contracts

src/lib/sponsor-tech/
  env.ts                                        Integration configuration
  studentos-agent.ts                            Core analysis orchestration
  replan-agent.ts                               Replanning orchestration
  vercel-gateway.ts                             Vercel AI Gateway planning
  ai-gateway-model.ts                           Gateway model selection
  exa.ts                                        Exa research pipeline
  aws-s3.ts                                     S3 utilities
  aws-textract.ts                               Textract utilities
  source-interpreter.ts                         Source interpretation
  source-cache.ts                               Source cache manifest
  sponsor-proof.ts                              Sponsor trace helpers

scripts/
  build-aws-agent.mjs                           Lambda bundle builder
  verify-sponsors.mjs                           Integration verification helper
```

---

## Getting Started

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open:

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

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Key variables:

```env
NEXT_PUBLIC_USE_REAL_SPONSOR_TECH=true
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_NAME=StudentOS

USE_REAL_VERCEL_AI=true
AI_GATEWAY_API_KEY=
VERCEL_OIDC_TOKEN=
AI_GATEWAY_AUTH_MODE=api-key
AI_GATEWAY_MODEL=google/gemini-3.5-flash
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
```

Secrets should stay on the server. Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## AWS Lambda Agent

StudentOS includes an AWS Lambda deployment path for the main analysis agent.

Relevant files:

- `serverless.yml`
- `src/aws/analyse-student-chaos-handler.ts`
- `src/aws/server-only-shim.ts`
- `scripts/build-aws-agent.mjs`

Build the Lambda bundle:

```bash
npm run build:aws-agent
```

Deploy:

```bash
npm run deploy:aws-agent
```

Configure the deployed endpoint:

```env
AWS_AGENT_ENDPOINT=https://<api-id>.execute-api.us-west-2.amazonaws.com/analyse-student-chaos
```

---

## Verification Commands

```bash
npm run lint
npm run build
npm run build:aws-agent
npm run verify:sponsors
```

`verify:sponsors` checks the integration wiring for the sponsor-backed system. It is useful before a live demo or deployment.

---

## Suggested Judge Demo Script

1. **Start at `/`**
   - "StudentOS is an AI chief of staff for students. It turns messy school inputs into an execution plan."

2. **Show `/chaos`**
   - Let the chaos animation establish the problem: students do not begin with clean task data.

3. **Open `/input`**
   - Load the demo packet or add a real goal.
   - Explain that StudentOS accepts files, text, images, PDFs, and voice notes.

4. **Run analysis**
   - Move into `/agents`.
   - Point out the live agent timeline and sponsor traces.

5. **Review `/commitments`**
   - Show tasks, events, deadlines, goals, and conflicts.
   - Open a clarification sheet to show responsible AI behavior.

6. **Resolve a conflict**
   - Show that StudentOS detects time conflicts and recommends practical actions.

7. **Show the daily plan**
   - Emphasize that this is time-aware planning, not a generic checklist.

8. **Open `/roadmap`**
   - Show how a broad student goal becomes a milestone roadmap.
   - Point out research context and citations when available.

9. **Trigger replanning**
   - Add or change a commitment and show that StudentOS updates the plan.

10. **Finish on `/end`**
    - Close the story: scattered student chaos became a clear plan.

---

## Engineering Highlights

StudentOS combines product polish with real technical depth:

- Mobile-first Next.js App Router implementation.
- Streaming AI activity timeline.
- Structured AI outputs with Zod validation.
- Multi-route product flow with persistent browser state.
- Source ingestion for text, files, images, PDFs, and audio.
- AWS S3 and Textract integration.
- Exa-powered goal research.
- Vercel AI Gateway planning and replanning.
- AWS Lambda agent deployment path.
- Conflict detection and schedule validation.
- Reusable bottom-sheet interaction system.
- Sponsor trace UI for transparent tool usage.

---

## Product Design Principles

StudentOS is designed to feel calm, focused, and useful under pressure.

Key decisions:

- Mobile-first because student inputs often start on phones.
- One inbox because students should not pre-sort chaos.
- Visible agent activity because trust matters.
- Clarifying questions because ambiguity should be handled explicitly.
- Conflict resolution because real plans must respect time.
- Roadmaps because ambitious goals need concrete milestones.
- Replanning because student life changes constantly.

---

## Future Roadmap

StudentOS can grow naturally into a full student operating system:

- Authenticated student accounts.
- Persistent cloud storage for sources and plans.
- Calendar integration.
- Email and chat imports.
- Larger document processing pipelines.
- Notification and reminder flows.
- Team project planning.
- Parent, tutor, or mentor views.
- School-specific integrations.
- Privacy controls for student data deletion and retention.

---

## Why StudentOS Can Win

StudentOS combines a strong product insight with a complete AI-native workflow.

It is valuable because it handles the real mess before the todo list. It is technically strong because sponsor technology is used for meaningful jobs: AWS for source processing, Exa for research grounding, and Vercel AI Gateway for planning intelligence. It is demoable because the flow is visual, understandable, and end to end.

Most importantly, StudentOS solves a problem every student recognizes immediately:

> "I have too much scattered everywhere. Just tell me what matters and what to do next."

That is the promise of StudentOS.
