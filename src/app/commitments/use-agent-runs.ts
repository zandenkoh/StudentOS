"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appendAgentRunEvent,
  createAgentEvent,
  createAgentRun,
  loadAgentRuns,
  saveAgentRuns,
  upsertAgentRun,
  type AgentActivityRun,
} from "@/lib/agent-activity";

export type ReplanTrigger = "clarification" | "manual_conflict" | "add_task";

const runMeta: Record<ReplanTrigger, { agentName: string; title: string; body: string }> = {
  add_task: {
    agentName: "Add-task agent",
    title: "Add-task agent started",
    body: "StudentOS is reading the added task and preparing to update commitments and plan tasks.",
  },
  manual_conflict: {
    agentName: "Manual conflict replanning agent",
    title: "Manual instruction received",
    body: "StudentOS is treating the custom prompt as a high-priority scheduling constraint.",
  },
  clarification: {
    agentName: "Clarification replanning agent",
    title: "Clarification agent started",
    body: "StudentOS is applying the clarified answer before rebuilding the affected plan items.",
  },
};

export function useAgentRuns() {
  const [agentRuns, setAgentRuns] = useState<AgentActivityRun[]>([]);

  useEffect(() => {
    setAgentRuns(loadAgentRuns());
  }, []);

  const commitAgentRuns = useCallback((updater: (runs: AgentActivityRun[]) => AgentActivityRun[]) => {
    setAgentRuns((current) => {
      const next = updater(current);
      saveAgentRuns(next);
      return next;
    });
  }, []);

  const updateAgentRun = useCallback(
    (runId: string, updater: (run: AgentActivityRun) => AgentActivityRun) => {
      commitAgentRuns((runs) => {
        const existing = runs.find((run) => run.runId === runId);
        if (!existing) return runs;
        return upsertAgentRun(runs, updater(existing));
      });
    },
    [commitAgentRuns],
  );

  const beginAgentRun = useCallback(
    (trigger: ReplanTrigger) => {
      const selected = runMeta[trigger];
      const run = createAgentRun({
        agentName: selected.agentName,
        trigger,
        currentStep: selected.title,
      });
      const startedRun = appendAgentRunEvent(
        run,
        createAgentEvent({
          id: `${run.runId}-started`,
          kind: "observed",
          title: selected.title,
          body: selected.body,
          provider: "StudentOS",
          status: "running",
        }),
      );

      commitAgentRuns((runs) => upsertAgentRun(runs, startedRun));
      return startedRun;
    },
    [commitAgentRuns],
  );

  return {
    agentRuns,
    beginAgentRun,
    commitAgentRuns,
    updateAgentRun,
  };
}
