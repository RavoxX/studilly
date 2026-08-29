import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitch } from "@/components/shared/locale-switch";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="rounded-control" aria-label="Studilly">
          <Logo priority />
        </Link>
        <LocaleSwitch />
      </header>
      <main id="main" className="flex-1 px-4 pb-16 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
