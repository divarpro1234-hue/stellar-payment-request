import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatusKind = 'loading' | 'success' | 'warning' | 'error';

const icons = {
  loading: LoaderCircle,
  success: CheckCircle2,
  warning: Info,
  error: AlertCircle,
};

export function StatusMessage({
  kind,
  children,
}: {
  kind: StatusKind;
  children: ReactNode;
}) {
  const Icon = icons[kind];
  return (
    <div className={`status-box ${kind}`} role="status" aria-live="polite">
      <Icon
        size={17}
        aria-hidden="true"
        className={kind === 'loading' ? 'spin' : undefined}
      />
      <div className="status-copy">{children}</div>
    </div>
  );
}
