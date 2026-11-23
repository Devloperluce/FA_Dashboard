// 팀 입장 판단 테스트: npx tsx tests/perspective.test.ts
import assert from "node:assert/strict";
import { isOtherTeamDeal } from "../lib/perspective";
import { teamById } from "../lib/teams";

const T = (id: string) => teamById(id)!;
const cases: [string, string, boolean][] = [
  // [팀, 제목, 다른 팀 계약인가]
  ["mlb-lad", "Tarik Skubal Signs Record Contract With Mets: What's Next For The Dodgers?", true],
  ["mlb-nym", "Tarik Skubal Signs Record Contract With Mets: What's Next For The Dodgers?", false],
  ["mlb-lad", "스쿠벌, 메츠와 역대 투수 최고액 계약", true],
  ["mlb-nym", "스쿠벌, 메츠와 역대 투수 최고액 계약", false],
  ["kbo-hanwha", "FA 와이스, 한화 복귀 대신 샌디에이고와 계약…송성문과 한솥밥", true], // 한화 입장에선 다른 팀(SD) 계약
  ["kbo-lg", "양의지, 두산 베어스와 2년 최대 55억원 잔류 계약", true],
  ["kbo-doosan", "양의지, 두산 베어스와 2년 최대 55억원 잔류 계약", false],
  ["kbo-hanwha", "롯데 자이언츠, 키움 외야수 임지열 트레이드 영입", true],
  ["kbo-kiwoom", "롯데는 키움 주장 임지열, 키움은 신인왕 출신 정철원 영입", false],
  ["mlb-lad", "Twins, Dodgers Swap Royce Lewis For Bobby Miller", false],
  ["mlb-nyy", "Yankees To Sign Jonathan Loaisiga", false],
  ["mlb-lad", "Blue Jays Claim Christian Cairo, Designate Chase Lee For Assignment", true],
  ["mlb-tor", "Blue Jays Claim Christian Cairo, Designate Chase Lee For Assignment", false],
  ["epl-tot", "[오피셜] 레알 마드리드, 쿠르투아와 재계약 발표, 2028년까지 동행", true],
  ["laliga-rma", "[오피셜] 레알 마드리드, 쿠르투아와 재계약 발표, 2028년까지 동행", false],
  ["kbo-hanwha", "‘중견수 대어’ 최지훈 SSG 잔류…FA C등급 김호령 거취에 촉각", true],
  ["kbo-ssg", "‘중견수 대어’ 최지훈 SSG 잔류…FA C등급 김호령 거취에 촉각", false],
  ["epl-tot", "Tottenham set sights on signing Reims attacker Yaya Fofana", false],
];
let bad = 0;
for (const [id, title, want] of cases) {
  const got = isOtherTeamDeal(title, T(id));
  if (got !== want) {
    bad++;
    console.log(`  ✗ [${id}] 기대 ${want} 결과 ${got}: ${title}`);
  }
}
assert.equal(bad, 0, `${bad}건 실패`);
console.log(`perspective tests OK (${cases.length}건)`);
