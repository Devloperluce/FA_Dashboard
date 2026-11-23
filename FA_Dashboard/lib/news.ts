import { XMLParser } from "fast-xml-parser";
import { classify, type Status } from "./classify";
import type { Sport, Team } from "./teams";
import type { AiBrief } from "./ai";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  link: string;
  publishedAt: string; // ISO
  lang: "ko" | "en";
  status: Status;
  /** 상태를 누가 판단했는지: 규칙(rule) 또는 AI */
  statusBy: "rule" | "ai";
  /** 영문 기사의 한국어 번역 제목 (AI 브리핑이 켜져 있을 때) */
  titleKo?: string;
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
  /** AI 브리핑 (ANTHROPIC_API_KEY가 있을 때만) */
  ai: AiBrief | null;
};

type Query = { q: string; lang: "ko" | "en"; url?: string; source?: string };

const HANGUL = /[가-힣]/;
const quoteAll = (names: string[]) => {
  const uniq = [...new Set(names.filter(Boolean))];
  return uniq.length === 1 ? `"${uniq[0]}"` : `(${uniq.map((n) => `"${n}"`).join(" OR ")})`;
};

/** MLB Trade Rumors 팀별 RSS 주소의 팀 이름 부분 */
export const MLBTR_SLUG: Record<string, string> = {
  "mlb-lad": "los-angeles-dodgers", "mlb-sf": "san-francisco-giants", "mlb-sd": "san-diego-padres",
  "mlb-ari": "arizona-diamondbacks", "mlb-col": "colorado-rockies", "mlb-nyy": "new-york-yankees",
  "mlb-bos": "boston-red-sox", "mlb-tor": "toronto-blue-jays", "mlb-tb": "tampa-bay-rays",
  "mlb-bal": "baltimore-orioles", "mlb-nym": "new-york-mets", "mlb-phi": "philadelphia-phillies",
  "mlb-atl": "atlanta-braves", "mlb-mia": "miami-marlins", "mlb-wsh": "washington-nationals",
  "mlb-chc": "chicago-cubs", "mlb-mil": "milwaukee-brewers", "mlb-stl": "st-louis-cardinals",
  "mlb-cin": "cincinnati-reds", "mlb-pit": "pittsburgh-pirates", "mlb-cle": "cleveland-guardians",
  "mlb-det": "detroit-tigers", "mlb-kc": "kansas-city-royals", "mlb-min": "minnesota-twins",
  "mlb-cws": "chicago-white-sox", "mlb-hou": "houston-astros", "mlb-sea": "seattle-mariners",
  "mlb-tex": "texas-rangers", "mlb-laa": "los-angeles-angels", "mlb-ath": "oakland-athletics",
};

/**
 * 종목별 검색어 — Google News 검색 문법(OR, 따옴표, when:) 사용.
 * 국내 매체는 "다저스", "맨유"처럼 줄임말을 많이 써서 한글 별칭도 함께 검색합니다.
 */
export function buildQueries(team: Team, sport: Sport, isMlb: boolean): Query[] {
  const koNames = [team.ko, ...team.aliases.filter((a) => HANGUL.test(a))];
  const ko = quoteAll(koNames);
  const en = `"${team.en}"`;

  if (sport === "baseball" && !isMlb) {
    // "한화·삼성·롯데·LG"는 그룹 이름이기도 해서, 야구 문맥 단어를 함께 걸어 경제 기사를 줄임
    const baseball = "(야구 OR 프로야구 OR KBO OR 투수 OR 타자 OR 포수 OR 내야수 OR 외야수 OR 외국인 OR 코치 OR FA)";
    return [
      { q: `${ko} FA when:30d`, lang: "ko" },
      { q: `${ko} (계약 OR 영입 OR 협상 OR 보상선수 OR 트레이드) ${baseball} when:14d`, lang: "ko" },
    ];
  }
  if (isMlb) {
    const qs: Query[] = [
      { q: `${ko} (FA OR 계약 OR 영입 OR 트레이드 OR 협상) when:14d`, lang: "ko" },
      {
        q: `${en} ("free agent" OR "free agency" OR signs OR agree OR trade OR acquire OR "non-tender") when:14d`,
        lang: "en",
      },
    ];
    const slug = MLBTR_SLUG[team.id];
    if (slug) {
      qs.push({
        q: `MLB Trade Rumors: ${slug}`,
        lang: "en",
        url: `https://www.mlbtraderumors.com/${slug}/feed`,
        source: "MLB Trade Rumors",
      });
    }
    return qs;
  }
  return [
    { q: `${ko} (이적 OR 영입 OR FA OR 재계약 OR 임대) when:30d`, lang: "ko" },
    { q: `${en} (transfer OR signing OR "free agent" OR contract OR loan) when:14d`, lang: "en" },
  ];
}

