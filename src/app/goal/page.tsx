"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import { AgentLogRow } from "@/components/agent-activity-panel";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import { ClarificationBottomSheet } from "@/components/clarification-bottom-sheet";
import { CommitmentCard } from "@/components/commitment-card";
import { GoalCommandInput } from "@/components/goal-command-input";
import { PlanSection } from "@/components/plan-section";
import { ScreenHeader } from "@/components/screen-header";
import { SourceChip } from "@/components/source-chip";
import { agentLogs, goalPlan, type Commitment } from "@/lib/demo-data";

const initialGoal = "/goal Learn coding by December with 5 hours of commitment per week";

const goalCommitment: Commitment = {
  id: "coding-goal-route",
  title: "Learn coding by December · 5h/week",
  type: "goal",
  source: "Goal command",
  confidence: 81,
  state: "needs_clarification",
  explanation: "StudentOS needs a target outcome."
};

const confirmedGoal: Commitment = {
  ...goalCommitment,
  confidence: 94,
  state: "confirmed",
  explanation: "Goal enriched and split into weekly execution blocks."
};

export default function GoalPage() {
  const [value, setValue] = useState(initialGoal);
  const [stage, setStage] = useState<"input" | "identified" | "planned">("input");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [added, setAdded] = useState(false);

  function planGoal() {
    setStage("identified");
    window.setTimeout(() => setSheetOpen(true), 420);
  }

  function finishClarification() {
    setSheetOpen(false);
    setStage("planned");
  }

  return (
    <AppShell route="goal" stepLabel="/goal" progress={stage === "input" ? 0.25 : stage === "identified" ? 0.55 : 1}>
      <div className="px-5 pb-24">
        <AnimatePresence mode="wait">
          {stage === "input" ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <ScreenHeader
                title="Add a goal"
                subtitle="Type a goal and StudentOS will turn it into weekly commitments."
              />
              <GoalCommandInput value={value} onChange={setValue} onSubmit={planGoal} />
            </motion.div>
          ) : (
            <motion.div
              key="identified"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <ScreenHeader
                title={stage === "planned" ? "Coding plan ready" : "Goal identified"}
                subtitle={
                  stage === "planned"
                    ? "StudentOS turned the goal into a weekly rhythm."
                    : "StudentOS recognised a long-term commitment that needs clarification."
                }
              />
              <CommitmentCard
                commitment={stage === "planned" ? confirmedGoal : goalCommitment}
                onClick={() => setSheetOpen(true)}
              />

              {stage === "planned" ? (
                <>
                  <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-soft">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-[18px] font-semibold">Weekly breakdown</h2>
                        <p className="mt-1 text-sm text-muted">5 hours scheduled around school.</p>
                      </div>
                      <SourceChip tone="success">Goal enriched</SourceChip>
                    </div>
                    <div className="space-y-3">
                      {goalPlan.map((item) => (
                        <div
                          key={item.day}
                          className="flex items-center justify-between rounded-[20px] bg-neutral-50 p-4"
                        >
                          <p className="text-[15px] font-semibold">{item.day}</p>
                          <p className="text-sm text-muted">{item.task}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-neutral-200 bg-[#F7F7F8] p-4 shadow-soft">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="size-4" />
                      <h2 className="text-[17px] font-semibold">Mini agent log</h2>
                    </div>
                    <div className="space-y-2.5">
                      {[agentLogs[7], { id: "weekly", label: "Created weekly schedule" }, { id: "blocks", label: "Added 5 × 1h blocks" }].map((row, index) => (
                        <AgentLogRow
                          key={row.id}
                          row={row}
                          status={index < 2 ? "completed" : "active"}
                        />
                      ))}
                    </div>
                  </section>

                  <PlanSection
                    title="Final plan card"
                    items={[
                      { title: "Coding plan ready", meta: "Monday, Wednesday, Friday, Saturday · 5h/week" }
                    ]}
                  />

                  <div className="flex flex-col gap-3">
                    <PrimaryButton onClick={() => setAdded(true)}>
                      <CalendarPlus className="size-4" />
                      Add to weekly plan
                    </PrimaryButton>
                    <SecondaryButton className="w-full" onClick={() => setSheetOpen(true)}>
                      Edit clarification
                    </SecondaryButton>
                  </div>
                </>
              ) : (
                <PrimaryButton onClick={() => setSheetOpen(true)}>Clarify goal</PrimaryButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ClarificationBottomSheet
        open={sheetOpen}
        kind="goal"
        onClose={() => setSheetOpen(false)}
        onSubmit={finishClarification}
      />

      <AnimatePresence>
        {added ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift"
          >
            <CheckCircle2 className="size-4" />
            Weekly plan updated
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}
