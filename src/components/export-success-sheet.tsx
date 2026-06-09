import { CalendarDays } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function ExportSuccessSheet({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Calendar updated"
      subtitle="Added Physics focus block, revision block, and coding practice. Tuition was kept fixed."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CalendarDays className="size-5" />
          <p className="text-sm font-semibold">3 blocks added · 1 fixed event kept</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
          <SecondaryButton className="w-full">View calendar</SecondaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}
