/**
 * Full API diagnostic — 2-tier cascade + FAL Recraft V3.
 * 1A gpt-4o → 1B gpt-4o-mini → 1C gpt-4.1-mini → 2A DeepSeek-Flash → 2B Qwen
 */

interface TestResult {
  step: string;
  provider: string;
  model: string;
  status: "SUCCESS" | "FAILED";
  durationMs: number;
  details: string;
}

const results: TestResult[] = [];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";
const TIER1_TIMEOUT_MS = 8_000;
const TIER2_TIMEOUT_MS = 12_000;

type CascadeStep = {
  step: string;
  provider: string;
  model: string;
  url: string;
  timeoutMs: number;
  getKey: () => string | undefined;
  headers: (key: string) => Record<string, string>;
};

const CASCADE: CascadeStep[] = [
  {
    step: "Tier 1A",
    provider: "OpenRouter",
    model: "openai/gpt-4o",
    url: OPENROUTER_URL,
    timeoutMs: TIER1_TIMEOUT_MS,
    getKey: () => process.env.OPENROUTER_API_KEY,
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OneLoop Diagnostic Test",
      "Content-Type": "application/json",
    }),
  },
  {
    step: "Tier 1B",
    provider: "OpenRouter",
    model: "openai/gpt-4o-mini",
    url: OPENROUTER_URL,
    timeoutMs: TIER1_TIMEOUT_MS,
    getKey: () => process.env.OPENROUTER_API_KEY,
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OneLoop Diagnostic Test",
      "Content-Type": "application/json",
    }),
  },
  {
    step: "Tier 1C",
    provider: "OpenRouter",
    model: "openai/gpt-4.1-mini",
    url: OPENROUTER_URL,
    timeoutMs: TIER1_TIMEOUT_MS,
    getKey: () => process.env.OPENROUTER_API_KEY,
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OneLoop Diagnostic Test",
      "Content-Type": "application/json",
    }),
  },
  {
    step: "Tier 2A",
    provider: "Together AI",
    model: "deepseek-ai/DeepSeek-V4.1-Flash",
    url: TOGETHER_URL,
    timeoutMs: TIER2_TIMEOUT_MS,
    getKey: () => process.env.TOGETHER_API_KEY,
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
  },
  {
    step: "Tier 2B",
    provider: "Together AI",
    model: "Qwen/Qwen3.5-9B",
    url: TOGETHER_URL,
    timeoutMs: TIER2_TIMEOUT_MS,
    getKey: () => process.env.TOGETHER_API_KEY,
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
  },
];

