-- ============================================================================
-- Studilly 002: learning materials, exams, attempts, grading results
-- ============================================================================

create type material_status as enum (
  'uploaded',    -- stored, not yet read
  'extracting',  -- pulling text out of the file
  'analyzing',   -- topic extraction + curriculum alignment
  'ready',
  'failed'
);

create type exam_status as enum (
  'generating',
  'ready',
  'failed',
  'archived'
);

create type attempt_status as enum (
  'in_progress',
  'submitted',
  'grading',
  'graded',
  'failed'
);

-- How well a single answer met the task. Kept richer than correct/incorrect so
-- feedback can be specific.
create type answer_verdict as enum (
  'incorrect',
  'partially_correct',
  'correct_incomplete',
  'correct',
  'exceptional'
);

-- ----------------------------------------------------------------------------
-- learning_materials
-- ----------------------------------------------------------------------------

create table learning_materials (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,

  title             text not null,
  original_filename text not null,
  -- Path inside the private `materials` storage bucket. Always prefixed with
  -- the owner's user id so storage policies can authorise by path.
  storage_path      text not null unique,
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes > 0),

  subject_id        uuid references subjects(id) on delete set null,
  status            material_status not null default 'uploaded',
  error_message     text,

  -- Filled in during extraction.
  page_count        integer,
  char_count        integer,
  detected_language text,
  -- Short AI summary shown in the material list.
  summary           text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  processed_at      timestamptz,

  constraint title_length check (char_length(title) between 1 and 200)
);

create trigger learning_materials_updated_at
  before update on learning_materials
  for each row execute function set_updated_at();

create index learning_materials_user_idx
  on learning_materials(user_id, created_at desc);
create index learning_materials_subject_idx on learning_materials(subject_id);

-- Chunked text for retrieval. We never send a whole document to the model;
-- exam generation retrieves the most relevant chunks instead.
create table material_chunks (
  id             uuid primary key default gen_random_uuid(),
  material_id    uuid not null references learning_materials(id) on delete cascade,
  -- Denormalised for RLS: lets policies authorise without a join.
  user_id        uuid not null references profiles(id) on delete cascade,

  chunk_index    integer not null,
  content        text not null,
  heading        text,
  page_from      integer,
  page_to        integer,
  token_estimate integer not null default 0,
  -- text-embedding-3-small
  embedding      vector(1536),

  created_at     timestamptz not null default now(),
  unique (material_id, chunk_index)
);

create index material_chunks_material_idx on material_chunks(material_id);
create index material_chunks_user_idx on material_chunks(user_id);
-- IVFFlat needs data before it is useful; created here so retrieval scales.
create index material_chunks_embedding_idx
  on material_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Topics the AI found in a material, optionally aligned to a curriculum topic.
