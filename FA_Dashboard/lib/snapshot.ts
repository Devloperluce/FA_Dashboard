// 개발·문서용: tests/fixtures/snapshots/{팀id}.json 에 저장된 "실제 수집 기사"로 화면을 그림
// NEWS_SNAPSHOT=1 npm run dev  → 외부 접속 없이 실제 데이터 모양 그대로 확인
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanSource, mergeItems, stripSourceSuffix, type NewsResponse } from "./news";
import type { Team } from "./teams";

type SnapshotFile = {
  capturedAt: string;
  batches: { lang: "ko" | "en"; teamFeed?: boolean; items: { title: string; source: string; link: string; publishedAt: string }[] }[];
};

export function snapshotNews(team: Team): NewsResponse | null {
  const file = join(process.cwd(), "tests", "fixtures", "snapshots", `${team.id}.json`);
  if (!existsSync(file)) return null;
  const snap = JSON.parse(readFileSync(file, "utf8")) as SnapshotFile;
  const batches = snap.batches.map((b) => ({
    lang: b.lang,
    items: b.items.map((i) => ({
      ...i,
      title: stripSourceSuffix(i.title, i.source),
      source: cleanSource(i.source),
      teamFeed: b.teamFeed,
    })),
  }));
  return {
    teamId: team.id,
    fetchedAt: new Date().toISOString(),
    queries: [`(snapshot ${snap.capturedAt})`],
    items: mergeItems(team, batches),
    errors: [],
    ai: null,
  };
}
