-- Prompt Debugger 2.0 — Supabase Schema
-- 在 Supabase 控制台 SQL Editor 中执行此文件

-- 1. 调试配置
create table pd_debuggers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  system_prompt text not null default '',
  user_prompt_template text,
  model_config jsonb not null default '{"model":"gpt-4o","temperature":0.7}',
  user_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 测试用例
create table pd_test_cases (
  id uuid primary key default gen_random_uuid(),
  debugger_id uuid not null references pd_debuggers(id) on delete cascade,
  name text not null,
  description text,
  test_data jsonb not null default '{}',
  "order" integer not null default 0,
  created_at timestamptz default now()
);
create index on pd_test_cases(debugger_id);

-- 3. 运行历史
create table pd_histories (
  id uuid primary key default gen_random_uuid(),
  debugger_id uuid not null references pd_debuggers(id) on delete cascade,
  test_case_id uuid references pd_test_cases(id) on delete set null,
  batch_run_id uuid,
  run_config jsonb not null default '{}',
  input_data jsonb not null default '{}',
  request_context jsonb not null default '{}',
  output_result text not null default '',
  status text not null default 'success',
  error_message text,
  execution_time integer not null default 0,
  token_usage jsonb,
  created_at timestamptz default now()
);
create index on pd_histories(debugger_id);
create index on pd_histories(batch_run_id);

-- 4. 评估结果
create table pd_evaluation_results (
  id uuid primary key default gen_random_uuid(),
  history_id uuid not null unique references pd_histories(id) on delete cascade,
  test_case_id uuid not null references pd_test_cases(id) on delete cascade,
  batch_run_id uuid,
  debugger_id uuid not null references pd_debuggers(id) on delete cascade,
  tier_match boolean not null default false,
  score_match boolean not null default false,
  reason_match boolean not null default false,
  overall_pass boolean not null default false,
  pass_rate float not null default 0,
  evaluation_details jsonb not null default '{}',
  test_case_name text,
  test_data jsonb,
  ai_output text,
  created_at timestamptz default now()
);
create index on pd_evaluation_results(debugger_id);
create index on pd_evaluation_results(batch_run_id);

-- 5. 关闭 RLS（本工具不需要用户认证，直接用 anon key 访问）
alter table pd_debuggers enable row level security;
alter table pd_test_cases enable row level security;
alter table pd_histories enable row level security;
alter table pd_evaluation_results enable row level security;

create policy "allow_all_pd_debuggers" on pd_debuggers for all using (true) with check (true);
create policy "allow_all_pd_test_cases" on pd_test_cases for all using (true) with check (true);
create policy "allow_all_pd_histories" on pd_histories for all using (true) with check (true);
create policy "allow_all_pd_evaluation_results" on pd_evaluation_results for all using (true) with check (true);
