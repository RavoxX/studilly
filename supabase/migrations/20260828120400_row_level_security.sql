-- ============================================================================
-- Studilly 005: Row Level Security
--
-- Principles
--   1. Every table has RLS enabled. There is no table without a policy.
--   2. Reference data (subjects, curricula, grading scales) is world-readable
--      to signed-in users and writable only by the service role.
--   3. Anything a student could use to cheat the product is NOT client
--      writable: points, grades, evaluations, subscription plan, usage
--      counters. Those columns are written exclusively by server code holding
--      the service-role key, after its own authorisation checks.
--   4. Where a client write is genuinely the right call (exam answer
--      autosave, marking a plan item done) the policy itself enforces the
--      surrounding invariant.
--   5. auth.uid() is wrapped as (select auth.uid()) so Postgres evaluates it
--      once per statement rather than once per row.
--
-- The service role bypasses RLS entirely, which is exactly why the secret key
-- never leaves the server.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so that a policy on study_group_members can ask
-- "is this user a member?" without recursively triggering itself.
-- ----------------------------------------------------------------------------

create or replace function is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from study_group_members
    where group_id = gid and user_id = (select auth.uid())
  );
$$;

create or replace function is_group_owner(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from study_group_members
    where group_id = gid
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

-- ============================================================================
-- Reference data: readable by any signed-in user, never client-writable.
-- ============================================================================

alter table subjects enable row level security;
create policy "subjects_read" on subjects
  for select to authenticated using (true);

alter table curricula enable row level security;
create policy "curricula_read" on curricula
  for select to authenticated using (true);

alter table curriculum_topics enable row level security;
create policy "curriculum_topics_read" on curriculum_topics
  for select to authenticated using (true);

alter table grading_scales enable row level security;
create policy "grading_scales_read" on grading_scales
  for select to authenticated using (true);

-- ============================================================================
-- Identity
-- ============================================================================

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profiles_update_own" on profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No client INSERT: the signup trigger creates the row.
-- No client DELETE: account deletion removes the auth user, which cascades.

alter table education_profiles enable row level security;

create policy "education_profiles_select_own" on education_profiles
  for select to authenticated using (user_id = (select auth.uid()));

create policy "education_profiles_insert_own" on education_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "education_profiles_update_own" on education_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table user_subjects enable row level security;

create policy "user_subjects_select_own" on user_subjects
  for select to authenticated using (user_id = (select auth.uid()));

create policy "user_subjects_insert_own" on user_subjects
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "user_subjects_update_own" on user_subjects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_subjects_delete_own" on user_subjects
  for delete to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Learning materials
--
-- Read and delete are the student's. Creation and mutation run server-side so
-- that size_bytes, status and storage_path cannot be forged; forging
-- size_bytes would defeat the storage quota.
-- ============================================================================

alter table learning_materials enable row level security;

create policy "materials_select_own" on learning_materials
  for select to authenticated using (user_id = (select auth.uid()));

create policy "materials_delete_own" on learning_materials
  for delete to authenticated using (user_id = (select auth.uid()));

alter table material_chunks enable row level security;
create policy "material_chunks_select_own" on material_chunks
  for select to authenticated using (user_id = (select auth.uid()));

alter table material_topics enable row level security;
create policy "material_topics_select_own" on material_topics
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Exams
--
-- Tasks carry points and model solutions, so they are read-only to the client.
-- ============================================================================

alter table exams enable row level security;

create policy "exams_select_own" on exams
  for select to authenticated using (user_id = (select auth.uid()));

create policy "exams_delete_own" on exams
  for delete to authenticated using (user_id = (select auth.uid()));

alter table exam_tasks enable row level security;

create policy "exam_tasks_select_own" on exam_tasks
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Attempts and answers
--
-- Answers are written directly by the browser because autosave has to be
-- instant. The policy enforces the invariants that matter: the attempt is
-- yours, it is still running, and the task belongs to that attempt's exam.
-- Everything scored is server-written.
-- ============================================================================

alter table exam_attempts enable row level security;

create policy "attempts_select_own" on exam_attempts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "attempts_delete_own" on exam_attempts
  for delete to authenticated using (user_id = (select auth.uid()));

alter table exam_answers enable row level security;

create policy "answers_select_own" on exam_answers
  for select to authenticated using (user_id = (select auth.uid()));

create policy "answers_insert_own_running_attempt" on exam_answers
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from exam_attempts a
      join exam_tasks t on t.exam_id = a.exam_id
      where a.id = exam_answers.attempt_id
        and t.id = exam_answers.task_id
        and a.user_id = (select auth.uid())
        and a.status = 'in_progress'
    )
  );

create policy "answers_update_own_running_attempt" on exam_answers
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from exam_attempts a
      where a.id = exam_answers.attempt_id
        and a.user_id = (select auth.uid())
        and a.status = 'in_progress'
    )
  )
  with check (user_id = (select auth.uid()));

alter table answer_evaluations enable row level security;
create policy "evaluations_select_own" on answer_evaluations
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Weakness model: derived data, read-only to the client.
-- ============================================================================

alter table weaknesses enable row level security;
create policy "weaknesses_select_own" on weaknesses
  for select to authenticated using (user_id = (select auth.uid()));

