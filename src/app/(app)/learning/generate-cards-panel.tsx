"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { useT } from "@/i18n/client";

/**
 * Creates flashcards, either from a material or from recent mistakes.
 *
 * The mistakes source is offered first because cards built from questions the
 * student actually got wrong are worth more than cards restating a chapter.
 */
export function GenerateCardsPanel({
  materials,
}: {
  materials: { id: string; title: string }[];
}) {
  const t = useT();
  const router = useRouter();

  const [source, setSource] = useState<"mistakes" | "material">("mistakes");
  const [materialId, setMaterialId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<number | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    setCreated(null);

    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        materialId: source === "material" ? materialId || null : null,
        cardCount: 12,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: { reason?: string };
      } | null;

      setError(
        body?.error === "limit_reached"
          ? t.subscription.limitReachedBody
          : body?.details?.reason === "no_source"
            ? t.learning.emptyBody
            : body?.error === "ai_unavailable"
              ? t.errors.aiUnavailable
              : t.errors.generic,
      );
      setPending(false);
      return;
    }

    const body = (await response.json()) as { created: number };
    setCreated(body.created);
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <SectionHeader title={t.learning.generateCards} />

      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {created !== null ? (
        <Alert tone="success" className="mb-4">
          {t.learning.cardCount(created)}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.materials.title}>
          {(props) => (
            <Select
              {...props}
              value={source}
              onChange={(event) =>
                setSource(event.target.value as "mistakes" | "material")
              }
            >
              <option value="mistakes">{t.results.makeFlashcards}</option>
              <option value="material">{t.materials.title}</option>
            </Select>
          )}
        </Field>

        {source === "material" ? (
          <Field label={t.materials.titleField}>
            {(props) => (
              <Select
                {...props}
                value={materialId}
                onChange={(event) => setMaterialId(event.target.value)}
              >
                <option value="">{t.common.none}</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
      </div>

      <Button
        className="mt-5"
        loading={pending}
        disabled={source === "material" && materialId === ""}
        onClick={generate}
      >
        <SparkleIcon size={16} aria-hidden="true" />
        {t.learning.generateCards}
      </Button>
    </Card>
  );
}
