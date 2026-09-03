"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";
import type { ArtifactContent, ArtifactKind } from "@/lib/notebooks/schemas";

/**
 * The seven Studio outputs, drawn.
 *
 * The model returns structure, never markup, so every one of these decides
 * its own appearance. That is what lets a deck generated last month be
 * redrawn by a newer design, and it is why nothing here renders HTML from
 * the model: there is none to render.
 *
 * Content arrives as `unknown` because it comes back out of a jsonb column.
 * Each view narrows it once, and a row whose shape does not match — an old
 * artifact after a schema change — renders nothing rather than throwing and
 * taking the page with it.
 */
export function ArtifactView({
  kind,
  content,
}: {
  kind: ArtifactKind;
  content: unknown;
}) {
  switch (kind) {
    case "presentation":
      return <PresentationView data={content as ArtifactContent["presentation"]} />;
    case "mindmap":
      return <MindmapView data={content as ArtifactContent["mindmap"]} />;
    case "flashcards":
      return <FlashcardsView data={content as ArtifactContent["flashcards"]} />;
    case "quiz":
      return <QuizView data={content as ArtifactContent["quiz"]} />;
    case "table":
      return <TableView data={content as ArtifactContent["table"]} />;
    case "infographic":
      return <InfographicView data={content as ArtifactContent["infographic"]} />;
    case "report":
      return <ReportView data={content as ArtifactContent["report"]} />;
  }
}

// --- Presentation ----------------------------------------------------------

/**
 * One slide at a time, at 16:9.
 *
 * A deck shown as a scrolling list of headings is not a deck. The speaker
 * note sits below the slide rather than on it, which is where a presenter
 * expects it and keeps it out of the projected area.
 */
