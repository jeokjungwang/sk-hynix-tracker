import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://everydaycheck.vercel.app"),
  title: "삼성전자 · SK하이닉스 실시간 대시보드",
  description: "삼성전자와 SK하이닉스의 실시간 시세 및 지표를 확인해보세요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://everydaycheck.vercel.app",
    siteName: "삼성전자 · SK하이닉스 실시간 대시보드",
    title: "삼성전자 · SK하이닉스 실시간 대시보드",
    description: "삼성전자와 SK하이닉스의 실시간 시세 및 지표를 확인해보세요.",
    images: [
      {
        url: "/sumsum.png",
        width: 1200,
        height: 630,
        alt: "삼성전자 · SK하이닉스 실시간 대시보드",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "삼성전자 · SK하이닉스 실시간 대시보드",
    description: "삼성전자와 SK하이닉스의 실시간 시세 및 지표를 확인해보세요.",
    images: ["/sumsum.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('sk-tracker-theme');
    if (t !== 'light' && t !== 'dark') t = 'light';
    document.documentElement.classList.add(t);
  } catch (e) {
    document.documentElement.classList.add('light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex h-full flex-col overflow-hidden bg-background font-sans text-foreground">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
