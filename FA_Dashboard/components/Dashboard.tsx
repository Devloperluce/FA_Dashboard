"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeamPicker from "./TeamPicker";
import DailyChart from "./DailyChart";
import TeamBadge from "./TeamBadge";
import { teamTheme, themeVars } from "@/lib/teamTheme";
import { clock, dateLabel, dayKey, save, storage, timeAgo } from "./format";
import { STATUS_META, STATUS_ORDER, type Status } from "@/lib/classify";
import type { NewsItem, NewsResponse } from "@/lib/news";
import { leagueById, resolveTeam } from "@/lib/teams";
import { canTranslateInBrowser, googleTranslateUrl, translateEnToKo } from "./translate";

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

  // 번역: 아이템 id → 한국어 제목, 한국어로 보여줄 id, 번역 중 id, 브라우저 번역 실패 id
  const [koTitles, setKoTitles] = useState<Record<string, string>>({});
  const [showKo, setShowKo] = useState<Set<string>>(new Set());
  const [busyKo, setBusyKo] = useState<Set<string>>(new Set());
  const [failedKo, setFailedKo] = useState<Set<string>>(new Set());
  const [autoKo, setAutoKo] = useState(false);
  const [trNote, setTrNote] = useState<string | null>(null);
  const koOf = (it: NewsItem) => it.titleKo ?? koTitles[it.id];
  const setIn = (fn: typeof setShowKo, id: string, on: boolean) =>
    fn((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const fetchKo = async (it: NewsItem) => {
    if (koOf(it)) return koOf(it);
    setIn(setBusyKo, it.id, true);
    const r = await translateEnToKo(it.title);
    setIn(setBusyKo, it.id, false);
    if (r) setKoTitles((prev) => ({ ...prev, [it.id]: r }));
    else setIn(setFailedKo, it.id, true);
    return r;
  };

  const toggleKo = async (it: NewsItem) => {
    if (showKo.has(it.id)) return setIn(setShowKo, it.id, false);
    if (!koOf(it) && !canTranslateInBrowser()) {
      // 내장 번역이 없는 브라우저: 클릭한 순간 바로 구글 번역 열기 (팝업 차단 방지)
      window.open(googleTranslateUrl(it.title), "_blank", "noopener");
      return;
    }
    if (await fetchKo(it)) setIn(setShowKo, it.id, true);
  };

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

  // "해외 기사 한국어로" 켜면 보이는 영문 기사를 차례로 번역
  useEffect(() => {
    if (!autoKo || !data) return;
    let cancelled = false;
    (async () => {
      const targets = data.items.filter((i) => i.lang === "en").slice(0, 60);
      const needBrowser = targets.some((i) => !koOf(i));
      if (needBrowser && !canTranslateInBrowser()) {
        setTrNote("이 브라우저는 내장 번역을 지원하지 않아요(Chrome 최신 버전 지원). 기사 옆 번역 버튼을 누르면 구글 번역으로 열려요.");
      }
      for (const it of targets) {
        if (cancelled) return;
        if (koOf(it) || (canTranslateInBrowser() && (await fetchKo(it)))) setIn(setShowKo, it.id, true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoKo, data]);

  useEffect(() => {
    if (!autoKo) {
      setShowKo(new Set());
      setTrNote(null);
    }
  }, [autoKo]);

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
        (!term ||
          i.title.toLowerCase().includes(term) ||
          (koOf(i) ?? "").toLowerCase().includes(term) ||
          i.source.toLowerCase().includes(term)),
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
  const theme = teamTheme(picking ? null : activeId);
  const ticker = base.slice(0, 8);

  return (
    <div className="shell" style={themeVars(theme) as React.CSSProperties}>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>FA</span>
          <div>
            <h1>FA RADAR</h1>
            <p>스토브리그 · 이적시장 실시간 현황</p>
          </div>
        </div>
        <nav className="fav-tabs" aria-label="내 팀">
          {favorites.map((id) => {
            const r = resolveTeam(id);
            if (!r) return null;
            const t = teamTheme(id);
            const on = id === activeId && !picking;
            return (
              <button
                key={id}
                className={`fav ${on ? "on" : ""}`}
                style={on ? { background: t.primary, color: t.ink, borderColor: t.secondary } : undefined}
                onClick={() => {
                  setActiveId(id);
                  setPicking(false);
                }}
              >
                <TeamBadge teamId={id} size={22} />
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

      {!picking && resolved && activeId && (
        <main>
          <section className="banner">
            <div className="banner-stripe" aria-hidden />
            <div className="banner-main">
              <TeamBadge teamId={activeId} size={84} className="banner-badge" />
              <div className="banner-text">
                <div className="eyebrow">
                  {league?.name ?? (resolved.sport === "baseball" ? "야구" : "해외축구")} ·{" "}
                  {resolved.sport === "baseball" ? "FA 시장" : "이적 시장"}
                </div>
                <h2 className="team-title">{resolved.team.ko}</h2>
                <div className="banner-en">{resolved.team.en}</div>
              </div>
            </div>
            <div className="banner-side">
              <span className={`live ${loading ? "loading" : ""}`}>
                <i /> {loading ? "UPDATING" : "LIVE"}
              </span>
              <div className="clock" aria-live="polite">
                {data ? clock(data.fetchedAt) : "--:--"}
                <small>
                  다음 갱신 {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, "0")}
                </small>
              </div>
              <button className="btn refresh-btn" onClick={() => load(activeId, true)} disabled={loading}>
                ↻ 지금 갱신
              </button>
            </div>
          </section>

          {ticker.length > 0 && (
            <div className="ticker" aria-label="최신 헤드라인">
              <span className="ticker-label">속보</span>
              <div className="ticker-track">
                <div className="ticker-move">
                  {[...ticker, ...ticker].map((it, i) => (
                    <a key={`${it.id}-${i}`} href={it.link} target="_blank" rel="noreferrer" aria-hidden={i >= ticker.length}>
                      <i className={`dot seg-${it.status}`} />
                      {it.title}
                      <em>{timeAgo(it.publishedAt, now)}</em>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <div className="alert">⚠ {error}</div>}
          {!data && loading && <Skeleton />}

          {data && (
            <>
              <section className="scoreboard">
                <Kpi label="LAST 24H" sub="최근 24시간" value={in24h} />
                <Kpi label="LAST 7D" sub="최근 7일" value={in7d} />
                <Kpi label="SIGNED" sub="계약·영입 확정" value={counts.done} />
                <Kpi label="NEW" sub="지난 확인 이후" value={newCount} accent={newCount > 0} />
              </section>

              {data.ai && (
                <section className="card ai-brief">
                  <div className="card-label">
                    <span className="ai-spark" aria-hidden>✦</span> AI 브리핑
                  </div>
                  <ol className="ai-summary">
                    {data.ai.summary.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ol>
                  {data.ai.players.length > 0 && (
                    <div className="players" aria-label="선수별 현황">
                      {data.ai.players.map((p) => (
                        <div key={p.name} className={`player st-${p.status}`}>
                          <strong>{p.name}</strong>
                          <StatusTag status={p.status} />
                          <span className="player-note">{p.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="muted small">기사 제목만 보고 AI({data.ai.model})가 정리한 내용이라 틀릴 수 있어요. 원문 기사를 함께 확인하세요.</p>
                </section>
              )}

              <section className="row hero-row">
                <article className="card hero">
                  <div className="card-label">
                    <span className="pulse" aria-hidden /> NOW · 가장 최신 현황
                  </div>
                  {latest ? (
                    <>
                      <StatusTag status={latest.status} ai={latest.statusBy === "ai"} />
                      <Title
                        it={latest}
                        className="hero-title"
                        ko={koOf(latest)}
                        showKo={showKo.has(latest.id)}
                        busy={busyKo.has(latest.id)}
                        failed={failedKo.has(latest.id)}
                        onToggle={toggleKo}
                      />
                      <div className="meta">
                        {latest.source} · {timeAgo(latest.publishedAt, now)}
                        {latest.coverage > 1 && ` · ${latest.coverage}개 매체 보도`}
                      </div>
                    </>
                  ) : (
                    <p className="muted">최근 30일 내 관련 기사가 없어요.</p>
                  )}
                </article>

                <article className="card done-card">
                  <div className="card-label">✓ 최근 확정 소식</div>
                  {latestDone ? (
                    <>
                      <Title
                        it={latestDone}
                        className="sub-title"
                        ko={koOf(latestDone)}
                        showKo={showKo.has(latestDone.id)}
                        busy={busyKo.has(latestDone.id)}
                        failed={failedKo.has(latestDone.id)}
                        onToggle={toggleKo}
                      />
                      <div className="meta">
                        {latestDone.source} · {timeAgo(latestDone.publishedAt, now)}
                      </div>
                    </>
                  ) : (
                    <p className="muted">아직 확정 보도가 없어요.</p>
                  )}
                </article>
              </section>

              <section className="row two">
                <article className="card">
                  <div className="card-label">현황 분류</div>
                  {total > 0 ? (
                    <>
                      <div className="stack" role="img" aria-label="상태별 기사 비율">
                        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                          <span key={s} className={`seg-${s}`} style={{ flexGrow: counts[s] }} title={`${STATUS_META[s].label} ${counts[s]}건`} />
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
                      <p className="muted small">
                        {base.some((i) => i.statusBy === "ai") ? "AI가 기사 제목을 읽고 분류했어요" : "제목 키워드 규칙으로 자동 분류해서 틀릴 수 있어요"} · 항목을 누르면 목록이 필터됩니다.
                      </p>
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
                  {data.items.some((i) => i.lang === "en") && (
                    <label className="toggle">
                      <input type="checkbox" checked={autoKo} onChange={(e) => setAutoKo(e.target.checked)} />
                      <TranslateIcon /> 해외 기사 한국어로
                    </label>
                  )}
                  {statusFilter && (
                    <button className="chip on" onClick={() => setStatusFilter(null)}>
                      {STATUS_META[statusFilter].label} ✕
                    </button>
                  )}
                  <input className="input grow" placeholder="선수·매체 검색" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>

                {trNote && <p className="tr-note">{trNote}</p>}
                {groups.length === 0 && <p className="muted empty">조건에 맞는 기사가 없어요.</p>}
                {groups.map(([k, list]) => (
                  <div key={k} className="day">
                    <h3 className="day-head">
                      {dateLabel(list[0].publishedAt)} <span>{list.length}건</span>
                    </h3>
                    <ul className="timeline">
                      {list.map((it) => (
                        <li key={it.id} className={`t-item st-${it.status}`}>
                          <time className="t-time">{clock(it.publishedAt)}</time>
                          <div className="t-body">
                            <div className="t-tags">
                              <StatusTag status={it.status} ai={it.statusBy === "ai"} />
                              {newIds.has(it.id) && <span className="new">NEW</span>}
                              {it.lang === "en" && <span className="lang">해외</span>}
                            </div>
                            <Title
                              it={it}
                              className="t-title"
                              ko={koOf(it)}
                              showKo={showKo.has(it.id)}
                              busy={busyKo.has(it.id)}
                              failed={failedKo.has(it.id)}
                              onToggle={toggleKo}
                            />
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

              <footer className="foot">
                출처: Google News 검색{resolved.team.league === "mlb" ? " · MLB Trade Rumors" : ""} · 5분마다 갱신
                {data.ai ? " · 분류·요약: AI" : " · 분류: 제목 키워드 규칙"} · 자동 판정이라 실제와 다를 수 있어요.
              </footer>
            </>
          )}
        </main>
      )}
    </div>
  );
}

function StatusTag({ status, ai }: { status: Status; ai?: boolean }) {
  const icon = { done: "✓", leaving: "↗", talks: "⇄", rumor: "?", other: "•" }[status];
  return (
    <span className={`tag tag-${status}`} title={ai ? "AI 분류" : "키워드 규칙 분류"}>
      <i className={`dot seg-${status}`} />
      {icon} {STATUS_META[status].label}
      {ai && <sup className="ai-mark">AI</sup>}
    </span>
  );
}

function TranslateIcon() {
  return (
    <svg className="tr-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden>
      <path
        fill="currentColor"
        d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
      />
    </svg>
  );
}

type TitleProps = {
  it: NewsItem;
  className: string;
  ko?: string;
  showKo: boolean;
  busy: boolean;
  failed: boolean;
  onToggle: (it: NewsItem) => void;
};

/** 기사 제목 + (영문 기사면) 번역 버튼 */
function Title({ it, className, ko, showKo, busy, failed, onToggle }: TitleProps) {
  const translated = showKo && ko && ko !== it.title ? ko : null;
  return (
    <div className="title-wrap">
      <a href={it.link} target="_blank" rel="noreferrer" className={className} lang={translated ? "ko" : it.lang}>
        {translated ? ko : it.title}
      </a>
      {translated && <div className="orig" lang="en">{it.title}</div>}
      {it.lang === "en" &&
        (failed ? (
          <a className="tr-btn" href={googleTranslateUrl(it.title)} target="_blank" rel="noreferrer">
            <TranslateIcon /> 구글 번역으로 보기
          </a>
        ) : (
          <button
            type="button"
            className={`tr-btn ${translated ? "on" : ""}`}
            onClick={() => onToggle(it)}
            disabled={busy}
            aria-label={translated ? "원문 보기" : "한국어로 번역"}
          >
            <TranslateIcon /> {busy ? "번역 중…" : translated ? "원문" : ko ? "번역 보기" : "번역"}
          </button>
        ))}
    </div>
  );
}

function Kpi({ label, sub, value, accent }: { label: string; sub: string; value: number; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? "accent" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{String(value).padStart(2, "0")}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="row hero-row" aria-hidden>
      <div className="card skel" />
      <div className="card skel" />
    </div>
  );
}
