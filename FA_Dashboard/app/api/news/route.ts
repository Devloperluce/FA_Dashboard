import { NextRequest, NextResponse } from "next/server";
import { fetchTeamNews } from "@/lib/news";
import { mockNews } from "@/lib/mock";
import { snapshotNews } from "@/lib/snapshot";
import { resolveTeam } from "@/lib/teams";
import { enrichWithAi } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team") ?? "";
  const resolved = resolveTeam(teamId);
  if (!resolved) {
    return NextResponse.json({ error: "알 수 없는 팀입니다." }, { status: 400 });
  }
  const { team, sport } = resolved;

  const data =
    (process.env.NEWS_SNAPSHOT === "1" && snapshotNews(team)) ||
    (process.env.NEWS_MOCK === "1" ? mockNews(team) : await fetchTeamNews(team, sport, team.league === "mlb"));

  // 선택 기능: API 키가 있으면 AI가 재분류·번역·요약 (실패하면 규칙 결과 유지)
  if (!data.ai) {
    const ai = await enrichWithAi(team, sport, data.items);
    data.items = ai.items;
    data.ai = ai.brief;
    if (ai.error) data.errors.push(`AI: ${ai.error}`);
  }

  return NextResponse.json(data, {
    headers: {
      // Vercel CDN에서 5분 캐시, 이후 10분간은 이전 응답을 주면서 백그라운드 갱신
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
