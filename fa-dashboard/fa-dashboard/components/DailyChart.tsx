"use client";

import { useState } from "react";
import { dayKey } from "./format";
import type { NewsItem } from "@/lib/news";

const DAYS = 14;
const W = 560;
const H = 160;
const PAD = { top: 16, right: 8, bottom: 24, left: 28 };

export default function DailyChart({ items }: { items: NewsItem[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const now = Date.now();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const t = now - (DAYS - 1 - i) * 86400_000;
    return { key: dayKey(t), date: new Date(t), count: 0 };
  });
  const idx = new Map(days.map((d, i) => [d.key, i]));
  for (const it of items) {
    const i = idx.get(dayKey(it.publishedAt));
    if (i !== undefined) days[i].count++;
  }

  const max = Math.max(4, ...days.map((d) => d.count));
  const niceMax = Math.ceil(max / 4) * 4;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / DAYS;
  const barW = Math.min(22, slot - 6);
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        role="img"
        aria-label={`최근 ${DAYS}일 일별 기사 수`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.left - 6} y={y(t) + 3} className="axis" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const top = y(d.count);
          const h = PAD.top + innerH - top;
          const r = Math.min(4, h);
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)}>
              {/* 막대보다 넓은 히트 영역 */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {d.count > 0 && (
                <path
                  className={`bar ${hover === i ? "hot" : ""}`}
                  d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`}
                />
              )}
              {(i % 2 === 1 || i === DAYS - 1) && (
                <text x={x + barW / 2} y={H - 6} className="axis" textAnchor="middle">
                  {i === DAYS - 1 ? "오늘" : `${d.date.getMonth() + 1}/${d.date.getDate()}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="tooltip"
          style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <strong>{days[hover].count}건</strong>
          <span>
            {days[hover].date.getMonth() + 1}월 {days[hover].date.getDate()}일
          </span>
        </div>
      )}
    </div>
  );
}
