/** VIN helpers. A single OCR-style confusion (O/0, I/1, …) still counts as a match. */
const CONFUSABLE: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };
const norm = (c: string) => CONFUSABLE[c] ?? c;

export function compareVin(requested: string, read: string | null): "exact" | "ocr_tolerant" | "mismatch" | "unreadable" {
  if (!read) return "unreadable";
  const a = requested.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const b = read.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (a === b) return "exact";
  if (a.length !== 17 || b.length !== 17) return "mismatch";
  let confusions = 0;
  for (let i = 0; i < 17; i++) {
    if (a[i] === b[i]) continue;
    if (norm(a[i]) === norm(b[i])) confusions++;
    else return "mismatch";
  }
  return confusions <= 1 ? "ocr_tolerant" : "mismatch";
}

export const isVinFormat = (v: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
