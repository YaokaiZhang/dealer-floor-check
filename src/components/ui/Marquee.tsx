/** Endless scrolling band, alternating lavender and black like an editorial ticker. */
export function Marquee({ items, tone = "brand", duration = 40 }: { items: string[]; tone?: "brand" | "ink"; duration?: number }) {
  const cls = tone === "brand" ? "bg-brand text-ink" : "bg-ink text-brand";
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className={`overflow-hidden border-y border-ink ${cls}`} aria-hidden>
      <div className="flex w-max animate-marquee" style={{ ["--marquee-duration" as string]: `${duration}s` }}>
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {row.map((t, i) => (
              <span key={i} className="flex items-center gap-4 px-4 py-2 whitespace-nowrap display-md">
                {t}
                <span className={`inline-block size-1.5 ${tone === "brand" ? "bg-ink" : "bg-brand"}`} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