function rssUrl({ q, lang, url }: Query) {
  if (url) return url;
  const params =
    lang === "ko" ? "hl=ko&gl=KR&ceid=KR:ko" : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${params}`;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

type RawItem = { title: string; source: string; link: string; publishedAt: string; teamFeed?: boolean };

/** "머니투데이 - 머니투데이"처럼 반복되거나 주소로 온 매체명을 정리 */
export function cleanSource(source: string) {
  let s = source.trim();
  if (/^https?:\/\//.test(s)) {
    try {
      s = new URL(s).hostname.replace(/^www\./, "");
    } catch {
      /* 그대로 사용 */
    }
  }
  return s;
}

export function stripSourceSuffix(title: string, source: string) {
  let t = title.trim();
  const candidates = [source, cleanSource(source)].filter(Boolean);
  // 같은 매체명이 여러 번 붙는 경우까지 반복 제거
  for (let i = 0; i < 3; i++) {
    const hit = candidates.find((c) => t.endsWith(` - ${c}`));
    if (!hit) break;
    t = t.slice(0, -(hit.length + 3)).trim();
  }
  return t;
}

export function parseRss(xml: string, fallbackSource = ""): RawItem[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((it: Record<string, unknown>) => {
      const srcNode = it.source as { "#text"?: string } | string | undefined;
      const source =
        typeof srcNode === "string" ? srcNode : srcNode?.["#text"] ?? "";
      // Google News 제목은 "헤드라인 - 매체명" 형식
      const title = source ? stripSourceSuffix(String(it.title ?? ""), source) : String(it.title ?? "").trim();
      const date = new Date(String(it.pubDate ?? ""));
      return {
        title: decodeEntities(title),
        source: decodeEntities(cleanSource(source) || fallbackSource),
        link: String(it.link ?? ""),
        publishedAt: isNaN(date.getTime()) ? "" : date.toISOString(),
      };
    })
    .filter((x) => x.title && x.link && x.publishedAt);
}

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
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

/** 어느 기사에나 나오는 말 — 같은 소식 판단에서 제외 */
const COMMON_WORDS = new Set(
  ("프로야구 오피셜 공식발표 메이저리그 메이저리거 외국인 계약금 외인 투수진 선발진 퍼포먼스 스토브리그 " +
    "free agent agency agree agrees trade trades rumors report reportedly sign signs deal contract " +
    "pitcher outfielder infielder catcher reliever starter league baseball american national").split(" "),
);
const PARTICLE = /(으로|에서|에게|와|과|는|은|이|가|을|를|의|도|로|에|만)$/;

/** 선수 이름처럼 그 소식을 구분해 주는 단어들 (한글 3자 이상, 영문 대문자로 시작하는 4자 이상) */
function storyTokens(title: string, teamNames: string[]) {
  let t = title;
  for (const n of teamNames) t = t.split(n).join(" ");
  const out = new Set<string>();
  for (const raw of t.split(/[^\p{L}\p{N}]+/u)) {
    const w = raw.replace(PARTICLE, "");
    if (/^[가-힣]{3,}$/.test(w) || /^[A-Z][a-z]{3,}$/.test(w)) {
      if (!COMMON_WORDS.has(w.toLowerCase()) && !COMMON_WORDS.has(w)) out.add(w.toLowerCase());
    }
  }
  return out;
}
/** 같은 소식으로 볼 시간 간격 */
const SAME_STORY_WINDOW = 36 * 3600_000;

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * KBO 구단 이름과 겹치는 그룹 계열사·e스포츠 기사 (실제 수집 결과에서 확인된 패턴)
 * 예: "한화오션 … 계약", "한화생명(e스포츠) … 영입", "삼성전자 … 협상"
 */
export const KBO_OFFTOPIC =
  /한화\s?(오션|에어로|생명|시스템|솔루션|투자|손해|자산|큐셀|호텔|건설|비전)|삼성\s?(전자|바이오|물산|SDI|SDS|생명|화재|증권|중공업|카드|E&A)|롯데\s?(쇼핑|케미칼|웰푸드|칠성|호텔|월드|건설|정보통신|이노베이트|카드|바이오)|LG\s?(전자|화학|에너지|유플러스|U\+|디스플레이|이노텍|CNS|생활건강)|KT\s?(&G|스카이라이프|클라우드)|SSG(닷컴|\.COM)|신세계\s?(백화점|인터내셔날)|NC\s?소프트|엔씨소프트|기아\s?(EV|전기차|판매|노조)|두산\s?(에너빌리티|밥캣|로보틱스)|키움\s?(증권|자산)|e스포츠|LCK|롤드컵|젠지|T1\b/i;

export function mergeItems(
  team: Team,
  batches: { lang: "ko" | "en"; items: RawItem[] }[],
): NewsItem[] {
  const names = [team.ko, team.en, ...team.aliases].filter(Boolean);
  // 영문 별칭은 단어 경계로 매칭 (Reds가 hundreds에 걸리지 않도록)
  const matchers = [team.ko, team.en, ...team.aliases].filter(Boolean).map((n) => {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return /^[\x00-\x7F]+$/.test(n) ? new RegExp(`\\b${esc}\\b`, "i") : new RegExp(esc, "i");
  });
  const byKey = new Map<string, NewsItem>();
  const grams = new Map<string, Set<string>>();

  const isKbo = team.league === "kbo";
  for (const { lang, items } of batches) {
    for (const r of items) {
      if (isKbo && KBO_OFFTOPIC.test(r.title)) continue;
      const key = normalize(r.title);
      if (!key) continue;
      const g = storyTokens(r.title, names);
      const status = classify(r.title);
      let existing = byKey.get(key);
      if (!existing) {
        // 완전히 같은 제목이 없으면 "같은 소식을 다른 매체가 쓴 기사"를 찾음:
        // 36시간 안, 같은 상태, 선수 이름 같은 구분 단어를 공유
        const t = Date.parse(r.publishedAt);
        for (const [k, it] of byKey) {
          if (it.status !== status || Math.abs(Date.parse(it.publishedAt) - t) > SAME_STORY_WINDOW) continue;
          const other = grams.get(k)!;
          if ([...g].some((w) => other.has(w))) {
            existing = it;
            break;
          }
        }
      }
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
      grams.set(key, g);
      byKey.set(key, {
        id: hash(key),
        title: r.title,
        source: r.source,
        link: r.link,
        publishedAt: r.publishedAt,
        lang,
        status,
        statusBy: "rule",
        // 팀 전용 피드(MLB Trade Rumors 팀 페이지)는 제목에 팀명이 없어도 그 팀 소식
        mentionsTeam: !!r.teamFeed || matchers.some((re) => re.test(r.title)),
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
        const items = parseRss(await res.text(), query.source);
        return { lang: query.lang, items: query.url ? items.map((i) => ({ ...i, teamFeed: true })) : items };
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
    ai: null,
  };
}
