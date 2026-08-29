import { Alert } from "@/components/ui/feedback";
import { getT } from "@/i18n/server";

/**
 * Shared shell for the legal pages.
 *
 * The notice at the top is not decoration. These documents contain
 * placeholders that only the operator can fill in, and a template is not a
 * legal document. Saying so plainly is more useful than shipping text that
 * looks finished and is not.
 */
export async function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const t = await getT();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink-subtle">
        {t.legal.lastUpdated(updated)}
      </p>

      <Alert
        tone="warning"
        title={t.legal.placeholderNoticeTitle}
        className="mt-8"
      >
        {t.legal.placeholderNoticeBody}
      </Alert>

      <div
        className={[
          "mt-10 space-y-8",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink",
          "[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink",
          "[&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-ink-muted",
          "[&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:list-disc",
          "[&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-ink-muted",
          "[&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2",
          "[&_table]:mt-4 [&_table]:w-full [&_table]:text-sm",
          "[&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink",
          "[&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_td]:align-top [&_td]:text-ink-muted",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

/** Marks information the operator has to supply. */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-warning-soft px-1.5 py-0.5 font-mono text-[0.8em] text-warning">
      [{children}]
    </mark>
  );
}
