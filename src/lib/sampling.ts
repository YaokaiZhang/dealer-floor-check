/**
 * Statistically sized sampling, spread over the year.
 *
 * One check-in of n cars from a pool of N, with M cars missing, misses every missing car with
 *   q(n) = C(N-M, n) / C(N, n) = prod_{i<n} (N-M-i)/(N-i)          (hypergeometric)
 * Every check-in draws afresh, so k check-ins a year all miss with probability q(n)^k.
 * We pick the smallest n with 1 - q(n)^k >= confidence, then cap it so a check-in stays light.
 */
export function sampleSize(N: number, p = 0.02, confidence = 0.95, perYear = 1, maxCars = Infinity): number {
  if (N <= 0) return 0;
  const M = missingToDetect(N, p);
  const cap = Math.max(1, Math.min(N, maxCars));
  for (let n = 1; n <= cap; n++) {
    if (yearlyDetection(N, M, n, perYear) >= confidence) return n;
  }
  return cap;
}

/** Number of missing cars the target is sized for: p of the pool, at least one. */
export const missingToDetect = (N: number, p: number) => Math.max(1, Math.ceil(p * N));

/** Chance that at least one of k independent check-ins of n cars catches a missing car. */
export function yearlyDetection(N: number, M: number, n: number, perYear: number): number {
  return 1 - (1 - detectionProbability(N, M, n)) ** Math.max(1, perYear);
}

/**
 * Mean days from the moment cars go missing until a check-in catches it.
 * Check-ins every 365/k days; the problem starts on average half an interval before the next one,
 * then each check-in catches it with probability d (geometric).
 */
export function expectedDaysToDetect(d: number, perYear: number): number {
  if (d <= 0) return Infinity;
  return (365 / Math.max(1, perYear)) * (1 / d - 0.5);
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
