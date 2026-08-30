"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import {
  CheckIcon,
  DownloadSimpleIcon,
  StarIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ManageSubscription } from "@/components/subscription/manage-subscription";
import { Field, Input, Select, Toggle } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LocaleSwitch } from "@/components/shared/locale-switch";
import { ThemeSwitch } from "@/components/shared/theme-switch";
import {
  changePassword,
  updateEducation,
  updateNotifications,
  updatePrivacy,
  updateProfile,
  updateSubjects,
} from "./actions";
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
import type { PlanTier } from "@/config/plans";
import { cn } from "@/lib/utils/cn";

type Subject = {
  id: string;
  key: string;
  name_de: string;
  name_en: string;
  category: string;
  position: number;
};

type NotificationPrefs = {
  exam_reminders: boolean;
  practice_reminders: boolean;
  plan_reminders: boolean;
  group_activity: boolean;
  usage_alerts: boolean;
  subscription_updates: boolean;
  achievements: boolean;
};

export function SettingsPanel({
  email,
  profile,
  education,
  subjects,
  selectedSubjects,
  notifications: initialNotifications,
  subscription,
  locale,
}: {
  email: string;
  profile: {
    displayName: string;
    theme: "system" | "light" | "dark";
    allowAiQualityReview: boolean;
  };
  education: {
    bundesland: Bundesland;
    stage: EducationStage;
    schoolType: SchoolType;
    grade: number;
    oberstufePhase: "einfuehrungsphase" | "qualifikationsphase" | null;
  };
  subjects: Subject[];
  selectedSubjects: { id: string; priority: boolean }[];
  notifications: NotificationPrefs;
  subscription: SubscriptionSummary;
  locale: Locale;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  function flashSaved() {
    setSaved(t.settings.savedToast);
    setTimeout(() => setSaved(null), 2500);
    router.refresh();
  }

  return (
    <>
      {saved ? (
        <Alert tone="success" className="mb-6">
          {saved}
        </Alert>
      ) : null}

      <Tabs.Root defaultValue="account">
        <Tabs.List className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
          {[
            { value: "account", label: t.settings.account },
            { value: "education", label: t.settings.education },
            { value: "preferences", label: t.settings.preferences },
            { value: "privacy", label: t.settings.privacy },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                "data-[state=active]:border-brand data-[state=active]:text-ink",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-ink-subtle",
              )}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="account">
          <AccountSection
            email={email}
            displayName={profile.displayName}
            subscription={subscription}
            onSaved={flashSaved}
          />
        </Tabs.Content>

        <Tabs.Content value="education">
          <EducationSection
            education={education}
            subjects={subjects}
            selectedSubjects={selectedSubjects}
            locale={locale}
            onSaved={flashSaved}
          />
        </Tabs.Content>

        <Tabs.Content value="preferences">
          <PreferencesSection
            theme={profile.theme}
            notifications={initialNotifications}
            onSaved={flashSaved}
          />
        </Tabs.Content>

        <Tabs.Content value="privacy">
          <PrivacySection
            allowAiQualityReview={profile.allowAiQualityReview}
            onSaved={flashSaved}
          />
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}

function AccountSection({
  email,
  displayName: initialName,
  subscription,
  onSaved,
}: {
  email: string;
  displayName: string;
  subscription: SubscriptionSummary;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(initialName);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Card className="p-5">
        <SectionHeader title={t.settings.account} />
        <div className="space-y-5">
          <Field label={t.settings.displayName} required>
            {(props) => (
              <Input
                {...props}
                value={displayName}
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            )}
          </Field>

          <Field label={t.settings.email} hint={t.settings.emailChangeHint}>
            {(props) => <Input {...props} value={email} disabled readOnly />}
          </Field>

          <Button
            loading={pending}
            disabled={displayName.trim() === ""}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await updateProfile({
                  displayName: displayName.trim(),
                });
                if (result.ok) onSaved();
                else setError(t.errors.generic);
              })
            }
          >
            {t.common.save}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title={t.settings.changePassword} />
        <div className="space-y-5">
          <Field label={t.settings.newPassword} hint={t.auth.passwordHint}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </Field>

          <Button
            variant="secondary"
            loading={pending}
            disabled={newPassword.length < 8}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await changePassword({ newPassword });
                if (result.ok) {
                  setNewPassword("");
                  onSaved();
                } else {
                  setError(
                    result.error === "weak_password"
                      ? t.auth.errors.weakPassword
                      : t.errors.generic,
                  );
                }
              })
            }
          >
            {t.settings.changePassword}
          </Button>
        </div>
      </Card>

      {subscription.plan === "free" ? (
        <Card className="p-5">
          <SectionHeader title={t.subscription.manageTitle} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">{t.plans.free.name}</p>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/subscription">{t.subscription.changePlan}</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <ManageSubscription
          plan={subscription.plan}
          purchasedPlan={subscription.purchasedPlan}
          currentPeriodEnd={subscription.currentPeriodEnd}
          autoRenew={subscription.autoRenew}
          inGracePeriod={subscription.inGracePeriod}
          daysRemaining={subscription.daysRemaining}
          store={subscription.store}
          productId={subscription.productId}
          managementUrl={subscription.managementUrl}
          simulated={subscription.simulated}
        />
      )}

      <DeleteAccountCard />
    </div>
  );
}

