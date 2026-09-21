/**
 * Counter — food reader.
 * Netlify Function (v2): takes either a plain-English description of a meal
 * ("two eggs on toast and a flat white") or a photo of one, and returns the
 * calories and protein, read by Claude. Uses the same environment variables as
 * the sheet reader:
 *   ANTHROPIC_API_KEY   your key from console.anthropic.com
 *   SCAN_PASSCODE       the word the group types into Counter → Me → "Sheet reader" (optional)
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const FoodSchema = z.object({
  name: z.string().describe('Short name for the whole thing, as it would read in a food diary, e.g. "Eggs on toast + flat white". Under 40 characters'),
  quantity: z.string().describe('The portion, however it was described, e.g. "2 eggs, 1 slice", "1 bowl", "150 g". Empty string if it cannot be told'),
  calories: z.number().describe("Best estimate of total kilocalories for the whole lot"),
  protein: z.number().describe("Best estimate of total protein in grams"),
  carbs: z.number().describe("Best estimate of total carbohydrate in grams"),
  fat: z.number().describe("Best estimate of total fat in grams"),
  items: z.array(z.string()).describe('One short line per component with its own calories, e.g. "2 poached eggs — 140 cal". Empty array for a single simple item'),
  assumption: z
    .string()
    .describe('Anything you had to guess, in one short plain sentence, e.g. "Assumed full-cream milk and a medium cup". Empty string if nothing was guessed'),
  confidence: z.enum(["high", "medium", "low"]).describe("How sure the estimate is"),
});

const SYSTEM = `You estimate the nutrition of everyday meals for a woman logging her food in a fitness app in Australia.

- Assume Australian supermarket products, portion sizes and names (a "flat white", a "slice of Helga's", a "Weet-Bix").
- When the portion is not given, assume an ordinary home-cooked serving for one adult woman — not a restaurant serving, not a bodybuilder's.
- Estimate the total for everything described, added together. Round calories to the nearest 5 and grams to the nearest 1.
- Protein matters most to her after calories, so take extra care over it.
- Put every real guess in "assumption", in plain words, so she can correct it. Don't pad it with things you didn't actually guess.
- Lower the confidence when the description is vague, the photo is unclear, or the portion could reasonably be half or double what you assumed.
- Never refuse a reasonable food description. If you genuinely cannot tell what it is, return zeros with low confidence and say so in "assumption".`;

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
  if (req.method !== "POST") return json({ error: "POST a JSON body { text } or { image, mediaType }" }, 405);

  const passcode = process.env.SCAN_PASSCODE;
  if (passcode && req.headers.get("x-counter-passcode") !== passcode) {
    return json({ error: "Wrong group passcode. Check Me → Sheet reader in Counter." }, 401);
  }
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "The food reader has no ANTHROPIC_API_KEY set on Netlify yet." }, 500);

  let body: { text?: string; image?: string; mediaType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const text = (body.text ?? "").trim();
  const image = body.image?.replace(/^data:[^;]+;base64,/, "");
  const mediaType = (body.mediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  if (!text && !image) return json({ error: "Describe the food, or send a photo of it." }, 400);
  if (image && image.length > 8_000_000) return json({ error: "Photo too large. Try again — the app shrinks photos before sending." }, 413);

  // A photo and a description together are better than either: the words say
  // what the photo cannot (how it was cooked, what's underneath).
  const content: Anthropic.ContentBlockParam[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: image } });
  content.push({
    type: "text",
    text: image
      ? text
        ? `Estimate the nutrition of the food in this photo. She also described it as: ${text}`
        : "Estimate the nutrition of the food in this photo."
      : `Estimate the nutrition of: ${text}`,
  });

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "medium", format: zodOutputFormat(FoodSchema) },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return json({ error: "The reader declined that one. Try describing it in your own words." }, 422);
    if (!response.parsed_output) return json({ error: "Couldn't work that one out. Try describing it a bit more plainly." }, 422);
    return json({ food: response.parsed_output, usage: response.usage });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return json({ error: "The Anthropic API key on Netlify is invalid." }, 500);
    if (err instanceof Anthropic.RateLimitError) return json({ error: "The reader is busy. Wait a moment and try again." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `Reader error ${err.status}: ${err.message}` }, 502);
    return json({ error: "The reader failed unexpectedly." }, 500);
  }
};
