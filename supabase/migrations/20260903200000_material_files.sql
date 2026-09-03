-- A material can be several files.
--
-- Two photos of the same worksheet, a front and a back, three pages of the
-- same handout: they are one thing to study from, and treating each as its
-- own material meant the model never saw them together. Question 3 continuing
-- onto the second image was, to every feature, a fragment with no context.
--
-- The material keeps its own row and everything hanging off it — chunks,
-- topics, notebook links — so nothing that reads a material changes. What
-- moves is where the bytes are: from one storage_path on the material to a
-- row per file here.

create table material_files (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references learning_materials(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type    text not null,
  size_bytes   bigint not null,
  -- Reading order, chosen by the student when they picked the files.
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create index material_files_material_idx on material_files (material_id, position);

alter table material_files enable row level security;
create policy "material_files_select_own" on material_files
  for select to authenticated using (user_id = (select auth.uid()));
create policy "material_files_delete_own" on material_files
  for delete to authenticated using (user_id = (select auth.uid()));
-- Written by the server after the upload is authorised, never by a client.

-- Existing materials become single-file materials, so one code path reads
-- both and nothing has to special-case an older upload.
insert into material_files (material_id, user_id, storage_path, original_filename, mime_type, size_bytes, position, created_at)
select id, user_id, storage_path, original_filename, mime_type, size_bytes, 0, created_at
from learning_materials;
