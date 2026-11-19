import { NextRequest, NextResponse } from "next/server";
import { fetchTeamNews } from "@/lib/news";
import { mockNews } from "@/lib/mock";
import { resolveTeam } from "@/lib/teams";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("team") ?? "";
  const resolved = resolveTeam(teamId);
  if (!resolved) {
    return NextResponse.json({ error: "알 수 없는 팀입니다." }, { status: 400 });
  }
  const { team, sport } = resolved;

  const data =
    process.env.NEWS_MOCK === "1"
      ? mockNews(team)
      : await fetchTeamNews(team, sport, team.league === "mlb");

  return NextResponse.json(data, {
    headers: {
      // Vercel CDN에서 5분 캐시, 이후 10분간은 이전 응답을 주면서 백그라운드 갱신
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
