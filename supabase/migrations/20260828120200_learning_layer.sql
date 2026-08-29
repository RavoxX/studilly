-- ============================================================================
-- Studilly 003: weakness model, targeted practice, flashcards, learning plans
-- ============================================================================

-- What kind of problem a weakness represents. Distinguishing these is the
-- point: "does not understand quadratic functions" and "understands the
-- content but never answers the operator 'eroertern' fully" need different
-- practice.
create type skill_dimension as enum (
  'concept',        -- conceptual misunderstanding
  'procedure',      -- calculation / method errors
  'operator',       -- does not fulfil what the operator demands
  'completeness',   -- right idea, too thin for full credit
  'precision',      -- careless / avoidable slips
  'transfer'        -- cannot apply to an unfamiliar context (AFB III)
);

create type weakness_trend as enum ('improving', 'stable', 'worsening', 'new');

-- ----------------------------------------------------------------------------
-- weaknesses: a persistent, evidence-backed model of the student
-- ----------------------------------------------------------------------------

create table weaknesses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  subject_id          uuid not null references subjects(id) on delete cascade,

  topic_label         text not null,
  curriculum_topic_id uuid references curriculum_topics(id) on delete set null,
  dimension           skill_dimension not null,
  -- Set when dimension = 'operator'.
  operator            text,

  -- 0..1. How much this is costing the student right now.
  severity            numeric(3,2) not null default 0.5
                        check (severity between 0 and 1),
  -- 0..1. How sure we are, driven by how much evidence exists.
  confidence          numeric(3,2) not null default 0.3
                        check (confidence between 0 and 1),
  evidence_count      integer not null default 0 check (evidence_count >= 0),

  trend               weakness_trend not null default 'new',
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  -- Set once the student has demonstrably recovered.
  resolved_at         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One weakness row per (student, subject, topic, dimension, operator).
  -- Repeated evidence updates the row instead of creating duplicates.
  unique (user_id, subject_id, topic_label, dimension, operator)
);

create trigger weaknesses_updated_at
  before update on weaknesses
  for each row execute function set_updated_at();

create index weaknesses_user_idx
  on weaknesses(user_id, severity desc, last_seen_at desc);
create index weaknesses_subject_idx on weaknesses(subject_id);

-- Every weakness is traceable back to concrete task performance.
create table weakness_evidence (
  id          uuid primary key default gen_random_uuid(),
  weakness_id uuid not null references weaknesses(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,

  -- Where the evidence came from. Exactly one source is set.
  attempt_id  uuid references exam_attempts(id) on delete cascade,
  task_id     uuid references exam_tasks(id) on delete set null,

  note        text not null default '',
  points_lost numeric(6,2) not null default 0,
  occurred_at timestamptz not null default now()
);

create index weakness_evidence_weakness_idx
  on weakness_evidence(weakness_id, occurred_at desc);
create index weakness_evidence_user_idx on weakness_evidence(user_id);

-- ----------------------------------------------------------------------------
-- Targeted practice
-- ----------------------------------------------------------------------------

create table practice_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,

  title       text not null,
  -- Why this set exists, which drives how it is presented.
  origin      text not null default 'weakness'
                check (origin in ('weakness','topic','material','review')),
  weakness_id uuid references weaknesses(id) on delete set null,
  topic_label text,

  status      text not null default 'ready'
                check (status in ('generating','ready','failed')),
  error_message text,
  model_used  text,

  created_at  timestamptz not null default now(),
  completed_at timestamptz
);

create index practice_sets_user_idx on practice_sets(user_id, created_at desc);

