"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  StarIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Progress } from "@/components/ui/feedback";
import { completeOnboarding } from "./actions";
import { useI18n } from "@/i18n/client";
import {
  BUNDESLAENDER,
  SCHOOL_SYSTEM,
  SCHOOL_TYPE_LABELS,
  gradesFor,
  schoolTypesFor,
  type Bundesland,
  type EducationStage,
  type SchoolType,
} from "@/config/education";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils/cn";

type Subject = {
  id: string;
  key: string;
  name_de: string;
  name_en: string;
  category: string;
  position: number;
};

const TOTAL_STEPS = 4;

/**
 * Onboarding.
 *
 * Four steps, each asking one thing. The alternative, a single long form,
 * tests worse with students on phones and makes the school-context question
 * look bureaucratic rather than purposeful.
 *
 * The second step explains WHY the school context is needed, in place, rather
 * than burying it in a privacy policy. Students are more willing to give
 * accurate information when the reason is visible.
 *
 * Options cascade: choosing a state narrows the school types to the ones that
 * exist there, and the stage narrows the grades. The server re-checks all of
 * it, so this is convenience rather than security.
 */
export function OnboardingFlow({
  initialName,
  initialLocale,
  subjects,
}: {
  initialName: string;
  initialLocale: Locale;
  subjects: Subject[];
  userEmail: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(initialName);
  const [bundesland, setBundesland] = useState<Bundesland | "">("");
  const [stage, setStage] = useState<EducationStage>("sek_1");
  const [schoolType, setSchoolType] = useState<SchoolType | "">("");
  const [grade, setGrade] = useState<number | "">("");
  const [phase, setPhase] = useState<
    "einfuehrungsphase" | "qualifikationsphase" | ""
  >("");
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [prioritySubjects, setPrioritySubjects] = useState<Set<string>>(new Set());
  const [examDate, setExamDate] = useState("");
  const [examSubjectId, setExamSubjectId] = useState("");

  const availableSchoolTypes = useMemo(
    () => (bundesland ? schoolTypesFor(bundesland, stage) : []),
    [bundesland, stage],
  );
  const availableGrades = useMemo(
    () => (bundesland ? gradesFor(bundesland, stage) : []),
    [bundesland, stage],
  );

  const subjectName = (subject: Subject) =>
    locale === "de" ? subject.name_de : subject.name_en;

  const groupedSubjects = useMemo(() => {
    const groups = new Map<string, Subject[]>();
    for (const subject of subjects) {
      const list = groups.get(subject.category) ?? [];
      list.push(subject);
      groups.set(subject.category, list);
    }
    return [...groups.entries()];
  }, [subjects]);

  // Reset dependent fields so an impossible combination cannot survive a
  // change further up the chain.
  function changeState(value: string) {
    setBundesland(value as Bundesland);
    setSchoolType("");
    setGrade("");
  }

  function changeStage(value: EducationStage) {
    setStage(value);
    setSchoolType("");
    setGrade("");
    setPhase("");
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        setPrioritySubjects((p) => {
          const cleaned = new Set(p);
          cleaned.delete(id);
          return cleaned;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function togglePriority(id: string) {
    setPrioritySubjects((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canAdvance = (() => {
    if (step === 1) return displayName.trim().length > 0;
    if (step === 2) return bundesland !== "" && schoolType !== "" && grade !== "";
    if (step === 3) return selectedSubjects.size > 0;
    return true;
  })();

  async function handleFinish() {
    setError(null);
    setPending(true);

    const result = await completeOnboarding({
      displayName: displayName.trim(),
      locale: initialLocale,
      bundesland: bundesland as Bundesland,
      stage,
      schoolType: schoolType as string,
      grade: grade as number,
      oberstufePhase: stage === "sek_2" && phase !== "" ? phase : null,
      subjectIds: [...selectedSubjects],
      prioritySubjectIds: [...prioritySubjects],
      examDate: examDate || null,
      examSubjectId: examSubjectId || null,
    });

    if (!result.ok) {
      setError(t.errors.invalidInput);
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="pt-4">
      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t.onboarding.title}
          </h1>
          <span className="tabular shrink-0 text-sm text-ink-subtle">
            {t.onboarding.stepOf(step, TOTAL_STEPS)}
          </span>
        </div>
        <Progress
          value={step}
          max={TOTAL_STEPS}
          label={t.a11y.progress}
        />
      </div>

      {error ? (
        <Alert tone="danger" className="mb-6">
          {error}
        </Alert>
      ) : null}

      {step === 1 ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">
            {t.onboarding.step1Title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-muted">
            {t.onboarding.intro}
          </p>

          <div className="mt-6">
            <Field
              label={t.auth.displayName}
              hint={t.auth.displayNameHint}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  value={displayName}
                  maxLength={80}
                  autoFocus
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              )}
            </Field>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">
            {t.onboarding.step2Title}
          </h2>

          <div className="mt-4 flex gap-3 rounded-surface border border-line bg-surface p-4">
            <InfoIcon
              size={18}
              className="mt-0.5 shrink-0 text-brand-text"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-ink">
                {t.onboarding.whyTitle}
              </p>
              <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-muted">
                {t.onboarding.whyBody}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label={t.onboarding.bundesland} required>
              {(props) => (
                <Select
                  {...props}
                  value={bundesland}
                  onChange={(e) => changeState(e.target.value)}
                >
                  <option value="">{t.onboarding.bundeslandPlaceholder}</option>
                  {BUNDESLAENDER.map((code) => (
                    <option key={code} value={code}>
                      {SCHOOL_SYSTEM[code].nameDe}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t.onboarding.stage} required>
              {(props) => (
                <Select
                  {...props}
                  value={stage}
                  onChange={(e) => changeStage(e.target.value as EducationStage)}
                >
                  <option value="sek_1">{t.onboarding.stageSek1}</option>
                  <option value="sek_2">{t.onboarding.stageSek2}</option>
                </Select>
              )}
            </Field>

            <Field
              label={t.onboarding.schoolType}
              hint={bundesland ? t.onboarding.schoolTypeNote : undefined}
              required
            >
              {(props) => (
                <Select
                  {...props}
                  value={schoolType}
                  disabled={!bundesland}
                  onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                >
                  <option value="">{t.onboarding.schoolTypePlaceholder}</option>
                  {availableSchoolTypes.map((type) => (
                    <option key={type} value={type}>
                      {locale === "de"
                        ? SCHOOL_TYPE_LABELS[type].de
                        : SCHOOL_TYPE_LABELS[type].en}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t.onboarding.grade} required>
              {(props) => (
                <Select
                  {...props}
                  value={grade === "" ? "" : String(grade)}
                  disabled={!bundesland}
                  onChange={(e) =>
                    setGrade(e.target.value === "" ? "" : Number(e.target.value))
                  }
                >
                  <option value="">{t.common.none}</option>
                  {availableGrades.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {stage === "sek_2" ? (
              <Field label={t.onboarding.phase}>
                {(props) => (
                  <Select
                    {...props}
                    value={phase}
                    onChange={(e) =>
                      setPhase(
                        e.target.value as
                          | "einfuehrungsphase"
                          | "qualifikationsphase"
                          | "",
                      )
                    }
                  >
                    <option value="">{t.common.optional}</option>
                    <option value="einfuehrungsphase">
                      {t.onboarding.phaseEinfuehrung}
                    </option>
                    <option value="qualifikationsphase">
                      {t.onboarding.phaseQualifikation}
                    </option>
                  </Select>
                )}
              </Field>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">
            {t.onboarding.step4Title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm text-ink-muted">
            {t.onboarding.subjectsHint}
          </p>

          <div className="mt-6 space-y-6">
            {groupedSubjects.map(([category, list]) => (
              <div key={category}>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                  {CATEGORY_LABELS[category]?.[locale] ?? category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {list.map((subject) => {
                    const selected = selectedSubjects.has(subject.id);
                    const priority = prioritySubjects.has(subject.id);
                    return (
                      <div key={subject.id} className="flex">
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleSubject(subject.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors",
                            selected
                              ? "border-brand bg-brand-soft text-brand-text"
                              : "border-line-strong bg-surface text-ink-muted hover:text-ink",
                            selected
                              ? "rounded-l-control border-r-0"
                              : "rounded-control",
                          )}
                        >
                          {selected ? (
                            <CheckIcon size={14} weight="bold" aria-hidden="true" />
                          ) : null}
                          {subjectName(subject)}
                        </button>
                        {selected ? (
                          <button
                            type="button"
                            aria-pressed={priority}
                            aria-label={`${subjectName(subject)}: ${t.onboarding.priorityHint}`}
                            onClick={() => togglePriority(subject.id)}
                            className={cn(
                              "inline-flex items-center rounded-r-control border border-brand px-2.5 transition-colors",
                              priority
                                ? "bg-brand text-on-brand"
                                : "bg-brand-soft text-brand-text",
                            )}
                          >
                            <StarIcon
                              size={14}
                              weight={priority ? "fill" : "regular"}
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedSubjects.size > 0 ? (
            <p className="mt-6 text-sm text-ink-subtle">
              {t.onboarding.priorityHint}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === 4 ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">
            {t.onboarding.step5Title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm text-ink-muted">
            {t.onboarding.step5Subtitle}
          </p>

          <div className="mt-6 space-y-5">
            <Field label={t.onboarding.examSubject}>
              {(props) => (
                <Select
                  {...props}
                  value={examSubjectId}
                  onChange={(e) => setExamSubjectId(e.target.value)}
                >
                  <option value="">{t.common.optional}</option>
                  {subjects
                    .filter((s) => selectedSubjects.has(s.id))
                    .map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subjectName(subject)}
                      </option>
                    ))}
                </Select>
              )}
            </Field>

            <Field label={t.onboarding.examDate}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              )}
            </Field>
          </div>
        </section>
      ) : null}

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-6">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || pending}
        >
          <ArrowLeftIcon size={16} aria-hidden="true" />
          {t.common.back}
        </Button>

        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
          >
            {t.common.next}
            <ArrowRightIcon size={16} aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={handleFinish} loading={pending}>
            {t.onboarding.finish}
          </Button>
        )}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  sprachen: { de: "Sprachen", en: "Languages" },
  mint: { de: "MINT", en: "STEM" },
  gesellschaft: { de: "Gesellschaft", en: "Social sciences" },
  kunst_musik: { de: "Kunst und Musik", en: "Arts" },
  sonstige: { de: "Weitere", en: "Other" },
};
