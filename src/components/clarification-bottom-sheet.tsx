"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import { cn } from "@/lib/utils";

export function MCQOption({
  label,
  selected,
  onClick
}: {
  label: string;
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
      {label}
      {selected ? <Check className="size-4" /> : null}
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

const goalQuestions = [
  {
    question: "What do you mean by coding?",
    options: ["Web development", "Python basics", "App development", "Not sure yet"]
  },
  {
    question: "What is your target outcome by December?",
    options: [
      "Build a personal website",
      "Build a small app",
      "Pass a school module",
      "Prepare for competitions"
    ]
  },
  {
    question: "When can StudentOS schedule the 5 hours?",
    options: [
      "Weekdays after school",
      "Weekends only",
      "Mix of weekdays and weekends",
      "Let StudentOS decide"
    ]
  }
];

const teamQuestions = [
  {
    question: "Is this a confirmed meeting or a possible one?",
    options: ["Confirmed", "Possible", "Cancelled", "Ask teammate first"]
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
  const [answers, setAnswers] = useState<Record<number, string>>({});

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={kind === "goal" ? "Clarify coding goal" : "Clarify team meeting"}
      subtitle={
        kind === "goal"
          ? "StudentOS needs two quick answers to plan this properly."
          : "Resolve the uncertainty before StudentOS builds the day."
      }
    >
      <div className="space-y-6">
        {questions.map((item, index) => (
          <div key={item.question} className="space-y-3">
            <p className="text-[15px] font-semibold">{item.question}</p>
            <div className="space-y-2">
              {item.options.map((option) => (
                <MCQOption
                  key={option}
                  label={option}
                  selected={answers[index] === option}
                  onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}
                />
              ))}
            </div>
          </div>
        ))}
        <OptionalTextInput placeholder={kind === "goal" ? "Add extra context..." : "Add details..."} />
        <div className="flex flex-col gap-3">
          <PrimaryButton onClick={onSubmit}>
            {kind === "goal" ? "Update goal" : "Update commitment"}
          </PrimaryButton>
          <SecondaryButton onClick={onClose} className="w-full">
            Skip for now
          </SecondaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}
