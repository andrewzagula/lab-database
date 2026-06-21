import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { MainNav } from "@/app/_components/main-nav";
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
  title: {
    default: "Lab Database",
    template: "%s · Lab Database",
  },
  description:
    "Local lab database for constructs, plasmids, and experiments with relationship tracing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-950">
        <div className="min-h-screen border-t-4 border-teal-700">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="group">
                <p className="font-mono text-xs font-semibold uppercase text-teal-700">
                  Constructs · Plasmids · Experiments
                </p>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950 group-hover:text-teal-800">
                  Lab Database
                </h1>
              </Link>
              <MainNav />
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
