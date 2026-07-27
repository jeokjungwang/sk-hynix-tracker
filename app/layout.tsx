import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  description: "주말에도 실시간으로 시세 확인! 24시간 삼성전자·하이닉스 USDT 선물시세",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://everydaycheck.vercel.app",
    siteName: "everydaycheck",
    title: "24시간 삼성전자·하이닉스 USDT 선물시세",
    description: "주말에도 실시간으로 시세 확인! 해외 USDT 선물 vs 코스피 현물",
    images: [
      {
        url: "https://everydaycheck.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "24시간 삼성전자·하이닉스 USDT 선물시세",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "24시간 삼성전자·하이닉스 USDT 선물시세",
    description: "주말에도 실시간으로 시세 확인! 해외 USDT 선물 vs 코스피 현물",
    images: ["https://everydaycheck.vercel.app/og.png"],
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex h-full flex-col overflow-hidden bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
