export type Sport = "baseball" | "soccer";

export type League = {
  id: string;
  sport: Sport;
  name: string;
  short: string;
};

export type Team = {
  id: string;
  league: string;
  ko: string;
  en: string;
  /** 제목 매칭용 별칭 (짧은 이름, 영문 약칭 등) */
  aliases: string[];
};

export const LEAGUES: League[] = [
  { id: "kbo", sport: "baseball", name: "KBO 리그", short: "KBO" },
  { id: "mlb", sport: "baseball", name: "메이저리그", short: "MLB" },
  { id: "epl", sport: "soccer", name: "프리미어리그", short: "EPL" },
  { id: "laliga", sport: "soccer", name: "라리가", short: "LaLiga" },
  { id: "seriea", sport: "soccer", name: "세리에 A", short: "Serie A" },
  { id: "bundesliga", sport: "soccer", name: "분데스리가", short: "BL" },
  { id: "ligue1", sport: "soccer", name: "리그 1", short: "L1" },
];

type Row = [id: string, ko: string, en: string, aliases?: string[]];

const make = (league: string, rows: Row[]): Team[] =>
  rows.map(([id, ko, en, aliases = []]) => ({
    id: `${league}-${id}`,
    league,
    ko,
    en,
    aliases,
  }));

export const TEAMS: Team[] = [
  ...make("kbo", [
    ["lg", "LG 트윈스", "LG Twins", ["LG", "엘지"]],
    ["hanwha", "한화 이글스", "Hanwha Eagles", ["한화"]],
    ["ssg", "SSG 랜더스", "SSG Landers", ["SSG"]],
    ["samsung", "삼성 라이온즈", "Samsung Lions", ["삼성"]],
    ["nc", "NC 다이노스", "NC Dinos", ["NC"]],
    ["kt", "KT 위즈", "KT Wiz", ["KT", "kt"]],
    ["lotte", "롯데 자이언츠", "Lotte Giants", ["롯데"]],
    ["kia", "KIA 타이거즈", "KIA Tigers", ["KIA", "기아"]],
    ["doosan", "두산 베어스", "Doosan Bears", ["두산"]],
    ["kiwoom", "키움 히어로즈", "Kiwoom Heroes", ["키움"]],
  ]),
  ...make("mlb", [
    ["lad", "LA 다저스", "Los Angeles Dodgers", ["다저스", "Dodgers"]],
    ["sf", "샌프란시스코 자이언츠", "San Francisco Giants", ["샌프란시스코", "SF Giants"]],
    ["sd", "샌디에이고 파드리스", "San Diego Padres", ["샌디에이고", "Padres"]],
    ["ari", "애리조나 다이아몬드백스", "Arizona Diamondbacks", ["애리조나", "Diamondbacks"]],
    ["col", "콜로라도 로키스", "Colorado Rockies", ["콜로라도", "Rockies"]],
    ["nyy", "뉴욕 양키스", "New York Yankees", ["양키스", "Yankees"]],
    ["bos", "보스턴 레드삭스", "Boston Red Sox", ["보스턴", "Red Sox"]],
    ["tor", "토론토 블루제이스", "Toronto Blue Jays", ["토론토", "Blue Jays"]],
    ["tb", "탬파베이 레이스", "Tampa Bay Rays", ["탬파베이", "Rays"]],
    ["bal", "볼티모어 오리올스", "Baltimore Orioles", ["볼티모어", "Orioles"]],
    ["nym", "뉴욕 메츠", "New York Mets", ["메츠", "Mets"]],
    ["phi", "필라델피아 필리스", "Philadelphia Phillies", ["필라델피아", "Phillies"]],
    ["atl", "애틀랜타 브레이브스", "Atlanta Braves", ["애틀랜타", "Braves"]],
    ["mia", "마이애미 말린스", "Miami Marlins", ["마이애미", "Marlins"]],
    ["wsh", "워싱턴 내셔널스", "Washington Nationals", ["워싱턴", "Nationals"]],
    ["chc", "시카고 컵스", "Chicago Cubs", ["컵스", "Cubs"]],
    ["mil", "밀워키 브루어스", "Milwaukee Brewers", ["밀워키", "Brewers"]],
    ["stl", "세인트루이스 카디널스", "St. Louis Cardinals", ["세인트루이스", "Cardinals"]],
    ["cin", "신시내티 레즈", "Cincinnati Reds", ["신시내티", "Reds"]],
    ["pit", "피츠버그 파이리츠", "Pittsburgh Pirates", ["피츠버그", "Pirates"]],
    ["cle", "클리블랜드 가디언스", "Cleveland Guardians", ["클리블랜드", "Guardians"]],
    ["det", "디트로이트 타이거스", "Detroit Tigers", ["디트로이트", "Tigers"]],
    ["kc", "캔자스시티 로열스", "Kansas City Royals", ["캔자스시티", "Royals"]],
    ["min", "미네소타 트윈스", "Minnesota Twins", ["미네소타", "Twins"]],
    ["cws", "시카고 화이트삭스", "Chicago White Sox", ["화이트삭스", "White Sox"]],
    ["hou", "휴스턴 애스트로스", "Houston Astros", ["휴스턴", "Astros"]],
    ["sea", "시애틀 매리너스", "Seattle Mariners", ["시애틀", "Mariners"]],
    ["tex", "텍사스 레인저스", "Texas Rangers", ["텍사스", "Rangers"]],
    ["laa", "LA 에인절스", "Los Angeles Angels", ["에인절스", "Angels"]],
    ["ath", "애슬레틱스", "Athletics", ["애슬레틱스", "A's"]],
  ]),
  ...make("epl", [
    ["ars", "아스널", "Arsenal", ["아스날", "Arsenal"]],
    ["mci", "맨체스터 시티", "Manchester City", ["맨시티", "Man City"]],
    ["liv", "리버풀", "Liverpool", ["Liverpool"]],
    ["che", "첼시", "Chelsea", ["Chelsea"]],
    ["mun", "맨체스터 유나이티드", "Manchester United", ["맨유", "Man United", "Man Utd"]],
    ["tot", "토트넘", "Tottenham Hotspur", ["토트넘", "Tottenham", "Spurs"]],
    ["new", "뉴캐슬", "Newcastle United", ["뉴캐슬", "Newcastle"]],
    ["avl", "아스톤 빌라", "Aston Villa", ["애스턴 빌라", "Aston Villa"]],
    ["bha", "브라이튼", "Brighton", ["브라이턴", "Brighton"]],
    ["whu", "웨스트햄", "West Ham United", ["웨스트햄", "West Ham"]],
    ["bre", "브렌트포드", "Brentford", ["Brentford"]],
    ["cry", "크리스탈 팰리스", "Crystal Palace", ["팰리스", "Crystal Palace"]],
    ["ful", "풀럼", "Fulham", ["Fulham"]],
    ["bou", "본머스", "Bournemouth", ["Bournemouth"]],
    ["wol", "울버햄튼", "Wolverhampton Wanderers", ["울버햄프턴", "Wolves"]],
    ["eve", "에버턴", "Everton", ["에버튼", "Everton"]],
    ["nfo", "노팅엄 포레스트", "Nottingham Forest", ["노팅엄", "Forest"]],
  ]),
  ...make("laliga", [
    ["rma", "레알 마드리드", "Real Madrid", ["레알", "Real Madrid"]],
    ["bar", "바르셀로나", "Barcelona", ["바르사", "Barcelona", "Barça"]],
    ["atm", "아틀레티코 마드리드", "Atletico Madrid", ["아틀레티코", "Atletico"]],
    ["ath", "아틀레틱 빌바오", "Athletic Bilbao", ["빌바오", "Athletic Club"]],
    ["rso", "레알 소시에다드", "Real Sociedad", ["소시에다드", "Real Sociedad"]],
    ["vil", "비야레알", "Villarreal", ["Villarreal"]],
    ["bet", "레알 베티스", "Real Betis", ["베티스", "Betis"]],
    ["sev", "세비야", "Sevilla", ["Sevilla"]],
    ["val", "발렌시아", "Valencia", ["Valencia"]],
    ["mll", "마요르카", "Mallorca", ["Mallorca"]],
  ]),
  ...make("seriea", [
    ["int", "인터 밀란", "Inter Milan", ["인테르", "Inter"]],
    ["mil", "AC 밀란", "AC Milan", ["밀란", "Milan"]],
    ["juv", "유벤투스", "Juventus", ["유베", "Juventus"]],
    ["nap", "나폴리", "Napoli", ["Napoli"]],
    ["rom", "AS 로마", "AS Roma", ["로마", "Roma"]],
    ["laz", "라치오", "Lazio", ["Lazio"]],
    ["ata", "아탈란타", "Atalanta", ["Atalanta"]],
    ["fio", "피오렌티나", "Fiorentina", ["Fiorentina"]],
    ["bol", "볼로냐", "Bologna", ["Bologna"]],
    ["com", "코모", "Como", ["Como 1907"]],
  ]),
  ...make("bundesliga", [
    ["fcb", "바이에른 뮌헨", "Bayern Munich", ["뮌헨", "Bayern"]],
    ["bvb", "도르트문트", "Borussia Dortmund", ["도르트문트", "Dortmund"]],
    ["b04", "레버쿠젠", "Bayer Leverkusen", ["레버쿠젠", "Leverkusen"]],
    ["rbl", "라이프치히", "RB Leipzig", ["라이프치히", "Leipzig"]],
    ["sge", "프랑크푸르트", "Eintracht Frankfurt", ["프랑크푸르트", "Frankfurt"]],
    ["vfb", "슈투트가르트", "VfB Stuttgart", ["슈투트가르트", "Stuttgart"]],
    ["scf", "프라이부르크", "SC Freiburg", ["프라이부르크", "Freiburg"]],
    ["wob", "볼프스부르크", "VfL Wolfsburg", ["볼프스부르크", "Wolfsburg"]],
    ["m05", "마인츠", "Mainz 05", ["마인츠", "Mainz"]],
    ["bmg", "묀헨글라트바흐", "Borussia Monchengladbach", ["글라트바흐", "Gladbach"]],
  ]),
  ...make("ligue1", [
    ["psg", "파리 생제르맹", "Paris Saint-Germain", ["PSG", "파리"]],
    ["om", "마르세유", "Marseille", ["Marseille"]],
    ["asm", "AS 모나코", "AS Monaco", ["모나코", "Monaco"]],
    ["ol", "올랭피크 리옹", "Lyon", ["리옹", "Lyon"]],
    ["losc", "릴", "Lille", ["Lille"]],
    ["ogcn", "니스", "Nice", ["OGC Nice"]],
    ["rcl", "랑스", "Lens", ["RC Lens"]],
  ]),
];

export const teamById = (id: string) => TEAMS.find((t) => t.id === id);
export const leagueById = (id: string) => LEAGUES.find((l) => l.id === id);

/** 사용자가 직접 입력한 팀 (목록에 없는 팀) — id 형식: custom-{sport}-{이름} */
export function customTeam(sport: Sport, name: string): Team {
  const clean = name.trim().slice(0, 40);
  return {
    id: `custom-${sport}-${clean}`,
    league: sport === "baseball" ? "custom-baseball" : "custom-soccer",
    ko: clean,
    en: clean,
    aliases: [],
  };
}

export function resolveTeam(id: string): { team: Team; sport: Sport } | null {
  const m = id.match(/^custom-(baseball|soccer)-(.+)$/);
  if (m) {
    const sport = m[1] as Sport;
    return { team: customTeam(sport, m[2]), sport };
  }
  const team = teamById(id);
  if (!team) return null;
  const league = leagueById(team.league);
  return league ? { team, sport: league.sport } : null;
}

export function sportOfLeague(leagueId: string): Sport {
  if (leagueId === "custom-baseball") return "baseball";
  if (leagueId === "custom-soccer") return "soccer";
  return leagueById(leagueId)?.sport ?? "soccer";
}
