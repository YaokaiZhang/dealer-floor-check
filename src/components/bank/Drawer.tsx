"use client";
import { useEffect, useState, type ReactNode } from "react";

/** Right-hand slide-over panel. Kept in the page (no route change) so clicks are instant on stage. */
export function Drawer({ open, onClose, label, wide, children }: { open: boolean; onClose: () => void; label: string; wide?: boolean; children: ReactNode }) {
  // Stay mounted for the exit animation, showing the last content it had.
  const [mounted, setMounted] = useState(open);
  const [last, setLast] = useState<ReactNode>(children);
  if (open && !mounted) setMounted(true);
  if (open && children !== last) setLast(children);
  const closing = !open && mounted;
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

  if (!mounted) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={label} inert={closing || undefined}>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/35 ${closing ? "animate-[fade-out_200ms_ease-in_both]" : "animate-[fade-in_240ms_ease-out_both]"}`}
      />
      <div
        onAnimationEnd={(e) => closing && e.target === e.currentTarget && setMounted(false)}
        className={`relative flex h-full w-full flex-col border-l border-ink bg-paper shadow-[-12px_0_0_0_var(--color-brand)] ${closing ? "animate-[slide-out_200ms_cubic-bezier(0.55,0,1,0.45)_both]" : "animate-[slide-in_340ms_cubic-bezier(0.22,1,0.36,1)_both]"} ${wide ? "max-w-4xl" : "max-w-2xl"}`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-ink px-4 md:px-6">
          <span className="tag-text text-ash-700">{label}</span>
          <button type="button" onClick={onClose} className="flex min-h-9 items-center gap-2 border border-ink px-3 tag-text hover:bg-brand">
            Close <span aria-hidden>✕</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{open ? children : last}</div>
      </div>
      <style>{`
        @keyframes slide-in { from { transform: translateX(72px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes slide-out { to { transform: translateX(72px); opacity: 0 } }
        @keyframes fade-in { from { opacity: 0 } }
        @keyframes fade-out { to { opacity: 0 } }
      `}</style>
    </div>
  );
}
