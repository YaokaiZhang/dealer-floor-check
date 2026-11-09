"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Store } from "@/lib/store";
import { timeFi } from "@/lib/format";

/** Mock mailbox: the check-in emails the bank "sent". Nothing leaves the demo; the QR opens the dealer app. */
export function Mailbox({ s }: { s: Store }) {
  const [sel, setSel] = useState<string | null>(null);
  const mail = s.mail.slice(0, 8);
  const m = mail.find((x) => x.id === sel) ?? mail[0];
  const [qr, setQr] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (!m) return;
    const full = `${window.location.origin}${m.link}`;
    let alive = true;
    QRCode.toDataURL(full, { margin: 1, width: 220, color: { dark: "#0f1e33", light: "#ffffff" } }).then((d) => { if (alive) { setQr(d); setUrl(full); } });
    return () => { alive = false; };
  }, [m]);

  if (!m) return <p className="text-sm text-ash-700">No emails yet. Send a check-in from the demo panel or a dealer&apos;s panel.</p>;
  const dealer = s.dealers.find((d) => d.id === m.dealerId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <ul className="divide-y divide-line border-y border-line">
        {mail.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => setSel(x.id)} aria-current={x.id === m.id} className={`block w-full px-3 py-3 text-left text-sm hover:bg-mist ${x.id === m.id ? "bg-brand-soft" : ""}`}>
              <span className="flex justify-between gap-3"><span className="font-semibold">{s.dealers.find((d) => d.id === x.dealerId)?.name}</span><span className="shrink-0 text-xs tabular-nums text-ash-700">{timeFi(x.at)}</span></span>
              <span className="mt-0.5 block truncate text-ash-700">{x.subject}</span>
            </button>
          </li>
        ))}
      </ul>
      <article className="border border-ink" aria-label="Email">
        <header className="border-b border-ink px-4 py-3 text-sm">
          <p><span className="text-ash-700">To</span> {dealer?.contact}, {dealer?.name}</p>
          <p><span className="text-ash-700">From</span> Curb Floor Check</p>
          <p className="mt-1 font-semibold">{m.subject}</p>
        </header>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
          <div className="text-sm">
            <p>{m.body}</p>
            <a href={m.link} target="_blank" rel="noreferrer" className="mt-4 inline-block border border-ink bg-ink px-3 py-2 font-medium text-paper hover:bg-ink/85">Open check-in ↗</a>
            <p className="mt-3 break-all text-xs text-ash-700">{url}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="QR code that opens this check-in on a phone" className="size-40 border border-line" />}
        </div>
        <p className="border-t border-line px-4 py-2 tag-text text-ash-500">Mock email · not sent</p>
      </article>
    </div>
  );
}
