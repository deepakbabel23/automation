-- 0001_schema.sql — core schema for MockCred.
-- Portable Postgres (runs on local/CI Postgres and on Supabase).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Content (public, except correct answers/explanations which are filtered in
-- the query/API layer for locked questions).
-- ---------------------------------------------------------------------------

create table if not exists exams (
  id                uuid primary key default gen_random_uuid(),
  exam_code         text not null,
  slug              text not null unique,
  title             text not null,
  subtitle          text,
  version           text,
  source_version    text,
  duration_minutes  int  not null,
  question_count    int  not null,
  pass_scaled       int  not null default 720,
  scale_min         int  not null default 100,
  scale_max         int  not null default 1000,
  mastery_benchmark int  not null default 80,
  bloom_target      jsonb,
  is_published      boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists exam_domains (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references exams(id) on delete cascade,
  domain_no   int  not null,
  name        text not null,
  weight      int  not null default 0,
  item_target int  not null default 0,
  unique (exam_id, domain_no)
);

create table if not exists case_studies (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references exams(id) on delete cascade,
  case_key       text not null,
  title          text,
  question_range text,
  scenario       text not null,
  unique (exam_id, case_key)
);

create table if not exists questions (
  id                   uuid primary key default gen_random_uuid(),
  exam_id              uuid not null references exams(id) on delete cascade,
  external_id          int,
  domain_no            int  not null,
  case_key             text,
  variant              text,
  selection            text not null default 'single' check (selection in ('single','multi')),
  answer_count         int,
  stem                 text not null,
  rationale            text,
  concept              text,
  lesson               text,
  bloom                text,
  difficulty           int,
  confidence           text,
  reference            text,
  official_terminology text[] not null default '{}',
  distractor_patterns  text[] not null default '{}',
  cross_modules        int[]  not null default '{}',
  is_free              boolean not null default false,
  position             int  not null default 0,
  created_at           timestamptz not null default now(),
  unique (exam_id, external_id)
);

create table if not exists question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  letter      text not null,
  text        text not null,
  is_correct  boolean not null default false,
  explanation text,
  position    int not null default 0,
  unique (question_id, letter)
);

-- ---------------------------------------------------------------------------
-- Accounts, commerce, entitlements.
-- ---------------------------------------------------------------------------

create table if not exists app_users (
  id           uuid primary key default gen_random_uuid(),
  auth_id      text not null unique,
  email        text,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null unique,
  kind             text not null check (kind in ('pack','subscription')),
  exam_id          uuid references exams(id) on delete set null,
  name             text not null,
  currency         text not null default 'USD',
  price_cents      int  not null default 0,
  interval         text check (interval in ('month','year')),
  razorpay_plan_id text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references app_users(id) on delete cascade,
  scope      text not null check (scope in ('exam','all_access')),
  exam_id    uuid references exams(id) on delete cascade,
  source     text not null check (source in ('purchase','subscription','grant')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references app_users(id) on delete cascade,
  razorpay_subscription_id text unique,
  status                   text not null default 'created',
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references app_users(id) on delete set null,
  product_id          uuid references products(id) on delete set null,
  razorpay_order_id   text,
  razorpay_payment_id text,
  event_id            text unique,
  amount_cents        int,
  currency            text default 'USD',
  status              text not null default 'created',
  raw                 jsonb,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Attempts.
-- ---------------------------------------------------------------------------

create table if not exists test_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app_users(id) on delete cascade,
  exam_id      uuid not null references exams(id) on delete cascade,
  mode         text not null default 'practice' check (mode in ('practice','timed')),
  status       text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  expires_at   timestamptz,
  scaled_score int,
  raw_percent  int,
  passed       boolean,
  created_at   timestamptz not null default now()
);

create table if not exists attempt_answers (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references test_attempts(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  selected      text[] not null default '{}',
  is_correct    boolean,
  flagged       boolean not null default false,
  time_spent_ms int not null default 0,
  answered_at   timestamptz,
  unique (attempt_id, question_id)
);

create index if not exists idx_questions_exam         on questions (exam_id);
create index if not exists idx_options_question       on question_options (question_id);
create index if not exists idx_domains_exam           on exam_domains (exam_id);
create index if not exists idx_entitlements_user      on entitlements (user_id);
create index if not exists idx_attempts_user          on test_attempts (user_id);
create index if not exists idx_attempt_answers_attempt on attempt_answers (attempt_id);
