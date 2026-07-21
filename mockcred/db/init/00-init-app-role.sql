-- Runs once on first Postgres init (docker-entrypoint-initdb.d), as the
-- superuser, against POSTGRES_DB (mockcred). Creates a NON-superuser app role
-- that owns the public schema, so row-level security (incl. FORCE) applies to
-- the application connection — matching production (Supabase uses a
-- non-superuser app role too).
create role mockcred login password 'mockcred' nosuperuser;
grant all on database mockcred to mockcred;
alter schema public owner to mockcred;
