-- Pre-fill the display name for OAuth sign-ups.
--
-- Google returns the account's name as `full_name` (and `name`), never as
-- `display_name`, so a Google sign-up previously landed on onboarding with an
-- empty name field. Onboarding still asks and still requires an answer; this
-- only saves the student retyping something the provider already told us.
--
-- Studilly greets people by first name, so the first token is taken rather
-- than the whole legal name.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
      nullif(split_part(coalesce(new.raw_user_meta_data->>'name', ''), ' ', 1), ''),
      ''
    )
  )
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
