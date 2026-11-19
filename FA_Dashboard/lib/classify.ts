export type Status = "done" | "leaving" | "talks" | "rumor" | "other";

export const STATUS_META: Record<Status, { label: string; desc: string }> = {
  done: { label: "계약·영입 확정", desc: "계약 체결, 합의, 공식 발표" },
  leaving: { label: "이탈·결별", desc: "선수 이탈, 결별, 방출, 보상선수" },
  talks: { label: "협상 중", desc: "협상, 제안, 접촉, 임박" },
  rumor: { label: "관심·루머", desc: "관심, 후보, 링크, 루머" },
  other: { label: "기타 동향", desc: "그 외 FA·이적 관련 기사" },
};

export const STATUS_ORDER: Status[] = ["done", "leaving", "talks", "rumor", "other"];

// 우선순위: 확정 > 이탈 > 협상 > 루머 > 기타 (먼저 매칭되는 것이 이김)
const RULES: [Status, RegExp][] = [
  [
    "done",
    /(계약\s?(체결|완료|성공|합의)|도장|사인했|공식\s?(발표|영입|입단)|영입\s?(확정|완료|발표)|입단\s?(확정|식)?|잔류\s?(확정|계약)|FA\s?계약|합의했|최종\s?합의|완전\s?이적\s?(확정|완료)|\b(signs?|signed|signing confirmed|agree[sd]?|agreement|finalize[sd]?|completes?|completed|officially|announce[sd]?|re-signs?|here we go|deal done)\b)/i,
  ],
  [
    "leaving",
    /(결별|이탈|방출|떠난다|떠나|보상\s?선수|작별|이적\s?확정.*(떠|으로)|팀\s?떠|\b(leave[sd]?|leaving|depart(s|ure)?|exit|released|waived|sold|parts ways)\b)/i,
  ],
  [
    "talks",
    /(협상|제안|오퍼|접촉|조율|근접|임박|막바지|협의|면담|\b(talks|negotiat\w*|offer|bid|close to|closing in|nearing|advanced|in discussions|meeting)\b)/i,
  ],
  [
    "rumor",
    /(관심|루머|물망|후보|노린다|노려|타깃|타겟|링크|영입\s?추진|검토|주시|\b(eye[sd]?|eyeing|interest(ed)?|target(s|ing)?|linked|rumou?rs?|consider(s|ing)?|monitor(s|ing)?|keen|pursu\w*)\b)/i,
  ],
];

export function classify(title: string): Status {
  for (const [status, re] of RULES) if (re.test(title)) return status;
  return "other";
}
