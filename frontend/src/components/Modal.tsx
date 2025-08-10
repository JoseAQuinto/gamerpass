import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  labelledById?: string;
};

export default function Modal({
  open, onClose, title, children, footer, size = "sm", labelledById
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === "lg" ? "max-w-2xl" : size === "md" ? "max-w-xl" : "max-w-md";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm" />
      {/* panel */}
      <div
        ref={panelRef}
        className={`relative w-[92vw] ${width} rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 text-neutral-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)]`}
      >
        {/* header */}
        <div className="mb-4 flex items-center justify-between">
          {title ? (
            <h3 id={labelledById} className="text-sm font-semibold tracking-tight">
              {title}
            </h3>
          ) : <span />}
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-800 px-2 py-1 text-sm text-neutral-300 transition hover:bg-neutral-800/70"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">{children}</div>

        {footer && (
          <div className="mt-5 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