/** Everything the settings view needs to show and manage the plan. */
type SubscriptionSummary = {
  plan: PlanTier;
  purchasedPlan: PlanTier;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  inGracePeriod: boolean;
  daysRemaining: number | null;
  store: string | null;
  productId: string | null;
  managementUrl: string | null;
  simulated: boolean;
};

function EducationSection({
  education,
  subjects,
  selectedSubjects,
  locale,
  onSaved,
}: {
  education: {
    bundesland: Bundesland;
    stage: EducationStage;
    schoolType: SchoolType;
    grade: number;
    oberstufePhase: "einfuehrungsphase" | "qualifikationsphase" | null;
  };
  subjects: Subject[];
  selectedSubjects: { id: string; priority: boolean }[];
  locale: Locale;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bundesland, setBundesland] = useState(education.bundesland);
  const [stage, setStage] = useState(education.stage);
  const [schoolType, setSchoolType] = useState<SchoolType | "">(
    education.schoolType,
  );
  const [grade, setGrade] = useState<number | "">(education.grade);
  const [phase, setPhase] = useState(education.oberstufePhase ?? "");

  const [selected, setSelected] = useState(
    new Set(selectedSubjects.map((entry) => entry.id)),
  );
  const [priority, setPriority] = useState(
    new Set(selectedSubjects.filter((e) => e.priority).map((e) => e.id)),
  );

  const availableTypes = schoolTypesFor(bundesland, stage);
  const availableGrades = gradesFor(bundesland, stage);

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Card className="p-5">
        <SectionHeader
          title={t.settings.education}
          description={t.onboarding.whyBody}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.onboarding.bundesland} required>
            {(props) => (
              <Select
                {...props}
                value={bundesland}
                onChange={(event) => {
                  setBundesland(event.target.value as Bundesland);
                  setSchoolType("");
                  setGrade("");
                }}
              >
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
                onChange={(event) => {
                  setStage(event.target.value as EducationStage);
                  setSchoolType("");
                  setGrade("");
                }}
              >
                <option value="sek_1">{t.onboarding.stageSek1}</option>
                <option value="sek_2">{t.onboarding.stageSek2}</option>
              </Select>
            )}
          </Field>

          <Field label={t.onboarding.schoolType} required>
            {(props) => (
              <Select
                {...props}
                value={schoolType}
                onChange={(event) =>
                  setSchoolType(event.target.value as SchoolType)
                }
              >
                <option value="">{t.onboarding.schoolTypePlaceholder}</option>
                {availableTypes.map((type) => (
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
                onChange={(event) =>
                  setGrade(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
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
                  onChange={(event) => setPhase(event.target.value as typeof phase)}
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

        <Button
          className="mt-5"
          loading={pending}
          disabled={schoolType === "" || grade === ""}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await updateEducation({
                bundesland,
                stage,
                schoolType,
                grade,
                oberstufePhase: stage === "sek_2" && phase !== "" ? phase : null,
              });
              if (result.ok) onSaved();
              else setError(t.errors.invalidInput);
            })
          }
        >
          {t.common.save}
        </Button>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title={t.onboarding.subjects}
          description={t.onboarding.priorityHint}
        />

        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => {
            const isSelected = selected.has(subject.id);
            const isPriority = priority.has(subject.id);
            return (
              <div key={subject.id} className="flex">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(subject.id)) {
                        next.delete(subject.id);
                        setPriority((p) => {
                          const cleaned = new Set(p);
                          cleaned.delete(subject.id);
                          return cleaned;
                        });
                      } else next.add(subject.id);
                      return next;
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-brand bg-brand-soft text-brand-text"
                      : "border-line-strong bg-surface text-ink-muted hover:text-ink",
                    isSelected ? "rounded-l-control border-r-0" : "rounded-control",
                  )}
                >
                  {isSelected ? (
                    <CheckIcon size={14} weight="bold" aria-hidden="true" />
                  ) : null}
                  {locale === "de" ? subject.name_de : subject.name_en}
                </button>
                {isSelected ? (
                  <button
                    type="button"
                    aria-pressed={isPriority}
                    aria-label={`${subject.name_de}: ${t.onboarding.priorityHint}`}
                    onClick={() =>
                      setPriority((current) => {
                        const next = new Set(current);
                        if (next.has(subject.id)) next.delete(subject.id);
                        else next.add(subject.id);
                        return next;
                      })
                    }
                    className={cn(
                      "inline-flex items-center rounded-r-control border border-brand px-2.5 transition-colors",
                      isPriority
                        ? "bg-brand text-on-brand"
                        : "bg-brand-soft text-brand-text",
                    )}
                  >
                    <StarIcon
                      size={14}
                      weight={isPriority ? "fill" : "regular"}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <Button
          className="mt-5"
          loading={pending}
          disabled={selected.size === 0}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await updateSubjects({
                subjectIds: [...selected],
                prioritySubjectIds: [...priority],
              });
              if (result.ok) onSaved();
              else setError(t.errors.generic);
            })
          }
        >
          {t.common.save}
        </Button>
      </Card>
    </div>
  );
}

