"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";

type ClarificationOption = {
  label: string;
  recommended?: boolean;
};

export type ClarificationQuestion = {
  question: string;
  options: ClarificationOption[];
  customPlaceholder: string;
};

export type ClarificationAnswers = Record<number, string>;

export function MCQOption({
  label,
  recommended,
  selected,
  onClick
}: {
  label: string;
  recommended?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-[15px] font-semibold transition",
        selected
          ? "border-ink bg-ink text-white"
          : "border-neutral-200 bg-white text-ink hover:bg-neutral-50"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{label}</span>
        {recommended ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
              selected ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700"
            )}
          >
            Recommended
          </span>
        ) : null}
      </span>
      {selected ? <Check className="size-4 shrink-0" /> : null}
    </button>
  );
}

export function OptionalTextInput({ placeholder }: { placeholder: string }) {
  return (
    <textarea
      placeholder={placeholder}
      className="min-h-20 w-full resize-none rounded-[18px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-[15px] outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-0"
    />
  );
}

const goalQuestions: ClarificationQuestion[] = [
  {
    question: "What does success look like?",
    options: [
      { label: "Build a small app", recommended: true },
      { label: "Portfolio readiness" },
      { label: "Competition prep" }
    ],
    customPlaceholder: "Type your target outcome..."
  },
  {
    question: "How many sessions per week are realistic?",
    options: [
      { label: "2 sessions/week", recommended: true },
      { label: "1 session/week" },
      { label: "3 sessions/week" }
    ],
    customPlaceholder: "Type your cadence..."
  },
  {
    question: "Where are you starting from?",
    options: [
      { label: "Basics" },
      { label: "Already building projects" },
      { label: "Some Python", recommended: true }
    ],
    customPlaceholder: "Type your starting point..."
  }
];

const teamQuestions: ClarificationQuestion[] = [
  {
    question: "Is this a confirmed meeting or a possible one?",
    options: [
      { label: "Confirmed" },
      { label: "Possible" },
      { label: "Cancelled" },
      { label: "Ask teammate first" }
    ],
    customPlaceholder: "Type what this should become..."
  }
];

export function ClarificationBottomSheet({
  open,
  kind,
  onClose,
  onSubmit,
  questionsOverride,
  titleOverride,
  subtitleOverride
}: {
  open: boolean;
  kind: "goal" | "team";
  onClose: () => void;
  onSubmit: (answers: ClarificationAnswers) => void;
  questionsOverride?: ClarificationQuestion[];
  titleOverride?: string;
  subtitleOverride?: string;
}) {
  const questions = questionsOverride?.length
    ? questionsOverride
    : kind === "goal"
      ? goalQuestions
      : teamQuestions;
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});
  const customInputRef = useRef<HTMLInputElement>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const safeActiveIndex = Math.min(activeIndex, questions.length - 1);
  const activeQuestion = questions[safeActiveIndex];
  const progress = (safeActiveIndex + 1) / questions.length;

  useEffect(() => {
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (!open) return;
    setActiveIndex(0);
    setAnswers({});
    setCustomAnswers({});
  }, [kind, open]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  function advance(nextAnswers = answers) {
    if (safeActiveIndex < questions.length - 1) {
      setActiveIndex((current) => current + 1);
      return;
    }
    onSubmit(nextAnswers);
  }

  function chooseAnswer(answer: string) {
    const nextAnswers = { ...answers, [safeActiveIndex]: answer };
    setAnswers(nextAnswers);
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
    }
    advanceTimeoutRef.current = window.setTimeout(() => {
      advanceTimeoutRef.current = null;
      advance(nextAnswers);
    }, 140);
  }

  function updateCustomAnswer(value: string) {
    setCustomAnswers((current) => ({ ...current, [safeActiveIndex]: value }));
    if (value.trim()) {
      setAnswers((current) => ({ ...current, [safeActiveIndex]: value }));
    }
  }

  function skipQuestion() {
    setAnswers((current) => ({ ...current, [safeActiveIndex]: "Skipped" }));
    advance();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={titleOverride ?? (kind === "goal" ? "Clarify coding goal" : "Clarify team meeting")}
      subtitle={
        subtitleOverride ??
        (kind === "goal"
          ? "StudentOS needs a few quick details to plan this properly."
          : "Resolve the uncertainty before StudentOS builds the day.")
      }
    >
      <div className="space-y-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-ink transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-[0_12px_45px_rgba(0,0,0,0.045)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[15px] font-semibold">{activeQuestion.question}</p>
            <span className="shrink-0 text-xs font-semibold text-neutral-400">
              {safeActiveIndex + 1}/{questions.length}
            </span>
          </div>

          <div className="space-y-2">
            {activeQuestion.options.map((option) => (
              <MCQOption
                key={option.label}
                label={option.label}
                recommended={option.recommended}
                selected={answers[safeActiveIndex] === option.label}
                onClick={() => chooseAnswer(option.label)}
              />
            ))}

            <button
              type="button"
              onClick={() => customInputRef.current?.focus()}
              className={cn(
                "flex min-h-12 w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition",
                customAnswers[safeActiveIndex]?.trim()
                  ? "border-ink bg-ink text-white"
                  : "border-neutral-200 bg-white text-ink hover:bg-neutral-50"
              )}
            >
              <input
                ref={customInputRef}
                value={customAnswers[safeActiveIndex] ?? ""}
                onChange={(event) => updateCustomAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && customAnswers[safeActiveIndex]?.trim()) {
                    event.preventDefault();
                    advance();
                  }
                }}
                placeholder={activeQuestion.customPlaceholder}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold placeholder:text-neutral-400 focus:outline-none focus:ring-0"
              />
              {customAnswers[safeActiveIndex]?.trim() ? <Check className="ml-3 size-4 shrink-0" /> : null}
            </button>

            {customAnswers[safeActiveIndex]?.trim() ? (
              <button
                type="button"
                onClick={() => advance()}
                className="flex min-h-12 w-full items-center justify-center rounded-[18px] bg-ink px-4 py-3 text-[15px] font-semibold text-white"
              >
                Continue
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={skipQuestion}
          className="w-full rounded-full py-2.5 text-sm font-semibold text-neutral-400 transition hover:text-ink"
        >
          Skip
        </button>
      </div>
    </BottomSheet>
  );
}
