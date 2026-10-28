import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  DEMO_ENHANCE_NATURAL_URL,
  DEMO_ENHANCE_STUDIO_URL,
  isFalDemoMode,
} from "@/lib/ai/demo-enhance";
import {
  runDualEnhancePipeline,
  runEnhancePipeline,
} from "@/lib/ai/enhance-pipeline";
import { FalError, uploadToFalStorage } from "@/lib/ai/fal";
import type { EnhanceFlavor, EnhanceImageRequest } from "@/lib/ai/types";
import { getVariantsBySession } from "@/lib/db/client";
import {
  DraftSessionLimitError,
  prepareDraftSession,
} from "@/lib/db/draft-session-guard";
import { insertDraftVariant } from "@/lib/db/drafts";
import { MAX_VARIANTS_PER_SESSION } from "@/lib/db/draft-constants";

export const runtime = "nodejs";
/** 4-layer FAL can exceed 2 minutes on cold starts — keep headroom. */
export const maxDuration = 300;

function isValidImageRef(value: string): boolean {
  return (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("data:image/")
  );
}

function parseFlavor(value: unknown): EnhanceFlavor | undefined {
  if (value === "natural" || value === "studio") return value;
  return undefined;
}

function parseCustomInstruction(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : undefined;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalize raw base64 / data URI / URL into a usable image ref. */
function resolveImageRef(body: Record<string, unknown>): string | null {
  const candidates = [
    asTrimmedString(body.imageUrl),
    asTrimmedString(body.image),
    asTrimmedString(body.imageBase64),
  ].filter(Boolean);

  for (const raw of candidates) {
    if (isValidImageRef(raw)) return raw;
    // Bare base64 → data URI
    if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 64) {
      return `data:image/jpeg;base64,${raw.replace(/\s+/g, "")}`;
    }
  }
  return null;
}

function parseJsonBody(body: unknown): EnhanceImageRequest | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const imageUrl = resolveImageRef(o);
  if (!imageUrl) return null;

  const industry =
    asTrimmedString(o.industry) ||
    asTrimmedString(o.businessCategory) ||
    "general";
  const sessionId = asTrimmedString(o.sessionId) || randomUUID();

  const parsed: EnhanceImageRequest = {
    imageUrl,
    sessionId,
    industry,
  };

  const targetPlatform = asTrimmedString(o.targetPlatform);
  if (targetPlatform) parsed.targetPlatform = targetPlatform;

  const styleRaw = asTrimmedString(o.selectedEnhanceStyle);
  const styleFlavor =
    styleRaw === "authentic"
      ? ("natural" as const)
      : styleRaw === "studio"
        ? ("studio" as const)
        : undefined;
  if (styleRaw === "authentic" || styleRaw === "studio") {
    parsed.selectedEnhanceStyle = styleRaw;
  }
  const preferred =
    parseFlavor(o.preferredFlavor) || styleFlavor || parseFlavor(o.flavor);
  if (preferred) {
    parsed.preferredFlavor = preferred;
    parsed.flavor = preferred;
  }

  // Default to dual when client sends the simplified base64 payload
  const dualExplicit = o.dual === true || o.dual === false;
  if (dualExplicit) {
    parsed.dual = o.dual === true;
  } else if (asTrimmedString(o.imageBase64) || !preferred) {
    parsed.dual = true;
  }

  const instruction =
    parseCustomInstruction(o.customInstruction) ||
    parseCustomInstruction(o.userInstruction);
  if (instruction) {
    parsed.customInstruction = instruction;
    parsed.userInstruction = instruction;
  }

  if (asTrimmedString(o.businessCategory)) {
    parsed.businessCategory = asTrimmedString(o.businessCategory);
  }
  if (asTrimmedString(o.headline)) parsed.headline = asTrimmedString(o.headline);
  if (asTrimmedString(o.igCaption))
    parsed.igCaption = asTrimmedString(o.igCaption);
  if (asTrimmedString(o.fbCaption))
    parsed.fbCaption = asTrimmedString(o.fbCaption);

  if (o.persist === false) parsed.persist = false;
  if (o.skipLogo === true) parsed.skipLogo = true;

  return parsed;
}