alter table weakness_evidence enable row level security;
create policy "weakness_evidence_select_own" on weakness_evidence
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Practice
-- ============================================================================

alter table practice_sets enable row level security;

create policy "practice_sets_select_own" on practice_sets
  for select to authenticated using (user_id = (select auth.uid()));

create policy "practice_sets_delete_own" on practice_sets
  for delete to authenticated using (user_id = (select auth.uid()));

alter table practice_questions enable row level security;
create policy "practice_questions_select_own" on practice_questions
  for select to authenticated using (user_id = (select auth.uid()));

-- Scored server-side after AI evaluation.
alter table practice_attempts enable row level security;
create policy "practice_attempts_select_own" on practice_attempts
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Flashcards
--
-- Students may create and edit their own cards. Scheduling is recomputed
-- server-side on every review, so a hand-edited interval is only ever the
-- student's own business.
-- ============================================================================

alter table flashcards enable row level security;

create policy "flashcards_select_own" on flashcards
  for select to authenticated using (user_id = (select auth.uid()));

create policy "flashcards_insert_own" on flashcards
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "flashcards_update_own" on flashcards
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "flashcards_delete_own" on flashcards
  for delete to authenticated using (user_id = (select auth.uid()));

alter table flashcard_reviews enable row level security;
create policy "flashcard_reviews_select_own" on flashcard_reviews
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Learning plans
-- ============================================================================

alter table learning_plans enable row level security;

create policy "plans_select_own" on learning_plans
  for select to authenticated using (user_id = (select auth.uid()));

create policy "plans_delete_own" on learning_plans
  for delete to authenticated using (user_id = (select auth.uid()));

alter table learning_plan_items enable row level security;

create policy "plan_items_select_own" on learning_plan_items
  for select to authenticated using (user_id = (select auth.uid()));

-- Ticking off a session is a real client action.
create policy "plan_items_update_own" on learning_plan_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================================
-- Study groups
--
-- Membership is the unit of authorisation. A member sees the group, its
-- members, its messages and what has been shared into it. Nothing else.
-- ============================================================================

alter table study_groups enable row level security;

create policy "groups_select_member" on study_groups
  for select to authenticated using (is_group_member(id));

create policy "groups_insert_own" on study_groups
  for insert to authenticated with check (owner_id = (select auth.uid()));

create policy "groups_update_owner" on study_groups
  for update to authenticated
  using (is_group_owner(id))
  with check (is_group_owner(id));

create policy "groups_delete_owner" on study_groups
  for delete to authenticated using (owner_id = (select auth.uid()));

alter table study_group_members enable row level security;

-- A member can see who else is in their groups.
create policy "members_select_in_my_groups" on study_group_members
  for select to authenticated using (is_group_member(group_id));

-- Joining is done server-side against an invite code, which is why there is
-- no client INSERT policy here: without one, a user cannot add themselves to
-- an arbitrary group id.

-- Leaving a group is the member's own action. Owners are additionally allowed
-- to remove other members.
create policy "members_delete_self_or_owner" on study_group_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or is_group_owner(group_id));

alter table study_group_shares enable row level security;

create policy "shares_select_member" on study_group_shares
  for select to authenticated using (is_group_member(group_id));

-- Sharing requires BOTH group membership AND ownership of the resource.
-- This is the rule that stops a group from becoming a way to read someone
-- else's library.
create policy "shares_insert_owned_resource" on study_group_shares
  for insert to authenticated
  with check (
    shared_by = (select auth.uid())
    and is_group_member(group_id)
    and (
      (material_id is not null and exists (
        select 1 from learning_materials m
        where m.id = material_id and m.user_id = (select auth.uid())
      ))
      or
      (exam_id is not null and exists (
        select 1 from exams e
        where e.id = exam_id and e.user_id = (select auth.uid())
      ))
    )
  );

create policy "shares_delete_sharer_or_owner" on study_group_shares
  for delete to authenticated
  using (shared_by = (select auth.uid()) or is_group_owner(group_id));

alter table study_group_messages enable row level security;

create policy "messages_select_member" on study_group_messages
  for select to authenticated using (is_group_member(group_id));

create policy "messages_insert_member" on study_group_messages
  for insert to authenticated
  with check (user_id = (select auth.uid()) and is_group_member(group_id));

create policy "messages_delete_own_or_owner" on study_group_messages
  for delete to authenticated
  using (user_id = (select auth.uid()) or is_group_owner(group_id));

-- ============================================================================
-- Billing and metering: readable, never client-writable.
--
-- This is the anti-spoofing boundary. A user can read what plan they are on
-- but cannot set it, and cannot decrement their own usage counters.
-- ============================================================================

alter table subscriptions enable row level security;
create policy "subscriptions_select_own" on subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

alter table usage_records enable row level security;
create policy "usage_select_own" on usage_records
  for select to authenticated using (user_id = (select auth.uid()));

-- ============================================================================
-- Notifications
-- ============================================================================

alter table notifications enable row level security;

create policy "notifications_select_own" on notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- Marking as read.
create policy "notifications_update_own" on notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_delete_own" on notifications
  for delete to authenticated using (user_id = (select auth.uid()));

alter table notification_preferences enable row level security;

create policy "notification_prefs_select_own" on notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));

create policy "notification_prefs_update_own" on notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
