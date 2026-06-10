"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function BottomSheet({
  open,
  title,
  subtitle,
  children,
  onClose,
  headerAction,
  confirmClose = false,
  onSaveBeforeClose,
  onDiscardBeforeClose,
  closeConfirmationTitle = "Save changes?",
  closeConfirmationSubtitle = "You have unsaved changes in this sheet.",
  closeConfirmationSaveLabel = "Save",
  closeConfirmationDiscardLabel = "Discard",
  closeConfirmationSaveDisabled = false
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  headerAction?: ReactNode;
  confirmClose?: boolean;
  onSaveBeforeClose?: () => void;
  onDiscardBeforeClose?: () => void;
  closeConfirmationTitle?: string;
  closeConfirmationSubtitle?: string;
  closeConfirmationSaveLabel?: string;
  closeConfirmationDiscardLabel?: string;
  closeConfirmationSaveDisabled?: boolean;
}) {
  const [confirmingClose, setConfirmingClose] = useState(false);

  useEffect(() => {
    if (!open) setConfirmingClose(false);
  }, [open]);

  function requestClose() {
    if (confirmClose) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  }

  function discardAndClose() {
    setConfirmingClose(false);
    if (onDiscardBeforeClose) {
      onDiscardBeforeClose();
      return;
    }
    onClose();
  }

  function saveAndClose() {
    if (closeConfirmationSaveDisabled) return;
    setConfirmingClose(false);
    if (onSaveBeforeClose) {
      onSaveBeforeClose();
      return;
    }
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-0 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[86vh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-neutral-200 bg-white p-5 shadow-lift"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-neutral-200" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-[22px] font-semibold leading-tight">{title}</h2>
                {subtitle ? <p className="mt-2 break-words text-[14px] leading-5 text-muted">{subtitle}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerAction}
                <button
                  onClick={requestClose}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            {children}
          </motion.div>
          <AnimatePresence>
            {confirmingClose ? (
              <motion.div
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 px-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.target === event.currentTarget) setConfirmingClose(false);
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-[360px] rounded-[24px] border border-neutral-200 bg-white p-5 shadow-lift"
                >
                  <h3 className="text-[19px] font-semibold leading-tight text-ink">
                    {closeConfirmationTitle}
                  </h3>
                  <p className="mt-2 text-[13px] font-medium leading-5 text-muted">
                    {closeConfirmationSubtitle}
                  </p>
                  <div className="mt-5 space-y-3">
                    <PrimaryButton
                      onClick={saveAndClose}
                      disabled={closeConfirmationSaveDisabled}
                      className="h-12"
                    >
                      {closeConfirmationSaveLabel}
                    </PrimaryButton>
                    <SecondaryButton onClick={discardAndClose} className="h-12 w-full">
                      {closeConfirmationDiscardLabel}
                    </SecondaryButton>
                    <button
                      type="button"
                      onClick={() => setConfirmingClose(false)}
                      className="h-10 w-full text-sm font-semibold text-neutral-400 transition hover:text-ink"
                    >
                      Keep editing
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
