import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "tcl-dojo-eda.aialra0.chatgpt.site";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "TCL/DOJO — 从 Tcl 语法到 EDA 自动化";
  const description =
    "44 课、128 个交互任务、10 个项目交付：在浏览器真实 Tcl 8.6 内核中，从扎实基础一路练到工程自动化与 EDA 发布门禁。";
  const socialDescription =
    "别背语法，把流程跑起来。真实 Tcl 8.6 内核、扎实基础、真实自动化项目与 Vivado 风格设计数据库。";
  const image = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "TCL/DOJO",
    keywords: ["Tcl", "EDA", "Vivado", "FPGA", "自动化", "交互式学习"],
    openGraph: {
      title,
      description: socialDescription,
      type: "website",
      locale: "zh_CN",
      url: origin,
      images: [
        {
          url: image,
          width: 1732,
          height: 909,
          alt: "TCL/DOJO — 从语法到 EDA 自动化",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: socialDescription,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
