-- ============================================================================
-- Studilly 004: study groups, subscriptions, usage metering, notifications
-- ============================================================================

create type plan_tier as enum ('free', 'pro', 'ultra');

create type group_role as enum ('owner', 'member');

-- ----------------------------------------------------------------------------
-- Study groups
--
-- Sharing is explicit and additive. Joining a group never grants access to a
-- member's library; only resources deliberately shared into the group become
-- visible, and only to that group.
-- ----------------------------------------------------------------------------

create table study_groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,

  name        text not null,
  description text not null default '',
  subject_id  uuid references subjects(id) on delete set null,

  -- Random, rotatable join code. Not derived from the group id.
  invite_code text not null unique
                default encode(gen_random_bytes(6), 'hex'),

  member_limit smallint not null default 30 check (member_limit between 2 and 200),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint group_name_length check (char_length(name) between 2 and 80),
  constraint group_description_length check (char_length(description) <= 500)
);

create trigger study_groups_updated_at
  before update on study_groups
  for each row execute function set_updated_at();

create table study_group_members (
  group_id  uuid not null references study_groups(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index study_group_members_user_idx on study_group_members(user_id);

-- Resources a member has explicitly shared into a group.
create table study_group_shares (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references study_groups(id) on delete cascade,
  shared_by     uuid not null references profiles(id) on delete cascade,

  resource_type text not null check (resource_type in ('material','exam')),
  material_id   uuid references learning_materials(id) on delete cascade,
  exam_id       uuid references exams(id) on delete cascade,

  note          text not null default '',
  created_at    timestamptz not null default now(),

  -- Exactly one resource reference, matching resource_type.
  constraint share_target_consistent check (
    (resource_type = 'material' and material_id is not null and exam_id is null)
    or
    (resource_type = 'exam' and exam_id is not null and material_id is null)
  )
);

create unique index study_group_shares_material_uniq
  on study_group_shares(group_id, material_id) where material_id is not null;
create unique index study_group_shares_exam_uniq
  on study_group_shares(group_id, exam_id) where exam_id is not null;
create index study_group_shares_group_idx on study_group_shares(group_id, created_at desc);

create table study_group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references study_groups(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint message_length check (char_length(body) between 1 and 2000)
);

create index study_group_messages_group_idx
  on study_group_messages(group_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Subscriptions
--
-- The plan stored here is the only thing the backend trusts. It is written by
-- the RevenueCat sync path (webhook or server-side refresh), never by the
-- browser. Plan limits themselves live in code config, not in the database.
-- ----------------------------------------------------------------------------

create table subscriptions (
  user_id             uuid primary key references profiles(id) on delete cascade,

  plan                plan_tier not null default 'free',
  entitlement_id      text,
  status              text not null default 'active'
                        check (status in ('active','trialing','grace_period','expired','cancelled')),

  provider            text not null default 'none'
                        check (provider in ('none','revenuecat')),
  rc_customer_id      text,
  -- True for every purchase made through the RevenueCat Test Store.
  is_sandbox          boolean not null default true,

  current_period_end  timestamptz,
  cancels_at          timestamptz,

  -- Last raw payload we synced from, for support and debugging. Contains no
  -- payment instrument data.
  last_sync_at        timestamptz,
  last_event          jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

create index subscriptions_rc_customer_idx on subscriptions(rc_customer_id);

-- ----------------------------------------------------------------------------
-- Usage metering
--
-- One row per (user, month, metric). Incremented server-side before an
-- expensive operation runs. The unique constraint plus an atomic upsert is
-- what makes limits impossible to race past.
-- ----------------------------------------------------------------------------

create table usage_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  -- First day of the billing month, in UTC.
  period_start date not null,
  metric       text not null check (metric in (
                 'exam_generation',
                 'exam_grading',
                 'practice_generation',
                 'flashcard_generation',
                 'material_upload',
                 'material_analysis',
                 'learning_plan'
               )),
  used         integer not null default 0 check (used >= 0),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (user_id, period_start, metric)
);

create trigger usage_records_updated_at
  before update on usage_records
  for each row execute function set_updated_at();

create index usage_records_user_period_idx on usage_records(user_id, period_start);

-- Storage accounting is a live sum rather than a counter, so it stays correct
-- when a student deletes a file.
create or replace function user_storage_bytes(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from learning_materials
  where user_id = target_user;
$$;

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------

create table notification_preferences (
  user_id               uuid primary key references profiles(id) on delete cascade,
  exam_reminders        boolean not null default true,
  practice_reminders    boolean not null default true,
  plan_reminders        boolean not null default true,
  group_activity        boolean not null default true,
  usage_alerts          boolean not null default true,
  subscription_updates  boolean not null default true,
  achievements          boolean not null default true,
  -- Delivery channels. Email delivery is not wired up in this release; the
  -- preference exists so the model does not need migrating later.
  email_enabled         boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger notification_preferences_updated_at
  before update on notification_preferences
  for each row execute function set_updated_at();

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,

  type       text not null check (type in (
               'exam_upcoming','practice_due','plan_due','group_activity',
               'usage_limit','subscription','achievement','system'
             )),
  title      text not null,
  body       text not null default '',
  -- Deep-link target, e.g. { "href": "/exams/<id>" }.
  data       jsonb not null default '{}'::jsonb,

  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on notifications(user_id, created_at desc);
create index notifications_unread_idx
  on notifications(user_id) where read_at is null;

-- ----------------------------------------------------------------------------
-- Signup trigger: every new auth user gets a profile, notification
-- preferences and a free subscription row.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