create table practice_questions (
  id              uuid primary key default gen_random_uuid(),
  set_id          uuid not null references practice_sets(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,

  position        integer not null,
  prompt          text not null,
  operator        text,
  afb             afb_level,
  points          integer not null default 1 check (points > 0),
  expected_solution text not null default '',
  erwartungshorizont jsonb not null default '[]'::jsonb,
  hint            text,

  created_at      timestamptz not null default now(),
  unique (set_id, position)
);

create index practice_questions_set_idx on practice_questions(set_id, position);
create index practice_questions_user_idx on practice_questions(user_id);

create table practice_attempts (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references practice_questions(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,

  answer_text     text not null default '',
  points_awarded  numeric(6,2) not null default 0,
  points_possible numeric(6,2) not null default 1,
  verdict         answer_verdict,
  explanation     text not null default '',
  improvement     text not null default '',

  created_at      timestamptz not null default now()
);

create index practice_attempts_question_idx on practice_attempts(question_id);
create index practice_attempts_user_idx
  on practice_attempts(user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Flashcards with SM-2 style spaced repetition
-- ----------------------------------------------------------------------------

create table flashcards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  subject_id      uuid references subjects(id) on delete set null,

  front           text not null,
  back            text not null,
  topic_label     text,
  difficulty      text not null default 'standard'
                    check (difficulty in ('einfach','standard','anspruchsvoll')),

  -- Where the card came from, so the feed can explain itself.
  origin          text not null default 'material'
                    check (origin in ('material','mistake','weakness','exam','manual')),
  source_material_id uuid references learning_materials(id) on delete set null,
  source_weakness_id uuid references weaknesses(id) on delete set null,

  -- SM-2 scheduling state.
  ease_factor     numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days   integer not null default 0 check (interval_days >= 0),
  repetitions     integer not null default 0 check (repetitions >= 0),
  lapses          integer not null default 0 check (lapses >= 0),
  due_at          timestamptz not null default now(),
  last_reviewed_at timestamptz,

  suspended       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint flashcard_front_length check (char_length(front) between 1 and 1000),
  constraint flashcard_back_length check (char_length(back) between 1 and 4000)
);

create trigger flashcards_updated_at
  before update on flashcards
  for each row execute function set_updated_at();

-- The feed query: "cards for this user that are due now".
create index flashcards_due_idx
  on flashcards(user_id, due_at) where suspended = false;
create index flashcards_subject_idx on flashcards(subject_id);

create table flashcard_reviews (
  id                uuid primary key default gen_random_uuid(),
  card_id           uuid not null references flashcards(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,

  -- 0 again, 1 hard, 2 good, 3 easy
  rating            smallint not null check (rating between 0 and 3),
  previous_interval integer not null default 0,
  new_interval      integer not null default 0,
  reviewed_at       timestamptz not null default now()
);

create index flashcard_reviews_card_idx on flashcard_reviews(card_id, reviewed_at desc);
create index flashcard_reviews_user_idx on flashcard_reviews(user_id, reviewed_at desc);

-- ----------------------------------------------------------------------------
-- Learning plans
-- ----------------------------------------------------------------------------

create table learning_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  subject_id      uuid not null references subjects(id) on delete cascade,

  title           text not null,
  exam_date       date not null,
  -- How much time the student says they can give this, per week.
  weekly_minutes  integer not null default 180 check (weekly_minutes between 30 and 2520),

  status          text not null default 'active'
                    check (status in ('generating','active','completed','archived','failed')),
  error_message   text,
  model_used      text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Bumped whenever the plan is adapted to new performance data.
  last_adapted_at timestamptz
);

create trigger learning_plans_updated_at
  before update on learning_plans
  for each row execute function set_updated_at();

create index learning_plans_user_idx on learning_plans(user_id, exam_date);

create table learning_plan_items (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references learning_plans(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,

  scheduled_for     date not null,
  title             text not null,
  description       text not null default '',
  activity          text not null
                      check (activity in ('read','flashcards','practice','exam','review')),
  topic_label       text,
  estimated_minutes integer not null default 30 check (estimated_minutes between 5 and 480),
  position          smallint not null default 0,

  status            text not null default 'pending'
                      check (status in ('pending','done','skipped')),
  completed_at      timestamptz,

  created_at        timestamptz not null default now()
);

create index learning_plan_items_plan_idx
  on learning_plan_items(plan_id, scheduled_for, position);
create index learning_plan_items_user_day_idx
  on learning_plan_items(user_id, scheduled_for);
