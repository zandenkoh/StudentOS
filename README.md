# StudentOS Demo

StudentOS is a mobile-first, cinematic Next.js demo application designed as an **AI Chief of Staff for ambitious students**. It addresses the common student problem: scattered commitments across calendar invites, WhatsApp chat screenshots, PDFs, syllabus worksheets, voice notes, and vague long-term goals. 

Instead of acting as a generic todo list application, StudentOS performs a transformation:
```txt
Messy Inputs + Vague Goals + Fixed Constraints
 ↳ Extracted Commitments
 ↳ Grounded Goal Roadmaps
 ↳ Conflict-Resolved Daily Execution Plans
 ↳ Flexible Replanning when life changes
```

The application is built using a **progressive enhancement** design philosophy. By default, it runs on pre-configured, realistic local mock data. When API credentials and feature flags are enabled, the app seamlessly routes live uploads, OCR requests, goal research, and daily planning through real **AWS**, **Exa**, and **Vercel AI** backend integrations, falling back gracefully to mock results if any API call fails.

---

## 📱 User Flow & Routes

The application features a cinematic, mobile-first viewport design. The core demo flow transitions users sequentially through the following routes:

### 1. Landing Page (`/`)
* **Purpose:** The entry point for the demo. Shows the core value proposition: *"Turn school chaos into a plan you can actually follow."*
* **Key Interactions:** 
  * Clears any existing browser local storage demo states.
  * Features a clean, high-premium brand badge.
  * Clicking **"Start Demo"** triggers a custom opacity fade-out transition, routing the user directly into the chaos scene.

### 2. Chaos Animation (`/chaos`)
* **Purpose:** A cinematic visual representation of a student's daily cognitive overload.
* **Key Interactions:**
  * **Populating Stage:** 18 distinct cards representing screenshots, PDFs, CCA meetings, voice notes, email threads, and tuition details rapidly populate the viewport, randomized in position and rotation.
  * **Clumping Stage:** The cards dynamically slide and shrink into the center of the screen, representing the consolidation of scattered data.
  * **Reveal Stage:** A clean, minimal three-task plan emerges under the title *"One inbox for your school mess,"* before performing a scanning-beam transition to the universal inbox.

### 3. Universal Inbox Capture (`/input`)
* **Purpose:** The universal capture interface where students dump their disorganized inputs.
* **Key Interactions:**
  * **ChatGPT-Style input:** A responsive text input area supporting auto-growing height.
  * **File Uploads:** A file attachment trigger that connects to an AWS S3 file upload. Supports image files, PDFs, text, and audio.
  * **Voice Note Recording:** Built-in microphone recording utility allowing students to record and queue audio notes.
  * **Demo Packet Loader:** A **"Load demo packet"** button that fetches pre-loaded data packets from the backend, simulating a student importing a preset folder of files (e.g., WhatsApp chats, homework sheets, and audio notes).
  * **Analyse Trigger:** Submits the captured sources to the agent timeline.

### 4. Agent Processing Timeline (`/agents`)
* **Purpose:** A live-tracking cockpit showing the AI agent's reasoning process and tool invocations.
* **Key Interactions:**
  * Renders a vertical timeline of activities (thoughts, tool runs, decisions).
  * Surfaces specific sponsor trace badges (e.g., `AWS S3 upload`, `AWS Textract OCR`, `Exa search queries`, `Vercel AI Gateway call`).
  * Features smooth animated progress bars, live-scrolling logs, and automatic redirection to the commitments cockpit upon completion.

### 5. Commitments Workspace (`/commitments`)
* **Purpose:** The main interface where the generated agenda is reviewed, clarified, and finalized.
* **Key Subcomponents:**
  * **Review Commitments:** Groups extracted items into **Tasks**, **Events**, **Deadlines**, and **Goals** with AI confidence ratings and subject badges.
  * **Clarify Uncertainties:** Generates interactive multiple-choice questions for broad goals or tentative plans (e.g., selecting a target outcome or verifying if a meeting is confirmed) to resolve scheduling gaps.
  * **Resolve Conflicts:** Detects overlapping fixed appointments (e.g., `CCA Briefing` overlapping with `Tuition`). Suggests automated resolutions (e.g., request CCA briefing notes, move flexible revision, keep tuition fixed) or custom manual actions (e.g., reschedule tuition, record a homework extension).
  * **Streamed Daily Plan:** Displays the daily hourly calendar. Streams the final optimized execution plan in real-time, featuring green-flash transitions when items are marked complete.

### 6. Goal Roadmap (`/roadmap`)
* **Purpose:** A dedicated roadmap viewer that breaks down vague long-term goals (e.g., *"Learn Python coding by December"*) into specific monthly milestone phases.
* **Key Interactions:**
  * Displays a vertical timeline of milestone steps (e.g., defining outcomes, syntax sprints, mini-projects).
  * Lists scheduled subtasks for each phase, enriched with web research summaries and cited reference URLs.

