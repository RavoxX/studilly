"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, Progress } from "@/components/ui/feedback";
import { useT } from "@/i18n/client";
import { RATINGS, type Rating } from "@/lib/learning/srs";
import { cn } from "@/lib/utils/cn";

type Card = { id: string; front: string; back: string; topic: string | null };

/**
 * Flashcard review.
 *
 * Recall first, then reveal, then rate. Showing the answer before the student
 * has committed to one destroys the retrieval practice that makes spaced
 * repetition work, so the back stays hidden until they ask for it.
 *
 * Ratings are keyboard-accessible with 1 to 4, which is how anyone doing a
 * long session will actually work.
 */
export function ReviewSession({ cards }: { cards: Card[] }) {
  const t = useT();
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [pending, setPending] = useState(false);
  const [nextInterval, setNextInterval] = useState<number | null>(null);

  const card = cards[index];

  async function rate(rating: Rating) {
    if (!card || pending) return;
    setPending(true);

    const response = await fetch(`/api/flashcards/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });

    if (response.ok) {
      const body = (await response.json()) as { intervalDays: number };
      setNextInterval(body.intervalDays);
    }

    setReviewed((count) => count + 1);
    setPending(false);

    // A card rated "again" comes back later in the same queue.
    if (index + 1 >= cards.length) {
      router.refresh();
      setIndex(cards.length);
      return;
    }

    setIndex((i) => i + 1);
    setRevealed(false);
  }

  if (!card) {
    return (
      <div className="rounded-surface border border-line bg-surface px-6 py-12 text-center">
        <CheckCircleIcon
          size={30}
          weight="fill"
          className="mx-auto mb-4 text-success"
          aria-hidden="true"
        />
        <h2 className="text-base font-semibold text-ink">
          {t.learning.sessionDone}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {t.learning.sessionDoneBody(reviewed)}
        </p>
      </div>
    );
  }

  return (
    <div
      onKeyDown={(event) => {
        if (!revealed) return;
        const position = Number(event.key) - 1;
        if (position >= 0 && position < RATINGS.length) {
          const rating = RATINGS[position];
          if (rating) void rate(rating);
        }
      }}
      tabIndex={-1}
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-muted">{t.learning.dueNow}</span>
        <span className="tabular text-sm text-ink-subtle">
          {index + 1} {t.common.of} {cards.length}
        </span>
      </div>
      <Progress
        value={index}
        max={cards.length}
        className="mb-6"
        label={t.a11y.progress}
      />

      <Card className="p-6">
        {card.topic ? (
          <Badge tone="neutral" className="mb-4">
            {card.topic}
          </Badge>
        ) : null}

        <p className="plain-text text-lg leading-relaxed text-ink">
          {card.front}
        </p>

        {revealed ? (
          <>
            <hr className="my-5 border-line" />
            <p className="plain-text text-base leading-relaxed text-ink-muted">
              {card.back}
            </p>

            <div className="mt-6">
              <p className="mb-2.5 text-xs font-medium text-ink-subtle">
                {t.learning.ratingHint}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RATINGS.map((rating, position) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={pending}
                    onClick={() => void rate(rating)}
                    className={cn(
                      "rounded-control border px-3 py-2.5 text-sm font-medium transition-colors",
                      "disabled:opacity-50",
                      rating === "again"
                        ? "border-danger/40 text-danger hover:bg-danger-soft"
                        : rating === "hard"
                          ? "border-warning/40 text-warning hover:bg-warning-soft"
                          : rating === "good"
                            ? "border-brand/40 text-brand-text hover:bg-brand-soft"
                            : "border-success/40 text-success hover:bg-success-soft",
                    )}
                  >
                    {t.learning.rating[rating]}
                    <span className="ml-1.5 text-xs opacity-60">
                      {position + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <Button className="mt-6 w-full" onClick={() => setRevealed(true)}>
            {t.learning.showAnswer}
          </Button>
        )}
      </Card>

      {nextInterval !== null ? (
        <p className="mt-3 text-center text-xs text-ink-subtle" aria-live="polite">
          {t.learning.nextReview(nextInterval)}
        </p>
      ) : null}
    </div>
  );
}
