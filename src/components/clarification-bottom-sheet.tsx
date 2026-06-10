"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";

type ClarificationOption = {
  label: string;
  description?: string;
  recommended?: boolean;
};

export type ClarificationQuestion = {
  question: string;
  options: ClarificationOption[];
  customPlaceholder: string;
};

export type ClarificationAnswers = Record<number, string>;
export type ClarificationKind = "goal" | "team" | "general";

function answerSignature(answers: ClarificationAnswers) {
  return JSON.stringify(
    Object.entries(answers)
      .filter(([, answer]) => answer.trim().length > 0)
      .sort(([left], [right]) => Number(left) - Number(right)),
  );
}

function splitInitialAnswers(
  questions: ClarificationQuestion[],
  initialAnswers: ClarificationAnswers,
) {
  const customAnswers: Record<number, string> = {};

  Object.entries(initialAnswers).forEach(([rawIndex, answer]) => {
    const index = Number(rawIndex);
    const question = questions[index];
    if (!question || !answer.trim()) return;

    const matchesOption = question.options.some((option) => option.label === answer);
    if (!matchesOption) {
      customAnswers[index] = answer;
    }
  });

  return customAnswers;
}

export function MCQOption({
  label,
  description,
  recommended,
  selected,
  onClick
}: {
  label: string;
  description?: string;
  recommended?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const shortDescription = description?.trim();

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition",
        selected
          ? "border-ink bg-ink text-white"
          : "border-neutral-200 bg-white text-ink hover:bg-neutral-50"
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="line-clamp-2 min-w-0 break-words text-[15px] font-semibold leading-5">
            {label}
          </span>
          {recommended ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-4",
                selected ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700"
              )}
            >
              Recommended
            </span>
          ) : null}
        </span>
        {shortDescription ? (
          <span
            className={cn(
              "line-clamp-2 break-words text-[13px] font-medium leading-4",
              selected ? "text-white/75" : "text-muted"
            )}
          >
            {shortDescription}
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

export const goalQuestions: ClarificationQuestion[] = [
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

export const teamQuestions: ClarificationQuestion[] = [
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

export const generalQuestions: ClarificationQuestion[] = [
  {
    question: "When should this item be scheduled?",
    options: [
      { label: "Later this week", recommended: true },
      { label: "Today or tomorrow" },
      { label: "Next week" },
      { label: "Keep flexible / unscheduled" }
    ],
    customPlaceholder: "Type scheduling details..."
  }
];

function fallbackQuestionsForKind(kind: ClarificationKind) {
  if (kind === "goal") return goalQuestions;
  if (kind === "team") return teamQuestions;
  return generalQuestions;
}

function defaultTitleForKind(kind: ClarificationKind) {
  if (kind === "goal") return "Clarify goal";
  if (kind === "team") return "Clarify team meeting";
  return "Clarify item";
}

function defaultSubtitleForKind(kind: ClarificationKind) {
  if (kind === "goal") return "StudentOS needs a few quick details to plan this properly.";
  if (kind === "team") return "Resolve the uncertainty before StudentOS builds the day.";
  return "Resolve the missing detail before StudentOS builds the day.";
}

export function ClarificationBottomSheet({
  open,
  kind,
  onClose,
  onSubmit,
  questionsOverride,
  titleOverride,
  subtitleOverride,
  initialAnswers = {}
}: {
  open: boolean;
  kind: ClarificationKind;
  onClose: () => void;
  onSubmit: (answers: ClarificationAnswers) => void;
  questionsOverride?: ClarificationQuestion[];
  titleOverride?: string;
  subtitleOverride?: string;
  initialAnswers?: ClarificationAnswers;
}) {
  const questions = questionsOverride?.length
    ? questionsOverride
    : fallbackQuestionsForKind(kind);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>({});
  const customInputRef = useRef<HTMLInputElement>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const initialAnswersSignature = answerSignature(initialAnswers);
  const questionsSignature = JSON.stringify(
    questions.map((question) => [
      question.question,
      question.customPlaceholder,
      question.options.map((option) => option.label).join("|"),
    ]),
  );
  const safeActiveIndex = Math.min(activeIndex, questions.length - 1);
  const activeQuestion = questions[safeActiveIndex];
  const progress = (safeActiveIndex + 1) / questions.length;
  const isEditingSavedAnswers = initialAnswersSignature !== "[]";

  useEffect(() => {
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (!open) return;
    setActiveIndex(0);
    setAnswers(initialAnswers);
    setCustomAnswers(splitInitialAnswers(questions, initialAnswers));
  }, [initialAnswers, initialAnswersSignature, kind, open, questions, questionsSignature]);

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
    if (isEditingSavedAnswers) return;
    onSubmit(nextAnswers);
  }

  function chooseAnswer(answer: string) {
    const nextAnswers = { ...answers, [safeActiveIndex]: answer };
    setAnswers(nextAnswers);
    setCustomAnswers((current) => {
      const next = { ...current };
      delete next[safeActiveIndex];
      return next;
    });
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
    }
    if (isEditingSavedAnswers) return;
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
    if (isEditingSavedAnswers) return;
    setAnswers((current) => ({ ...current, [safeActiveIndex]: "Skipped" }));
    advance();
  }

  function previousQuestion() {
    setActiveIndex((current) => Math.max(0, current - 1));
  }

  function saveAnswers() {
    onSubmit(answersToSave);
  }

  const mergedAnswers = {
    ...answers,
    ...Object.fromEntries(
      Object.entries(customAnswers)
        .map(([index, answer]) => [index, answer.trim()])
        .filter(([, answer]) => answer.length > 0),
    ),
  };
  const hasUnsavedClarification =
    open &&
    (isEditingSavedAnswers
      ? answerSignature(mergedAnswers) !== initialAnswersSignature
      : Object.keys(answers).length > 0 ||
        Object.values(customAnswers).some((answer) => answer.trim().length > 0));
  const answersToSave = mergedAnswers;
  const canSaveAnswers = Object.keys(answersToSave).length > 0;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      confirmClose={hasUnsavedClarification}
      onSaveBeforeClose={() => onSubmit(answersToSave)}
      closeConfirmationTitle="Save clarification?"
      closeConfirmationSubtitle="StudentOS can use your current answers, or you can discard them and return to the unresolved item."
      closeConfirmationSaveLabel="Save answers"
      closeConfirmationSaveDisabled={!canSaveAnswers}
      title={titleOverride ?? defaultTitleForKind(kind)}
      subtitle={subtitleOverride ?? defaultSubtitleForKind(kind)}
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
                description={option.description}
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

            {customAnswers[safeActiveIndex]?.trim() && !isEditingSavedAnswers ? (
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

        {isEditingSavedAnswers ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={previousQuestion}
              disabled={safeActiveIndex === 0}
              className="h-12 rounded-full border border-neutral-200 bg-white px-4 text-sm font-bold text-ink transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300"
            >
              Back
            </button>
            {safeActiveIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveIndex((current) => Math.min(questions.length - 1, current + 1))}
                className="h-12 rounded-full bg-ink px-4 text-sm font-bold text-white"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={saveAnswers}
                disabled={!canSaveAnswers}
                className="h-12 rounded-full bg-ink px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Update
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={skipQuestion}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-neutral-400 transition hover:text-ink"
          >
            Skip
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
