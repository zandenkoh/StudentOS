"use client";

import { useEffect, useRef } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function ManualConflictSheet({
  open,
  instruction,
  onInstructionChange,
  onApply,
  onClose,
  applying = false
}: {
  open: boolean;
  instruction: string;
  onInstructionChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
  applying?: boolean;
}) {
  const initialInstructionRef = useRef(instruction);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      initialInstructionRef.current = instruction;
    }
    wasOpenRef.current = open;
  }, [instruction, open]);

  const hasUnsavedInstruction = open && instruction !== initialInstructionRef.current;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tell StudentOS how to resolve it"
      confirmClose={hasUnsavedInstruction}
      onSaveBeforeClose={onApply}
      onDiscardBeforeClose={() => {
        onInstructionChange(initialInstructionRef.current);
        onClose();
      }}
      closeConfirmationTitle="Save this instruction?"
      closeConfirmationSubtitle="StudentOS has not applied this manual scheduling instruction yet."
      closeConfirmationSaveLabel={applying ? "Replanning..." : "Apply instruction"}
      closeConfirmationSaveDisabled={applying || !instruction.trim()}
    >
      <div className="space-y-4">
        <textarea
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          rows={6}
          className="min-h-36 w-full resize-none rounded-[22px] border border-neutral-200 bg-white px-4 py-3 text-[15px] font-semibold leading-6 text-ink outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-0"
        />
        <p className="rounded-[18px] border border-neutral-100 bg-neutral-50 p-3 text-xs font-semibold leading-5 text-neutral-500">
          StudentOS will treat this as a scheduling instruction and rebuild the plan.
        </p>
        <div className="flex flex-col gap-3">
          <PrimaryButton onClick={onApply} disabled={applying || !instruction.trim()}>
            {applying ? "Replanning..." : "Apply manual instruction"}
          </PrimaryButton>
          <SecondaryButton onClick={onClose} className="w-full">
            Cancel
          </SecondaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}
