"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeamPicker from "./TeamPicker";
import DailyChart from "./DailyChart";
import { clock, dateLabel, dayKey, save, storage, timeAgo } from "./format";
import { STATUS_META, STATUS_ORDER, type Status } from "@/lib/classify";
import type { NewsItem, NewsResponse } from "@/lib/news";
import { leagueById, resolveTeam } from "@/lib/teams";

const REFRESH_MS = 5 * 60 * 1000;
const FAV_KEY = "fa:favorites";
const ACTIVE_KEY = "fa:active";
const seenKey = (id: string) => `fa:seen:${id}`;

type LangFilter = "all" | "ko" | "en";

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const [data, setData] = useState<NewsResponse | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextAt, setNextAt] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [lang, setLang] = useState<LangFilter>("all");
  const [onlyTeam, setOnlyTeam] = useState(true);
  const [q, setQ] = useState("");

  // 저장된 즐겨찾기 복원
  useEffect(() => {
    const favs = storage<string[]>(FAV_KEY, []).filter((id) => resolveTeam(id));
    const active = storage<string | null>(ACTIVE_KEY, null);
    setFavorites(favs);
    setActiveId(active && favs.includes(active) ? active : favs[0] ?? null);
    setPicking(favs.length === 0);
    setReady(true);
  }, []);

  const toggleFavorite = (id: string) => {
    const adding = !favorites.includes(id);
    const next = adding ? [...favorites, id] : favorites.filter((x) => x !== id);
    setFavorites(next);
    save(FAV_KEY, next);
    if (adding) setActiveId(id);
    else if (activeId === id) setActiveId(next[next.length - 1] ?? null);
  };

  useEffect(() => {
    if (activeId) save(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const load = useCallback(async (teamId: string, manual = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?team=${encodeURIComponent(teamId)}${manual ? `&t=${Date.now()}` : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (activeIdRef.current !== teamId) return; // 그 사이 팀이 바뀜
      const resp = json as NewsResponse;
      const seen = storage<string[] | null>(seenKey(teamId), null);
      const seenSet = new Set(seen ?? []);
      setNewIds(seen ? new Set(resp.items.filter((i) => !seenSet.has(i.id)).map((i) => i.id)) : new Set());
      save(seenKey(teamId), [...new Set([...seenSet, ...resp.items.map((i) => i.id)])].slice(-500));
      setData(resp);
      if (resp.items.length === 0 && resp.errors.length) setError("뉴스 소스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setNextAt(Date.now() + REFRESH_MS);
    }
  }, []);

  // 팀이 바뀌면 즉시 로드
  useEffect(() => {
    setData(null);
    setStatusFilter(null);
    if (activeId) load(activeId);
  }, [activeId, load]);

  // 1초 시계 + 자동 갱신
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (activeIdRef.current && nextAt && n >= nextAt && !document.hidden) {
        setNextAt(0);
        load(activeIdRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [nextAt, load]);

  const resolved = activeId ? resolveTeam(activeId) : null;
  const league = resolved ? leagueById(resolved.team.league) : null;

  const base = useMemo(() => {
    if (!data) return [];
    return data.items.filter(
      (i) => (!onlyTeam || i.mentionsTeam) && (lang === "all" || i.lang === lang),
    );
  }, [data, onlyTeam, lang]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return base.filter(
      (i) =>
        (!statusFilter || i.status === statusFilter) &&
        (!term || i.title.toLowerCase().includes(term) || i.source.toLowerCase().includes(term)),
    );
  }, [base, statusFilter, q]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { done: 0, leaving: 0, talks: 0, rumor: 0, other: 0 };
    base.forEach((i) => c[i.status]++);
    return c;
  }, [base]);

  const latest = base[0];
  const latestDone = base.find((i) => i.status === "done");
  const in24h = base.filter((i) => now - +new Date(i.publishedAt) < 86400_000).length;
  const in7d = base.filter((i) => now - +new Date(i.publishedAt) < 7 * 86400_000).length;
  const newCount = base.filter((i) => newIds.has(i.id)).length;

  const groups = useMemo(() => {
    const m = new Map<string, NewsItem[]>();
    for (const it of visible) {
      const k = dayKey(it.publishedAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return [...m.entries()];
  }, [visible]);

  if (!ready) return <div className="shell" />;

  const remain = Math.max(0, Math.ceil((nextAt - now) / 1000));
  const total = STATUS_ORDER.reduce((s, k) => s + counts[k], 0);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>◎</span>
          <div>
            <h1>FA 레이더</h1>
            <p className="muted">내 팀의 FA·이적 소식을 가장 빠르게</p>
          </div>
        </div>
        <nav className="fav-tabs" aria-label="내 팀">
          {favorites.map((id) => {
            const r = resolveTeam(id);
            if (!r) return null;
            return (
              <button
                key={id}
                className={`fav ${id === activeId && !picking ? "on" : ""}`}
                onClick={() => {
                  setActiveId(id);
                  setPicking(false);
                }}
              >
                <span>{r.sport === "baseball" ? "⚾" : "⚽"}</span>
                {r.team.ko}
              </button>
            );
          })}
          <button className={`fav add ${picking ? "on" : ""}`} onClick={() => setPicking((p) => !p)}>
            {picking ? "닫기" : "+ 팀 관리"}
          </button>
        </nav>
      </header>

      {picking && (
        <TeamPicker
          favorites={favorites}
          onToggle={toggleFavorite}
          onClose={favorites.length ? () => setPicking(false) : undefined}
        />
      )}

      {!picking && resolved && (
        <main>
          <section className="team-head">
            <div>
              <div className="eyebrow">
                {league?.name ?? (resolved.sport === "baseball" ? "야구" : "해외축구")} ·{" "}
                {resolved.sport === "baseball" ? "FA 시장" : "이적 시장"}
              </div>
              <h2 className="team-title">{resolved.team.ko}</h2>
              <div className="muted small">{resolved.team.en}</div>
            </div>
            <div className="refresh">
              <div className="muted small" aria-live="polite">
                {loading
                  ? "최신 소식 불러오는 중…"
                  : data
                    ? `${clock(data.fetchedAt)} 갱신 · 자동 갱신까지 ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`
                    : ""}
              </div>
              <button className="btn primary" onClick={() => activeId && load(activeId, true)} disabled={loading}>
                {loading ? "불러오는 중" : "↻ 지금 갱신"}
              </button>
            </div>
          </section>

          {error && <div className="alert">⚠ {error}</div>}

          {!data && loading && <Skeleton />}

          {data && (
            <>
              <section className="row hero-row">
                <article className="card hero">
                  <div className="card-label">
                    <span className="pulse" aria-hidden /> 가장 최신 현황
                  </div>
                  {latest ? (
                    <>
                      <StatusTag status={latest.status} />
                      <a className="hero-title" href={latest.link} target="_blank" rel="noreferrer">
                        {latest.title}
                      </a>
                      <div className="meta">
                        {latest.source} · {timeAgo(latest.publishedAt, now)}
                        {latest.coverage > 1 && ` · ${latest.coverage}개 매체 보도`}
                      </div>
                    </>
                  ) : (
                    <p className="muted">최근 30일 내 관련 기사가 없어요.</p>
                  )}
                </article>

                <article className="card">
                  <div className="card-label">최근 확정 소식</div>
                  {latestDone ? (
                    <>
                      <a className="sub-title" href={latestDone.link} target="_blank" rel="noreferrer">
                        {latestDone.title}
                      </a>
                      <div className="meta">
                        {latestDone.source} · {timeAgo(latestDone.publishedAt, now)}
                      </div>
                    </>
                  ) : (
                    <p className="muted">아직 확정 보도가 없어요.</p>
                  )}
                </article>

                <div className="kpis">
                  <Kpi label="최근 24시간" value={in24h} unit="건" />
                  <Kpi label="최근 7일" value={in7d} unit="건" />
                  <Kpi label="새 소식" value={newCount} unit="건" hint="지난 확인 이후" accent={newCount > 0} />
                </div>
              </section>

              <section className="row two">
                <article className="card">
                  <div className="card-label">현황 분류</div>
                  {total > 0 ? (
                    <>
                      <div className="stack" role="img" aria-label="상태별 기사 비율">
                        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                          <span
                            key={s}
                            className={`seg-${s}`}
                            style={{ flexGrow: counts[s] }}
                            title={`${STATUS_META[s].label} ${counts[s]}건`}
                          />
                        ))}
                      </div>
                      <ul className="legend">
                        {STATUS_ORDER.map((s) => (
                          <li key={s}>
                            <button
                              className={`legend-btn ${statusFilter === s ? "on" : ""}`}
                              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                              aria-pressed={statusFilter === s}
                            >
                              <i className={`dot seg-${s}`} />
                              <span className="lg-name">{STATUS_META[s].label}</span>
                              <span className="lg-val">{counts[s]}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="muted small">제목 키워드 기반 자동 분류예요. 항목을 누르면 목록이 필터됩니다.</p>
                    </>
                  ) : (
                    <p className="muted">분류할 기사가 없어요.</p>
                  )}
                </article>
                <article className="card">
                  <div className="card-label">최근 14일 보도량</div>
                  <DailyChart items={base} />
                </article>
              </section>

              <section className="card feed">
                <div className="filters">
                  <div className="seg small-seg">
                    {(["all", "ko", "en"] as LangFilter[]).map((l) => (
                      <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
                        {l === "all" ? "전체" : l === "ko" ? "국내 보도" : "해외 보도"}
                      </button>
                    ))}
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={onlyTeam} onChange={(e) => setOnlyTeam(e.target.checked)} />
                    제목에 팀명 있는 기사만
                  </label>
                  {statusFilter && (
                    <button className="chip on" onClick={() => setStatusFilter(null)}>
                      {STATUS_META[statusFilter].label} ✕
                    </button>
                  )}
                  <input className="input grow" placeholder="선수·매체 검색" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>

                {groups.length === 0 && <p className="muted empty">조건에 맞는 기사가 없어요.</p>}
                {groups.map(([k, list]) => (
                  <div key={k} className="day">
                    <h3 className="day-head">
                      {dateLabel(list[0].publishedAt)} <span className="muted">{list.length}건</span>
                    </h3>
                    <ul className="timeline">
                      {list.map((it) => (
                        <li key={it.id} className="t-item">
                          <time className="t-time">{clock(it.publishedAt)}</time>
                          <div className="t-body">
                            <div className="t-tags">
                              <StatusTag status={it.status} />
                              {newIds.has(it.id) && <span className="new">NEW</span>}
                              {it.lang === "en" && <span className="lang">해외</span>}
                            </div>
                            <a href={it.link} target="_blank" rel="noreferrer" className="t-title">
                              {it.title}
                            </a>
                            <div className="meta">
                              {it.source}
                              {it.coverage > 1 && ` 외 ${it.coverage - 1}곳`}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>

              <footer className="foot muted small">
                출처: Google News 검색 결과 · 5분마다 서버 캐시 갱신 · 분류는 제목 키워드 기반 자동 판정이라 실제와 다를 수 있어요.
              </footer>
            </>
          )}
        </main>
      )}
    </div>
  );
}

function StatusTag({ status }: { status: Status }) {
  const icon = { done: "✓", leaving: "↗", talks: "⇄", rumor: "?", other: "•" }[status];
  return (
    <span className={`tag tag-${status}`}>
      <i className={`dot seg-${status}`} />
      {icon} {STATUS_META[status].label}
    </span>
  );
}

function Kpi({ label, value, unit, hint, accent }: { label: string; value: number; unit: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? "accent" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        <small>{unit}</small>
      </div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="row hero-row" aria-hidden>
      <div className="card skel" />
      <div className="card skel" />
      <div className="card skel" />
    </div>
  );
}
