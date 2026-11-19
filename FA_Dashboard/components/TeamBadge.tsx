import { TEAM_LOGOS, teamAbbr, teamTheme } from "@/lib/teamTheme";

type Props = { teamId: string; size?: number; className?: string };

/** 팀 엠블럼: 등록된 로고가 있으면 이미지, 없으면 팀 컬러 약칭 배지 */
export default function TeamBadge({ teamId, size = 40, className = "" }: Props) {
  const logo = TEAM_LOGOS[teamId];
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="" width={size} height={size} className={`badge-img ${className}`} />;
  }
  const t = teamTheme(teamId);
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
