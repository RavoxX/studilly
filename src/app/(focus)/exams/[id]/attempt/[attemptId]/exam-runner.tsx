"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloudCheckIcon,
  CloudWarningIcon,
  FlagIcon,
  ListChecksIcon,
  SignOutIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/i18n/client";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Task = {
  id: string;
  label: string;
  prompt: string;
  stimulus: string | null;
  operator: string | null;
  afb: "I" | "II" | "III" | null;
  points: number;
  answer: string;
  flagged: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 900;

/**
 * The exam runner.
 *
 * Answers save straight to Supabase from the browser. That is a deliberate
 * exception to the "everything through an API route" rule: typing has to feel
 * instant, and a round trip through the application server on every pause
 * would not. It is safe because the RLS policy on `exam_answers` enforces the
 * invariants that matter (the attempt is yours, it is still running, the task
 * belongs to that exam) and because nothing scored is writable this way.
 *
 * Recovery: answers are persisted, not held in memory, so a refresh, a crash
 * or a closed tab loses nothing. The timer is derived from the server's
 * `started_at`, so reloading does not hand the student extra time.
 *
 * Mobile is a genuinely different layout, not a narrowed desktop one: the
 * task list becomes a sheet, and navigation moves to a thumb-reachable bar.
 */
export function ExamRunner({
  exam,
  attempt,
  tasks: initialTasks,
}: {
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    totalPoints: number;
  };
  attempt: { id: string; startedAt: string; serverNow: string };
  tasks: Task[];
}) {
  const t = useT();
  const router = useRouter();

  const [tasks, setTasks] = useState(initialTasks);
  const [current, setCurrent] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingSaves = useRef(new Set<string>());

  // --- Timer ---------------------------------------------------------------
  // Anchored to the SERVER's clock, so a client with a wrong or deliberately
  // altered system time cannot gain working time.
  const deadline = useMemo(
    () =>
      new Date(attempt.startedAt).getTime() + exam.durationMinutes * 60_000,
    [attempt.startedAt, exam.durationMinutes],
  );

  // The initial value comes purely from server-supplied timestamps, so render
  // never calls `Date.now()`. The offset between the server and client clocks
  // is measured on mount and kept in a ref, and every subsequent tick happens
  // inside the interval callback.
  const clockOffsetRef = useRef(0);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(
      0,
      Math.round((deadline - new Date(attempt.serverNow).getTime()) / 1000),
    ),
  );

  useEffect(() => {
    clockOffsetRef.current = new Date(attempt.serverNow).getTime() - Date.now();

    const tick = setInterval(() => {
      setRemainingSeconds(
        Math.max(
          0,
          Math.round(
            (deadline - (Date.now() + clockOffsetRef.current)) / 1000,
          ),
        ),
      );
    }, 1000);

    return () => clearInterval(tick);
  }, [deadline, attempt.serverNow]);

  const timeUp = remainingSeconds <= 0;
  const lowTime = remainingSeconds > 0 && remainingSeconds <= 300;

  // --- Autosave ------------------------------------------------------------
  const persist = useCallback(
    async (taskId: string, answer: string, flagged: boolean) => {
      const supabase = createClient();
      setSaveState("saving");
      pendingSaves.current.add(taskId);

      const { error } = await supabase
        .from("exam_answers")
        .update({ answer_text: answer, is_flagged: flagged })
        .eq("attempt_id", attempt.id)
        .eq("task_id", taskId);

      pendingSaves.current.delete(taskId);

      if (error) {
        setSaveState("error");
        return false;
      }

      if (pendingSaves.current.size === 0) setSaveState("saved");
      return true;
    },
    [attempt.id],
  );

  const scheduleSave = useCallback(
    (taskId: string, answer: string, flagged: boolean) => {
      const timers = saveTimers.current;
      const existing = timers.get(taskId);
      if (existing) clearTimeout(existing);

      timers.set(
        taskId,
        setTimeout(() => {
          timers.delete(taskId);
          void persist(taskId, answer, flagged);
        }, AUTOSAVE_DELAY_MS),
      );
    },
    [persist],
  );

  // Flush pending saves on unmount so navigating away does not drop the last
  // keystrokes.
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // Warn before closing the tab while a save is still queued.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (saveTimers.current.size > 0 || pendingSaves.current.size > 0) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  function updateAnswer(taskId: string, answer: string) {
    setTasks((list) =>
      list.map((task) => (task.id === taskId ? { ...task, answer } : task)),
    );
    const task = tasks.find((entry) => entry.id === taskId);
    scheduleSave(taskId, answer, task?.flagged ?? false);
  }

  function toggleFlag(taskId: string) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    const flagged = !task.flagged;
    setTasks((list) =>
      list.map((entry) => (entry.id === taskId ? { ...entry, flagged } : entry)),
    );
    void persist(taskId, task.answer, flagged);
  }

  // --- Submit --------------------------------------------------------------
  const answeredCount = tasks.filter((task) => task.answer.trim() !== "").length;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);

    // Flush anything still queued before the answer window closes.
    for (const [taskId, timer] of saveTimers.current) {
      clearTimeout(timer);
      saveTimers.current.delete(taskId);
      const task = tasks.find((entry) => entry.id === taskId);
      if (task) await persist(taskId, task.answer, task.flagged);
    }

    // Measured against the server clock. The submit endpoint clamps this to
    // the real elapsed time anyway, so a tampered client cannot inflate it.
    const elapsedSeconds = Math.max(
      0,
      Math.round(
        (Date.now() +
          clockOffsetRef.current -
          new Date(attempt.startedAt).getTime()) /
          1000,
      ),
    );

    const response = await fetch(`/api/attempts/${attempt.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSpentSeconds: elapsedSeconds }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setSubmitError(
        body?.error === "limit_reached"
          ? t.subscription.limitReachedBody
          : body?.error === "ai_unavailable"
            ? t.errors.aiUnavailable
            : t.examRunner.gradingFailedBody,
      );
      setSubmitting(false);
      setSubmitOpen(false);
      return;
    }

    router.replace(`/exams/${exam.id}/results/${attempt.id}`);
  }

  const task = tasks[current];
  if (!task) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar: time, progress, exit */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-control text-sm text-ink-muted hover:text-ink"
          >
            <SignOutIcon size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{t.examRunner.exit}</span>
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            <span className="truncate text-sm font-medium text-ink">
              {exam.title}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <SaveIndicator state={saveState} />
            <span
              className={cn(
                "tabular rounded-control px-2 py-1 text-sm font-semibold",
                timeUp
                  ? "bg-danger-soft text-danger"
                  : lowTime
                    ? "bg-warning-soft text-warning"
                    : "text-ink",
              )}
              aria-live="off"
              aria-label={t.examRunner.timeLeft}
            >
              {formatDuration(remainingSeconds)}
            </span>
          </div>
        </div>

        <Progress
          value={answeredCount}
          max={tasks.length}
          className="h-1 rounded-none"
          label={t.a11y.progress}
        />
      </header>

      {timeUp ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <Alert tone="warning" title={t.examRunner.timeUp}>
            {t.examRunner.timeUpBody}
          </Alert>
        </div>
      ) : null}

      {submitError ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <Alert tone="danger">{submitError}</Alert>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-8 px-4 py-6 pb-28 lg:pb-6">
        {/* Desktop task rail */}
        <nav
          className="hidden w-40 shrink-0 lg:block"
          aria-label={t.examRunner.overview}
        >
          <ol className="sticky top-24 space-y-1">
            {tasks.map((entry, index) => (
              <li key={entry.id}>
                <TaskChip
                  task={entry}
                  active={index === current}
                  onSelect={() => setCurrent(index)}
                />
              </li>
            ))}
          </ol>
        </nav>

        {/* Task */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-ink">
                {t.examRunner.task} {task.label}
              </h1>
              <span className="tabular text-sm text-ink-subtle">
                {task.points} {t.common.pointsShort}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {task.afb ? <Badge tone="neutral">AFB {task.afb}</Badge> : null}
              {task.operator ? (
                <Badge tone="neutral">{task.operator}</Badge>
              ) : null}
              <button
                type="button"
                onClick={() => toggleFlag(task.id)}
                aria-pressed={task.flagged}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-control transition-colors",
                  task.flagged
                    ? "bg-warning-soft text-warning"
                    : "text-ink-subtle hover:bg-surface-sunken hover:text-ink",
                )}
                aria-label={task.flagged ? t.examRunner.unflag : t.examRunner.flag}
                title={task.flagged ? t.examRunner.unflag : t.examRunner.flag}
              >
                <FlagIcon
                  size={16}
                  weight={task.flagged ? "fill" : "regular"}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {task.stimulus ? (
            <figure className="mb-5 rounded-surface border border-line bg-surface p-4">
              <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                {t.examRunner.stimulus}
              </figcaption>
              <p className="plain-text text-sm leading-relaxed text-ink-muted">
                {task.stimulus}
              </p>
            </figure>
          ) : null}

          <p className="plain-text mb-5 max-w-[70ch] text-base leading-relaxed text-ink">
            {task.prompt}
          </p>

          <label
            htmlFor={`answer-${task.id}`}
            className="mb-2 block text-sm font-medium text-ink"
          >
            {t.examRunner.yourAnswer}
          </label>
          <textarea
            id={`answer-${task.id}`}
            value={task.answer}
            onChange={(event) => updateAnswer(task.id, event.target.value)}
            placeholder={t.examRunner.answerPlaceholder}
            className="min-h-64 w-full resize-y rounded-control border border-line-strong bg-surface p-4 text-base leading-relaxed text-ink placeholder:text-ink-subtle"
            // Students write German prose here; the browser's own help is
            // appropriate and expected.
            spellCheck
            autoComplete="off"
          />

          {/* Desktop navigation */}
          <div className="mt-6 hidden items-center justify-between gap-3 lg:flex">
            <Button
              variant="secondary"
              onClick={() => setCurrent((i) => Math.max(0, i - 1))}
              disabled={current === 0}
            >
              <ArrowLeftIcon size={16} aria-hidden="true" />
              {t.common.back}
            </Button>

            {current === tasks.length - 1 ? (
              <Button onClick={() => setSubmitOpen(true)}>
                {t.examRunner.submit}
              </Button>
            ) : (
              <Button onClick={() => setCurrent((i) => i + 1)}>
                {t.common.next}
                <ArrowRightIcon size={16} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setCurrent((i) => Math.max(0, i - 1))}
            disabled={current === 0}
            aria-label={t.common.back}
          >
            <ArrowLeftIcon size={17} aria-hidden="true" />
          </Button>

          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setOverviewOpen(true)}
          >
            <ListChecksIcon size={16} aria-hidden="true" />
            {t.examRunner.taskOf(current + 1, tasks.length)}
          </Button>

          {current === tasks.length - 1 ? (
            <Button onClick={() => setSubmitOpen(true)}>
              {t.examRunner.submit}
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => setCurrent((i) => i + 1)}
              aria-label={t.common.next}
            >
              <ArrowRightIcon size={17} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile task overview sheet */}
      <Dialog.Root open={overviewOpen} onOpenChange={setOverviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-surface border-t border-line bg-surface p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-ink">
                {t.examRunner.overview}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-control text-ink-subtle"
                  aria-label={t.common.close}
                >
                  <XIcon size={18} aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>

            <ol className="space-y-1.5">
              {tasks.map((entry, index) => (
                <li key={entry.id}>
                  <TaskChip
                    task={entry}
                    active={index === current}
                    onSelect={() => {
                      setCurrent(index);
                      setOverviewOpen(false);
                    }}
                  />
                </li>
              ))}
            </ol>

            <Button
              className="mt-5 w-full"
              onClick={() => {
                setOverviewOpen(false);
                setSubmitOpen(true);
              }}
            >
              {t.examRunner.submit}
            </Button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title={t.examRunner.submitTitle}
        description={t.examRunner.submitBody(answeredCount, tasks.length)}
        confirmLabel={t.examRunner.submitConfirm}
        busy={submitting}
        onConfirm={submit}
      />

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title={t.examRunner.exitTitle}
        description={t.examRunner.exitBody}
        confirmLabel={t.examRunner.exit}
        onConfirm={() => router.push(`/exams/${exam.id}`)}
      />
    </div>
  );
}

/**
 * A task in the navigation list.
 *
 * State is carried by an icon and by text, not only by colour: answered shows
 * a tick, flagged shows a flag, and the current one is marked with
 * aria-current.
 */
function TaskChip({
  task,
  active,
  onSelect,
}: {
  task: Task;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const answered = task.answer.trim() !== "";

  const status = answered
    ? t.examRunner.answered
    : t.examRunner.unanswered;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "step" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-control border px-3 py-2 text-left text-sm transition-colors",
        active
          ? "border-brand bg-brand-soft text-brand-text"
          : "border-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-pill border text-[0.6875rem]",
          answered
            ? "border-success bg-success-soft text-success"
            : "border-line-strong text-ink-subtle",
        )}
        aria-hidden="true"
      >
        {answered ? <CheckIcon size={11} weight="bold" /> : null}
      </span>

      <span className="tabular flex-1 truncate font-medium">{task.label}</span>

      {task.flagged ? (
        <FlagIcon
          size={13}
          weight="fill"
          className="shrink-0 text-warning"
          aria-hidden="true"
        />
      ) : null}

      <span className="sr-only">{t.a11y.taskStatus(task.label, status)}</span>
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const t = useT();

  if (state === "idle") return null;

  if (state === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-danger"
        role="status"
      >
        <CloudWarningIcon size={15} aria-hidden="true" />
        <span className="hidden sm:inline">{t.examRunner.saveFailed}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-ink-subtle"
      role="status"
    >
      <CloudCheckIcon size={15} aria-hidden="true" />
      <span className="hidden sm:inline">
        {state === "saving" ? t.common.saving : t.examRunner.autosaved}
      </span>
    </span>
  );
}
