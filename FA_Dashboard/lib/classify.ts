export type Status = "done" | "leaving" | "talks" | "rumor" | "other";

export const STATUS_META: Record<Status, { label: string; desc: string }> = {
  done: { label: "계약·영입 확정", desc: "계약 체결·합의, 트레이드 성사, 공식 발표" },
  leaving: { label: "이탈·결별", desc: "방출, 논텐더, 결별, 이적 유력" },
  talks: { label: "협상 중", desc: "협상·미팅·문의, 재계약 추진" },
  rumor: { label: "관심·루머", desc: "관심, 후보 거론, 영입설, 전망" },
  other: { label: "기타 동향", desc: "시장 일반 소식, 부상, 칼럼" },
};

export const STATUS_ORDER: Status[] = ["done", "leaving", "talks", "rumor", "other"];

/*
 * 제목 한 줄로 상태를 추정하는 규칙 기반 분류기.
 * tests/headlines.json (실제 기사 94건, 2026-11 수집)으로 정확도를 측정하며 다듬었습니다.
 *   npx tsx tests/classify.test.ts -v
 *
 * 판단 순서
 *  1) 시장 일반·비거래 소식(공시, 랭킹, 부상, 칼럼 묶음)  → other
 *  2) 추측 표현(?, ~할까, 유력, 전망, reportedly …)이 있으면 '확정'으로 보지 않음
 *  3) 확정 → 이탈 → 협상 → 루머 순으로 첫 매칭
 */

const R = (s: string) => new RegExp(s, "i");

const GENERAL = R(
  [
    "FA\\s?시장(이)?\\s?(열렸|개장)", "승인\\s?선수", "명단\\s?발표", "공시$", "공시\\b", "협상\\s?시작",
    "랭킹", "포스팅\\s?요청", "부상", "수술", "은퇴", "시련",
    "\\bNotes:", "rumors:", "Podcast", "Hot Stove", "소식\\s?모음", "시장\\s?본격\\s?개장", "Live updates", "news, rumou?rs and gossip", "Latest On", "Retire",
    "Surgery", "Injur", "would dream", "could make a profit", "주인공은",
  ].join("|"),
);

const SPECULATIVE = R(
  [
    "\\?", "할까", "될까", "올까", "갈까", "하나\\b", "되나", "나서나", "내보내나", "돌아오나", "입성하나",
    "설\\b", "설에", "설이", "유력", "전망", "가능성", "거론", "예상", "주장", "물망", "후보",
    "열까", "품나", "\\bcould\\b", "\\bwould\\b", "projected", "predicted", "makes? (too much )?sense", "target:", "\\bmight\\b", "reportedly", "expected", "likely", "apparently",
  ].join("|"),
);

const DONE = R(
  [
    "계약\\s?(체결|완료|합의|성공)", "\\d+(\\+\\d+)?년\\s?(최대|총액)?\\s?[\\d,.]*억?원?\\s?(FA\\s?|잔류\\s?)?계약", "[와과]\\s?\\S*\\s?계약", "\\[공식발표\\]", "\\S+\\s?확정\\b",
    "연장\\s?계약", "재계약\\s?(확정|완료|성공|체결)", "재계약(→|…|$)", "트레이드\\s?(영입|단행|성사)", "영입\\s?(확정|완료|발표)",
    "입단", "\\S+\\s?영입$", "영입\\s?(…|\\.\\.\\.|,)", "마이너\\s?계약", "트레이드\\s?영입", "잔류(\\s?확정)?($|[,.…!]|\\s)", "도장", "사인했", "공식\\s?(발표|영입)", "\\[오피셜\\]", "‘공식’", "타격코치로.*영입", "코치로\\s?\\S+\\s?영입",
    "\\bsigns?\\b", "\\bsigned\\b", "to sign\\b", "re-signs?\\b", "agree[sd]?\\b", "\\bacquire[sd]?\\b", "\\bclaims?\\b",
    "\\bextends?\\b", "off waivers", "\\btrade for\\b", "\\bswap\\b", "\\btrade[sd]? for\\b", "avoiding arbitration", "accepts?\\s(the\\s)?qualifying offer",
    "to accept qualifying", "\\bselects?\\b", "\\bhire[sd]?\\b", "officially", "here we go", "completes?\\b",
  ].join("|"),
);

