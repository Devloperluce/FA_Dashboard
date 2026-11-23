// RSS 파싱·정리 테스트: npx tsx tests/news.test.ts
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { parseRss, mergeItems, buildQueries } from "../lib/news";
import { teamById } from "../lib/teams";

const read = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");

const g = parseRss(read("google-ko.xml"));
assert.equal(g.length, 3);
assert.equal(g[0].source, "mlbkor.com", "주소로 온 매체명은 도메인으로");
assert.ok(!g[0].title.includes("https://"), "제목 끝의 주소 매체명 제거");
assert.ok(g[1].title.endsWith("냉정한 평가도"), "반복된 매체명 제거: " + g[1].title);

const m = parseRss(read("mlbtr.xml"), "MLB Trade Rumors");
assert.equal(m.length, 3);
assert.equal(m[0].source, "MLB Trade Rumors");
assert.ok(m[2].title.includes("’"), "숫자 엔티티 디코딩: " + m[2].title);

const nyy = teamById("mlb-nyy")!;
const merged = mergeItems(nyy, [
  { lang: "ko", items: g },
  { lang: "en", items: m.map((i) => ({ ...i, teamFeed: true })) },
]);
const nonTender = merged.find((i) => i.title.startsWith("2026 Non-Tenders"))!;
assert.equal(nonTender.mentionsTeam, true, "팀 전용 피드는 팀 기사로 취급");
assert.equal(nonTender.status, "leaving");

const q = buildQueries(teamById("mlb-lad")!, "baseball", true);
assert.ok(q[0].q.includes('"다저스"'), "한글 별칭 검색: " + q[0].q);
assert.ok(q.some((x) => x.url?.includes("los-angeles-dodgers")), "MLBTR 피드 포함");
const tot = buildQueries(teamById("epl-mun")!, "soccer", false);
assert.ok(tot[0].q.includes('"맨유"'), tot[0].q);

// 다른 팀 계약: 다저스 화면에서는 '다른 팀 계약', 메츠 화면에서는 '확정'
const skubal = [{ title: "Tarik Skubal Signs Record Contract With Mets: What's Next For The Dodgers?", source: "Bleacher Report", link: "https://x/s", publishedAt: "2026-11-22T00:00:00.000Z" }];
const lad = mergeItems(teamById("mlb-lad")!, [{ lang: "en", items: skubal }])[0];
assert.equal(lad.status, "other");
assert.equal(lad.otherTeam, true);
const nym = mergeItems(teamById("mlb-nym")!, [{ lang: "en", items: skubal }])[0];
assert.equal(nym.status, "done", "뒤에 붙은 물음 문장 때문에 루머로 내려가지 않음");
assert.equal(nym.otherTeam, undefined);

console.log("news tests OK");
