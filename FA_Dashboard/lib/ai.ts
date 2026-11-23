/**
 * AI 브리핑 (선택 기능)
 * ANTHROPIC_API_KEY 환경변수가 있으면 기사 제목 목록을 Claude에 보내
 *  - 기사별 상태 재분류 (규칙 분류보다 문맥을 잘 읽음)
 *  - 영문 제목 한국어 번역
 *  - 오늘의 현황 3줄 요약 + 선수별 현황
 * 을 받아옵니다. 키가 없거나 호출이 실패하면 규칙 기반 결과를 그대로 씁니다.
 */
import type { Status } from "./classify";
import type { NewsItem } from "./news";
import type { Sport, Team } from "./teams";

export type PlayerStatus = { name: string; status: Status; note: string };
export type AiBrief = { summary: string[]; players: PlayerStatus[]; model: string };

const STATUSES: Status[] = ["done", "leaving", "talks", "rumor", "other"];
const MAX_ITEMS = 40;

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

// 서버리스 인스턴스가 살아있는 동안만 유지되는 간단한 캐시 (같은 기사 묶음이면 재호출 안 함)
const cache = new Map<string, { at: number; value: AiResult }>();
const TTL = 30 * 60 * 1000;

type AiResult = {
  brief: AiBrief;
  items: Record<string, { status?: Status; ko?: string }>;
};

export function buildPrompt(team: Team, sport: Sport, items: NewsItem[]) {
  const market = sport === "baseball" ? "FA·트레이드" : "이적";
  const lines = items
    .slice(0, MAX_ITEMS)
    .map((it, i) => `${i}\t${it.publishedAt.slice(0, 10)}\t${it.lang}\t${it.title}`)
    .join("\n");
  return `당신은 스포츠 ${market} 시장 담당 기자입니다. 아래는 "${team.ko}"(${team.en}) 관련 최근 기사 제목입니다.
각 줄: 번호<TAB>날짜<TAB>언어<TAB>제목

${lines}

"${team.ko}" 입장에서 판단해 JSON 하나만 출력하세요. 다른 말은 쓰지 마세요.
{
  "summary": ["지금 이 팀 ${market} 현황을 한국어 한 문장씩, 가장 중요한 순서로 3개"],
  "players": [{"name": "선수 이름(한국어 표기)", "status": "done|leaving|talks|rumor", "note": "20자 이내 한국어 메모"}],
  "items": [{"i": 번호, "status": "done|leaving|talks|rumor|other", "ko": "영문(en) 제목일 때만 자연스러운 한국어 번역"}]
}
분류 기준: done=이 팀의 계약·영입·재계약·트레이드가 확정, leaving=이 팀 선수의 이탈·방출·결별(확정 또는 유력), talks=협상·미팅·문의 진행, rumor=관심·후보·영입설·전망, other=시장 일반·부상·칼럼 등.
players는 기사에 여러 번 나오거나 중요한 선수 위주로 최대 8명, 같은 선수는 한 번만. 추측을 사실처럼 쓰지 마세요.`;
}

/** 모델 응답(문자열)에서 JSON을 꺼내 검증 */
export function parseAiResponse(text: string, items: NewsItem[], model: string): AiResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: {
    summary?: unknown;
    players?: { name?: unknown; status?: unknown; note?: unknown }[];
    items?: { i?: unknown; status?: unknown; ko?: unknown }[];
  };
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const isStatus = (s: unknown): s is Status => typeof s === "string" && (STATUSES as string[]).includes(s);

  const summary = Array.isArray(raw.summary)
    ? raw.summary.filter((s): s is string => typeof s === "string" && s.trim() !== "").slice(0, 3)
    : [];
  const players = (Array.isArray(raw.players) ? raw.players : [])
    .filter((p) => typeof p?.name === "string" && isStatus(p.status))
    .slice(0, 8)
    .map((p) => ({ name: String(p.name), status: p.status as Status, note: typeof p.note === "string" ? p.note : "" }));

  const byIndex: AiResult["items"] = {};
  for (const r of Array.isArray(raw.items) ? raw.items : []) {
    const idx = Number(r?.i);
    const item = items[idx];
    if (!Number.isInteger(idx) || !item) continue;
    byIndex[item.id] = {
      status: isStatus(r.status) ? r.status : undefined,
      ko: item.lang === "en" && typeof r.ko === "string" && r.ko.trim() ? r.ko.trim() : undefined,
    };
  }
  if (!summary.length && !Object.keys(byIndex).length) return null;
  return { brief: { summary, players, model }, items: byIndex };
}

export async function enrichWithAi(
  team: Team,
  sport: Sport,
  items: NewsItem[],
): Promise<{ items: NewsItem[]; brief: AiBrief | null; error?: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || items.length === 0) return { items, brief: null };

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const target = items.slice(0, MAX_ITEMS);
  const cacheKey = team.id + ":" + target.map((i) => i.id).join(",");
  const hit = cache.get(cacheKey);
  let result = hit && Date.now() - hit.at < TTL ? hit.value : null;

  if (!result) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 3000,
          messages: [{ role: "user", content: buildPrompt(team, sport, target) }],
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`Claude API HTTP ${res.status}`);
      const json = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = (json.content ?? []).map((c) => c.text ?? "").join("");
      result = parseAiResponse(text, target, model);
      if (!result) throw new Error("AI 응답을 해석하지 못했습니다");
      cache.set(cacheKey, { at: Date.now(), value: result });
    } catch (e) {
      return { items, brief: null, error: (e as Error).message };
    }
  }

  const merged = items.map((it) => {
    const r = result!.items[it.id];
    if (!r) return it;
    return {
      ...it,
      status: r.status ?? it.status,
      statusBy: r.status ? ("ai" as const) : it.statusBy,
      // AI가 팀 입장에서 다시 판단했으면 규칙의 '다른 팀' 표시는 지움
      otherTeam: r.status ? undefined : it.otherTeam,
      titleKo: r.ko ?? it.titleKo,
    };
  });
  return { items: merged, brief: result.brief };
}
