-- ============================================================================
-- Studilly 001: extensions, shared enums, identity, curriculum layer
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ----------------------------------------------------------------------------
-- Shared enums
-- ----------------------------------------------------------------------------

-- The 16 German federal states.
create type bundesland as enum (
  'BW','BY','BE','BB','HB','HH','HE','MV',
  'NI','NW','RP','SL','SN','ST','SH','TH'
);

-- Studilly targets lower and upper secondary education only.
create type education_stage as enum ('sek_1', 'sek_2');

-- School types across all federal states. Names are state-specific; the
-- curriculum layer records which types actually exist per state.
create type school_type as enum (
  'gymnasium',
  'realschule',
  'hauptschule',
  'werkrealschule',
  'gesamtschule',
  'oberschule',
  'mittelschule',
  'stadtteilschule',
  'sekundarschule',
  'gemeinschaftsschule',
  'regionale_schule',
  'regelschule',
  'realschule_plus',
  'integrierte_sekundarschule',
  'mittelstufenschule',
  'wirtschaftsschule',
  'berufliches_gymnasium'
);

create type ui_language as enum ('de', 'en');

-- KMK Anforderungsbereiche.
--   I   Reproduktion
--   II  Reorganisation und Transfer
--   III Reflexion und Problemloesen
create type afb_level as enum ('I', 'II', 'III');

-- ----------------------------------------------------------------------------
-- Utility triggers
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user
-- ----------------------------------------------------------------------------

create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null default '',
  ui_locale             ui_language not null default 'de',
  theme                 text not null default 'system'
                          check (theme in ('system','light','dark')),
  onboarding_completed_at timestamptz,
  -- Privacy: opt-in only, default off. See docs/PRIVACY.md.
  allow_ai_quality_review boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) <= 80)
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- The signup trigger that seeds profiles, notification_preferences and
-- subscriptions lives in migration 004, once all three tables exist.

-- ----------------------------------------------------------------------------
-- education_profiles: the schooling context that drives every AI prompt
-- ----------------------------------------------------------------------------

create table education_profiles (
  user_id         uuid primary key references profiles(id) on delete cascade,
  bundesland      bundesland not null,
  school_type     school_type not null,
  stage           education_stage not null,
  grade           smallint not null check (grade between 5 and 13),
  -- Oberstufe phase, only meaningful for stage = 'sek_2'.
  oberstufe_phase text check (oberstufe_phase in ('einfuehrungsphase','qualifikationsphase')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger education_profiles_updated_at
  before update on education_profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- subjects: global reference data (not user-owned)
-- ----------------------------------------------------------------------------

create table subjects (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique,
  name_de   text not null,
  name_en   text not null,
  category  text not null check (category in (
              'sprachen','mint','gesellschaft','kunst_musik','sonstige'
            )),
  position  smallint not null default 0
);

-- Subjects a student is actually taking.
create table user_subjects (
  user_id     uuid not null references profiles(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,
  -- Leistungskurs / Grundkurs matters for Oberstufe exam realism.
  course_level text check (course_level in ('grundkurs','leistungskurs')),
  is_priority boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (user_id, subject_id)
);

create index user_subjects_user_idx on user_subjects(user_id);

-- ----------------------------------------------------------------------------
-- Curriculum layer
--
-- Curriculum knowledge lives in the database, not inside prompts, so it can be
-- extended and corrected without touching application code. Every curriculum
-- row carries its provenance (source name, URL, version, retrieval date) and
-- an `is_official` flag. Nothing is presented to the student as an official
-- requirement unless it is actually sourced from a state authority.
-- ----------------------------------------------------------------------------

create table curricula (
  id                  uuid primary key default gen_random_uuid(),
  bundesland          bundesland not null,
  school_type         school_type not null,
  stage               education_stage not null,
  subject_id          uuid not null references subjects(id) on delete cascade,
  grade_min           smallint not null check (grade_min between 5 and 13),
  grade_max           smallint not null check (grade_max between 5 and 13),

  title               text not null,
  -- Provenance. Required for anything shown as curriculum guidance.
  source_name         text not null,
  source_url          text,
  source_version      text,
  source_retrieved_at date,
  -- False means "structural scaffold, not verified against a state document".
  is_official         boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint grade_range_valid check (grade_max >= grade_min),
  unique (bundesland, school_type, stage, subject_id, grade_min, grade_max)
);

create trigger curricula_updated_at
  before update on curricula
  for each row execute function set_updated_at();

create index curricula_lookup_idx
  on curricula(bundesland, school_type, stage, subject_id);

create table curriculum_topics (
  id             uuid primary key default gen_random_uuid(),
  curriculum_id  uuid not null references curricula(id) on delete cascade,
  parent_id      uuid references curriculum_topics(id) on delete cascade,

  title_de       text not null,
  title_en       text,
  description    text,
  -- Competency statements ("Die Schuelerinnen und Schueler koennen ...").
  competencies   text[] not null default '{}',
  -- Which Anforderungsbereich this topic is typically assessed at.
  typical_afb    afb_level,
  grade_hint     smallint check (grade_hint between 5 and 13),
  position       smallint not null default 0,

  created_at     timestamptz not null default now()
);

create index curriculum_topics_curriculum_idx on curriculum_topics(curriculum_id);
create index curriculum_topics_parent_idx on curriculum_topics(parent_id);

-- ----------------------------------------------------------------------------
-- grading_scales: configurable, never hardcoded in UI or prompts
--
-- The KMK sets no binding percentage-to-grade key; schools and states define
-- their own. Scales are therefore data, and a student can pick the one their
-- school uses.
-- ----------------------------------------------------------------------------

create table grading_scales (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name_de     text not null,
  name_en     text not null,
  stage       education_stage not null,
  -- 'note'        -> German marks 1..6
  -- 'notenpunkte' -> Oberstufe points 15..0
  scale_type  text not null check (scale_type in ('note','notenpunkte')),
  -- Ordered thresholds, highest first:
  -- [{ "min_percent": 95, "value": 15, "label": "1+" }, ...]
  thresholds  jsonb not null,
  -- Null means the scale is generic rather than state-specific.
  bundesland  bundesland,
  is_default  boolean not null default false,
  source_note text,
  created_at  timestamptz not null default now()
);
