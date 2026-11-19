import generatedLogos from "./logos.generated.json";
import { resolveTeam } from "./teams";

/** 팀 대표색 [주색, 보조색] */
export const TEAM_COLORS: Record<string, [string, string]> = {
  // KBO
  "kbo-lg": ["#C30452", "#000000"],
  "kbo-hanwha": ["#FF6600", "#1A1A1A"],
  "kbo-ssg": ["#CE0E2D", "#FDB913"],
  "kbo-samsung": ["#074CA1", "#0A2D6E"],
  "kbo-nc": ["#315288", "#AF917B"],
  "kbo-kt": ["#000000", "#EB1C24"],
  "kbo-lotte": ["#041E42", "#D00F31"],
  "kbo-kia": ["#EA0029", "#06141F"],
  "kbo-doosan": ["#131230", "#ED1C24"],
  "kbo-kiwoom": ["#570514", "#B07F4A"],
  // MLB
  "mlb-lad": ["#005A9C", "#EF3E42"],
  "mlb-sf": ["#FD5A1E", "#27251F"],
  "mlb-sd": ["#2F241D", "#FFC425"],
  "mlb-ari": ["#A71930", "#E3D4AD"],
  "mlb-col": ["#333366", "#C4CED4"],
  "mlb-nyy": ["#0C2340", "#C4CED3"],
  "mlb-bos": ["#BD3039", "#0C2340"],
  "mlb-tor": ["#134A8E", "#1D2D5C"],
  "mlb-tb": ["#092C5C", "#8FBCE6"],
  "mlb-bal": ["#DF4601", "#000000"],
  "mlb-nym": ["#002D72", "#FF5910"],
  "mlb-phi": ["#E81828", "#002D72"],
  "mlb-atl": ["#CE1141", "#13274F"],
  "mlb-mia": ["#00A3E0", "#EF3340"],
  "mlb-wsh": ["#AB0003", "#14225A"],
  "mlb-chc": ["#0E3386", "#CC3433"],
  "mlb-mil": ["#12284B", "#FFC52F"],
  "mlb-stl": ["#C41E3A", "#0C2340"],
  "mlb-cin": ["#C6011F", "#000000"],
  "mlb-pit": ["#FDB827", "#27251F"],
  "mlb-cle": ["#00385D", "#E50022"],
  "mlb-det": ["#0C2340", "#FA4616"],
  "mlb-kc": ["#004687", "#BD9B60"],
  "mlb-min": ["#002B5C", "#D31145"],
  "mlb-cws": ["#27251F", "#C4CED4"],
  "mlb-hou": ["#002D62", "#EB6E1F"],
  "mlb-sea": ["#0C2C56", "#005C5C"],
  "mlb-tex": ["#003278", "#C0111F"],
  "mlb-laa": ["#BA0021", "#003263"],
  "mlb-ath": ["#003831", "#EFB21E"],
  // EPL
  "epl-ars": ["#EF0107", "#063672"],
  "epl-mci": ["#6CABDD", "#1C2C5B"],
  "epl-liv": ["#C8102E", "#00B2A9"],
  "epl-che": ["#034694", "#DBA111"],
  "epl-mun": ["#DA291C", "#FBE122"],
  "epl-tot": ["#132257", "#FFFFFF"],
  "epl-new": ["#241F20", "#41B6E6"],
  "epl-avl": ["#670E36", "#95BFE5"],
  "epl-bha": ["#0057B8", "#FFCD00"],
  "epl-whu": ["#7A263A", "#1BB1E7"],
  "epl-bre": ["#E30613", "#140E0C"],
  "epl-cry": ["#1B458F", "#C4122E"],
  "epl-ful": ["#000000", "#CC0000"],
  "epl-bou": ["#DA291C", "#000000"],
  "epl-wol": ["#FDB913", "#231F20"],
  "epl-eve": ["#003399", "#FFFFFF"],
  "epl-nfo": ["#DD0000", "#FFFFFF"],
  // LaLiga
  "laliga-rma": ["#FEBE10", "#00529F"],
  "laliga-bar": ["#A50044", "#004D98"],
  "laliga-atm": ["#CB3524", "#272E61"],
  "laliga-ath": ["#EE2523", "#000000"],
  "laliga-rso": ["#0067B1", "#FFFFFF"],
  "laliga-vil": ["#FFE667", "#005187"],
  "laliga-bet": ["#00954C", "#FFFFFF"],
  "laliga-sev": ["#D71920", "#FFFFFF"],
  "laliga-val": ["#F18E00", "#000000"],
  "laliga-mll": ["#E20613", "#000000"],
  // Serie A
  "seriea-int": ["#0068A8", "#000000"],
  "seriea-mil": ["#FB090B", "#000000"],
  "seriea-juv": ["#000000", "#FFFFFF"],
  "seriea-nap": ["#12A0D7", "#003C82"],
  "seriea-rom": ["#8E1F2F", "#F0BC42"],
  "seriea-laz": ["#87D8F7", "#15366F"],
  "seriea-ata": ["#1E71B8", "#000000"],
  "seriea-fio": ["#482E92", "#FFFFFF"],
  "seriea-bol": ["#1A2F48", "#A21C26"],
  "seriea-com": ["#1B4F9C", "#FFFFFF"],
  // Bundesliga
  "bundesliga-fcb": ["#DC052D", "#0066B2"],
  "bundesliga-bvb": ["#FDE100", "#000000"],
  "bundesliga-b04": ["#E32221", "#000000"],
  "bundesliga-rbl": ["#DD0741", "#001F47"],
  "bundesliga-sge": ["#E1000F", "#000000"],
  "bundesliga-vfb": ["#E32219", "#FFFFFF"],
  "bundesliga-scf": ["#E2001A", "#000000"],
  "bundesliga-wob": ["#65B32E", "#FFFFFF"],
  "bundesliga-m05": ["#C3141E", "#FFFFFF"],
  "bundesliga-bmg": ["#000000", "#1F9F3F"],
  // Ligue 1
  "ligue1-psg": ["#004170", "#DA291C"],
  "ligue1-om": ["#2FAEE0", "#FFFFFF"],
  "ligue1-asm": ["#E51B22", "#FFFFFF"],
  "ligue1-ol": ["#DA0812", "#14387F"],
  "ligue1-losc": ["#E01E13", "#20325F"],
  "ligue1-ogcn": ["#C8102E", "#000000"],
  "ligue1-rcl": ["#EC1C24", "#FFD100"],
};

