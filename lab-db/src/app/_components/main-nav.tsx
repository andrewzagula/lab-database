"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["Dashboard", "/"],
  ["Constructs", "/constructs"],
  ["Plasmids", "/plasmids"],
  ["Experiments", "/experiments"],
  ["Explore", "/explore"],
  ["Data quality", "/data-quality"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="flex flex-wrap gap-2 text-sm font-medium"
    >
      {LINKS.map(([label, href]) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md border border-teal-700 bg-teal-700 px-3 py-2 text-white transition"
                : "rounded-md border border-slate-200 px-3 py-2 text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
