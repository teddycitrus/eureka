import Link from "next/link";
import { EurekaMark } from "./eureka-mark";

const NAV = [
  { href: "/", label: "Lanes" },
  { href: "/alerts", label: "Alerts" },
  { href: "/calls", label: "Calls" },
  { href: "/contacts", label: "Contacts" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/news", label: "Signals" },
];

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Eureka, back to the lanes">
            <EurekaMark />
            <span className="text-base font-semibold text-ink">Eureka</span>
          </Link>
          <nav className="flex gap-4 overflow-x-auto text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={n.label === title ? "page" : undefined}
                className={
                  n.label === title
                    ? "relative py-4 text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent"
                    : "py-4 text-ink-muted transition-colors hover:text-ink"
                }
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-4 pt-8">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
    </>
  );
}
