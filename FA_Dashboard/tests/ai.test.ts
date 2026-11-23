// AI 응답 해석 테스트 (실제 API 호출 없음): npx tsx tests/ai.test.ts
import assert from "node:assert/strict";
import { parseAiResponse, buildPrompt } from "../lib/ai";
import { mergeItems } from "../lib/news";
import { teamById } from "../lib/teams";

const team = teamById("mlb-nyy")!;
const items = mergeItems(team, [
  { lang: "en", items: [{ title: "Yankees To Sign Jonathan Loaisiga", source: "MLBTR", link: "https://x/1", publishedAt: "2026-11-20T00:00:00.000Z" }] },
  { lang: "ko", items: [{ title: "양키스, FA 아로자레나에 관심", source: "매일경제", link: "https://x/2", publishedAt: "2026-11-19T00:00:00.000Z" }] },
]);

const prompt = buildPrompt(team, "baseball", items);
assert.ok(prompt.includes("0\t2026-11-20\ten\tYankees To Sign"), "프롬프트에 번호·날짜·언어·제목");

const reply = `네, 결과입니다.
{"summary":["양키스가 로아이시가와 계약하며 불펜을 보강했다.","아로자레나 영입 관심 보도가 나왔다.","3루 보강이 남은 과제다.","넷째 줄은 잘려야 함"],
 "players":[{"name":"로아이시가","status":"done","note":"계약 합의"},{"name":"아로자레나","status":"rumor","note":"관심"},{"name":"잘못된","status":"unknown"}],
 "items":[{"i":0,"status":"done","ko":"양키스, 조너선 로아이시가와 계약 예정"},{"i":1,"status":"rumor","ko":"한글 기사는 번역 안 함"},{"i":9,"status":"done"}]}`;
const r = parseAiResponse(reply, items, "test-model")!;
assert.ok(r, "앞뒤 잡담이 있어도 JSON 추출");
assert.equal(r.brief.summary.length, 3, "요약은 최대 3줄");
assert.equal(r.brief.players.length, 2, "잘못된 상태값은 버림");
const en = items.find((i) => i.lang === "en")!;
const ko = items.find((i) => i.lang === "ko")!;
assert.equal(r.items[en.id].ko, "양키스, 조너선 로아이시가와 계약 예정");
assert.equal(r.items[ko.id].ko, undefined, "한글 기사는 번역 제목 없음");
assert.equal(parseAiResponse("JSON 없음", items, "m"), null);
assert.equal(parseAiResponse("{깨진 json", items, "m"), null);
console.log("ai tests OK");
