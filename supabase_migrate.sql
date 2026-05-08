-- 补丁迁移：在现有表上补充字段
-- 在 Supabase SQL Editor 执行

-- debug_history 补充 batch_run_id
ALTER TABLE debug_history ADD COLUMN IF NOT EXISTS batch_run_id UUID;
CREATE INDEX IF NOT EXISTS idx_history_batch_run ON debug_history(batch_run_id);

-- debug_evaluation_result 补充批次/快照字段
ALTER TABLE debug_evaluation_result ADD COLUMN IF NOT EXISTS batch_run_id UUID;
ALTER TABLE debug_evaluation_result ADD COLUMN IF NOT EXISTS debugger_id UUID REFERENCES prompt_debugger(id) ON DELETE CASCADE;
ALTER TABLE debug_evaluation_result ADD COLUMN IF NOT EXISTS test_case_name TEXT;
ALTER TABLE debug_evaluation_result ADD COLUMN IF NOT EXISTS ai_output TEXT;
ALTER TABLE debug_evaluation_result ADD COLUMN IF NOT EXISTS test_data JSONB;

CREATE INDEX IF NOT EXISTS idx_evaluation_batch_run ON debug_evaluation_result(batch_run_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_debugger ON debug_evaluation_result(debugger_id);

-- RLS：全开（无登录工具）
ALTER TABLE prompt_debugger ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_test_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_evaluation_result ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all ON prompt_debugger;
DROP POLICY IF EXISTS allow_all ON debug_test_case;
DROP POLICY IF EXISTS allow_all ON debug_history;
DROP POLICY IF EXISTS allow_all ON debug_evaluation_result;

CREATE POLICY allow_all ON prompt_debugger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON debug_test_case FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON debug_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON debug_evaluation_result FOR ALL USING (true) WITH CHECK (true);
