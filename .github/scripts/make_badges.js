/**
 * ============================================================
 * File: .github/scripts/make_badges.js
 * Purpose: Generate simple Lighthouse score badges (SVG)
 * ------------------------------------------------------------
 * Reads a Lighthouse JSON report (default: desktop) and writes
 * SVG badges under assets/img/scores/.
 * ------------------------------------------------------------
 * Usage (from CI or local):
 *   node .github/scripts/make_badges.js assets/data/lighthouse/desktop/report.json
 * ============================================================
 */

import fs from "fs";
import path from "path";

const inputPath = process.argv[2] || "assets/data/lighthouse/desktop/report.json";

// ---------- Safety checks ----------
if (!fs.existsSync(inputPath)) {
  console.log("[make_badges] Skip: report not found:", inputPath);
  process.exit(0);
}

let json;
try {
  json = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch (err) {
  console.error("[make_badges] Skip: invalid JSON in", inputPath);
  process.exit(0);
}

// ---------- Helper functions ----------

function pct(v) {
  if (v == null) return 0;
  return Math.round(Number(v) * 100);
}

function colorFor(score) {
  if (score >= 90) return "#0cce6b"; // green
  if (score >= 50) return "#ffa400"; // orange
  return "#ff4e42"; // red
}

function makeBadge(label, score) {
  const color = colorFor(score);
  const text = `${label}: ${score}`;
  const w = 140 + (String(score).length >= 3 ? 10 : 0);
  const labelW = 90;
  const valueW = w - labelW;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${label}: ${score}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="m"><rect width="${w}" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#m)">
    <rect width="${labelW}" height="20" fill="#555"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelW / 2}" y="14">${label}</text>
    <text x="${labelW + valueW / 2}" y="15" fill="#010101" fill-opacity=".3">${score}</text>
    <text x="${labelW + valueW / 2}" y="14">${score}</text>
  </g>
</svg>`;
}

// ---------- Extract category scores ----------

const cats = json.categories || {};
const scores = {
  performance: pct(cats.performance?.score),
  accessibility: pct(cats.accessibility?.score),
  best: pct(cats["best-practices"]?.score),
  seo: pct(cats.seo?.score),
  pwa: cats.pwa ? pct(cats.pwa.score) : null
};

// ---------- Write badges ----------

const outDir = "assets/img/scores";
fs.mkdirSync(outDir, { recursive: true });

function write(name, svg) {
  const outPath = path.join(outDir, name + ".svg");
  fs.writeFileSync(outPath, svg);
  console.log("  wrote", outPath);
}

write("lighthouse_performance", makeBadge("Performance", scores.performance));
write("lighthouse_accessibility", makeBadge("Accessibility", scores.accessibility));
write("lighthouse_best-practices", makeBadge("Best-Practices", scores.best));
write("lighthouse_seo", makeBadge("SEO", scores.seo));
// if (scores.pwa !== null) write("lighthouse_pwa", makeBadge("PWA", scores.pwa));

console.log("SUCCESS: Badges written to", outDir);