async function probeCascadeStep(
  step: CascadeStep,
  index: number,
  total: number,
): Promise<boolean> {
  const start = Date.now();
  console.log(
    `\n🔍 [${index}/${total}] ${step.step}: ${step.provider} (${step.model})…`,
  );

  const key = step.getKey()?.trim();
  if (!key) {
    results.push({
      step: step.step,
      provider: step.provider,
      model: step.model,
      status: "FAILED",
      durationMs: 0,
      details: `Missing API key for ${step.provider}`,
    });
    console.error(`❌ Missing key for ${step.provider}`);
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), step.timeoutMs);

  try {
    const res = await fetch(step.url, {
      method: "POST",
      headers: step.headers(key),
      signal: controller.signal,
      body: JSON.stringify({
        model: step.model,
        messages: [
          {
            role: "system",
            content: 'החזר JSON תקין בלבד: {"status": "ok", "tier": string}',
          },
          { role: "user", content: `בדיקת שפיות — ${step.step}` },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const data = await res.json();
    const duration = Date.now() - start;

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    }

    results.push({
      step: step.step,
      provider: step.provider,
      model: step.model,
      status: "SUCCESS",
      durationMs: duration,
      details: "תגובה תקינה",
    });
    console.log(`✅ Served by: ${step.model} in ${duration} ms`);
    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timed out after ${step.timeoutMs}ms`
          : err.message
        : String(err);
    results.push({
      step: step.step,
      provider: step.provider,
      model: step.model,
      status: "FAILED",
      durationMs: Date.now() - start,
      details: message,
    });
    console.error(`❌ ${step.step} נכשל: ${message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function testCascadeReachability(): Promise<void> {
  console.log("\n⚡ בודק נגישות לכל דרגות המפל…");
  const total = CASCADE.length + 1;
  for (let i = 0; i < CASCADE.length; i++) {
    await probeCascadeStep(CASCADE[i]!, i + 1, total);
  }

  const firstLive = results.find(
    (r) =>
      r.status === "SUCCESS" &&
      (r.step.startsWith("Tier 1") || r.step.startsWith("Tier 2")),
  );
  if (firstLive) {
    console.log(
      `\n📌 Production would serve: ${firstLive.model} (${firstLive.step})`,
    );
  } else {
    console.error("\n⚠️ כל דרגות המפל נכשלו");
  }
}

async function testFalAiVisual(): Promise<boolean> {
  const start = Date.now();
  const index = CASCADE.length + 1;
  console.log(
    `\n🎨 [${index}/${index}] בודק מנוע תמונות: FAL AI (Recraft V3)...`,
  );

  const key = process.env.FAL_KEY;
  if (!key) {
    results.push({
      step: "Visual Engine",
      provider: "FAL AI",
      model: "fal-ai/recraft-v3",
      status: "FAILED",
      durationMs: 0,
      details: "Missing FAL_KEY in .env.local",
    });
    return false;
  }

  try {
    const res = await fetch("https://fal.run/fal-ai/recraft-v3", {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt:
          "A clean modern automotive repair workshop with a car lifted on a hydraulic lift, realistic lighting",
        image_size: "square_hd",
        style: "realistic_image",
      }),
    });

    const data = (await res.json()) as {
      images?: Array<{ url?: string }>;
    };
    const duration = Date.now() - start;

    if (!res.ok || !data.images?.[0]?.url) {
      throw new Error(`FAL Error: ${JSON.stringify(data)}`);
    }

    results.push({
      step: "Visual Engine",
      provider: "FAL AI",
      model: "fal-ai/recraft-v3",
      status: "SUCCESS",
      durationMs: duration,
      details: `נוצרה תמונה תקינה: ${data.images[0].url.substring(0, 45)}...`,
    });
    console.log(`✅ FAL AI Recraft V3 ייצר תמונה תקינה תוך ${duration}ms`);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      step: "Visual Engine",
      provider: "FAL AI",
      model: "fal-ai/recraft-v3",
      status: "FAILED",
      durationMs: Date.now() - start,
      details: message,
    });
    console.error(`❌ FAL AI נכשל: ${message}`);
    return false;
  }
}

async function runDiagnostic() {
  console.log("==================================================");
  console.log("🚀 דיאגנוסטיקה — מפל אמין (כל קריאה מקבלת תשובה)");
  console.log(
    "   1A gpt-4o → 1B mini → 1C 4.1-mini → 2A DeepSeek-Flash → 2B Qwen",
  );
  console.log("==================================================");

  await testCascadeReachability();
  await testFalAiVisual();

  console.log("\n==================================================");
  console.log("📊 DIAGNOSTIC REPORT");
  console.log("==================================================");
  console.table(results, [
    "step",
    "provider",
    "model",
    "status",
    "durationMs",
    "details",
  ]);

  const cascadeOk = results.some(
    (r) =>
      r.status === "SUCCESS" &&
      (r.step.startsWith("Tier 1") || r.step.startsWith("Tier 2")),
  );
  const falOk = results.some(
    (r) => r.step === "Visual Engine" && r.status === "SUCCESS",
  );

  if (cascadeOk && falOk) {
    console.log(
      "\n🎉 Pipeline usable — at least one cascade tier + FAL succeeded.",
    );
  } else {
    console.log("\n⚠️ Cascade and/or FAL failed — check the table above.");
  }

  process.exit(cascadeOk && falOk ? 0 : 1);
}

void runDiagnostic();

export {};
