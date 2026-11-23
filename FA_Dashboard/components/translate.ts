/**
 * 영문 → 한국어 제목 번역 (브라우저에서 실행)
 * 1) 서버의 AI 번역(titleKo)이 있으면 그것을 사용 (Dashboard 쪽에서 처리)
 * 2) 브라우저 내장 번역 API(Chrome 138+의 Translator) — 무료, 기기 안에서 번역
 * 3) 둘 다 없으면 구글 번역 페이지를 새 탭으로 열기
 */

type TranslatorLike = { translate: (text: string) => Promise<string> };
type TranslatorStatic = {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<TranslatorLike>;
};

let translatorPromise: Promise<TranslatorLike> | null = null;

/** 처음 한 번은 기기에 번역 모델을 내려받아야 해서 오래 걸릴 수 있음 → 기다리는 한도 */
const TIMEOUT_MS = 15_000;
const withTimeout = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS))]);
const cache = new Map<string, string>();

function getTranslatorApi(): TranslatorStatic | null {
  if (typeof self === "undefined") return null;
  return ((self as unknown as { Translator?: TranslatorStatic }).Translator) ?? null;
}

export function canTranslateInBrowser() {
  return getTranslatorApi() !== null;
}

/** 번역 결과, 또는 이 브라우저에서 번역할 수 없으면 null */
export async function translateEnToKo(text: string): Promise<string | null> {
  if (cache.has(text)) return cache.get(text)!;
  const api = getTranslatorApi();
  if (!api) return null;
  try {
    if (!translatorPromise) {
      const status = await api.availability({ sourceLanguage: "en", targetLanguage: "ko" });
      if (status === "unavailable") return null;
      // 처음 한 번은 번역 모델을 내려받느라 몇 초 걸릴 수 있음
      translatorPromise = api.create({ sourceLanguage: "en", targetLanguage: "ko" });
    }
    const out = await withTimeout(translatorPromise.then((t) => t.translate(text)));
    cache.set(text, out);
    return out;
  } catch (e) {
    // 시간 초과는 모델 다운로드가 계속되도록 두고, 그 외 오류는 다음에 처음부터 다시 시도
    if ((e as Error).message !== "timeout") translatorPromise = null;
    return null;
  }
}

export const googleTranslateUrl = (text: string) =>
  `https://translate.google.com/?sl=en&tl=ko&text=${encodeURIComponent(text)}&op=translate`;
