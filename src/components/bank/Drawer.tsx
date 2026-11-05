"use client";
import { useEffect, type ReactNode } from "react";

/** Right-hand slide-over panel. Kept in the page (no route change) so clicks are instant on stage. */
export function Drawer({ open, onClose, label, wide, children }: { open: boolean; onClose: () => void; label: string; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-ink/30 backdrop-blur-[1px]" />
      <div className={`relative flex h-full w-full flex-col border-l border-ink bg-paper shadow-lift animate-[slide-in_260ms_cubic-bezier(0.22,1,0.36,1)_both] ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-ink px-4 md:px-6">
          <span className="tag-text text-ash-700">{label}</span>
          <button type="button" onClick={onClose} className="flex min-h-9 items-center gap-2 border border-ink px-3 tag-text hover:bg-brand">
            Close <span aria-hidden>✕</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
      <style>{`@keyframes slide-in { from { transform: translateX(40px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  );
}
