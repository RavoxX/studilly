import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="mb-8 rounded-control" aria-label="Studilly">
        <Logo size={30} />
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {t.errors.notFound}
      </h1>
      <p className="mt-3 max-w-[46ch] text-sm text-ink-muted">
        {t.errors.notFoundBody}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">{t.errors.backToDashboard}</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/">{t.errors.backHome}</Link>
        </Button>
      </div>
    </div>
  );
}
