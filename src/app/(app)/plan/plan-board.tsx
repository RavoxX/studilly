"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwiseIcon,
  BookOpenIcon,
  CardsThreeIcon,
  CheckIcon,
  ExamIcon,
  RepeatIcon,
  TargetIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";
import { daysUntil, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Activity = "read" | "flashcards" | "practice" | "exam" | "review";

type Item = {
  id: string;
  planId: string;
  scheduledFor: string;
  title: string;
  description: string;
  activity: Activity;
  topicLabel: string | null;
  estimatedMinutes: number;
  status: "pending" | "done" | "skipped";
};

type Plan = {
  id: string;
  title: string;
  examDate: string;
  weeklyMinutes: number;
  subjectDe: string;
  subjectEn: string;
};

const ACTIVITY_ICONS: Record<Activity, React.ReactNode> = {
  read: <BookOpenIcon size={16} aria-hidden="true" />,
  flashcards: <CardsThreeIcon size={16} aria-hidden="true" />,
  practice: <TargetIcon size={16} aria-hidden="true" />,
  exam: <ExamIcon size={16} aria-hidden="true" />,
  review: <RepeatIcon size={16} aria-hidden="true" />,
};

/**
 * The plan, as a day or week view.
 *
 * Marking an item done writes directly from the browser: `learning_plan_items`
 * is one of the few tables with a client UPDATE policy, because ticking off a
 * session is a genuine user action with nothing to forge.
 *
 * When a student has fallen behind, the board says so and offers to
 * redistribute rather than silently showing a wall of overdue work.
 */
export function PlanBoard({
  plans,
  items: initialItems,
}: {
  plans: Plan[];
  items: Item[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<"day" | "week">("week");
  const [adapting, setAdapting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const overdue = useMemo(
    () =>
      items.filter(
        (item) => item.status === "pending" && item.scheduledFor < today,
      ),
    [items, today],
  );

  const visible = useMemo(() => {
    if (view === "day") {
      return items.filter((item) => item.scheduledFor === today);
    }
    const weekEnd = new Date();
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const end = weekEnd.toISOString().slice(0, 10);
    return items.filter(
      (item) => item.scheduledFor >= today && item.scheduledFor <= end,
    );
  }, [items, view, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of [...overdue, ...visible]) {
      const list = map.get(item.scheduledFor) ?? [];
      list.push(item);
      map.set(item.scheduledFor, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [overdue, visible]);

  async function setStatus(item: Item, status: "pending" | "done") {
    // Optimistic: ticking a checkbox should feel instant, and the only cost
    // of being wrong is a checkbox that flips back.
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status } : entry,
      ),
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("learning_plan_items")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    if (error) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: item.status } : entry,
        ),
      );
    }
  }

  async function adapt(planId: string) {
    setAdapting(true);
    await fetch(`/api/plans/${planId}/adapt`, { method: "POST" });
    setAdapting(false);
    router.refresh();
  }

  const doneCount = items.filter((item) => item.status === "done").length;

  return (
    <div>
      {/* Plan summaries */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const days = daysUntil(plan.examDate);
          const planItems = items.filter((item) => item.planId === plan.id);
          const planDone = planItems.filter(
            (item) => item.status === "done",
          ).length;

          return (
            <Card key={plan.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {locale === "de" ? plan.subjectDe : plan.subjectEn}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {formatDate(plan.examDate, locale)}
                  </p>
                </div>
                <Badge tone={days <= 3 ? "warning" : "neutral"}>
                  {t.plan.daysUntilExam(days)}
                </Badge>
              </div>

              <Progress
                value={planDone}
                max={Math.max(1, planItems.length)}
                className="mt-4"
                tone="success"
                label={t.a11y.progress}
              />
              <p className="mt-2 text-xs text-ink-subtle">
                {t.plan.progress(planDone, planItems.length)}
              </p>
            </Card>
          );
        })}
      </div>

      {overdue.length > 0 ? (
        <Alert
          tone="warning"
          className="mb-6"
          title={t.plan.behindTitle}
          action={
            <Button
              size="sm"
              variant="secondary"
              loading={adapting}
              onClick={() => {
                const planId = overdue[0]?.planId;
                if (planId) void adapt(planId);
              }}
            >
              <ArrowsClockwiseIcon size={15} aria-hidden="true" />
              {t.plan.adapt}
            </Button>
          }
        >
          {t.plan.behindBody(overdue.length)} {t.plan.adaptHint}
        </Alert>
      ) : null}

      {/* View switch */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div
          className="inline-flex rounded-control border border-line p-0.5"
          role="group"
          aria-label={t.plan.title}
        >
          {(["day", "week"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-current={view === option ? "true" : undefined}
              onClick={() => setView(option)}
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors",
                view === option
                  ? "bg-surface-sunken text-ink"
                  : "text-ink-subtle hover:text-ink",
              )}
            >
              {option === "day" ? t.plan.dayView : t.plan.weekView}
            </button>
          ))}
        </div>

        <span className="tabular text-sm text-ink-subtle">
          {t.plan.progress(doneCount, items.length)}
        </span>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-surface border border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
          {t.dashboard.planTodayEmpty}
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, dayItems]) => {
            const isOverdue = date < today;
            const isToday = date === today;

            return (
              <section key={date}>
                <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink">
                  {isToday ? t.plan.today : formatDate(date, locale)}
                  {isOverdue ? (
                    <Badge tone="warning">{formatDate(date, locale)}</Badge>
                  ) : null}
                </h2>

                <ul className="divide-y divide-line rounded-surface border border-line bg-surface">
                  {dayItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 px-4 py-3.5"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.status === "done"}
                        aria-label={item.title}
                        onClick={() =>
                          void setStatus(
                            item,
                            item.status === "done" ? "pending" : "done",
                          )
                        }
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                          item.status === "done"
                            ? "border-success bg-success text-white"
                            : "border-line-strong hover:border-brand",
                        )}
                      >
                        {item.status === "done" ? (
                          <CheckIcon size={12} weight="bold" aria-hidden="true" />
                        ) : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              item.status === "done"
                                ? "text-ink-subtle line-through"
                                : "text-ink",
                            )}
                          >
                            {item.title}
                          </span>
                          <Badge tone="neutral" icon={ACTIVITY_ICONS[item.activity]}>
                            {t.plan.activity[item.activity]}
                          </Badge>
                        </div>

                        {item.description ? (
                          <p className="mt-1 max-w-[64ch] text-sm text-ink-muted">
                            {item.description}
                          </p>
                        ) : null}
                      </div>

                      <span className="tabular shrink-0 text-xs text-ink-subtle">
                        {item.estimatedMinutes} {t.common.minutesShort}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
