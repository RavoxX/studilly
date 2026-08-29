import {
  CheckCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/feedback";
import { getT } from "@/i18n/server";
import { getLocale } from "@/i18n/server";

/**
 * A worked example of a marked task, rendered with the same primitives the
 * product uses.
 *
 * This is not a mocked screenshot: it is the real card, the real badges and
 * the real marking-criteria layout, filled with one illustrative task. It is
 * labelled as an example so nobody reads it as a real student's work.
 *
 * Showing the marking scheme is deliberate. Per-criterion marking is the thing
 * that separates Studilly from a chatbot that hands back a paragraph, so it
 * belongs in the hero rather than three sections down.
 */

const CRITERIA_DE = [
  { text: "Nennt beide Wirkungsrichtungen", points: 2, met: true },
  { text: "Begründet mit dem Marktmechanismus", points: 2, met: true },
  { text: "Belegt am Beispiel aus dem Material", points: 2, met: false },
];

const CRITERIA_EN = [
  { text: "Names both directions of effect", points: 2, met: true },
  { text: "Justifies via the market mechanism", points: 2, met: true },
  { text: "Evidences it from the source", points: 2, met: false },
];

export async function ExamPreview() {
  const t = await getT();
  const locale = await getLocale();
  const criteria = locale === "de" ? CRITERIA_DE : CRITERIA_EN;

  const awarded = criteria
    .filter((c) => c.met)
    .reduce((sum, c) => sum + c.points, 0);
  const possible = criteria.reduce((sum, c) => sum + c.points, 0);

  return (
    <figure className="w-full">
      <div className="overflow-hidden rounded-surface border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <span className="text-sm font-semibold text-ink">
            {locale === "de" ? "Aufgabe 2b" : "Task 2b"}
          </span>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">AFB II</Badge>
            <Badge tone="neutral">
              {locale === "de" ? "erläutern" : "erläutern"}
            </Badge>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-ink">
            {locale === "de"
              ? "Erläutere, wie sich eine Angebotsausweitung auf den Marktpreis auswirkt. Belege deine Erklärung am Material."
              : "Explain how an increase in supply affects the market price. Evidence your explanation from the source."}
          </p>
        </div>

        <div className="border-t border-line bg-surface-sunken px-5 py-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              {t.results.erwartungshorizont}
            </span>
            <span className="tabular text-sm font-semibold text-ink">
              {awarded}/{possible}
            </span>
          </div>

          <ul className="space-y-2.5">
            {criteria.map((criterion) => (
              <li key={criterion.text} className="flex items-start gap-2.5">
                {criterion.met ? (
                  <CheckCircleIcon
                    size={17}
                    weight="fill"
                    className="mt-px shrink-0 text-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircleIcon
                    size={17}
                    weight="fill"
                    className="mt-px shrink-0 text-danger"
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1 text-sm text-ink-muted">
                  {criterion.text}
                </span>
                <span className="tabular shrink-0 text-sm text-ink-subtle">
                  {criterion.met ? criterion.points : 0}/{criterion.points}
                </span>
                <span className="sr-only">
                  {criterion.met ? t.results.criterionMet : t.results.criterionMissed}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 border-t border-line pt-3 text-sm text-ink-muted">
            <span className="font-medium text-ink">
              {t.results.improvement}:{" "}
            </span>
            {locale === "de"
              ? "Deine Erklärung stimmt. Zitiere zusätzlich die Preisangabe aus Zeile 14, dann ist der Beleg vollständig."
              : "Your explanation is right. Also cite the price figure from line 14 and the evidence is complete."}
          </p>
        </div>
      </div>

      <figcaption className="mt-3 text-center text-xs text-ink-subtle">
        {locale === "de"
          ? "Beispielaufgabe zur Veranschaulichung der Korrektur."
          : "Example task, shown to illustrate how marking works."}
      </figcaption>
    </figure>
  );
}
