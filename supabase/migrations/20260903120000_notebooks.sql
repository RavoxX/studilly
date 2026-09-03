-- Notebooks.
--
-- A notebook is a named set of the student's own materials, a conversation
-- grounded in exactly those, and the things generated from them: a deck, a
-- mind map, cards, a quiz, a table, an infographic, a report.
--
-- Sources are a join rather than a copy. A material uploaded once can sit in
-- several notebooks, deleting it removes it from all of them, and no file is
-- duplicated in storage.
--
-- Artifacts store their content as jsonb against a shape the app validates on
-- the way in. Keeping them structured rather than as rendered HTML means the
-- same deck can be redrawn when the design changes, and read by the iOS app,
-- without regenerating anything.

create table notebooks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  emoji        text not null default '📓',
  subject_id   uuid references subjects(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index notebooks_user_idx on notebooks (user_id, updated_at desc);

create table notebook_sources (
  notebook_id  uuid not null references notebooks(id) on delete cascade,
  material_id  uuid not null references learning_materials(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  added_at     timestamptz not null default now(),
  primary key (notebook_id, material_id)
);

create index notebook_sources_material_idx on notebook_sources (material_id);

create table notebook_messages (
  id           uuid primary key default gen_random_uuid(),
  notebook_id  uuid not null references notebooks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('user', 'assistant')),
  content      text not null,
  -- Which passages the answer leaned on, as [{materialId, title, quote}].
  -- Stored with the message so a citation still resolves after the notebook
  -- has been edited.
  citations    jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index notebook_messages_thread_idx
  on notebook_messages (notebook_id, created_at);

create table notebook_artifacts (
  id           uuid primary key default gen_random_uuid(),
  notebook_id  uuid not null references notebooks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in (
                 'presentation', 'mindmap', 'flashcards',
                 'quiz', 'table', 'infographic', 'report'
               )),
  title        text not null,
  status       text not null default 'ready'
                 check (status in ('generating', 'ready', 'failed')),
  content      jsonb not null default '{}'::jsonb,
  error_message text,
  model_used   text,
  created_at   timestamptz not null default now()
);

create index notebook_artifacts_notebook_idx
  on notebook_artifacts (notebook_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security. Same shape as every other table here: the row is the
-- student's or it does not exist.
-- ---------------------------------------------------------------------------

alter table notebooks enable row level security;
create policy "notebooks_select_own" on notebooks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notebooks_insert_own" on notebooks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notebooks_update_own" on notebooks
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notebooks_delete_own" on notebooks
  for delete to authenticated using (user_id = (select auth.uid()));

alter table notebook_sources enable row level security;
create policy "notebook_sources_select_own" on notebook_sources
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notebook_sources_insert_own" on notebook_sources
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notebook_sources_delete_own" on notebook_sources
  for delete to authenticated using (user_id = (select auth.uid()));

alter table notebook_messages enable row level security;
create policy "notebook_messages_select_own" on notebook_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notebook_messages_insert_own" on notebook_messages
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notebook_messages_delete_own" on notebook_messages
  for delete to authenticated using (user_id = (select auth.uid()));

alter table notebook_artifacts enable row level security;
create policy "notebook_artifacts_select_own" on notebook_artifacts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notebook_artifacts_delete_own" on notebook_artifacts
  for delete to authenticated using (user_id = (select auth.uid()));

-- Artifacts are written by the server after a model call, never by a client:
-- there is no insert or update policy, so only the service role can create
-- one. The same is true of assistant messages, but those share a table with
-- the student's own, so that split is enforced in the service instead.

-- ---------------------------------------------------------------------------
-- Usage metrics for the two new billable operations.
-- ---------------------------------------------------------------------------

alter table usage_records drop constraint if exists usage_records_metric_check;
alter table usage_records add constraint usage_records_metric_check
  check (metric in (
    'exam_generation', 'exam_grading', 'practice_generation',
    'flashcard_generation', 'material_upload', 'material_analysis',
    'learning_plan', 'notebook_chat', 'notebook_artifact'
  ));
