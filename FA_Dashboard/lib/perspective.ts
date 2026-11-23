/**
 * 팀 입장에서 다시 보기
 * "스쿠벌, 메츠와 계약"은 메츠 팬에게는 '영입 확정'이지만 다저스 팬에게는 '다른 팀 계약'입니다.
 * 제목에서 계약 상대 팀(…와 계약, signs with …, … 입단 등)이 우리 팀이 아니라 다른 팀이면
 * 확정(done)을 '기타'로 돌리고 otherTeam 표시를 붙여 SIGNED 숫자에서 뺍니다.
 */
import { TEAMS, leagueById, type Team } from "./teams";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const HANGUL = /[가-힣]/;

type NameSet = { ko: string[]; en: string[] };

function namesOf(t: Team): NameSet {
  const all = [t.ko, t.en, ...t.aliases].filter(Boolean);
  return {
    // 한국어 기사 문형("SSG 잔류", "LG와 계약")에는 영문 약칭도 그대로 쓰이므로 전부 포함
    ko: all,
    // 영문은 대소문자를 구분해 고유명사로만 매칭 ("Nice", "Inter" 같은 일반 단어 오인 방지)
    en: all.filter((n) => !HANGUL.test(n) && n.length >= 3),
  };
}

function patterns({ ko, en }: NameSet) {
  const K = ko.length ? `(?:${ko.map(esc).join("|")})` : null;
  const E = en.length ? `(?:${en.map(esc).join("|")})` : null;
  const res: RegExp[] = [];
  if (K) {
    res.push(new RegExp(`${K}\\s?(?:와|과)\\s?(?:\\S+\\s?){0,5}?(?:계약|재계약|합의|도장)`));
    res.push(new RegExp(`${K}\\s?(?:입단|행\\b|행…|행,|유니폼|잔류)`));
    res.push(new RegExp(`${K}(?:로|으로)\\s?(?:이적|간다|떠난다)`));
    res.push(new RegExp(`(?:^|[\\s'"‘“\\]])${K}[,\\s]\\s?(?:\\S+\\s){0,4}?\\S*\\s?(?:영입|계약 체결|재계약)`));
  }
  if (E) {
    // 동사는 대소문자 무관, 팀 이름은 대소문자 구분 (제목은 단어마다 대문자인 경우가 많음)
    res.push(
      new RegExp(
        `\\b(?:[Ss]ign(?:s|ed)?|[Aa]gree(?:s|d)?|[Dd]eal|[Cc]ontract|[Jj]oins?|[Tt]raded|[Hh]eads?)\\b[^:;]*?\\b(?:[Ww]ith|[Tt]o|[Bb]y)\\s+(?:[Tt]he\\s+)?${E}\\b`,
      ),
    );
    res.push(new RegExp(`(?:^|[,:]\\s*)${E}\\b[^:;]{0,40}?\\b(?:Sign|Signs|To Sign|Agree|Agrees|Acquire|Acquires|Claim|Claims|Re-Sign|Extend|sign|signs|agree|acquire|claim|land|lands)\\b`));
  }
  return res;
}

const cache = new Map<string, { ours: RegExp[]; others: RegExp[] }>();

function compiled(team: Team) {
  const hit = cache.get(team.id);
  if (hit) return hit;
  const sport = leagueById(team.league)?.sport;
  const ours = patterns(namesOf(team));
  const others = TEAMS.filter((t) => t.id !== team.id && leagueById(t.league)?.sport === sport).flatMap((t) =>
    patterns(namesOf(t)),
  );
  const value = { ours, others };
  cache.set(team.id, value);
  return value;
}

/** 제목 속 계약의 주인공이 다른 팀이면 true (우리 팀도 계약 당사자로 나오면 false) */
export function isOtherTeamDeal(title: string, team: Team) {
  const { ours, others } = compiled(team);
  if (ours.some((re) => re.test(title))) return false;
  return others.some((re) => re.test(title));
}