async function parseMultipart(
  request: Request,
): Promise<EnhanceImageRequest | null> {
  const form = await request.formData();
  const sessionId =
    String(form.get("sessionId") ?? "").trim() || randomUUID();
  const industry =
    String(form.get("industry") ?? "").trim() ||
    String(form.get("businessCategory") ?? "").trim() ||
    "general";

  const targetPlatform = String(form.get("targetPlatform") ?? "").trim();
  const headline = String(form.get("headline") ?? "").trim();
  const igCaption = String(form.get("igCaption") ?? "").trim();
  const fbCaption = String(form.get("fbCaption") ?? "").trim();
  const flavor = parseFlavor(String(form.get("flavor") ?? "").trim());
  const dualRaw = String(form.get("dual") ?? "").trim().toLowerCase();
  const dual =
    dualRaw === "1" ||
    dualRaw === "true" ||
    (!dualRaw && !flavor);
  const customInstruction =
    parseCustomInstruction(String(form.get("customInstruction") ?? "")) ||
    parseCustomInstruction(String(form.get("userInstruction") ?? ""));

  let imageUrl = String(form.get("imageUrl") ?? "").trim();

  const fileCandidate = form.get("file") ?? form.get("image");
  if (fileCandidate instanceof File && fileCandidate.size > 0) {
    const buffer = Buffer.from(await fileCandidate.arrayBuffer());
    const contentType = fileCandidate.type || "image/jpeg";
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    if (isFalDemoMode()) {
      imageUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    } else {
      imageUrl = await uploadToFalStorage(
        buffer,
        `enhance-upload.${ext}`,
        contentType,
      );
    }
  } else if (!imageUrl) {
    const imageField = form.get("image") ?? form.get("imageBase64");
    if (typeof imageField === "string" && imageField.trim()) {
      const raw = imageField.trim();
      imageUrl = isValidImageRef(raw)
        ? raw
        : `data:image/jpeg;base64,${raw.replace(/\s+/g, "")}`;
    }
  }

  if (!imageUrl || !isValidImageRef(imageUrl)) return null;

  return {
    imageUrl,
    sessionId,
    industry,
    ...(targetPlatform ? { targetPlatform } : {}),
    ...(flavor ? { flavor } : {}),
    ...(dual ? { dual: true } : {}),
    ...(customInstruction ? { customInstruction } : {}),
    ...(headline ? { headline } : {}),
    ...(igCaption ? { igCaption } : {}),
    ...(fbCaption ? { fbCaption } : {}),
  };
}

async function persistDualVariants(args: {
  sessionId: string;
  naturalUrl: string;
  studioUrl: string;
  nextIndex: number;
  headline?: string;
  igCaption?: string;
  fbCaption?: string;
}) {
  const naturalIndex = args.nextIndex;
  const studioIndex = args.nextIndex + 1;

  await insertDraftVariant({
    sessionId: args.sessionId,
    variantIndex: naturalIndex,
    imageUrl: args.naturalUrl,
    headline: args.headline,
    igCaption: args.igCaption,
    fbCaption: args.fbCaption,
  });
  await insertDraftVariant({
    sessionId: args.sessionId,
    variantIndex: studioIndex,
    imageUrl: args.studioUrl,
    headline: args.headline,
    igCaption: args.igCaption,
    fbCaption: args.fbCaption,
  });

  const variants = await getVariantsBySession(args.sessionId);

  return {
    naturalIndex,
    studioIndex,
    variants,
  };
}

