import { fileToBase64, hostCanRunReader, readerPasscode, readerSibling } from "./scan";
import { compressImage } from "./photos";

/** One meal as the reader worked it out, before she checks it. */
export interface ReadFood {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: string[];
  assumption: string;
  confidence: "high" | "medium" | "low";
}

const SET_UP_HINT = "Open Me → Sheet reader and paste the address of your reader.";

/**
 * Work out what a meal was, from a description, a photo, or both.
 *
 * Deliberately the same shape as scanSheet: the same address, the same
 * passcode, and errors phrased as something she can act on rather than a
 * status code.
 */
export async function readFood(
  input: { text?: string; file?: Blob },
  opts: { endpoint?: string; passcode?: string } = {},
): Promise<ReadFood> {
  const url = readerSibling("read-food", opts.endpoint);
  if (!url) throw new Error("No reader is set up yet. Add its address in Me → Sheet reader.");
  if (!opts.endpoint?.trim() && !hostCanRunReader()) {
    throw new Error(`This copy of Counter can't work food out on its own. ${SET_UP_HINT}`);
  }

  const payload: { text?: string; image?: string; mediaType?: string } = {};
  if (input.text?.trim()) payload.text = input.text.trim();
  if (input.file) {
    // The same shrink the sheet reader uses — a phone photo is far bigger than
    // anything the reader needs, and the upload is the slow part.
    const { blob } = await compressImage(input.file);
    const { data, mediaType } = await fileToBase64(blob);
    payload.image = data;
    payload.mediaType = mediaType;
  }
  if (!payload.text && !payload.image) throw new Error("Type what you ate, or add a photo of it.");

  const passcode = readerPasscode(opts.passcode);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(passcode ? { "x-counter-passcode": passcode } : {}) },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Couldn't reach the reader. Check you're online, and the address in Me → Sheet reader.");
  }

  const body = (await res.json().catch(() => ({}))) as { food?: ReadFood; error?: string };
  if (!res.ok || !body.food) {
    if (res.status === 404) throw new Error(`There's no food reader at ${url}. It may need redeploying. ${SET_UP_HINT}`);
    if (res.status === 401 || res.status === 403) throw new Error("The reader turned that away — check the group passcode in Me → Sheet reader.");
    if (res.status === 402 || /credit|balance|quota/i.test(body.error ?? "")) {
      throw new Error("The reader's Anthropic account is out of credit. Top it up and try again.");
    }
    if (res.status >= 500) throw new Error(body.error || "The reader hit a problem at its end. Try again in a moment.");
    throw new Error(body.error || `The reader answered with an error (${res.status}).`);
  }
  return body.food;
}

/** How sure it was, in words, because "0.72" means nothing at 7am. */
export const CONFIDENCE_NOTE: Record<ReadFood["confidence"], string> = {
  high: "",
  medium: "Rough estimate — worth a glance before you save it.",
  low: "Only a guess. Check the numbers before you save.",
};
