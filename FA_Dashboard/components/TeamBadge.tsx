import { TEAM_LOGOS, teamAbbr, teamTheme, type TeamTheme } from "@/lib/teamTheme";
import { resolveTeam } from "@/lib/teams";

type Props = { teamId: string; size?: number; className?: string };

/**
 * 팀 엠블럼
 * 1) public/logos 에 로고 파일이 있으면 그 이미지
 * 2) 축구팀은 팀 컬러 + 전통 문양(줄무늬·띠·사선 등)으로 만든 방패형 엠블럼
 * 3) 그 외(야구 등)는 팀 컬러 약칭 배지
 */
export default function TeamBadge({ teamId, size = 40, className = "" }: Props) {
  const logo = TEAM_LOGOS[teamId];
  const t = teamTheme(teamId);

  if (logo) {
    return (
      <span
        className={`badge badge-logo ${className}`}
        aria-hidden
        style={{ width: size, height: size, padding: Math.max(2, size * 0.1), boxShadow: `inset 0 0 0 ${Math.max(1, size / 30)}px ${t.secondary}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" loading="lazy" />
      </span>
    );
  }

  if (resolveTeam(teamId)?.sport === "soccer") {
    return <ShieldBadge teamId={teamId} theme={t} size={size} className={className} />;
  }

  const abbr = teamAbbr(teamId);
  return (
    <span
      className={`badge ${className}`}
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * (abbr.length > 2 ? 0.3 : 0.38),
        background: t.primary,
        color: t.ink,
        boxShadow: `inset 0 0 0 ${Math.max(2, size / 18)}px ${t.secondary}`,
      }}
    >
      {abbr}
    </span>
  );
}

// ---------- 축구 방패 엠블럼 ----------

const SHIELD = "M8 6 H92 V50 C92 79 72 98 50 108 C28 98 8 79 8 50 Z";
type Pattern = "stripes" | "halves" | "sash" | "chevron" | "hoops" | "quarters";
const PATTERNS: Pattern[] = ["stripes", "halves", "sash", "chevron", "hoops", "quarters"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function PatternLayer({ p, color }: { p: Pattern; color: string }) {
  switch (p) {
    case "stripes":
      return <>{[18, 42, 66].map((x) => <rect key={x} x={x} y={0} width={14} height={112} fill={color} />)}</>;
    case "halves":
      return <rect x={50} y={0} width={50} height={112} fill={color} />;
    case "sash":
      return <polygon points="0,10 22,0 100,92 100,112 82,112 0,22" fill={color} />;
    case "chevron":
      return <polygon points="0,6 50,46 100,6 100,28 50,68 0,28" fill={color} />;
    case "hoops":
      return <>{[14, 34, 84].map((y) => <rect key={y} x={0} y={y} width={100} height={11} fill={color} />)}</>;
    case "quarters":
      return (
        <>
          <rect x={50} y={0} width={50} height={56} fill={color} />
          <rect x={0} y={56} width={50} height={56} fill={color} />
        </>
      );
  }
}

function ShieldBadge({ teamId, theme, size, className }: { teamId: string; theme: TeamTheme; size: number; className: string }) {
  const abbr = teamAbbr(teamId);
  const pattern = PATTERNS[hash(teamId) % PATTERNS.length];
  const clip = `clip-${teamId.replace(/[^a-z0-9-]/gi, "_")}`;
  const showText = size >= 30;
  // 테두리: 보조색이 너무 어두우면 포인트 색으로
  const ring = theme.secondary.toLowerCase() === "#000000" ? theme.accent : theme.secondary;

  return (
    <svg
      className={`badge-shield ${className}`}
      viewBox="0 0 100 112"
      width={size * 0.9}
      height={size}
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={0} width={100} height={112} fill={theme.primary} />
        <PatternLayer p={pattern} color={theme.secondary} />
        {showText && <rect x={0} y={44} width={100} height={28} fill={theme.primary} />}
        {showText && <rect x={0} y={44} width={100} height={28} fill="rgb(0 0 0 / 0.18)" />}
      </g>
      <path d={SHIELD} fill="none" stroke={ring} strokeWidth={6} />
      <path d={SHIELD} fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth={1.5} transform="translate(50 56) scale(0.86) translate(-50 -56)" />
      {showText && (
        <text
          x={50}
          y={66}
          textAnchor="middle"
          fill={theme.ink}
          fontFamily="Oswald, Bahnschrift, 'Arial Narrow', sans-serif"
          fontWeight={700}
          fontSize={abbr.length > 3 ? 17 : 21}
          letterSpacing={1}
        >
          {abbr}
        </text>
      )}
    </svg>
  );
}
