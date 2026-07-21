-- 0002_rls.sql — row-level security (defense-in-depth).
--
-- The Next.js server is the only DB client and always enforces access in code
-- via lib/entitlements.ts. These policies are a second layer: if the database
-- were ever exposed directly (e.g. Supabase anon key), a user can only see
-- their own rows. Portable: keyed on a session GUC, not Supabase's auth.uid().
--
-- The app sets the GUC per user-scoped operation via lib/db.ts `asUser()`:
--   select set_config('app.current_user_id', <uuid>, true)
-- When the GUC is unset, app_current_user() is null and forced-RLS tables
-- return no rows / reject writes — the safe default.

create or replace function app_current_user() returns uuid
  language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

-- app_users: self-visibility. Not forced — account creation is a server bootstrap
-- op that runs before a user id is known.
alter table app_users enable row level security;
drop policy if exists app_users_self on app_users;
create policy app_users_self on app_users
  using (id = app_current_user());

-- Per-user data: enable + FORCE so even the table owner is subject to policy.
do $$
declare t text;
begin
  foreach t in array array['entitlements','subscriptions','payments','test_attempts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists %I_owner on %I', t, t);
    execute format(
      'create policy %I_owner on %I using (user_id = app_current_user()) with check (user_id = app_current_user())',
      t, t);
  end loop;
end $$;

-- attempt_answers is owned transitively through its parent attempt.
alter table attempt_answers enable row level security;
alter table attempt_answers force row level security;
drop policy if exists attempt_answers_owner on attempt_answers;
create policy attempt_answers_owner on attempt_answers
  using (exists (select 1 from test_attempts a
                 where a.id = attempt_id and a.user_id = app_current_user()))
  with check (exists (select 1 from test_attempts a
                      where a.id = attempt_id and a.user_id = app_current_user()));
