import { NextResponse } from "next/server";
import type { AgentActivityEvent, AgentActivityStreamEvent } from "@/lib/agent-activity";
import { ReplanAgentInputSchema, replanWithAgent } from "@/lib/sponsor-tech/replan-agent";

export const runtime = "nodejs";
export const maxDuration = 300;

type ParsedReplanInput = Parameters<typeof replanWithAgent>[0];

function agentEvent({
  id,
  kind,
  title,
  body,
  detail,
  provider = "StudentOS",
  status = "running",
}: Omit<AgentActivityEvent, "at">): AgentActivityEvent {
  return {
    id,
    at: new Date().toISOString(),
    kind,
    title,
    body,
    detail,
    provider,
    status,
  };
}

function initialEvents(input: ParsedReplanInput): AgentActivityEvent[] {
  if (input.trigger === "add_task") {
    return [
      agentEvent({
        id: "add-task-reading-source",
        kind: "observed",
        title: "Reading added source",
        body: "StudentOS is using the submitted text as the source of truth for this new item.",
      }),
      agentEvent({
        id: "add-task-checking-gateway",
        kind: "tool",
        title: "Checking Gateway",
        body: "The replanning route is checking whether Vercel AI Gateway is configured before sending the live model request.",
        provider: "Vercel AI Gateway",
      }),
      agentEvent({
        id: "add-task-classifying",
        kind: "reasoning",
        title: "Classifying commitment",
        body: "The agent is deciding whether the added source is a task, deadline, fixed event, or goal.",
      }),
      agentEvent({
        id: "add-task-schedule-constraints",
        kind: "decision",
        title: "Applying schedule constraints",
        body: "Existing fixed commitments stay protected while the added item is inserted into the plan.",
      }),
    ];
  }

  if (input.trigger === "manual_conflict") {
    return [
      agentEvent({
        id: "manual-identifying-fixed-movable",
        kind: "reasoning",
        title: "Identifying fixed vs movable items",
        body: "The agent is separating fixed-time events from flexible study blocks before changing the schedule.",
      }),
      agentEvent({
        id: "manual-checking-overlap",
        kind: "tool",
        title: "Checking real overlap",
        body: "StudentOS is validating conflict flags against confirmed fixed-time overlaps only.",
      }),
      agentEvent({
        id: "manual-calling-gateway",
        kind: "tool",
        title: "Calling Gateway replanning agent",
        body: "The custom instruction is being sent through the existing Vercel AI Gateway replanning path when configured.",
        provider: "Vercel AI Gateway",
      }),
    ];
  }

  return [
    agentEvent({
      id: "clarification-received",
      kind: "observed",
      title: "Clarification answer received",
      body: "StudentOS is treating the answer as new scheduling evidence.",
    }),
    agentEvent({
      id: "clarification-checking-gateway",
      kind: "tool",
      title: "Checking Gateway",
      body: "The replanning route is checking the existing Gateway-backed agent path.",
      provider: "Vercel AI Gateway",
    }),
    agentEvent({
      id: "clarification-updating-plan",
      kind: "decision",
      title: "Applying clarified constraint",
      body: "The affected commitment is being rescheduled around fixed events and current plan tasks.",
    }),
  ];
}

function completionEvents(input: ParsedReplanInput, status: "success" | "fallback" | "error") {
  if (input.trigger === "manual_conflict") {
    return [
      agentEvent({
        id: "manual-applying-timeline",
        kind: "decision",
        title: "Applying updated timeline",
        body: "StudentOS is replacing stale conflict timing with the replanned timeline.",
        status,
      }),
      agentEvent({
        id: "manual-conflict-updated",
        kind: "result",
        title: "Conflict state updated",
        body: "Conflict copy and plan tasks now reflect the manual instruction result.",
        status,
      }),
    ];
  }

  if (input.trigger === "add_task") {
    return [
      agentEvent({
        id: "add-task-updating-plan",
        kind: "result",
        title: "Updating plan",
        body: "StudentOS is applying the new commitment and any schedule shifts returned by the agent.",
        status,
      }),
    ];
  }

  return [
    agentEvent({
      id: "clarification-plan-updated",
      kind: "result",
      title: "Plan updated",
      body: "StudentOS applied the clarified commitment to the visible plan.",
      status,
    }),
  ];
}

function resultDecisionEvent(result: Awaited<ReturnType<typeof replanWithAgent>>): AgentActivityEvent {
  if (result.status === "success") {
    return agentEvent({
      id: "replan-gateway-result",
      kind: "result",
      title: "Gateway replanning result received",
      body: "The existing Vercel AI Gateway replanning agent returned updated schedule data.",
      detail: result.model,
      provider: "Vercel AI Gateway",
      status: "success",
    });
  }

  const reason = result.trace.find((item) => item.status === "fallback" || item.status === "error")?.detail;
  const isError = result.status === "error";

  return agentEvent({
    id: isError ? "replan-error-selected" : "replan-fallback-selected",
    kind: isError ? "error" : "fallback",
    title: isError ? "Replanning error recorded" : "Fallback plan selected",
    body: isError
      ? "The replanning agent returned an error status, so the UI will keep the current plan state explicit."
      : "The Gateway replanning request failed, so StudentOS used the grounded replanning fallback instead.",
    detail: reason,
    provider: "StudentOS",
    status: isError ? "error" : "fallback",
  });
}

function streamReplan(input: ParsedReplanInput) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentActivityStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let heartbeatCount = 0;
      const heartbeatTitles =
        input.trigger === "manual_conflict"
          ? ["Still validating fixed-time constraints", "Waiting for Gateway replanning result", "Applying manual instruction"]
          : input.trigger === "add_task"
            ? ["Still classifying the added source", "Waiting for Gateway replanning result", "Scheduling added task"]
            : ["Still applying clarified evidence", "Waiting for Gateway replanning result", "Updating clarified plan"];
      const stopHeartbeat = () => {
        if (!heartbeat) return;
        clearInterval(heartbeat);
        heartbeat = undefined;
      };

      initialEvents(input).forEach((event) => send({ type: "event", event }));
      heartbeat = setInterval(() => {
        const title = heartbeatTitles[heartbeatCount % heartbeatTitles.length];
        heartbeatCount += 1;
        send({
          type: "event",
          event: agentEvent({
            id: `replan-heartbeat-${heartbeatCount}`,
            kind: "observed",
            title,
            body: "The agent stream is still connected while Vercel AI Gateway finishes the replanning call.",
          }),
        });
      }, 1600);

      try {
        const result = await replanWithAgent(input);
        stopHeartbeat();

        result.trace.forEach((trace) => send({ type: "trace", trace }));
        send({ type: "event", event: resultDecisionEvent(result) });
        completionEvents(input, result.status).forEach((event) => send({ type: "event", event }));
        send({ type: "result", result });
      } catch (error) {
        stopHeartbeat();
        const message = error instanceof Error ? error.message : "StudentOS replanning stream failed.";

        send({
          type: "event",
          event: agentEvent({
            id: "replan-stream-error",
            kind: "error",
            title: "Replanning stream failed",
            body: message,
            status: "error",
          }),
        });
        send({ type: "error", error: message });
      } finally {
        stopHeartbeat();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReplanAgentInputSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid replanning input",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const wantsStream =
    new URL(req.url).searchParams.get("stream") === "1" ||
    req.headers.get("accept")?.includes("application/x-ndjson");

  if (wantsStream) {
    return streamReplan(parsed.data);
  }

  const result = await replanWithAgent(parsed.data);

  return NextResponse.json(result);
}
