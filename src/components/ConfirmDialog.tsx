import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SolarIcon } from "./SolarIcon";
import { t } from "../lib/i18n";

export interface ConfirmDialogProps {
  open: boolean;
  /** Short question, e.g. "Remove this item from the cart?" */
  title: string;
  /** Optional second line spelling out the consequence. */
  message?: ReactNode;
  /** Confirm button label. Defaults to a generic "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Destructive styling (red confirm). Defaults to true — this is a warning. */
  destructive?: boolean;
  /** Solar icon shown above the title. */
  icon?: string;
  /** Disables both buttons while the caller's mutation is in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small, focused confirmation modal — "are you sure?" before an irreversible
 * action (removing a cart line, emptying the cart, deleting an address).
 *
 * Lives in the core rather than in each theme so a destructive action is
 * guarded identically everywhere, including external marketplace themes.
 * Portalled to <body> (an ancestor with backdrop-filter/transform would
 * otherwise become the containing block for `position: fixed`), closes on
 * Escape and on a backdrop click, and locks page scroll while open. The cancel
 * button takes focus on open so a stray Enter cannot confirm.
 *
 * Presentation lives in base.css (`.sf-dialog*`): Tailwind does not scan
 * node_modules, so a utility class used only inside this package would never be
 * generated.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  icon = "danger-triangle-linear",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Read the latest onCancel through a ref so the effect depends on `open`
  // alone: an inline `onCancel={() => …}` is a new function on every parent
  // render, and re-running the effect would drag focus back to Cancel each time
  // the caller re-renders (which it does the moment `busy` flips).
  const latestCancel = useRef(onCancel);
  latestCancel.current = onCancel;

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") latestCancel.current();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="sf-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sf-dialog__backdrop" aria-hidden="true" onClick={onCancel} />

      <div className="sf-dialog__panel">
        <div className={`sf-dialog__icon${destructive ? " is-destructive" : ""}`}>
          <SolarIcon name={icon} className="text-2xl" />
        </div>

        <h2 className="sf-dialog__title">{title}</h2>
        {message ? <p className="sf-dialog__message">{message}</p> : null}

        <div className="sf-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="sf-btn sf-btn--tonal sf-dialog__action"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            className={`sf-btn sf-dialog__action ${
              destructive ? "sf-dialog__action--danger" : "sf-btn--primary"
            }`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel ?? t("common.confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
