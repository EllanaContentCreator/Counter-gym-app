/**
 * Counter — sheet reader.
 * Netlify Function (v2): receives a photo of one of Carolyn's workout sheets and returns the rows
 * as JSON, read by Claude. Set these environment variables on the Netlify site:
 *   ANTHROPIC_API_KEY   your key from console.anthropic.com
 *   SCAN_PASSCODE       a word the group types into Counter → Me → "Sheet reader" (optional but recommended)
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const RowSchema = z.object({
  slot: z.string().describe('Station label exactly as written: "1", "1+", "2", "3", "4", "4+", "ALL" or "TABATA"'),
  exercise: z.string().describe("Exercise name as written on the sheet, including any machine/setting notes"),
  weight: z.string().describe('Weight column as written, e.g. "12.5", "39+2", "5 P", "0". Empty string if blank'),
  sets: z.string().describe('Sets column as written, e.g. "each side", "plate". Empty string if blank'),
  reps: z.string().describe('Reps column as written, e.g. "10", "10+10", "8 each". Empty string if blank'),
  rest: z.string().describe("Rest / note column as written. Empty string if blank"),
});

const SheetSchema = z.object({
  personName: z.string().describe("Name written at the top of the sheet, or empty string"),
  dayLabel: z.string().describe('Day/date as written at the top, e.g. "TUES 15 SEPT", or empty string'),
  title: z.string().describe("Program title/number if written, or empty string"),
  notes: z.string().describe("Any general notes on the sheet not tied to one row, or empty string"),
  rows: z.array(RowSchema).describe("Every exercise row in top-to-bottom order"),
  confidence: z.enum(["high", "medium", "low"]).describe("How legible the sheet was overall"),
});

export type ScannedSheet = z.infer<typeof SheetSchema>;

const SYSTEM = `You read photographs and screenshots of handwritten or printed gym training sheets written by a personal trainer (Carolyn) for a small group of women. Transcribe them faithfully into structured rows.

Sheet format:
- Columns are: Exercise | Weight | Sets | Reps | Rest. Some columns are often blank.
- The left edge of each row carries a station label: a number (1, 2, 3, 4), a number with a plus (1+, 4+) meaning a superset paired with the station above, "ALL" for a row everyone does, or "TABATA" (often highlighted yellow) for a finisher.
- Weights are written as free text: "12.5", "39+2", "5 P" (5 kg plate), "0" for bodyweight, "5 + 10+5" (plates per side).
- Keep the trainer's wording, capitalisation quirks aside: "Cable Three Way - Middle / Left / Right : Cable Highest Hole" stays as one exercise name.
- If a TABATA row lists several moves separated by slashes, keep them in one row's exercise name.
- If a cell is unreadable, make your best guess and lower the confidence. Never invent rows that are not on the sheet.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, x-counter-passcode",
      "access-control-allow-methods": "POST, OPTIONS",
    },
  });

export default async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "POST a JSON body { image, mediaType }" }, 405);

  const passcode = process.env.SCAN_PASSCODE;
  if (passcode && req.headers.get("x-counter-passcode") !== passcode) {
    return json({ error: "Wrong group passcode. Check Me → Sheet reader in Counter." }, 401);
  }
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "The sheet reader has no ANTHROPIC_API_KEY set on Netlify yet." }, 500);

  let body: { image?: string; mediaType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  const image = body.image?.replace(/^data:[^;]+;base64,/, "");
  const mediaType = (body.mediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  if (!image) return json({ error: "No image supplied." }, 400);
  if (image.length > 8_000_000) return json({ error: "Photo too large. Try again — the app shrinks photos before sending." }, 413);

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "medium", format: zodOutputFormat(SheetSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: "Transcribe this training sheet into rows." },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return json({ error: "The reader declined this image. Try a clearer photo of just the sheet." }, 422);
    if (!response.parsed_output) return json({ error: "Could not make sense of the sheet. Try a straighter, brighter photo." }, 422);
    return json({ sheet: response.parsed_output, usage: response.usage });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return json({ error: "The Anthropic API key on Netlify is invalid." }, 500);
    if (err instanceof Anthropic.RateLimitError) return json({ error: "The reader is busy. Wait a moment and try again." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Reader error ${err.status}: ${err.message}` }, 502);
    return json({ error: "The reader failed unexpectedly." }, 500);
  }
};
