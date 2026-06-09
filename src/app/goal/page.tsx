"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GoalCommandInput } from "@/components/goal-command-input";

export default function GoalPage() {
  const router = useRouter();
  const [goal, setGoal] = useState(
    "I want to become proficient with Python data-handling libraries by the end of this year."
  );
  const submitGoal = () => {
    window.localStorage.setItem("studentos_manual_goal", goal.trim());
    router.push("/input");
  };

  return (
    <AppShell stepLabel="Manual Goal" progress={0.22} route="goal">
      <div className="safe-bottom-padding px-5 pt-2">
        <GoalCommandInput value={goal} onChange={setGoal} onSubmit={submitGoal} />
      </div>
    </AppShell>
  );
}
