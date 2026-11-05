/**
 * Real vision read for a floor-check car, via Claude (Anthropic Messages API).
 *
 * Takes the three shots (VIN plate, whole car with licence plate, odometer),
 * downscales them with sharp, sends them in one message and forces a strict
 * JSON answer via structured outputs. The model reads "blind": the expected
 * VIN/plate are never sent, so it cannot just echo them back.
 *
 * Enabled only when ANTHROPIC_API_KEY is set. Model defaults to Claude Haiku
 * 5.5, overridable with CURB_VISION_MODEL. Any failure throws a short Error
 * so the caller can fall back to the simulated read.
 */
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

export interface VisionRead { vin: string | null; confidence: number; plate: string | null; odometerKm: number | null }

export const visionEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

const MODEL = () => process.env.CURB_VISION_MODEL || process.env.AURORA_VISION_MODEL || "claude-haiku-5-5";

const SCHEMA = {
  type: "object",
  properties: {
    vin: { type: ["string", "null"], description: "17-char VIN, uppercase, no I/O/Q; null if unreadable" },
    vin_confidence: { type: "number", description: "0..1 confidence in the VIN read" },
    plate: { type: ["string", "null"], description: "Licence plate exactly as printed; null if not visible" },
    odometer_km: { type: ["integer", "null"], description: "Odometer in km (convert if shown in miles); null if unreadable" },
  },
  required: ["vin", "vin_confidence", "plate", "odometer_km"],
  additionalProperties: false,
} as const;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 })); // SDK retries 408/429/5xx/529 once

async function toJpegB64(img: Buffer): Promise<string> {
  const out = await sharp(img).rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 }).toBuffer();
  return out.toString("base64");
}

const image = (data: string): Anthropic.ImageBlockParam =>
  ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });

function normVin(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(s) ? s : null;
}

function normPlate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ").toUpperCase();
  return s.length >= 2 && s.length <= 15 && /^[A-Z0-9 \-·.]+$/u.test(s) ? s : null;
}

function normKm(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 5_000_000 ? Math.round(n) : null;
}

export async function readShotsWithClaude(
  shots: { vin: Buffer; car: Buffer; odometer: Buffer },
  hint: { expectedPlateCountry?: string },
): Promise<VisionRead> {
  if (!visionEnabled()) throw new Error("vision disabled: no API key");
  let res: Anthropic.Message;
  try {
    const [vin, car, odo] = await Promise.all([shots.vin, shots.car, shots.odometer].map(toJpegB64));
    const country = hint.expectedPlateCountry ? ` The licence plate is probably from ${hint.expectedPlateCountry}.` : "";
    res = await getClient().messages.create({
      model: MODEL(),
      max_tokens: 2048,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Image 1: VIN plate" }, image(vin),
          { type: "text", text: "Image 2: whole car with licence plate" }, image(car),
          { type: "text", text: "Image 3: odometer" }, image(odo),
          { type: "text", text: "Read the VIN from image 1, the licence plate from image 2 and the odometer from image 3. "
            + "Only report characters you can actually see; use null rather than guessing. "
            + "If the odometer is in miles, convert to km." + country },
        ],
      }],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) throw new Error(`vision API error ${err.status ?? "network"}`);
    throw new Error(`vision request failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
  if (res.stop_reason === "refusal") throw new Error("vision refused");
  if (res.stop_reason === "max_tokens") throw new Error("vision answer truncated");
  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text ?? "") as Record<string, unknown>;
  } catch {
    throw new Error("vision answer not JSON");
  }
  const vinRead = normVin(raw.vin);
  const conf = Number(raw.vin_confidence);
  return {
    vin: vinRead,
    confidence: vinRead && Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0,
    plate: normPlate(raw.plate),
    odometerKm: normKm(raw.odometer_km),
  };
}
