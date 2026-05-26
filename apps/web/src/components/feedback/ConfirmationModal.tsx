import type { ReactNode } from "react";

export function ConfirmationModal({
  title,
  children,
  confirmLabel,
  disabled,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  disabled?: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <div>{children}</div>
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Revisar
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
