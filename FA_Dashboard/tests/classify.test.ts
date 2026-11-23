// 실제 헤드라인(2026-11 수집) 기반 분류 정확도 측정: npx tsx tests/classify.test.ts
import { readFileSync } from "node:fs";
import { classify } from "../lib/classify";
const file = process.argv.find((a) => a.endsWith(".json")) ?? "headlines.json";
const data: [string, string][] = JSON.parse(readFileSync(new URL("./" + file.split("/").pop(), import.meta.url), "utf8"));
console.log(`[${file}]`);
let ok = 0;
const miss: string[] = [];
for (const [want, title] of data) {
  const got = classify(title);
  if (got === want) ok++;
  else miss.push(`  기대 ${want.padEnd(7)} 결과 ${got.padEnd(7)} ${title.slice(0, 70)}`);
}
console.log(`정확도 ${ok}/${data.length} (${Math.round((ok / data.length) * 100)}%)`);
if (process.argv.includes("-v")) console.log(miss.join("\n"));
