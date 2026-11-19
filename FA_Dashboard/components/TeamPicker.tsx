"use client";

import { useMemo, useState } from "react";
import { LEAGUES, TEAMS, customTeam, type Sport } from "@/lib/teams";
import { teamTheme } from "@/lib/teamTheme";
import TeamBadge from "./TeamBadge";

type Props = {
  favorites: string[];
  onToggle: (teamId: string) => void;
  onClose?: () => void;
};

export default function TeamPicker({ favorites, onToggle, onClose }: Props) {
  const [sport, setSport] = useState<Sport>("baseball");
  const leagues = LEAGUES.filter((l) => l.sport === sport);
  const [leagueId, setLeagueId] = useState<string>(leagues[0].id);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");

  const changeSport = (s: Sport) => {
    setSport(s);
    setLeagueId(LEAGUES.find((l) => l.sport === s)!.id);
    setQ("");
  };

  const teams = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term) {
      const sportLeagues = new Set(leagues.map((l) => l.id));
      return TEAMS.filter(
        (t) =>
          sportLeagues.has(t.league) &&
          [t.ko, t.en, ...t.aliases].some((n) => n.toLowerCase().includes(term)),
      );
    }
    return TEAMS.filter((t) => t.league === leagueId);
  }, [q, leagueId, leagues]);

  const addCustom = () => {
    if (!custom.trim()) return;
    const t = customTeam(sport, custom);
    if (!favorites.includes(t.id)) onToggle(t.id);
    setCustom("");
  };

  return (
    <section className="picker" aria-label="팀 선택">
      <div className="picker-head">
        <div>
          <h2>좋아하는 팀 선택</h2>
          <p className="muted">여러 팀을 고를 수 있어요. 선택한 팀은 이 브라우저에 저장됩니다.</p>
        </div>
        {onClose && (
          <button className="btn" onClick={onClose}>
            완료
          </button>
        )}
      </div>

      <div className="seg" role="tablist">
        {(["baseball", "soccer"] as Sport[]).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={sport === s}
            className={sport === s ? "on" : ""}
            onClick={() => changeSport(s)}
          >
            {s === "baseball" ? "⚾ 야구" : "⚽ 해외축구"}
          </button>
        ))}
      </div>

      <div className="picker-tools">
        <div className="chips">
          {leagues.map((l) => (
            <button
              key={l.id}
              className={`chip ${leagueId === l.id && !q ? "on" : ""}`}
              onClick={() => {
                setLeagueId(l.id);
                setQ("");
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="팀 이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="team-grid">
        {teams.map((t) => {
          const on = favorites.includes(t.id);
          const th = teamTheme(t.id);
          return (
            <button
              key={t.id}
              className={`team-card ${on ? "on" : ""}`}
              onClick={() => onToggle(t.id)}
              aria-pressed={on}
              style={{ "--card-team": th.primary, "--card-accent-d": th.accent, "--card-accent-l": th.accentLight } as React.CSSProperties}
            >
              <TeamBadge teamId={t.id} size={38} />
              <span className="team-names">
                <span className="team-ko">{t.ko}</span>
                <span className="team-en">{t.en}</span>
              </span>
              <span className="team-check" aria-hidden>
                {on ? "★" : "☆"}
              </span>
            </button>
          );
        })}
        {teams.length === 0 && <p className="muted">검색 결과가 없어요. 아래에서 직접 추가해 보세요.</p>}
      </div>

      <div className="custom-row">
        <input
          className="input"
          placeholder={sport === "baseball" ? "목록에 없는 팀 직접 입력 (예: 상무 피닉스)" : "목록에 없는 팀 직접 입력 (예: 셀틱)"}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
        />
        <button className="btn" onClick={addCustom}>
          추가
        </button>
      </div>
    </section>
  );
}
