import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Lab Database",
  description: "Local lab database scaffold for constructs, plasmids, and experiments.",
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
              <div>
                <p className="font-mono text-xs font-semibold uppercase text-teal-700">
                  Phase 5 CRUD
                </p>
                <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
                  Lab Database
                </h1>
              </div>
              <nav
                aria-label="Primary navigation"
                className="flex flex-wrap gap-2 text-sm font-medium"
              >
                {[
                  ["Dashboard", "/"],
                  ["Constructs", "/constructs"],
                  ["Plasmids", "/plasmids"],
                  ["Experiments", "/experiments"],
                  ["Data quality", "/data-quality"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
