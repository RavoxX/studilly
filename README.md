# Studilly

AI-powered exam preparation for students in German secondary education
(Sekundarstufe I and the gymnasiale Oberstufe).

The product loop: a student uploads their own learning material, Studilly reads
it and maps it to their curriculum, generates a realistic practice exam for
their Bundesland and grade, marks it against an Erwartungshorizont, builds a
persistent model of where they lose marks, and turns that into targeted
practice.

---

## Requirements

- Node.js 20 or newer (developed on 24)
- A Supabase project
- An OpenAI API key
- Optional: a RevenueCat project for subscriptions

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the secrets
npm run dev
```

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Origin used for auth redirect links |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable key, protected by RLS |
| `SUPABASE_SECRET_KEY` | yes | Service role key. **Server only.** Bypasses RLS |
| `OPENAI_API_KEY` | yes | Server-side model calls |
| `OPENAI_MODEL_LIGHT` / `_STANDARD` / `_ADVANCED` | no | Override model per tier |
| `OPENAI_EMBEDDING_MODEL` | no | Defaults to `text-embedding-3-small` |
| `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` | no | Test Store key. Empty means simulation mode |
| `REVENUECAT_PROJECT_ID` | no | Needed for server-side entitlement checks |
| `REVENUECAT_SECRET_KEY` | no | REST v2 key. **Server only** |
| `REVENUECAT_WEBHOOK_SECRET` | no | Shared secret for the webhook |

Only `NEXT_PUBLIC_*` variables reach the browser. The three secrets are guarded
by `src/lib/env.server.ts`, which imports `server-only`: if a Client Component
ever pulls them in, the build fails rather than shipping a key.

### Supabase Auth settings to confirm

Two project settings the code cannot control:

- **Email deliverability validation.** Supabase rejects addresses whose domain
  has no MX record with `Email address "..." is invalid` (HTTP 400). This is
  correct behaviour, but it means `@example.com` and other placeholder domains
  cannot be used for manual testing. Verified against this project's auth logs.
- **Email confirmation.** Whether a confirmation is required before sign-in is
  a Supabase Auth setting. The register flow handles both: with confirmation
  on it shows a "check your email" screen, with it off it goes straight to
  onboarding.

### Database

Migrations live in `supabase/migrations/` and have already been applied to the
project this repository was set up against. For a fresh project, apply them in
filename order, then seed:

```bash
npm run seed:curriculum
```

That fans the catalogue in `src/lib/curriculum/data/catalog.ts` across all 16
states and every school type that exists in each.

## Scripts

```bash
npm run dev              # development server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run test             # vitest
npm run verify           # typecheck + lint + test + build
npm run db:types         # regenerate src/types/database.ts
npm run seed:curriculum  # load the curriculum catalogue
```

---

## Architecture

### Stack

Next.js 16 (App Router, React 19, Server Components by default), TypeScript in
strict mode with `noUncheckedIndexedAccess`, Tailwind v4, Supabase for auth,
Postgres and storage, the OpenAI Responses API, and RevenueCat for
subscriptions.

### Layout

```
src/
  app/
    (marketing)/     landing, pricing, legal
    (auth)/          sign in, register, password reset
    (app)/           the authenticated product, inside the app shell
    (focus)/         the exam runner, deliberately outside the shell
    onboarding/
    api/             route handlers
  components/
    ui/              design system primitives
    app/ marketing/ shared/ brand/ legal/
  config/            plans, education system, exam operators
  i18n/              typed dictionaries, German and English
  lib/
    ai/              client, models, prompts, schemas, validation, service
    auth/ api/ supabase/
    curriculum/ materials/ exams/ practice/ learning/ plans/ groups/
    grading/ weakness/ subscription/
    utils/
  types/database.ts  generated from the schema
