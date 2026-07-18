import { SolarIcon } from "./SolarIcon";
import { t } from "../lib/i18n";

/** Centered tonal panel — the shape shared by every empty/error state. */
function Panel({
  icon,
  title,
  hint,
  children,
}: {
  icon: string;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-4 rounded-full bg-surface-2 p-5">
        <SolarIcon name={icon} className="text-4xl text-foreground-3" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      {hint ? <p className="mb-6 max-w-xs text-sm text-foreground-2">{hint}</p> : null}
      {children}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  hint?: string;
  onRetry: () => void;
}

/** Failed-fetch state with a retry button. */
export function ErrorState({
  title = t("common.loadFailed"),
  hint = t("common.fetchError"),
  onRetry,
}: ErrorStateProps) {
  return (
    <Panel icon="cloud-cross-linear" title={title} hint={hint}>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-2xl bg-accent px-6 py-3.5 font-medium text-accent-foreground active:opacity-80 transition"
      >
        {t("common.retry")}
      </button>
    </Panel>
  );
}

export interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
}

/** Nothing-here state. */
export function EmptyState({ icon = "bag-4-linear", title, hint }: EmptyStateProps) {
  return <Panel icon={icon} title={title} hint={hint} />;
}
