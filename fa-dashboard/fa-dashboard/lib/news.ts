import { XMLParser } from "fast-xml-parser";
import { classify, type Status } from "./classify";
import type { Sport, Team } from "./teams";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string; // ISO
  lang: "ko" | "en";
  status: Status;
  /** 제목에 팀 이름/별칭이 들어가 있는지 */
  mentionsTeam: boolean;
  /** 같은 제목으로 보도한 매체 수 */
  coverage: number;
};

export type NewsResponse = {
  teamId: string;
  fetchedAt: string;
  queries: string[];
  items: NewsItem[];
  errors: string[];
};

type Query = { q: string; lang: "ko" | "en" };

/** 종목별 검색어 — Google News 검색 문법(OR, 따옴표, when:) 사용 */
export function buildQueries(team: Team, sport: Sport, isMlb: boolean): Query[] {
  const ko = `"${team.ko}"`;
  const en = `"${team.en}"`;
  if (sport === "baseball") {
    const qs: Query[] = [
      { q: `${ko} FA when:30d`, lang: "ko" },
      { q: `${ko} (계약 OR 영입 OR 협상 OR 보상선수) when:14d`, lang: "ko" },
    ];
    if (isMlb) {
      qs.push({
        q: `${en} ("free agent" OR "free agency" OR signs OR agree OR deal) when:14d`,
        lang: "en",
      });
    }
    return qs;
  }
  return [
    { q: `${ko} (이적 OR 영입 OR FA OR 재계약) when:30d`, lang: "ko" },
    { q: `${en} (transfer OR signing OR "free agent" OR contract) when:14d`, lang: "en" },
  ];
}

function rssUrl({ q, lang }: Query) {
  const params =
    lang === "ko" ? "hl=ko&gl=KR&ceid=KR:ko" : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${params}`;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

type RawItem = { title: string; source: string; link: string; publishedAt: string };

export function parseRss(xml: string): RawItem[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((it: Record<string, unknown>) => {
      const srcNode = it.source as { "#text"?: string } | string | undefined;
      const source =
        typeof srcNode === "string" ? srcNode : srcNode?.["#text"] ?? "";
      let title = String(it.title ?? "").trim();
      // Google News 제목은 "헤드라인 - 매체명" 형식
      if (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3)).trim();
      }
      const date = new Date(String(it.pubDate ?? ""));
      return {
        title: decodeEntities(title),
        source: decodeEntities(source),
        link: String(it.link ?? ""),
        publishedAt: isNaN(date.getTime()) ? "" : date.toISOString(),
      };
    })
    .filter((x) => x.title && x.link && x.publishedAt);
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const normalize = (t: string) =>
  t
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "") // [단독], (종합) 등 말머리 제거
    .replace(/[^\p{L}\p{N}]/gu, "");

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function mergeItems(
  team: Team,
  batches: { lang: "ko" | "en"; items: RawItem[] }[],
): NewsItem[] {
  // 영문 별칭은 단어 경계로 매칭 (Reds가 hundreds에 걸리지 않도록)
  const matchers = [team.ko, team.en, ...team.aliases].filter(Boolean).map((n) => {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return /^[\x00-\x7F]+$/.test(n) ? new RegExp(`\\b${esc}\\b`, "i") : new RegExp(esc, "i");
  });
  const byKey = new Map<string, NewsItem>();

  for (const { lang, items } of batches) {
    for (const r of items) {
      const key = normalize(r.title);
      if (!key) continue;
      const existing = byKey.get(key);
      if (existing) {
        existing.coverage += 1;
        // 가장 먼저 보도된 기사를 대표로
        if (r.publishedAt < existing.publishedAt) {
          existing.publishedAt = r.publishedAt;
          existing.link = r.link;
          existing.source = r.source;
        }
        continue;
      }
      byKey.set(key, {
        id: hash(key),
        title: r.title,
        source: r.source,
        link: r.link,
        publishedAt: r.publishedAt,
        lang,
        status: classify(r.title),
        mentionsTeam: matchers.some((re) => re.test(r.title)),
        coverage: 1,
      });
    }
  }
  return [...byKey.values()].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export async function fetchTeamNews(
  team: Team,
  sport: Sport,
  isMlb: boolean,
): Promise<NewsResponse> {
  const queries = buildQueries(team, sport, isMlb);
  const errors: string[] = [];

  const batches = await Promise.all(
    queries.map(async (query) => {
      try {
        const res = await fetch(rssUrl(query), {
          headers: { "User-Agent": "Mozilla/5.0 (FA-Dashboard)" },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { lang: query.lang, items: parseRss(await res.text()) };
      } catch (e) {
        errors.push(`${query.q}: ${(e as Error).message}`);
        return { lang: query.lang, items: [] };
      }
    }),
  );

  return {
    teamId: team.id,
    fetchedAt: new Date().toISOString(),
    queries: queries.map((q) => q.q),
    items: mergeItems(team, batches).slice(0, 150),
    errors,
  };
}
