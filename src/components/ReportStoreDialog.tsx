import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isAxiosError } from "axios";
import { reportStore, STORE_REPORT_REASONS } from "../lib/reviews";
import { t } from "../lib/i18n";
import { SolarIcon } from "./SolarIcon";
import type { StoreReportReason } from "../types/review";

export interface ReportStoreDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * «الإبلاغ عن المتجر» — a signed-in customer reports this store to the
 * platform (fraud, undelivered order, …). The report goes to the platform's
 * review team, never to the merchant. Gate the trigger on `useAuth()
 * .isAuthenticated` (the endpoint needs a customer token).
 *
 * Same overlay mechanics as ConfirmDialog (portalled, Escape/backdrop close,
 * scroll lock); presentation in base.css (`.sf-dialog*`, `.sf-report*`).
 */
export function ReportStoreDialog({ open, onClose }: ReportStoreDialogProps) {
  const [reason, setReason] = useState<StoreReportReason>("fraud");
  const [details, setDetails] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const latestClose = useRef(onClose);
  latestClose.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latestClose.current();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setError(null);
      setDone(null);
    }
  }, [open]);

  if (!open) return null;

  const valid = details.trim().length >= 10;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await reportStore({
        reason,
        details: details.trim(),
        ...(orderNumber.trim() ? { order_number: orderNumber.trim() } : {}),
      });
      setDone(res.message);
      setDetails("");
      setOrderNumber("");
    } catch (err) {
      const data = isAxiosError(err) ? err.response?.data : null;
      const first = data?.errors ? (Object.values(data.errors)[0] as string[] | undefined)?.[0] : null;
      setError(first || data?.message || t("report.failed"));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="sf-dialog" role="dialog" aria-modal="true" aria-label={t("report.title")}>
      <div className="sf-dialog__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="sf-dialog__panel sf-report">
        <div className="sf-dialog__icon is-destructive">
          <SolarIcon name="shield-warning-linear" className="text-2xl" />
        </div>
        <h2 className="sf-dialog__title">{t("report.title")}</h2>

        {done ? (
          <>
            <p className="sf-dialog__message">{done}</p>
            <div className="sf-dialog__actions">
              <button type="button" className="sf-btn sf-btn--primary sf-dialog__action" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
          </>
        ) : (
          <form className="sf-report__form" onSubmit={submit}>
            <p className="sf-dialog__message">{t("report.intro")}</p>

            <label className="sf-report__field">
              <span>{t("report.reason")}</span>
              <select className="sf-input" value={reason} onChange={(e) => setReason(e.target.value as StoreReportReason)}>
                {STORE_REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`report.reasons.${r}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="sf-report__field">
              <span>{t("report.details")}</span>
              <textarea
                className="sf-input"
                rows={4}
                maxLength={2000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("report.detailsPlaceholder")}
              />
            </label>

            <label className="sf-report__field">
              <span>{t("report.orderNumber")}</span>
              <input
                className="sf-input"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t("report.orderNumberPlaceholder")}
                dir="ltr"
              />
            </label>

            {error ? <p className="sf-report__error">{error}</p> : null}

            <div className="sf-dialog__actions">
              <button type="button" className="sf-btn sf-btn--tonal sf-dialog__action" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </button>
              <button type="submit" className="sf-btn sf-dialog__action sf-dialog__action--danger" disabled={!valid || busy}>
                {busy ? t("reviews.sending") : t("report.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default ReportStoreDialog;