create table material_topics (
  id                  uuid primary key default gen_random_uuid(),
  material_id         uuid not null references learning_materials(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,

  title               text not null,
  summary             text,
  curriculum_topic_id uuid references curriculum_topics(id) on delete set null,
  -- 0..1 confidence that this material topic matches the curriculum topic.
  match_confidence    numeric(3,2) check (match_confidence between 0 and 1),
  position            smallint not null default 0,

  created_at          timestamptz not null default now()
);

create index material_topics_material_idx on material_topics(material_id);
create index material_topics_user_idx on material_topics(user_id);

-- ----------------------------------------------------------------------------
-- exams
-- ----------------------------------------------------------------------------

create table exams (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,

  title             text not null,
  subject_id        uuid not null references subjects(id) on delete restrict,

  -- Schooling context frozen at generation time, so a later profile change
  -- does not silently reinterpret an existing exam.
  bundesland        bundesland not null,
  school_type       school_type not null,
  stage             education_stage not null,
  grade             smallint not null check (grade between 5 and 13),

  difficulty        text not null default 'standard'
                      check (difficulty in ('einfach','standard','anspruchsvoll')),
  duration_minutes  integer not null check (duration_minutes between 10 and 360),
  total_points      integer not null default 0 check (total_points >= 0),
  instructions      text not null default '',

  status            exam_status not null default 'generating',
  error_message     text,

  -- Provenance of the generation.
  source_material_ids uuid[] not null default '{}',
  topic_selection   jsonb not null default '[]'::jsonb,
  grading_scale_id  uuid references grading_scales(id) on delete set null,
  -- Output of the automated quality gate; see src/lib/ai/validation.
  validation_report jsonb,
  model_used        text,
  prompt_version    text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint exam_title_length check (char_length(title) between 1 and 200)
);

create trigger exams_updated_at
  before update on exams
  for each row execute function set_updated_at();

create index exams_user_idx on exams(user_id, created_at desc);
create index exams_subject_idx on exams(subject_id);

-- Tasks and subtasks. A subtask points at its parent; points always live on
-- the leaf that is actually answered.
create table exam_tasks (
  id                uuid primary key default gen_random_uuid(),
  exam_id           uuid not null references exams(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  parent_task_id    uuid references exam_tasks(id) on delete cascade,

  position          integer not null,
  -- Human label as printed on a German exam: "1", "1a", "2b".
  label             text not null,
  prompt            text not null,

  -- German exam conventions.
  operator          text,
  afb               afb_level,
  points            integer not null default 0 check (points >= 0),

  -- Reference material the task refers to (a source text, a data table).
  stimulus          text,

  -- Model answer.
  expected_solution text,
  -- Erwartungshorizont: what a full-credit answer must contain, as discrete
  -- criteria with their Bewertungseinheiten.
  -- [{ "criterion": "...", "points": 2, "required": true }]
  erwartungshorizont jsonb not null default '[]'::jsonb,

  created_at        timestamptz not null default now(),

  unique (exam_id, label)
);

create index exam_tasks_exam_idx on exam_tasks(exam_id, position);
create index exam_tasks_user_idx on exam_tasks(user_id);
create index exam_tasks_parent_idx on exam_tasks(parent_task_id);

-- ----------------------------------------------------------------------------
-- attempts, answers, evaluations
-- ----------------------------------------------------------------------------

create table exam_attempts (
  id                  uuid primary key default gen_random_uuid(),
  exam_id             uuid not null references exams(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,

  status              attempt_status not null default 'in_progress',
  started_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  graded_at           timestamptz,
  -- Wall-clock seconds the student spent, accumulated by the exam runner.
  time_spent_seconds  integer not null default 0 check (time_spent_seconds >= 0),

  -- All of these are computed by the backend grading engine, never by a model.
  points_awarded      numeric(6,2),
  points_possible     numeric(6,2),
  percentage          numeric(5,2),
  grade_value         numeric(4,2),
  grade_label         text,
  grading_scale_id    uuid references grading_scales(id) on delete set null,

  -- Narrative feedback produced after per-task evaluation.
  feedback_summary    jsonb,
  error_message       text,
  model_used          text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger exam_attempts_updated_at
  before update on exam_attempts
  for each row execute function set_updated_at();

create index exam_attempts_user_idx on exam_attempts(user_id, created_at desc);
create index exam_attempts_exam_idx on exam_attempts(exam_id);

-- One row per task per attempt. Autosaved continuously during the exam.
create table exam_answers (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references exam_attempts(id) on delete cascade,
  task_id     uuid not null references exam_tasks(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,

  answer_text text not null default '',
  is_flagged  boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (attempt_id, task_id)
);

create trigger exam_answers_updated_at
  before update on exam_answers
  for each row execute function set_updated_at();

create index exam_answers_attempt_idx on exam_answers(attempt_id);
create index exam_answers_user_idx on exam_answers(user_id);

create table answer_evaluations (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references exam_attempts(id) on delete cascade,
  task_id           uuid not null references exam_tasks(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,

  points_awarded    numeric(6,2) not null check (points_awarded >= 0),
  points_possible   numeric(6,2) not null check (points_possible >= 0),
  verdict           answer_verdict not null,

  -- Which Erwartungshorizont criteria were met, as
  -- [{ "criterion": "...", "met": true, "points": 2 }]
  criteria_results  jsonb not null default '[]'::jsonb,
  missing_elements  text[] not null default '{}',
  misconceptions    text[] not null default '{}',
  strengths         text[] not null default '{}',
  explanation       text not null default '',
  improvement       text not null default '',

  created_at        timestamptz not null default now(),

  unique (attempt_id, task_id),
  constraint points_within_max check (points_awarded <= points_possible)
);

create index answer_evaluations_attempt_idx on answer_evaluations(attempt_id);
create index answer_evaluations_user_idx on answer_evaluations(user_id);
