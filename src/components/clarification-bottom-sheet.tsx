"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";

type ClarificationOption = {
  label: string;
  recommended?: boolean;
};

type ClarificationQuestion = {
  question: string;
  options: ClarificationOption[];
  customPlaceholder: string;
};

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
    question: "What do you mean by coding?",
    options: [
      { label: "Web development" },
      { label: "Python basics" },
      { label: "App development" }
    ],
    customPlaceholder: "Type another coding focus..."
  },
  {
    question: "What is your target outcome by December?",
    options: [
      { label: "Build a personal website" },
      { label: "Build a small app" },
      { label: "Pass a school module" },
      { label: "Prepare for competitions" }
    ],
    customPlaceholder: "Type your target outcome..."
  },
  {
    question: "How much time can you commit per week?",
    options: [{ label: "5 hours/week", recommended: true }],
    customPlaceholder: "Type weekly time, e.g. 3 hours/week..."
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
  onSubmit
}: {
  open: boolean;
  kind: "goal" | "team";
  onClose: () => void;
  onSubmit: () => void;
}) {
  const questions = kind === "goal" ? goalQuestions : teamQuestions;
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});
  const customInputRef = useRef<HTMLInputElement>(null);
  const activeQuestion = questions[activeIndex];
  const progress = (activeIndex + 1) / questions.length;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setAnswers({});
    setCustomAnswers({});
  }, [kind, open]);

  function advance() {
    if (activeIndex < questions.length - 1) {
      setActiveIndex((current) => current + 1);
      return;
    }
    onSubmit();
  }

  function chooseAnswer(answer: string) {
    setAnswers((current) => ({ ...current, [activeIndex]: answer }));
    window.setTimeout(advance, 140);
  }

  function updateCustomAnswer(value: string) {
    setCustomAnswers((current) => ({ ...current, [activeIndex]: value }));
    if (value.trim()) {
      setAnswers((current) => ({ ...current, [activeIndex]: value }));
    }
  }

  function skipQuestion() {
    setAnswers((current) => ({ ...current, [activeIndex]: "Skipped" }));
    advance();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={kind === "goal" ? "Clarify coding goal" : "Clarify team meeting"}
      subtitle={
        kind === "goal"
          ? "StudentOS needs a few quick details to plan this properly."
          : "Resolve the uncertainty before StudentOS builds the day."
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
              {activeIndex + 1}/{questions.length}
            </span>
          </div>

          <div className="space-y-2">
            {activeQuestion.options.map((option) => (
              <MCQOption
                key={option.label}
                label={option.label}
                recommended={option.recommended}
                selected={answers[activeIndex] === option.label}
                onClick={() => chooseAnswer(option.label)}
              />
            ))}

            <button
              type="button"
              onClick={() => customInputRef.current?.focus()}
              className={cn(
                "flex min-h-12 w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition",
                customAnswers[activeIndex]?.trim()
                  ? "border-ink bg-ink text-white"
                  : "border-neutral-200 bg-white text-ink hover:bg-neutral-50"
              )}
            >
              <input
                ref={customInputRef}
                value={customAnswers[activeIndex] ?? ""}
                onChange={(event) => updateCustomAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && customAnswers[activeIndex]?.trim()) {
                    event.preventDefault();
                    advance();
                  }
                }}
                placeholder={activeQuestion.customPlaceholder}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold placeholder:text-neutral-400 focus:outline-none focus:ring-0"
              />
              {customAnswers[activeIndex]?.trim() ? <Check className="ml-3 size-4 shrink-0" /> : null}
            </button>

            {customAnswers[activeIndex]?.trim() ? (
              <button
                type="button"
                onClick={advance}
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
