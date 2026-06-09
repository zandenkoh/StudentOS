"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function ExportSuccessSheet({
  open,
  onClose,
  includeChemistry,
  includeRoadmap,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  includeChemistry?: boolean;
  includeRoadmap?: boolean;
  onSaved?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const previewItems = [
    "Physics worksheet focus block",
    ...(includeChemistry ? ["Chemistry worksheet before 8 PM"] : []),
    "CCA briefing handled",
    includeChemistry ? "Coding practice moved later" : "Coding practice weekly block",
    ...(includeRoadmap ? ["Roadmap tasks scheduled across future days"] : [])
  ];

  useEffect(() => {
    if (open) setSaved(false);
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={saved ? "Saved to calendar" : "Ready to save to calendar"}
      subtitle={
        saved
          ? "Demo calendar preview saved."
          : "StudentOS will add the confirmed focus blocks, deadlines, and reminders into your calendar."
      }
    >
      <div className="space-y-4">
        <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            {saved ? <CheckCircle2 className="size-4 text-emerald-700" /> : <CalendarDays className="size-4" />}
            <span>{saved ? "Saved demo items" : "Calendar preview"}</span>
          </div>
          <div className="space-y-2">
            {previewItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-700">
                <span className="size-1.5 rounded-full bg-ink" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {saved ? (
          <div className="flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="size-5" />
            <p className="text-sm font-semibold">Saved to calendar</p>
          </div>
        ) : (
          <div className="rounded-[18px] border border-neutral-100 bg-neutral-50 p-3 text-xs font-semibold leading-5 text-neutral-500">
            Demo confirmation only. No Google Calendar event will be created.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {saved ? (
            <PrimaryButton onClick={onClose} className="col-span-2">
              Done
            </PrimaryButton>
          ) : (
            <>
              <PrimaryButton
                onClick={() => {
                  setSaved(true);
                  onSaved?.();
                }}
              >
                Save demo calendar
              </PrimaryButton>
              <SecondaryButton onClick={onClose} className="w-full">
                Cancel
              </SecondaryButton>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
