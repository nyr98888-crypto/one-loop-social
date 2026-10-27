import {
  OPENROUTER_MODEL,
  OPENROUTER_URL,
} from "@/lib/ai/constants";
import {
  db,
  getDatabaseMode,
  resolveDatabaseUrl,
} from "@/lib/db/client";

export type ServiceStatus = "connected" | "error" | "missing_key";

export interface ServiceHealth {
  status: ServiceStatus;
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  ok: boolean;
  checkedAt: string;
  services: {
    openrouter: ServiceHealth;
    fal: ServiceHealth;
    database: ServiceHealth;
  };
}

function hasKey(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; latencyMs: number }> {
  const started = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - started };
}

export async function checkOpenRouter(): Promise<ServiceHealth> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!hasKey(apiKey)) {
    return {
      status: "missing_key",
      latencyMs: 0,
      message: "OPENROUTER_API_KEY is not set",
    };
  }

  try {
    const { result: res, latencyMs } = await timed(() =>
      fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "One Loop Social Health Check",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? OPENROUTER_MODEL,
          max_tokens: 5,
          messages: [{ role: "user", content: "ping" }],
        }),
      }),
    );

    const data = (await res.json().catch(() => null)) as {
      choices?: unknown[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      return {
        status: "error",
        latencyMs,
        message:
          data?.error?.message ?? `OpenRouter HTTP ${res.status}`,
        details: { httpStatus: res.status },
      };
    }

    return {
      status: "connected",
      latencyMs,
      message: "OpenRouter completion OK",
      details: {
        model: process.env.OPENROUTER_MODEL ?? OPENROUTER_MODEL,
        hasChoices: Array.isArray(data?.choices),
      },
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: 0,
      message: err instanceof Error ? err.message : "OpenRouter request failed",
    };
  }
}

export async function checkFal(): Promise<ServiceHealth> {
  const apiKey = process.env.FAL_KEY?.trim();
  if (!hasKey(apiKey)) {
    return {
      status: "missing_key",
      latencyMs: 0,
      message: "FAL_KEY is not set",
    };
  }

  try {
    const { result: res, latencyMs } = await timed(() =>
      fetch("https://api.fal.ai/v1/models?limit=1", {
        method: "GET",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
      }),
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        status: "error",
        latencyMs,
        message: `FAL HTTP ${res.status}`,
        details: {
          httpStatus: res.status,
          body: body.slice(0, 200),
        },
      };
    }

    return {
      status: "connected",
      latencyMs,
      message: "FAL credentials validated",
      details: { endpoint: "https://api.fal.ai/v1/models" },
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: 0,
      message: err instanceof Error ? err.message : "FAL request failed",
    };
  }
}

export async function checkDatabase(): Promise<ServiceHealth> {
  const mode = getDatabaseMode();
  const url = resolveDatabaseUrl();

  try {
    const { latencyMs } = await timed(async () => {
      const read = await db.execute("SELECT 1 as health_check");
      const value = Number(read.rows[0]?.health_check);
      if (value !== 1) {
        throw new Error(
          `Unexpected SELECT 1 result: ${String(read.rows[0]?.health_check)}`,
        );
      }

      // Lightweight write probe
      await db.execute(`
        CREATE TABLE IF NOT EXISTS _health_probe (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          checked_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      await db.execute(
        `INSERT INTO _health_probe (checked_at) VALUES (datetime('now'))`,
      );
    });

    return {
      status: "connected",
      latencyMs,
      message:
        mode === "local"
          ? "Local SQLite fallback OK (read/write)"
          : "Turso cloud OK (read/write)",
      details: {
        mode,
        url: mode === "local" ? url : url.replace(/\/\/.*@/, "//***@"),
      },
    };
  } catch (err) {
    return {
      status: "error",
      latencyMs: 0,
      message: err instanceof Error ? err.message : "Database check failed",
      details: { mode, url: mode === "local" ? url : "(cloud)" },
    };
  }
}

export async function runHealthChecks(): Promise<HealthReport> {
  const [openrouter, fal, database] = await Promise.all([
    checkOpenRouter(),
    checkFal(),
    checkDatabase(),
  ]);

  const services = { openrouter, fal, database };
  const ok = Object.values(services).every((s) => s.status === "connected");

  return {
    ok,
    checkedAt: new Date().toISOString(),
    services,
  };
}
