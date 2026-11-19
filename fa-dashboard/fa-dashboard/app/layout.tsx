import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FA 레이더 · 내 팀 FA·이적 대시보드",
  description: "야구·해외축구 응원팀의 FA·이적 뉴스를 모아 가장 빠른 현황을 보여주는 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
