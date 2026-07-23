import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TCL/DOJO — EDA 实战速成",
  description:
    "一个场景驱动的交互式 Tcl 学习站：写代码、立即运行、通过真实 EDA 风格任务掌握 Tcl。",
};

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