function PreferencesSection({
  theme,
  notifications: initial,
  onSaved,
}: {
  theme: "system" | "light" | "dark";
  notifications: NotificationPrefs;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();

  const keys = Object.keys(initial) as (keyof NotificationPrefs)[];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title={t.settings.uiLanguage}
          description={t.settings.uiLanguageHint}
        />
        <LocaleSwitch />
      </Card>

      <Card className="p-5">
        <SectionHeader title={t.settings.theme} />
        <ThemeSwitch current={theme} />
      </Card>

      <Card className="p-5">
        <SectionHeader
          title={t.settings.notifications}
          description={t.settings.notificationChannelNote}
        />
        <div className="divide-y divide-line">
          {keys.map((key) => (
            <Toggle
              key={key}
              label={t.settings.notificationTypes[key]}
              checked={prefs[key]}
              onCheckedChange={(value) =>
                setPrefs((current) => ({ ...current, [key]: value }))
              }
            />
          ))}
        </div>

        <Button
          className="mt-5"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateNotifications(prefs);
              if (result.ok) onSaved();
            })
          }
        >
          {t.common.save}
        </Button>
      </Card>
    </div>
  );
}

function PrivacySection({
  allowAiQualityReview: initial,
  onSaved,
}: {
  allowAiQualityReview: boolean;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [allow, setAllow] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    setExporting(true);
    // Fetched rather than linked so an auth failure surfaces as an error
    // instead of navigating the student to a JSON error page.
    const response = await fetch("/api/account/export");
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `studilly-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title={t.settings.dataExport}
          description={t.settings.dataExportBody}
        />
        <Button variant="secondary" loading={exporting} onClick={exportData}>
          <DownloadSimpleIcon size={16} aria-hidden="true" />
          {t.settings.dataExportButton}
        </Button>
      </Card>

      <Card className="p-5">
        <SectionHeader title={t.settings.privacy} />
        <Toggle
          label={t.settings.aiQualityReview}
          description={t.settings.aiQualityReviewBody}
          checked={allow}
          onCheckedChange={setAllow}
        />
        <Button
          className="mt-4"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updatePrivacy({
                allowAiQualityReview: allow,
              });
              if (result.ok) onSaved();
            })
          }
        >
          {t.common.save}
        </Button>
      </Card>

      <DeleteAccountCard />
    </div>
  );
}

/**
 * Account deletion.
 *
 * Requires typing DELETE. A single click for something irreversible that
 * removes every uploaded file, exam and result is not enough friction.
 */
function DeleteAccountCard() {
  const { t } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);

    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });

    if (!response.ok) {
      setError(t.errors.generic);
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <Card className="border-danger/30 p-5">
        <SectionHeader
          title={t.settings.deleteAccount}
          description={t.settings.deleteAccountBody}
        />
        {error ? (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}
        <Button variant="danger" onClick={() => setOpen(true)}>
          {t.settings.deleteAccountButton}
        </Button>
      </Card>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmation("");
        }}
        title={t.settings.deleteAccountConfirmTitle}
        description={t.settings.deleteAccountConfirmBody}
        confirmLabel={t.settings.deleteAccountButton}
        destructive
        busy={busy}
        onConfirm={() => {
          if (confirmation === t.settings.deleteAccountConfirmWord) {
            void remove();
          }
        }}
      >
        <Field label={t.settings.deleteAccountConfirmWord} required>
          {(props) => (
            <Input
              {...props}
              value={confirmation}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          )}
        </Field>
      </ConfirmDialog>
    </>
  );
}