### 7. Goal Command Lab (`/goal`)
* **Purpose:** An alternative experiment page focusing entirely on natural language goal-command ingestion.
* **Key Interactions:**
  * Simple, focused input bar allowing students to describe a target goal (e.g., *"Win the NEXT hackathon"*).
  * Directly generates the associated milestone timeline and actionable schedule cards.

---

## 🛠️ Technology Stack

StudentOS is engineered using modern, performant web standards:

1. **Framework:** Next.js 15 (App Router) & React 19, written in TypeScript.
2. **Styling:** Vanilla Tailwind CSS with custom HSL variables, configured in [tailwind.config.ts](file:///Users/zandenkoh/Downloads/StudentOS_Final/tailwind.config.ts) to support a premium aesthetic:
   * Sleek dark/light backgrounds (`#FAF9F6` and white card layers).
   * Glassmorphism and backdrop blur overlays.
   * Premium typography utilizing the **Outfit** and **Inter** font systems.
3. **Animations:** Framer Motion for premium UI transitions, including spring-based card layouts, staggered lists, slide-up bottom sheets, scanning beams, and progress indicators.
4. **Validation:** Zod schemas for strict contract validation between the Next.js API route handlers and the frontend components.

---

## 🔌 Sponsor-Tech Integrations

StudentOS integrates three primary sponsor technologies behind environment flags:

### 1. Vercel AI SDK & AI Gateway
* **Base URL:** `https://ai-gateway.vercel.sh/v1`
* **Purpose:** Model management, text generation, and stream handling.
* **Endpoints Used:**
  * `/api/sponsor/ai/analyse-student-chaos` - Streams agent timeline events and compiles the final structured planning payload using Zod schema coercion.
  * `/api/sponsor/ai/plan-day` - Handles streaming text responses for real-time plan builds.
* **Observability:** Centralized AI Gateway endpoint logging for model performance and costs.

### 2. Exa Search API
* **Base URL:** `https://api.exa.ai/search` and `https://api.exa.ai/answer`
* **Purpose:** Grounding broad goals with live external context.
* **Usage:** When a broad student goal (such as *"win NEXT hackathon using Vercel, AWS and Exa"*) is detected:
  * Exa executes target searches to extract judging criteria, event schedules, page summaries, and milestones.
  * The results are returned as structured milestones with cited URLs, avoiding generic AI advice.

### 3. AWS S3 & Textract
* **SDK Used:** AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`, `@aws-sdk/client-textract`)
* **Purpose:** Storing raw student files and executing OCR.
* **Usage:**
  * **AWS S3:** Uploads screenshots, images, PDFs, and audio recordings under `studentos-demo/` with presigned read URLs.
  * **AWS Textract:** Invokes `DetectDocumentTextCommand` (simple line-by-line OCR) or `AnalyzeDocumentCommand` (forms/tables extraction) on student worksheets, class notes, and calendar images to extract machine-readable text for AI classification.

---

## 📁 Directory Structure

```txt
StudentOS_Final/
├── src/
│   ├── app/                                 # Next.js App Router pages & API routes
│   │   ├── agents/
│   │   │   └── page.tsx                     # Agent simulated timeline
│   │   ├── api/
│   │   │   └── sponsor/                     # API routes for sponsor-tech integrations
│   │   │       ├── ai/
│   │   │       │   ├── analyse-student-chaos/  # Multi-stage agent planning endpoint
│   │   │       │   └── plan-day/               # Real-time daily plan streaming
│   │   │       ├── aws/
│   │   │       │   ├── analyse-document/       # Textract forms/tables OCR
│   │   │       │   ├── extract-source/         # General document text extraction
│   │   │       │   ├── import-demo-packet/     # Pre-configured demo data importer
│   │   │       │   └── upload-source/          # AWS S3 file upload handler
│   │   │       └── exa/
│   │   │           └── research-goal/          # Exa web search and context resolver
│   │   ├── chaos/
│   │   │   └── page.tsx                     # Scattered file animation
│   │   ├── commitments/
│   │   │   └── page.tsx                     # Review, conflict-solving, and day planner
│   │   ├── goal/
│   │   │   └── page.tsx                     # Natural language goal command lab
│   │   ├── roadmap/
│   │   │   └── page.tsx                     # Step-by-step goal roadmap details
│   │   ├── globals.css                      # Core layout classes & Tailwind directives
│   │   ├── layout.tsx                       # Main layout wrapper
│   │   └── page.tsx                         # Landing entry page
│   │
│   ├── components/                          # Reusable UI React components
│   │   ├── agent-activity-panel.tsx         # Activity tracker UI
│   │   ├── app-shell.tsx                    # Shared page shell, header, and timeline steps
│   │   ├── badges.tsx                       # Subject badges, priorities, and metadata chips
│   │   ├── bottom-sheet.tsx                 # Base sliding bottom panel
│   │   ├── clarification-bottom-sheet.tsx   # Multiple-choice goal details popup
│   │   ├── commitment-card.tsx              # Card display for tasks/events/goals
│   │   ├── conflict-summary-card.tsx        # Tuition vs CCA overlay alerts
│   │   ├── export-success-sheet.tsx         # Success confirmation sheet
│   │   ├── plan-section.tsx                 # Plan headers, tasks lists, and section tags
│   │   └── task-edit-bottom-sheet.tsx       # Timeline rescheduling, details, and overrides
│   │
│   └── lib/                                 # Shared utilities and core helper logic
│       ├── sponsor-tech/                    # Sponsor integrations layer
│       │   ├── aws-s3.ts                    # S3 bucket reading, writing, and presigning
│       │   ├── aws-textract.ts              # Textract document OCR commands
│       │   ├── env.ts                       # Environment variable helpers & feature flags
│       │   ├── exa.ts                       # Exa search querying & prompt templates
│       │   ├── source-cache.ts              # Local cache structure for offline demo stability
│       │   ├── source-interpreter.ts        # AI fallback extractor for raw texts
│       │   ├── studentos-agent.ts           # Core Multi-Stage Agent Orchestrator
│       │   └── vercel-gateway.ts            # Vercel AI Gateway client creator
│       ├── demo-data.ts                     # Full fallback mock datasets
│       ├── demo-state.ts                    # Local storage state management
│       ├── schedule-conflicts.ts            # Timeline conflict detection algorithms
│       ├── session-splitting.ts             # Time-block splitting logic (< 60m blocks)
│       └── utils.ts                         # Class merging and CN Tailwind utilities
```

---

## ⚙️ Environment Configuration

To configure the live backend integrations, create or update `.env.local` in the project root:

```env
# ==========================================
# Feature Flags (progressive enhancement)
# ==========================================
NEXT_PUBLIC_USE_REAL_SPONSOR_TECH=false
USE_REAL_AWS=false
USE_REAL_EXA=false
USE_REAL_VERCEL_AI=false
USE_REAL_BEDROCK=false

# ==========================================
# Vercel AI Gateway Configuration
# ==========================================
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
VERCEL_OIDC_TOKEN=your_vercel_oidc_token
AI_GATEWAY_MODEL=openai/gpt-5.4
AI_GATEWAY_FALLBACK_MODEL=anthropic/claude-sonnet-4.6
AI_GATEWAY_RESEARCH_MODEL=anthropic/claude-sonnet-4.6

# AWS Lambda agent and judge mode
AWS_AGENT_ENDPOINT=https://<api-id>.execute-api.us-west-2.amazonaws.com/analyse-student-chaos
ALLOW_LOCAL_AGENT_FALLBACK=true
STUDENTOS_STRICT_JUDGE=false

# ==========================================
# Exa Search Configuration
# ==========================================
EXA_API_KEY=your_exa_api_key

# ==========================================
# AWS Credentials & S3 Bucket Configuration
# ==========================================
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=your_s3_bucket_name
AWS_TEXTRACT_REGION=us-west-2

# ==========================================
# AWS Bedrock Configuration (Optional)
# ==========================================
AWS_BEDROCK_REGION=us-west-2
AWS_BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0
```

---

## 🚀 Local Development & Build Verification

Install the dependencies and start the development server:

```bash
# Install dependencies
npm install

# Start local Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To verify the codebase linting rules and run the production build:

```bash
# Run linting check
npm run lint

# Compile production-ready Next.js build
npm run build

# Verify sponsor proof paths; runs live checks when env vars are present
npm run verify:sponsors
```

---

## 🔍 Validation & Core Rules
During live model generation, the orchestrator ([studentos-agent.ts](file:///Users/zandenkoh/Downloads/StudentOS_Final/src/lib/sponsor-tech/studentos-agent.ts)) enforces specific processing rules to maintain the demo narrative:
1. **No Vague Goal Tasks:** For vague goals, the planner is instructed *not* to schedule tasks that tell the student to "clarify their goal". Instead, it flags the goal and relies on structured, multiple-choice questions on the review page.
2. **Fixed Conflict Handling:** A conflict is only flagged if two fixed events have overlapping start and end times. Flexible tasks are scheduled around fixed calendar slots, never triggering conflicts.
3. **Session Length Limits:** Large study tasks are broken down into sessions of **60 minutes or less** to promote realistic, manageable workflows.
4. **Schedule Rationales:** Every single task placed on the daily timeline is assigned a clear, user-facing schedule rationale explaining why it was placed in that specific slot.
