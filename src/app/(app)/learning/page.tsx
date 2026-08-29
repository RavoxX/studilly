import type { Metadata } from "next";
import { Suspense } from "react";
import { CardsThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/feedback";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ReviewSession } from "./review-session";
import { GenerateCardsPanel } from "./generate-cards-panel";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { dueCards } from "@/lib/learning/service";
import { getT } from "@/i18n/server";

export const metadata: Metadata = { title: "Lernen" };

/**
 * The learning feed.
 *
 * Deliberately not an infinite scroll. The session has a defined end, because
 * "you are done for today" is the single most motivating thing a spaced
 * repetition tool can say, and an endless feed removes it.
 */
export default async function LearningPage() {
  const t = await getT();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t.learning.title}
        </h1>
        <p className="mt-1 max-w-[62ch] text-sm text-ink-muted">
          {t.learning.subtitle}
        </p>
      </div>

      <Suspense fallback={<SkeletonCard className="h-64" />}>
        <Feed />
      </Suspense>
    </div>
  );
}

async function Feed() {
  const { user } = await requireOnboardedUser();
  const t = await getT();
  const supabase = await createClient();

  const [due, { count: totalCards }, { data: materials }] = await Promise.all([
    dueCards({ userId: user.id, limit: 30 }),
    supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("learning_materials")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if ((totalCards ?? 0) === 0) {
    return (
      <>
        <EmptyState
          icon={<CardsThreeIcon size={22} aria-hidden="true" />}
          title={t.learning.empty}
          description={t.learning.emptyBody}
        />
        <div className="mt-6">
          <GenerateCardsPanel materials={materials ?? []} />
        </div>
      </>
    );
  }

  if (due.length === 0) {
    return (
      <>
        <EmptyState
          icon={<CardsThreeIcon size={22} aria-hidden="true" />}
          title={t.learning.noneDue}
          description={t.learning.noneDueBody}
        />
        <div className="mt-6">
          <GenerateCardsPanel materials={materials ?? []} />
        </div>
      </>
    );
  }

  return (
    <>
      <ReviewSession
        cards={due.map((card) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          topic: card.topic_label,
        }))}
      />
      <div className="mt-10">
        <GenerateCardsPanel materials={materials ?? []} />
      </div>
    </>
  );
}
