"use client";

import { useEffect, useState } from "react";
import TeamBadge from "./TeamBadge";
import { storage, timeAgo } from "./format";
import { STATUS_META, type Status } from "@/lib/classify";
import type { NewsItem, NewsResponse } from "@/lib/news";
import { leagueById, resolveTeam } from "@/lib/teams";
import { teamTheme } from "@/lib/teamTheme";

const REFRESH_MS = 5 * 60 * 1000;
const seenKey = (id: string) => `fa:seen:${id}`;

type Summary = {
  latest?: NewsItem;
  latestDone?: NewsItem;
  in24h: number;
  done: number;
  fresh: number;
  error?: boolean;
};

function summarize(teamId: string, resp: NewsResponse): Summary {
  const items = resp.items.filter((i) => i.mentionsTeam);
  const now = Date.now();
  // 홈에서는 "본 것"으로 저장하지 않고 개수만 셈 (팀 화면에 들어가야 확인 처리)
  const seen = storage<string[] | null>(seenKey(teamId), null);
  const seenSet = new Set(seen ?? []);
  return {
    latest: items[0],
    latestDone: items.find((i) => i.status === "done"),
    in24h: items.filter((i) => now - +new Date(i.publishedAt) < 86400_000).length,
    done: items.filter((i) => i.status === "done").length,
    fresh: seen ? items.filter((i) => !seenSet.has(i.id)).length : 0,
  };
}

type Props = {
  favorites: string[];
  onOpen: (teamId: string) => void;
  onManage: () => void;
};

/** 홈: 즐겨찾기한 모든 팀의 현황을 한 화면에 */
export default function Home({ favorites, onOpen, onManage }: Props) {
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const loadAll = () =>
      favorites.forEach(async (id) => {
        try {
          const res = await fetch(`/api/news?team=${encodeURIComponent(id)}`);
          const json = (await res.json()) as NewsResponse;
          if (!res.ok) throw new Error();
          if (!cancelled) setSummaries((prev) => ({ ...prev, [id]: summarize(id, json) }));
        } catch {
          if (!cancelled) setSummaries((prev) => ({ ...prev, [id]: { in24h: 0, done: 0, fresh: 0, error: true } }));
        }
      });
    loadAll();
    const refresh = setInterval(() => !document.hidden && loadAll(), REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [favorites]);

  // 카드 순서는 즐겨찾기한 순서로 고정 (불러오는 순서에 따라 카드가 움직이지 않게)
  const ordered = favorites;
  const totalFresh = favorites.reduce((s, id) => s + (summaries[id]?.fresh ?? 0), 0);

  return (
    <main className="home">
      <section className="home-head">
        <div>
          <div className="eyebrow">MY TEAMS</div>
          <h2 className="home-title">내 팀 스토브리그</h2>
          <p className="muted">
            {totalFresh > 0 ? `지난 확인 이후 새 소식 ${totalFresh}건이 있어요.` : "즐겨찾기한 팀의 FA·이적 현황을 한눈에 볼 수 있어요."}
          </p>
        </div>
        <button className="btn" onClick={onManage}>
          + 팀 추가·관리
        </button>
      </section>

      <div className="home-grid">
        {ordered.map((id) => {
          const r = resolveTeam(id);
          if (!r) return null;
          const s = summaries[id];
          const t = teamTheme(id);
          const league = leagueById(r.team.league);
          return (
            <button
              key={id}
              className="home-card"
              onClick={() => onOpen(id)}
              style={{ "--card-team": t.primary, "--card-team-2": t.secondary, "--card-ink": t.ink } as React.CSSProperties}
            >
              <div className="home-card-top">
                <TeamBadge teamId={id} size={44} />
                <div className="home-card-name">
                  <strong>{r.team.ko}</strong>
                  <span>{league?.name ?? (r.sport === "baseball" ? "야구" : "해외축구")}</span>
                </div>
                {s && s.fresh > 0 && <span className="new">NEW {s.fresh}</span>}
              </div>

              {!s && <div className="home-skel" aria-hidden />}
              {s?.error && <p className="muted small">소식을 불러오지 못했어요.</p>}
              {s && !s.error && (
                <>
                  {s.latest ? (
                    <div className="home-latest">
                      <StatusPill status={s.latest.status} />
                      <p className="home-latest-title">{s.latest.titleKo ?? s.latest.title}</p>
                      <span className="meta">
                        {s.latest.source} · {timeAgo(s.latest.publishedAt, now)}
                      </span>
                    </div>
                  ) : (
                    <p className="muted small">최근 관련 기사가 없어요.</p>
                  )}
                  <div className="home-stats">
                    <span>
                      <b>{s.in24h}</b> 최근 24시간
                    </span>
                    <span>
                      <b>{s.done}</b> 확정
                    </span>
                    {s.latestDone && s.latestDone.id !== s.latest?.id && (
                      <span className="home-done" title={s.latestDone.title}>
                        ✓ {s.latestDone.titleKo ?? s.latestDone.title}
                      </span>
                    )}
                  </div>
                </>
              )}
              <span className="home-go" aria-hidden>
                자세히 →
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`tag tag-${status}`}>
      <i className={`dot seg-${status}`} />
      {STATUS_META[status].label}
    </span>
  );
}
