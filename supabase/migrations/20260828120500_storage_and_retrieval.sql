-- ============================================================================
-- Studilly 006: private storage bucket, storage policies, retrieval RPC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Storage
--
-- Uploaded schoolwork is private by definition. The bucket is not public, so
-- files are only ever reachable through a short-lived signed URL minted
-- server-side after an ownership check.
--
-- Object key format:  <user_id>/<material_id>/<sanitised-filename>
-- The leading path segment is the owner, which is what the policies below key
-- on. Storage also enforces a hard size cap and a MIME allowlist, so a
-- forged client request cannot smuggle in an executable.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  26214400, -- 25 MiB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read own files. Signed URLs are generated server-side, but this also lets
-- an authenticated client fetch its own object directly if needed.
create policy "materials_read_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Upload only into your own folder.
create policy "materials_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "materials_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "materials_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ----------------------------------------------------------------------------
-- Retrieval
--
-- Semantic search over a student's own material chunks. This is what keeps
-- exam generation cheap: instead of shipping whole documents to the model we
-- send only the passages that actually relate to the selected topics.
--
-- SECURITY: the function is INVOKER (the default), so RLS on material_chunks
-- still applies and a caller can only ever match their own chunks. The
-- explicit user_id filter is a second layer, not the only one.
-- ----------------------------------------------------------------------------

create or replace function match_material_chunks(
  query_embedding vector(1536),
  target_user     uuid,
  material_ids    uuid[] default null,
  match_count     integer default 12,
  min_similarity  float default 0.15
)
returns table (
  id            uuid,
  material_id   uuid,
  content       text,
  heading       text,
  page_from     integer,
  chunk_index   integer,
  similarity    float
)
language sql
stable
as $$
  select
    c.id,
    c.material_id,
    c.content,
    c.heading,
    c.page_from,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from material_chunks c
  where c.user_id = target_user
    and c.embedding is not null
    and (material_ids is null or c.material_id = any(material_ids))
    and 1 - (c.embedding <=> query_embedding) > min_similarity
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

-- ----------------------------------------------------------------------------
-- Atomic usage metering.
--
-- Reserving quota and incrementing the counter has to be one statement, or two
-- concurrent requests can both read "9 of 10 used" and both proceed. The
-- unique constraint on (user_id, period_start, metric) plus this upsert makes
-- that race impossible.
--
-- Returns the new count, or NULL when the limit would be exceeded, in which
-- case nothing was written.
-- ----------------------------------------------------------------------------

create or replace function consume_usage(
  target_user  uuid,
  target_metric text,
  max_allowed  integer,
  amount       integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  period date := date_trunc('month', now() at time zone 'utc')::date;
  new_used integer;
begin
  -- A negative limit means unlimited.
  if max_allowed < 0 then
    insert into usage_records (user_id, period_start, metric, used)
    values (target_user, period, target_metric, amount)
    on conflict (user_id, period_start, metric)
      do update set used = usage_records.used + amount
    returning used into new_used;
    return new_used;
  end if;

  insert into usage_records (user_id, period_start, metric, used)
  values (target_user, period, target_metric, amount)
  on conflict (user_id, period_start, metric)
    do update set used = usage_records.used + amount
    where usage_records.used + amount <= max_allowed
  returning used into new_used;

  -- No row returned means the ON CONFLICT WHERE clause rejected the update,
  -- i.e. the student is at their limit.
  if new_used is null then
    return null;
  end if;

  -- Guard the first-insert path too.
  if new_used > max_allowed then
    update usage_records set used = used - amount
    where user_id = target_user
      and period_start = period
      and metric = target_metric;
    return null;
  end if;

  return new_used;
end;
$$;

-- Give back quota when an operation fails after reserving it, so a model
-- timeout does not cost the student one of their monthly exams.
create or replace function release_usage(
  target_user   uuid,
  target_metric text,
  amount        integer default 1
)
returns void
language sql
security definer
set search_path = public
as $$
  update usage_records
  set used = greatest(used - amount, 0)
  where user_id = target_user
    and period_start = date_trunc('month', now() at time zone 'utc')::date
    and metric = target_metric;
$$;

revoke all on function consume_usage(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function release_usage(uuid, text, integer) from public, anon, authenticated;
