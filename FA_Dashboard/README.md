# FA 레이더 ⚾⚽

야구(KBO·MLB)·해외축구(EPL·라리가·세리에A·분데스리가·리그1) 응원팀을 고르면
그 팀의 **FA·이적 뉴스**를 모아 가장 최신 현황을 대시보드로 보여주는 Next.js 앱입니다.

## 기능
- 팀 선택 (여러 팀 즐겨찾기, 브라우저에 저장) + 목록에 없는 팀 직접 입력
- **가장 최신 현황** / **최근 확정 소식** 카드, 24시간·7일·새 소식 지표
- 제목 키워드 기반 자동 분류: 계약·영입 확정 / 이탈·결별 / 협상 중 / 관심·루머 / 기타
- 최근 14일 보도량 차트, 날짜별 타임라인, 국내/해외 보도 필터, 검색
- 같은 제목 기사 중복 제거(보도 매체 수 표시), 지난 확인 이후 새 기사 **NEW** 표시
- 5분마다 자동 갱신 + 수동 갱신

## 데이터 소스
API 키 없이 Google News RSS 검색을 서버(`/api/news`)에서 호출합니다.
- 야구: `"팀명" FA`, `"팀명" (계약 OR 영입 OR 협상 OR 보상선수)` (+MLB는 영문 free agent 검색)
- 축구: `"팀명" (이적 OR 영입 OR FA OR 재계약)` + 영문 transfer 검색
- 응답은 Vercel CDN에서 5분 캐시됩니다.

## 실행
```bash
npm install
npm run dev            # http://localhost:3000
NEWS_MOCK=1 npm run dev  # 외부 접속 없이 가짜 데이터로 UI 확인
```

## Vercel 배포
GitHub에 push → Vercel에서 저장소 Import → 별도 환경변수 없이 Deploy.

## 구조
```
app/api/news/route.ts   뉴스 API (팀 id → 검색·병합·분류)
lib/teams.ts            리그·팀 목록과 별칭
lib/news.ts             RSS 수집·파싱·중복제거
lib/classify.ts         현황 분류 규칙
components/             대시보드 UI
```

## 팀 컬러 · 로고
- 팀별 대표색은 `lib/teamTheme.ts`의 `TEAM_COLORS`에 있고, 선택한 팀에 따라 배너·포인트 색이 바뀝니다.
  어두운 배경에서 읽기 어려운 색(남색·검정 등)은 자동으로 밝게 보정해 포인트 색으로 씁니다.
- 기본 엠블럼은 팀 컬러 약칭 배지입니다. 공식 로고를 쓰려면 사용 권한이 있는 이미지를
  `public/logos/`에 넣고 `TEAM_LOGOS`에 경로를 등록하세요. 예: `"kbo-hanwha": "/logos/kbo-hanwha.png"`
