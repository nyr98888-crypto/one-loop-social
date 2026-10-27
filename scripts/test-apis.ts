/**
 * Standalone API / DB verification.
 *
 * Run: npm run test:apis
 *  or: npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/test-apis.ts
 */

import { runHealthChecks } from "../src/lib/health/checks";

async function main() {
  console.log("\nOne Loop Social — API & database health check\n");

  const report = await runHealthChecks();

  const rows: Array<[string, string, string, string]> = [
    ["Service", "Status", "Latency", "Message"],
    ["-------", "------", "-------", "-------"],
  ];

  for (const [name, result] of Object.entries(report.services)) {
    rows.push([
      name,
      result.status,
      `${result.latencyMs}ms`,
      result.message ?? "",
    ]);
  }

  const widths = [0, 1, 2, 3].map((i) =>
    Math.max(...rows.map((r) => r[i]!.length)),
  );

  for (const row of rows) {
    console.log(
      row.map((cell, i) => cell.padEnd(widths[i]!)).join("  "),
    );
  }

  console.log(`\nOverall: ${report.ok ? "OK" : "DEGRADED"}`);
  console.log(`Checked at: ${report.checkedAt}\n`);

  if (!report.ok) {
    console.log("Details:");
    console.log(JSON.stringify(report.services, null, 2));
    console.log("");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Health script failed:", err);
  process.exitCode = 1;
});
