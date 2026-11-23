# FA 레이더 — 개발 문서

야구(KBO·MLB)·해외축구(5대 리그) 응원팀의 FA·이적 뉴스를 모아 **가장 최신 현황**을 보여주는 Next.js 앱입니다.
기획 배경과 결정 과정은 저장소 첫 화면의 [README](../README.md)에 정리했습니다.

## 실행

```bash
npm install
npm run dev               # 실제 뉴스 수집 (http://localhost:3000)
npm run dev:snapshot      # 저장된 실제 기사 스냅샷으로 화면 확인 (외부 접속 없음, 한화·양키스)
NEWS_MOCK=1 npm run dev   # 가짜 데이터
NEWS_MOCK=1 AI_MOCK=1 npm run dev   # AI 브리핑 카드 예시까지
npm test                  # 파싱·AI 응답 해석·분류 정확도 테스트
```

## 환경변수 (Vercel → Settings → Environment Variables)

| 이름 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 선택 | 넣으면 **AI 브리핑**(3줄 요약·선수별 현황·AI 재분류·영문 제목 번역)이 켜짐. 없으면 규칙 기반으로 동작 |
| `ANTHROPIC_MODEL` | 선택 | 기본 `claude-haiku-5-5` |

## 데이터 흐름

```
[브라우저] 팀 선택 ──▶ /api/news?team=mlb-nyy
                          │
                          ├─ Google News RSS 검색 (국내 2~3개 + 해외 1개 검색어)
                          ├─ MLB Trade Rumors 팀별 RSS (MLB만)
                          ▼
                 parseRss  → 매체명 정리 ("머니투데이 - 머니투데이" 등)
                 mergeItems → KBO 계열사·e스포츠 기사 제외
                            → 같은 소식 묶기 (36시간 안 · 같은 상태 · 선수명 공유)
                            → 규칙 분류 (lib/classify.ts)
                 enrichWithAi (키 있을 때) → AI 재분류·번역·요약, 실패 시 규칙 결과 유지
                          ▼
                 Vercel CDN 5분 캐시 ──▶ 대시보드 (5분마다 자동 갱신)
```

## 폴더 구조

```
app/api/news/route.ts    뉴스 API
lib/news.ts              검색어 구성, RSS 수집·파싱, 중복·유사 기사 묶기, 노이즈 필터
lib/classify.ts          상태 분류 규칙 (확정/이탈/협상/루머/기타)
lib/ai.ts                AI 브리핑 (선택)
lib/teams.ts             리그·팀·별칭
lib/teamTheme.ts         팀 컬러, 모드별 포인트 색 대비 보정
lib/snapshot.ts          스냅샷 모드
components/              대시보드 UI, 번역(translate.ts), 엠블럼
tests/                   분류 정답 데이터(실제 기사 156건), RSS 샘플, 테스트
public/logos/            팀 로고 (파일명 = 팀 id, 빌드 시 자동 등록)
```

## 번역

영문 기사 제목 옆 **번역** 버튼 / 필터의 **해외 기사 한국어로** 토글

1. AI 브리핑이 켜져 있으면 서버에서 받은 AI 번역 사용
2. 아니면 브라우저 내장 번역(Chrome의 Translator API, 기기 안에서 무료 번역)
3. 둘 다 안 되면 구글 번역 페이지로 연결

## 팀 컬러 · 로고

- 팀 대표색: `lib/teamTheme.ts`의 `TEAM_COLORS`. 다크·라이트 배경 각각에서 4.5:1 이상 대비가 나오도록 포인트 색을 자동 보정
- 로고: `public/logos/{팀id}.png|svg|webp` 를 넣으면 빌드 때 자동 등록. 없으면 약칭 배지(야구)·방패 엠블럼(축구)
- 로고 받는 곳: [public/logos/README.md](public/logos/README.md)