const LEAVING = R(
  [
    "결별", "이탈", "방출", "논텐더", "FA\\s?신분으로", "떠난다", "떠나(기로|게)", "내보내", "보상\\s?선수", "작별", "다른\\s?팀으로", "로\\s?이적하나",
    "\\bnon-?tenders?\\b", "designate[sd]?\\b.*assignment", "\\breleased?\\b", "\\bwaive[sd]?\\b",
    "declines?\\s(the\\s)?qualifying", "to leave\\b", "wants to leave", "\\bdepart(s|ure)?\\b", "face losing",
    "parts ways", "\\bexit\\b", "allow .* to leave",
  ].join("|"),
);

const TALKS = R(
  [
    "협상", "접촉", "미팅", "만났다", "면담", "문의", "제안", "오퍼", "조율", "근접", "임박", "막바지", "협의",
    "영입전\\s?(본격|가세|참전)", "쟁탈전", "이야기\\s?(나누|중)", "구두\\s?합의", "원칙적\\s?합의", "이적\\s?마무리", "마무리\\s?(절차|단계)", "교착", "잡는다", "잡겠다", "계약\\s?정조준", "재결합\\s?의지", "계약\\s?소식",
    "\\btalks\\b", "negotiat", "to meet with", "meeting", "close to", "closing in", "nearing", "in discussions",
    "re-sign", "contract extension", "push to secure", "transfer is on", "weighs",
  ].join("|"),
);

const RUMOR = R(
  [
    "관심", "루머", "물망", "후보", "노린다", "노려", "노리", "타깃", "타겟", "링크", "영입\\s?추진", "검토", "주시", "점찍",
    "영입설", "복귀설", "베팅설", "이적설", "\\S+행\\s?루머", "영입\\s?나선다", "영입\\s?경쟁", "큰\\s?손", "사올까", "차지",
    "재영입", "돌아오나", "영입\\s?접근", "영입전", "이적", "영입",
    "interest", "interested", "\\beye[sd]?\\b", "eyeing", "target", "linked", "rumou?r", "consider", "monitor", "keen",
    "pursu", "set sights", "circle", "calling about", "open to", "offer they can", "transfer message", "top candidate",
  ].join("|"),
);

export function classify(title: string): Status {
  const t = title.replace(/\s+/g, " ").trim();
  // 계약 금액·공식 발표가 있는 제목은 "은퇴하고 싶었다" 같은 말이 섞여도 일반 소식으로 보지 않음
  const strongDone = /\[(오피셜|공식발표)\]|\d+년\s?(최대|총액)?\s?[\d,.]+억원?\s?(FA\s?|잔류\s?)?계약/.test(t);
  if (GENERAL.test(t) && !strongDone) return "other";

  const speculative = SPECULATIVE.test(t);
  // 문장(절) 단위로 확정 여부 판단: "X, 메츠와 계약 체결: 다저스는 이제 어떻게?"처럼
  // 뒤에 붙은 추측 문장이 앞의 확정 문장까지 루머로 끌어내리지 않게
  const clauses = t.split(/(?<=[?!:;…|—–,·])\s*|\s+-\s+/).filter((c) => c.trim());
  if (clauses.some((c) => DONE.test(c) && !SPECULATIVE.test(c))) return "done";
  // "결별한 OO, 우리 팀으로 돌아오나?" 처럼 복귀 추측은 이탈이 아니라 루머
  if (speculative && /돌아오나|복귀|재영입|return to/i.test(t)) return "rumor";
  if (LEAVING.test(t)) return "leaving";
  if (TALKS.test(t)) return "talks";
  if (RUMOR.test(t)) return "rumor";
  // 거래 신호는 약해도 추측·전망 기사면 루머로
  if (speculative) return "rumor";
  return "other";
}