/**
 * 팀 로고 이미지 경로.
 * public/logos/{팀id}.png 처럼 파일을 넣으면 빌드 때 자동 등록됩니다 (scripts/gen-logos.mjs).
 * 다른 경로를 쓰고 싶으면 아래 MANUAL 에 직접 적어도 됩니다.
 */
const MANUAL: Record<string, string> = {};
export const TEAM_LOGOS: Record<string, string> = { ...(generatedLogos as Record<string, string>), ...MANUAL };

const KBO_ABBR: Record<string, string> = {
  "kbo-hanwha": "HH",
  "kbo-samsung": "SS",
  "kbo-lotte": "LT",
  "kbo-doosan": "DS",
  "kbo-kiwoom": "KW",
};

export function teamAbbr(teamId: string) {
  if (KBO_ABBR[teamId]) return KBO_ABBR[teamId];
  const custom = teamId.match(/^custom-\w+-(.+)$/);
  if (custom) return custom[1].slice(0, 2).toUpperCase();
  return (teamId.split("-")[1] ?? "").toUpperCase().slice(0, 4);
}

// ---- 색 계산 ----
const BG = "#0b0c0f"; // 화면 배경 (globals.css 의 --bg 와 같게)

const hexToRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number[]) =>
  "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = (h: string) => {
  const [r, g, b] = hexToRgb(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgbToHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s, l];
};
const hslToHex = (h: number, s: number, l: number) => {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return rgbToHex([f(0), f(8), f(4)]);
};
const saturation = (h: string) => {
  const [r, g, b] = hexToRgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};
const inkOn = (h: string) => (contrast(h, "#ffffff") >= contrast(h, "#0b0c0f") ? "#ffffff" : "#0b0c0f");

export type TeamTheme = {
  primary: string;
  secondary: string;
  /** 배너 위 글자색 */
  ink: string;
  /** 어두운 배경 위에서 읽히는 포인트 색 */
  accent: string;
  accentInk: string;
};

const NEUTRAL: Record<string, [string, string]> = {
  baseball: ["#1F4E8C", "#C8102E"],
  soccer: ["#1E7F4F", "#0B2E4F"],
};

export function teamTheme(teamId: string | null): TeamTheme {
  let pair: [string, string] = ["#3A3F4B", "#1A1D24"];
  if (teamId) {
    const r = resolveTeam(teamId);
    pair = TEAM_COLORS[teamId] ?? (r ? NEUTRAL[r.sport] : pair);
  }
  const [primary, secondary] = pair;

  // 포인트 색: 채도가 있는 색 중 배경 대비가 더 좋은 색을 고르고, 4.5:1이 될 때까지 밝힘
  const colorful = [primary, secondary].filter((c) => saturation(c) > 0.2);
  const pool = colorful.length ? colorful : [primary, secondary];
  const base = pool.sort((a, b) => contrast(b, BG) - contrast(a, BG))[0];
  // 흰색을 섞으면 탁해지므로, 색상(H)과 채도(S)는 유지하고 명도(L)만 올림
  let accent = base;
  if (contrast(base, BG) < 4.5) {
    const [h, s, l] = rgbToHsl(base);
    const sat = saturation(base) > 0.2 ? Math.max(s, 0.6) : s;
    for (let L = l; L <= 0.92 && contrast(accent, BG) < 4.5; L += 0.02) {
      accent = hslToHex(h, sat, L);
    }
  }

  return { primary, secondary, ink: inkOn(primary), accent, accentInk: inkOn(accent) };
}

/** 루트 요소 style 에 바로 넣을 CSS 변수 */
export function themeVars(t: TeamTheme): Record<string, string> {
  return {
    "--team": t.primary,
    "--team-2": t.secondary,
    "--team-ink": t.ink,
    "--accent": t.accent,
    "--accent-ink": t.accentInk,
  };
}