/**
 * Enhancement pipeline → persist as draft variant(s).
 * Dual mode returns two distinct URLs: `naturalUrl` + `studioUrl`
 * (never a side-by-side composite image).
 *
 * Accepts `{ imageBase64, userInstruction?, businessCategory? }` as well as
 * the richer studio payload (`imageUrl`/`image`, `sessionId`, `industry`, …).
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let body: EnhanceImageRequest | null = null;

    if (contentType.includes("multipart/form-data")) {
      body = await parseMultipart(request);
    } else {
      body = parseJsonBody(await request.json().catch(() => null));
    }

    if (!body) {
      return NextResponse.json(
        {
          error:
            "Expected imageBase64 / image / imageUrl (and optional userInstruction, businessCategory)",
        },
        { status: 400 },
      );
    }

    const dual = body.dual === true;
    const persist = body.persist !== false;
    const slotsNeeded = dual ? 2 : 1;
    const skipLogo = body.skipLogo === true;

    let nextIndex = 1;
    if (persist) {
      try {
        const existing = await prepareDraftSession(body.sessionId);
        const existingCount = existing.length;
        if (existingCount + slotsNeeded > MAX_VARIANTS_PER_SESSION) {
          return NextResponse.json(
            {
              error: `מקסימום ${MAX_VARIANTS_PER_SESSION} גרסאות לסשן — מחקו טיוטה או בחרו גרסה קיימת`,
            },
            { status: 400 },
          );
        }
        nextIndex = existingCount + 1;
      } catch (err) {
        if (err instanceof DraftSessionLimitError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    // Demo / test keys — return distinctive dual URLs so the toggle works offline
    if (isFalDemoMode()) {
      if (dual) {
        if (!persist) {
          return NextResponse.json({
            success: true,
            dual: true,
            demo: true,
            naturalUrl: DEMO_ENHANCE_NATURAL_URL,
            studioUrl: DEMO_ENHANCE_STUDIO_URL,
            ok: true,
            imageUrl: DEMO_ENHANCE_STUDIO_URL,
          });
        }
        const { naturalIndex, studioIndex, variants } =
          await persistDualVariants({
            sessionId: body.sessionId,
            naturalUrl: DEMO_ENHANCE_NATURAL_URL,
            studioUrl: DEMO_ENHANCE_STUDIO_URL,
            nextIndex,
            headline: body.headline,
            igCaption: body.igCaption,
            fbCaption: body.fbCaption,
          });

        return NextResponse.json({
          success: true,
          dual: true,
          demo: true,
          naturalUrl: DEMO_ENHANCE_NATURAL_URL,
          studioUrl: DEMO_ENHANCE_STUDIO_URL,
          flavors: {
            natural: {
              imageUrl: DEMO_ENHANCE_NATURAL_URL,
              variantIndex: naturalIndex,
            },
            studio: {
              imageUrl: DEMO_ENHANCE_STUDIO_URL,
              variantIndex: studioIndex,
            },
          },
          variants,
          ok: true,
        });
      }

      const flavor: EnhanceFlavor = body.flavor ?? "studio";
      const demoUrl =
        flavor === "natural"
          ? DEMO_ENHANCE_NATURAL_URL
          : DEMO_ENHANCE_STUDIO_URL;

      if (!persist) {
        return NextResponse.json({
          success: true,
          demo: true,
          flavor,
          ok: true,
          imageUrl: demoUrl,
          ...(flavor === "natural"
            ? { naturalUrl: demoUrl }
            : { studioUrl: demoUrl }),
        });
      }

      await insertDraftVariant({
        sessionId: body.sessionId,
        variantIndex: nextIndex,
        imageUrl: demoUrl,
        headline: body.headline,
        igCaption: body.igCaption,
        fbCaption: body.fbCaption,
      });
      const variants = await getVariantsBySession(body.sessionId);

      return NextResponse.json({
        success: true,
        demo: true,
        flavor,
        variantIndex: nextIndex,
        variants,
        ok: true,
        imageUrl: demoUrl,
        ...(flavor === "natural"
          ? { naturalUrl: demoUrl }
          : { studioUrl: demoUrl }),
      });
    }

    if (dual) {
      const dualResult = await runDualEnhancePipeline({
        imageUrl: body.imageUrl,
        industry: body.industry,
        targetPlatform: body.targetPlatform,
        customInstruction:
          body.customInstruction || body.userInstruction,
        skipLogo,
      });

      if (!persist) {
        return NextResponse.json({
          success: true,
          dual: true,
          naturalUrl: dualResult.naturalUrl,
          studioUrl: dualResult.studioUrl,
          ok: true,
          imageUrl: dualResult.studioUrl,
          layers: {
            natural: dualResult.natural.layers,
            studio: dualResult.studio.layers,
          },
        });
      }

      const { naturalIndex, studioIndex, variants } = await persistDualVariants({
        sessionId: body.sessionId,
        naturalUrl: dualResult.naturalUrl,
        studioUrl: dualResult.studioUrl,
        nextIndex,
        headline: body.headline,
        igCaption: body.igCaption,
        fbCaption: body.fbCaption,
      });

      return NextResponse.json({
        success: true,
        dual: true,
        naturalUrl: dualResult.naturalUrl,
        studioUrl: dualResult.studioUrl,
        flavors: {
          natural: {
            imageUrl: dualResult.naturalUrl,
            variantIndex: naturalIndex,
            layers: dualResult.natural.layers,
          },
          studio: {
            imageUrl: dualResult.studioUrl,
            variantIndex: studioIndex,
            layers: dualResult.studio.layers,
          },
        },
        variants,
        ok: true,
      });
    }

    const flavor: EnhanceFlavor = body.flavor ?? "studio";
    const pipeline = await runEnhancePipeline({
      imageUrl: body.imageUrl,
      industry: body.industry,
      targetPlatform: body.targetPlatform ?? "instagram",
      flavor,
      customInstruction: body.customInstruction || body.userInstruction,
      skipLogo,
    });

    if (!persist) {
      return NextResponse.json({
        success: true,
        flavor,
        ok: true,
        imageUrl: pipeline.imageUrl,
        ...(flavor === "natural"
          ? { naturalUrl: pipeline.imageUrl }
          : { studioUrl: pipeline.imageUrl }),
        layers: pipeline.layers,
      });
    }

    await insertDraftVariant({
      sessionId: body.sessionId,
      variantIndex: nextIndex,
      imageUrl: pipeline.imageUrl,
      headline: body.headline,
      igCaption: body.igCaption,
      fbCaption: body.fbCaption,
    });

    const variants = await getVariantsBySession(body.sessionId);

    return NextResponse.json({
      success: true,
      flavor,
      variantIndex: nextIndex,
      variants,
      ok: true,
      imageUrl: pipeline.imageUrl,
      ...(flavor === "natural"
        ? { naturalUrl: pipeline.imageUrl }
        : { studioUrl: pipeline.imageUrl }),
      layers: pipeline.layers,
    });
  } catch (err) {
    if (err instanceof FalError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: err.status },
      );
    }

    console.error("[enhance-image]", err);
    return NextResponse.json(
      { error: "Failed to enhance image" },
      { status: 500 },
    );
  }
}