```

Business logic lives in `src/lib`. Components render and collect input; they do
not decide what a student is allowed to do.

### Security model

The single rule: **the browser is never trusted with anything it could profit
from forging.**

- Row Level Security is enabled on all 32 tables, every one with an explicit
  policy. Reference data is world-readable to signed-in users; everything else
  is scoped to `auth.uid()`.
- Anything scored or billed is read-only to the client: `subscriptions`,
  `usage_records`, `answer_evaluations`, `exam_tasks`, `weaknesses`,
  `practice_attempts`, `material_chunks`, `flashcard_reviews`. Those are
  written only by server code holding the service-role key.
- The few client writes that exist are genuine user actions with nothing to
  forge (exam answer autosave, ticking off a plan item, managing own
  flashcards), and the policies enforce the surrounding invariant. Answers, for
  instance, can only be written while the attempt is still `in_progress`.
- Every server route takes the user id from the verified session. None reads it
  from a body, query parameter or header.
- The service-role client bypasses RLS, so every query made with it also
  filters by the caller's id explicitly.
- Uploaded files live in a private bucket, keyed by owner, reachable only
  through short-lived signed URLs.
- Usage limits are enforced by an atomic SQL function, so concurrent requests
  cannot both pass the same check.

### AI layer

`src/lib/ai` is the only place that talks to OpenAI, and it is `server-only`.

- **models.ts** maps each task to a model and reasoning effort, in one place.
- **prompts.ts** holds every prompt, versioned (`PROMPT_VERSION`), with the
  untrusted-content boundary. Uploaded material and student answers are wrapped
  in explicit markers and every system prompt states that content inside them
  is data, never instructions.
- **schemas.ts** defines the structured-output contracts in Zod.
- **json-schema.ts** converts those to strict-mode JSON Schema.
- **validation.ts** is a deterministic quality gate over generated exams:
  point arithmetic, marking criteria totals, AFB distribution, duplicate
  detection, duration plausibility. Structural failures block the exam.
- **service.ts** is the public surface, one method per capability.

Model output is parsed AND re-validated with Zod before anything is stored.

#### Model selection

Verified against the OpenAI pricing page in August 2026.

| Task | Model | Effort | Why |
| --- | --- | --- | --- |
| Titles, tags, flashcards, summaries | `gpt-5.6-luna` | none / low | High volume, low judgement, 20x cheaper |
| Material analysis, curriculum alignment, practice, plans | `gpt-5.6-terra` | low / medium | Real comprehension, tolerant of a retry |
| Exam generation | `gpt-5.6-terra` | medium | Heavily schema-constrained and then validated |
| Exam review | `gpt-5.6-luna` | low | Cheap enough to run on every generation |
| Grading | `gpt-5.6-sol` | medium | The one place being wrong destroys trust |
| Embeddings | `text-embedding-3-small` | | Retrieval over material chunks |

A full exam cycle costs roughly EUR 0.29, which is what the plan limits are
sized against.

### Cost control

Documents are chunked and embedded once at upload. Exam generation retrieves
only the passages matching the selected topics, within a token budget. Whole
files are never sent to a model.

### Grading

The model marks each Erwartungshorizont criterion. The backend sums, computes
the percentage and maps it to a grade through a configurable scale
(`grading_scales`). The model is told not to report a grade, and one would be
ignored: nothing reads a grade field from model output.

Two scales ship: German marks 1 to 6 for lower secondary and the KMK 15-point
Notenpunkte scale for the Oberstufe. **The KMK does not define binding
percentage boundaries** for classwork; schools set their own. The seeded
thresholds are widely-used defaults, labelled as such, and changeable in
Settings.

### Curriculum

`curricula` and `curriculum_topics` carry provenance: source name, URL,
version, retrieval date, and an `is_official` flag. Competency framing comes
from the KMK Bildungsstandards, which are agreed nationwide; each row also
links the state's own curriculum portal.

**Every seeded row has `is_official = false`**, meaning: structurally sound,
not yet verified line by line against the state document. Nothing is shown to a
student as an official requirement while that flag is false. Verify a subject,
set `verified: true` in the catalogue, re-run the seed.

### Internationalization

German and English, German by default. Dictionaries are nested typed objects
(`t.dashboard.title`), so a typo is a compile error.

The interface language does **not** constrain content language. A German
interface with English material is supported: content language is detected per
material and passed to the model separately.

## Testing

```bash
npm run test
```

148 tests across the logic that would be dangerous to get wrong:

| Area | File |
| --- | --- |
| Grade calculation, thresholds, Notenpunkte | `lib/grading/engine.test.ts` |
| Exam quality gate, point arithmetic, repair | `lib/ai/validation.test.ts` |
| Weakness model, decay, trend, focus selection | `lib/weakness/model.test.ts` |
| Spaced repetition scheduling | `lib/learning/srs.test.ts` |
| Entitlements and plan limits | `config/plans.test.ts` |
| German school system per state | `config/education.test.ts` |
| Structured output schemas, strict mode | `lib/ai/schemas.test.ts` |
| Auth boundaries, open redirect | `lib/auth/errors.test.ts` |

The RLS model is verified directly against the database; see
`docs/SECURITY.md`.

## Documentation

- `docs/SECURITY.md`: threat model and how each risk is handled
- `docs/REVENUECAT.md`: sandbox setup and the path to production
- `docs/PRIVACY.md`: what is stored, where, and what the operator must decide

## Status

This is a complete, working foundation, not a finished commercial product. See
"Known limitations" in `docs/SECURITY.md` and the legal placeholders in
`docs/PRIVACY.md` before deploying anything.
