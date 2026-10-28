import {
  CascadeExhaustedError,
  runChatCascade,
} from "./llm-cascade";
import { TextEngineError, parseResilientJson } from "./text-engine";
import { generateFluxImageSafe } from "./fal";
import { lintFalPrompt } from "@/lib/visualCompiler";

export interface CampaignSnapshot {
  businessName: string;
  industry: string;
  headline: string;
  instagramCaption: string;
  facebookCaption: string;
  waBroadcastMessage: string;
  igCtaText?: string;
  waActionButton?: string;
  imagePrompt: string;
  generatedImage: string;
}

export interface RefineResult {
  reply: string;
  updated: Partial<CampaignSnapshot>;
  regeneratedImage: boolean;
  provider: "together" | "openrouter";
  model: string;
}

async function resilientJsonChat(
  system: string,
  user: string,
  temperature = 0.55,
): Promise<{
  data: unknown;
  provider: "together" | "openrouter";
  model: string;
}> {
  let data: unknown = null;

  try {
    const served = await runChatCascade({
      system: `${system}\n\nRespond ONLY in valid JSON without markdown fences.`,
      user,
      temperature,
      maxTokens: 2000,
      accept: (content) => {
        data = parseResilientJson(content);
      },
    });

    if (data === null) {
      throw new TextEngineError("Cascade returned without JSON", 500);
    }

    return { data, provider: served.provider, model: served.model };
  } catch (err) {
    if (err instanceof CascadeExhaustedError) {
      throw new TextEngineError("All cascade tiers failed", 500, {
        cascadeErrors: err.failures,
      });
    }
    throw err;
  }
}

const SANITIZE_SYSTEM = `You silently correct Hebrew/English typos in a business owner's free-form marketing prompt.
Rules:
- Fix spelling, nikud-free Hebrew typos, duplicated letters, and obvious OCR/keyboard mistakes.
- NEVER change meaning, offers, prices, times, names, or marketing intent.
- Do NOT rewrite into marketing copy — keep the user's voice and structure.
- Return JSON only: { "corrected": string, "changed": boolean }`;

/** Silent typo pass before generation — preserves intent. */
export async function sanitizeUserPrompt(raw: string): Promise<{
  corrected: string;
  changed: boolean;
}> {
  const input = raw.trim();
  if (!input) return { corrected: "", changed: false };

  try {
    const { data } = await resilientJsonChat(
      SANITIZE_SYSTEM,
      `RAW PROMPT:\n${input}`,
      0.1,
    );
    const obj = data as Record<string, unknown>;
    const corrected =
      typeof obj.corrected === "string" && obj.corrected.trim()
        ? obj.corrected.trim()
        : input;
    return {
      corrected,
      changed: Boolean(obj.changed) && corrected !== input,
    };
  } catch (err) {
    console.warn("[sanitize] failed — using raw prompt", err);
    return { corrected: input, changed: false };
  }
}

const REFINE_SYSTEM = `You are the Proactive Marketing Agent for an Israeli local-business social studio.
The user already has generated Instagram, Facebook, WhatsApp broadcast copy and an image prompt.
They send a short refinement (Hebrew or English). Apply it IN-PLACE.

Return STRICT JSON:
{
  "reply": "short Hebrew confirmation of what you changed",
  "needsImageRegen": boolean,
  "instagramCaption": string | null,
  "facebookCaption": string | null,
  "waBroadcastMessage": string | null,
  "headline": string | null,
  "imagePrompt": string | null
}

Rules:
- Only change fields that the refinement requires; set unchanged fields to null.
- needsImageRegen=true when the user asks to change visual angle, remove people, lighting, product framing, etc.
- imagePrompt must be English physical photography (tactile textures, natural light, shallow DOF). Forbid marketing buzzwords, stamps, logos, watermarks.
- Keep Hebrew copy authentic; never echo the refinement instruction as the caption.
- If user says it's perfect / ready to ship, reply warmly and leave fields null with needsImageRegen=false.`;

export async function refineCampaignInPlace(
  snapshot: CampaignSnapshot,
  instruction: string,
): Promise<RefineResult> {
  const user = [
    `businessName: ${snapshot.businessName}`,
    `industry: ${snapshot.industry}`,
    `headline: ${snapshot.headline}`,
    `instagramCaption: ${snapshot.instagramCaption}`,
    `facebookCaption: ${snapshot.facebookCaption}`,
    `waBroadcastMessage: ${snapshot.waBroadcastMessage}`,
    `imagePrompt: ${snapshot.imagePrompt}`,
    "",
    `USER REFINEMENT: ${instruction.trim()}`,
  ].join("\n");

  const { data, provider, model } = await resilientJsonChat(
    REFINE_SYSTEM,
    user,
    0.65,
  );
  const root = data as Record<string, unknown>;

  const asStr = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const reply = asStr(root.reply) || "עדכנתי לפי הבקשה שלך ✨";
  const needsImageRegen = Boolean(root.needsImageRegen);

  const updated: Partial<CampaignSnapshot> = {};
  const ig = asStr(root.instagramCaption);
  const fb = asStr(root.facebookCaption);
  const wa = asStr(root.waBroadcastMessage);
  const headline = asStr(root.headline);
  let imagePrompt = asStr(root.imagePrompt);

  if (ig) updated.instagramCaption = ig;
  if (fb) updated.facebookCaption = fb;
  if (wa) updated.waBroadcastMessage = wa;
  if (headline) updated.headline = headline;

  let regeneratedImage = false;

  if (needsImageRegen) {
    const basePrompt = imagePrompt || snapshot.imagePrompt;
    const lint = lintFalPrompt({ prompt: basePrompt });
    imagePrompt = lint.prompt;
    updated.imagePrompt = imagePrompt;

    const img = await generateFluxImageSafe({
      prompt: imagePrompt,
      timeoutMs: 45_000,
      foodHintText: [snapshot.businessName, snapshot.industry, instruction].join(
        " ",
      ),
    });
    if (img.imageUrl) {
      updated.generatedImage = img.imageUrl;
      regeneratedImage = true;
    }
  } else if (imagePrompt) {
    updated.imagePrompt = lintFalPrompt({ prompt: imagePrompt }).prompt;
  }

  return { reply, updated, regeneratedImage, provider, model };
}
