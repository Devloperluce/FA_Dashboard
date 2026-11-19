// 로컬 개발용 가짜 데이터 (NEWS_MOCK=1 일 때만 사용). 실제 기사 아님.
import { mergeItems, type NewsResponse } from "./news";
import type { Team } from "./teams";

const TEMPLATES = [
  "{t}, 내부 FA 선수A와 4년 계약 체결",
  "{t}, 외부 FA 선수B 영입 협상 막바지",
  "{t} 선수C, 결별 수순…타 구단 이적 유력",
  "{t}, 거포 선수D에 관심…영입 후보 물망",
  "[단독] {t}, 선수E에 공식 제안",
  "{t} 스토브리그 전력 보강 시나리오 점검",
  "{t}, 보상선수 지명 앞두고 보호명단 고심",
  "{t} agree to terms with Player F on one-year deal",
  "{t} linked with Player G as winter target",
  "{t} in talks with Player H's agent",
];

export function mockNews(team: Team): NewsResponse {
  const now = Date.now();
  const items = Array.from({ length: 34 }, (_, i) => {
    const tpl = TEMPLATES[(i * 7) % TEMPLATES.length];
    const isEn = /[a-z]{4}/.test(tpl.replace("{t}", ""));
    const name = isEn ? team.en : team.ko;
    return {
      lang: (isEn ? "en" : "ko") as "ko" | "en",
      raw: {
        title: tpl.replace("{t}", name) + (i > 9 ? ` ${i}보` : ""),
        source: ["가상일보", "샘플스포츠", "Mock Times", "테스트뉴스"][i % 4],
        link: "https://example.com/mock/" + i,
        publishedAt: new Date(now - (i * i * 0.35 + i) * 3600_000).toISOString(),
      },
    };
  });
  return {
    teamId: team.id,
    fetchedAt: new Date().toISOString(),
    queries: ["(mock)"],
    items: mergeItems(team, [
      { lang: "ko", items: items.filter((x) => x.lang === "ko").map((x) => x.raw) },
      { lang: "en", items: items.filter((x) => x.lang === "en").map((x) => x.raw) },
    ]),
    errors: [],
  };
}
