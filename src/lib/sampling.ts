/**
 * Statistically sized sampling.
 * Smallest n such that, if at least p of the N cars in the pool were missing,
 * a random sample of n catches at least one missing car with probability >= confidence.
 * Hypergeometric: P(no missing car in sample) = C(N-M, n) / C(N, n) = prod_{i<n} (N-M-i)/(N-i)
 */
export function sampleSize(N: number, p = 0.02, confidence = 0.95): number {
  if (N <= 0) return 0;
  const M = Math.max(1, Math.ceil(p * N)); // number of missing cars we want to detect
  for (let n = 1; n <= N; n++) {
    let p0 = 1;
    for (let i = 0; i < n; i++) p0 *= (N - M - i) / (N - i);
    if (p0 <= 1 - confidence) return n;
  }
  return N;
}

/** Probability that a sample of n from N catches at least one of M missing cars. */
export function detectionProbability(N: number, M: number, n: number): number {
  let p0 = 1;
  for (let i = 0; i < n; i++) p0 *= Math.max(0, N - M - i) / (N - i);
  return 1 - p0;
}

/** Fisher–Yates draw of k items, using crypto randomness when available. */
export function drawRandom<T>(items: T[], k: number): T[] {
  const a = [...items];
  const r = () => (typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 : Math.random());
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