function PresentationView({ data }: { data: ArtifactContent["presentation"] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const slides = data?.slides ?? [];
  const slide = slides[Math.min(index, slides.length - 1)];
  if (!slide) return null;

  return (
    <div>
      <div className="aspect-[16/9] w-full overflow-hidden rounded-surface border border-line bg-surface-raised">
        <div className="flex h-full flex-col p-6 sm:p-8">
          <h3 className="text-lg font-semibold tracking-tight text-ink sm:text-2xl">
            {slide.heading}
          </h3>
          <ul className="mt-4 flex-1 space-y-2 overflow-y-auto sm:mt-6 sm:space-y-3">
            {slide.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-muted sm:text-base">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand"
                />
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Stepper
        index={index}
        total={slides.length}
        label={t.notebooks.viewer.slide(index + 1, slides.length)}
        onChange={setIndex}
      />

      {slide.note ? (
        <div className="mt-4 rounded-surface bg-surface-sunken p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            {t.notebooks.viewer.speakerNote}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            {slide.note}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// --- Mind map --------------------------------------------------------------

/**
 * A mind map as columns rather than a radial drawing.
 *
 * A real radial layout needs collision handling to stay legible and cannot be
 * read on a phone at all. Branches as cards keep the same two-level structure,
 * survive any width, and can actually be read aloud by a screen reader.
 */
function MindmapView({ data }: { data: ArtifactContent["mindmap"] }) {
  const branches = data?.branches ?? [];
  if (branches.length === 0) return null;

  return (
    <div>
      <div className="mx-auto w-fit rounded-surface bg-brand px-5 py-2.5 text-center text-sm font-semibold text-on-brand">
        {data.root}
      </div>

      {/* The connector, drawn once, so every branch reads as hanging off the
          root instead of floating beside it. */}
      <div aria-hidden="true" className="mx-auto h-6 w-px bg-line-strong" />

      <ul className="grid gap-3 sm:grid-cols-2">
        {branches.map((branch, i) => (
          <li
            key={i}
            className="rounded-surface border border-line bg-surface p-4"
          >
            <p className="text-sm font-semibold text-ink">{branch.label}</p>
            <ul className="mt-2.5 space-y-1.5 border-l border-line pl-3">
              {branch.children.map((child, j) => (
                <li key={j} className="text-sm leading-relaxed text-ink-muted">
                  {child}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Flashcards ------------------------------------------------------------

/** One card, turned over on click, exactly as the physical thing works. */
function FlashcardsView({ data }: { data: ArtifactContent["flashcards"] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const cards = data?.cards ?? [];
  const card = cards[Math.min(index, cards.length - 1)];
  if (!card) return null;

  function go(next: number) {
    setIndex(next);
    setShown(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-label={t.notebooks.viewer.flip}
        className={cn(
          "flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-surface",
          "border border-line bg-surface-raised p-6 text-center transition-colors",
          "hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        )}
      >
        <p className="text-base font-medium leading-relaxed text-ink">
          {card.front}
        </p>

        {shown ? (
          <>
            <span aria-hidden="true" className="h-px w-16 bg-line-strong" />
            <p className="text-sm leading-relaxed text-ink-muted">{card.back}</p>
          </>
        ) : (
          <span className="text-xs text-ink-subtle">
            {t.notebooks.viewer.showAnswer}
          </span>
        )}
      </button>

      <Stepper
        index={index}
        total={cards.length}
        label={t.notebooks.viewer.card(index + 1, cards.length)}
        onChange={go}
      />
    </div>
  );
}

// --- Quiz ------------------------------------------------------------------

/**
 * A quiz that is actually taken, not a printed answer key.
 *
 * The explanation appears only after an answer is chosen. Showing it earlier
 * would give the answer away, and the point of the thing is the attempt.
 */
function QuizView({ data }: { data: ArtifactContent["quiz"] }) {
  const t = useT();
  const questions = data?.questions ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  // At most fifteen questions, so counting on every render costs nothing
  // and needs no memo to keep its dependencies honest.
  const correct = questions.reduce(
    (total, question, i) =>
      answers[i] === question.correctIndex ? total + 1 : total,
    0,
  );

  const position = Math.min(index, questions.length - 1);
  const question = questions[position];
  if (!question) return null;

  const chosen = answers[position];
  const answered = chosen !== undefined;
  const done = Object.keys(answers).length === questions.length;

  return (
    <div>
      <p className="text-base font-medium leading-relaxed text-ink">
        {question.prompt}
      </p>

      <ul className="mt-4 space-y-2">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = chosen === i;

          return (
            <li key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() =>
                  setAnswers((current) => ({ ...current, [position]: i }))
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-control border px-4 py-3 text-left text-sm transition-colors",
                  !answered &&
                    "border-line-strong text-ink hover:bg-surface-sunken",
                  // After answering, the right answer is always marked, not
                  // just the one that was picked: being told "wrong" without
                  // being shown "this one" teaches nothing.
                  answered && isCorrect && "border-success bg-success-soft text-ink",
                  answered &&
                    isChosen &&
                    !isCorrect &&
                    "border-danger bg-danger-soft text-ink",
                  answered &&
                    !isChosen &&
                    !isCorrect &&
                    "border-line text-ink-subtle",
                )}
              >
                <span className="min-w-0 flex-1">{option}</span>
                {answered && isCorrect ? (
                  <CheckCircleIcon
                    size={18}
                    weight="fill"
                    aria-hidden="true"
                    className="shrink-0 text-success"
                  />
                ) : null}
                {answered && isChosen && !isCorrect ? (
                  <XCircleIcon
                    size={18}
                    weight="fill"
                    aria-hidden="true"
                    className="shrink-0 text-danger"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {answered ? (
        <div className="mt-4 rounded-surface bg-surface-sunken p-4">
          <p className="text-sm font-medium text-ink">
            {chosen === question.correctIndex
              ? t.notebooks.viewer.correct
              : t.notebooks.viewer.incorrect}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            {question.explanation}
          </p>
        </div>
      ) : null}

      <Stepper
        index={position}
        total={questions.length}
        label={t.notebooks.viewer.question(position + 1, questions.length)}
        onChange={setIndex}
      />

      {done ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-surface border border-line bg-surface p-4">
          <p className="text-sm font-medium text-ink">
            {t.notebooks.viewer.score(correct, questions.length)}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAnswers({});
              setIndex(0);
            }}
          >
            {t.notebooks.viewer.restart}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// --- Data table ------------------------------------------------------------

function TableView({ data }: { data: ArtifactContent["table"] }) {
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  if (columns.length === 0) return null;

  return (
    <div>
      {/* Its own scroller: a wide table must never make the page scroll. */}
      <div className="overflow-x-auto rounded-surface border border-line">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-left">
              {columns.map((column, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-2.5 font-medium text-ink"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, i) => (
              <tr key={i} className="align-top">
                {columns.map((_, j) => (
                  <td key={j} className="px-4 py-2.5 leading-relaxed text-ink-muted">
                    {row[j] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.note ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-subtle">{data.note}</p>
      ) : null}
    </div>
  );
}

// --- Infographic -----------------------------------------------------------

function InfographicView({ data }: { data: ArtifactContent["infographic"] }) {
  const t = useT();
  const stats = data?.stats ?? [];
  const steps = data?.steps ?? [];

  return (
    <div>
      {data?.summary ? (
        <p className="text-sm leading-relaxed text-ink-muted">{data.summary}</p>
      ) : null}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {stats.map((stat, i) => (
          <li
            key={i}
            className="rounded-surface border border-line bg-surface p-4"
          >
            {/* Figures use the tabular face so a column of them lines up. */}
            <p className="tabular text-2xl font-semibold tracking-tight text-brand-text">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{stat.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {stat.detail}
            </p>
          </li>
        ))}
      </ul>

      {steps.length > 0 ? (
        <div className="mt-6">
          <h4 className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            {t.notebooks.viewer.steps}
          </h4>
          <ol className="mt-3 space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{step.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

// --- Report ----------------------------------------------------------------

function ReportView({ data }: { data: ArtifactContent["report"] }) {
  const t = useT();
  const sections = data?.sections ?? [];
  const takeaways = data?.takeaways ?? [];

  return (
    <div>
      {data?.summary ? (
        <p className="border-l-2 border-brand pl-4 text-sm leading-relaxed text-ink-muted">
          {data.summary}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        {sections.map((section, i) => (
          <section key={i}>
            <h4 className="text-sm font-semibold text-ink">{section.heading}</h4>
            {/* The model writes paragraphs separated by blank lines; they are
                split here rather than rendered as one block of text. */}
            {section.body.split(/\n{2,}/).map((paragraph, j) => (
              <p
                key={j}
                className="mt-2 text-sm leading-relaxed text-ink-muted"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      {takeaways.length > 0 ? (
        <div className="mt-6 rounded-surface bg-surface-sunken p-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
            {t.notebooks.viewer.takeaways}
          </h4>
          <ul className="mt-3 space-y-2">
            {takeaways.map((takeaway, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-muted">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand"
                />
                <span className="leading-relaxed">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// --- Shared ----------------------------------------------------------------

/** Previous / next with the position spelled out, shared by the paged views. */
function Stepper({
  index,
  total,
  label,
  onChange,
}: {
  index: number;
  total: number;
  label: string;
  onChange: (next: number) => void;
}) {
  const t = useT();

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <Button
        size="sm"
        variant="secondary"
        disabled={index === 0}
        aria-label={t.notebooks.viewer.previous}
        onClick={() => onChange(index - 1)}
      >
        <ArrowLeftIcon size={15} aria-hidden="true" />
        {t.notebooks.viewer.previous}
      </Button>

      <p className="tabular text-xs text-ink-subtle">{label}</p>

      <Button
        size="sm"
        variant="secondary"
        disabled={index >= total - 1}
        aria-label={t.notebooks.viewer.next}
        onClick={() => onChange(index + 1)}
      >
        {t.notebooks.viewer.next}
        <ArrowRightIcon size={15} aria-hidden="true" />
      </Button>
    </div>
  );
}
