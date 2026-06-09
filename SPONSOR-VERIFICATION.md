# StudentOS Sponsor Verification

## Architecture

Vercel frontend routes StudentOS agent requests through the Next.js API route. When `AWS_AGENT_ENDPOINT` is set, the route forwards the analysis request to the AWS Lambda StudentOS agent. Model calls inside the agent use Vercel AI Gateway. Exa and AWS source services are used when their environment flags and credentials are configured.

## AWS Lambda Agent

Files:

- `serverless.yml`
- `src/aws/analyse-student-chaos-handler.ts`
- `scripts/build-aws-agent.mjs`
- `src/app/api/sponsor/ai/analyse-student-chaos/route.ts`

Deploy:

```bash
npm run deploy:aws-agent
```

Set:

```bash
AWS_AGENT_ENDPOINT=https://<api-id>.execute-api.us-west-2.amazonaws.com/analyse-student-chaos
ALLOW_LOCAL_AGENT_FALLBACK=false
```

Verify:

- Run the demo.
- Check the response header: `X-StudentOS-Agent-Compute: aws-lambda`.
- Run `GET /api/sponsor/health?live=1` locally or against the deployed frontend to see critical and optional sponsor checks.
- Run the deployed Lambda health preflight by posting `{"healthCheck":true}` to `AWS_AGENT_ENDPOINT`.
- Check AWS CloudWatch logs for `studentos-analyse-chaos`.
- With `ALLOW_LOCAL_AGENT_FALLBACK=false`, a Lambda failure returns `X-StudentOS-Agent-Compute: aws-lambda-error` and a 502 response instead of silently falling back.
- With `STUDENTOS_STRICT_JUDGE=true` or `?judge=1`, AWS Lambda and Vercel AI Gateway must both verify; otherwise the analysis route fails closed.

## Vercel AI Gateway

Files:

- `src/lib/sponsor-tech/ai-gateway-model.ts`
- `src/lib/sponsor-tech/vercel-gateway.ts`
- `src/lib/sponsor-tech/source-interpreter.ts`
- `src/lib/sponsor-tech/replan-agent.ts`
- `src/lib/sponsor-tech/studentos-agent.ts`

All active sponsor model calls use `gatewayLanguageModel(...)`.

Required environment:

```bash
USE_REAL_VERCEL_AI=true
AI_GATEWAY_API_KEY=
VERCEL_OIDC_TOKEN=
AI_GATEWAY_MODEL=openai/gpt-5.4
AI_GATEWAY_FALLBACK_MODEL=anthropic/claude-sonnet-4.6
AI_GATEWAY_RESEARCH_MODEL=anthropic/claude-sonnet-4.6
```

`AI_GATEWAY_API_KEY` and `VERCEL_OIDC_TOKEN` are both supported for local verification.

## Source Services

AWS source services:

```bash
USE_REAL_AWS=false
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
```

Exa:

```bash
USE_REAL_EXA=false
EXA_API_KEY=
```

## Sponsor Proof UI

Files:

- `src/components/sponsor-proof-strip.tsx`
- `src/components/app-shell.tsx`
- `src/app/agents/page.tsx`
- `src/app/commitments/page.tsx`

## Local Verification

Run:

```bash
npm run verify:sponsors
npm run lint
npm run build
npm run build:aws-agent
```

`verify:sponsors` performs static checks every time. If live sponsor environment variables are present, it also verifies AWS Lambda, Vercel AI Gateway, Bedrock/Textract readiness or fallback, and Exa readiness or fallback. Use `npm run verify:sponsors -- --strict` to fail on missing in-Lambda Gateway preflight proof.
