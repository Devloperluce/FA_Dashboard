// public/logos 폴더의 이미지 파일을 읽어 lib/logos.generated.json 을 만듭니다.
// 파일 이름 = 팀 id (예: kbo-hanwha.png, epl-tot.svg). 빌드/개발 시작 전에 자동 실행됩니다.
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

const dir = join(process.cwd(), "public", "logos");
const exts = new Set([".png", ".svg", ".webp", ".jpg", ".jpeg"]);
const map = {};
if (existsSync(dir)) {
  for (const f of readdirSync(dir)) {
    const ext = extname(f).toLowerCase();
    if (exts.has(ext)) map[basename(f, extname(f))] = `/logos/${f}`;
  }
}
writeFileSync(join(process.cwd(), "lib", "logos.generated.json"), JSON.stringify(map, null, 2) + "\n");
console.log(`[logos] ${Object.keys(map).length}개 팀 로고 등록`);
