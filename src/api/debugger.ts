import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────

export interface PromptDebugger {
  id?: string
  name: string
  description?: string
  prompt_type: 'ai_prefill' | 'ai_diagnosis'
  system_prompt?: string
  user_prompt?: string
  model_config: { model: string; temperature: number; enable_thinking?: boolean }
  type_config?: any
  created_at?: string
  updated_at?: string
}

export interface DebugTestCase {
  id?: string
  debugger_id: string
  name: string
  description?: string
  test_data: any
  import_batch_id?: string
  import_batch_name?: string
  created_at?: string
}

export interface DebugHistory {
  id?: string
  debugger_id: string
  test_case_id?: string
  batch_run_id?: string
  run_config?: any
  input_data?: any
  output_result?: string
  request_context?: any
  status: string
  error_message?: string
  execution_time?: number
  token_usage?: any
  created_at?: string
}

export interface DebugBatchRun {
  id?: string
  debugger_id: string
  name: string
  created_at?: string
}

export interface DebugEvaluationResult {
  id?: string
  history_id: string
  test_case_id: string
  batch_run_id?: string
  debugger_id?: string
  tier_match: boolean
  score_match: boolean
  reason_match: boolean
  no_false_fail?: boolean
  overall_pass: boolean
  pass_rate: number
  evaluation_details?: any
  test_case_name?: string
  ai_output?: string
  test_data?: any
  created_at?: string
}

// ── Debugger CRUD ──────────────────────────────────────────────

export const getDebuggerList = async (): Promise<PromptDebugger[]> => {
  const { data, error } = await supabase
    .from('prompt_debugger')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as PromptDebugger[]
}

export const saveDebugger = async (d: PromptDebugger): Promise<PromptDebugger> => {
  if (d.id) {
    const { data, error } = await supabase
      .from('prompt_debugger')
      .update({ ...d, updated_at: new Date().toISOString() })
      .eq('id', d.id)
      .select()
      .single()
    if (error) throw error
    return data as PromptDebugger
  } else {
    const { data, error } = await supabase
      .from('prompt_debugger')
      .insert(d)
      .select()
      .single()
    if (error) throw error
    return data as PromptDebugger
  }
}

export const deleteDebugger = async (id: string) => {
  const { error } = await supabase.from('prompt_debugger').delete().eq('id', id)
  if (error) throw error
}

// ── Test Cases ─────────────────────────────────────────────────

export const getTestCases = async (debugger_id: string): Promise<DebugTestCase[]> => {
  const { data, error } = await supabase
    .from('debug_test_case')
    .select('*')
    .eq('debugger_id', debugger_id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as DebugTestCase[]
}

export const saveTestCase = async (tc: DebugTestCase): Promise<DebugTestCase> => {
  if (tc.id) {
    const { data, error } = await supabase
      .from('debug_test_case')
      .update({ name: tc.name, description: tc.description, test_data: tc.test_data })
      .eq('id', tc.id)
      .select()
      .single()
    if (error) throw error
    return data as DebugTestCase
  } else {
    const { data, error } = await supabase
      .from('debug_test_case')
      .insert(tc)
      .select()
      .single()
    if (error) throw error
    return data as DebugTestCase
  }
}

export const deleteTestCase = async (id: string) => {
  const { error } = await supabase.from('debug_test_case').delete().eq('id', id)
  if (error) throw error
}

export const batchImportTestCases = async (cases: DebugTestCase[]): Promise<DebugTestCase[]> => {
  const { data, error } = await supabase.from('debug_test_case').insert(cases).select()
  if (error) throw error
  return data as DebugTestCase[]
}

// ── History ────────────────────────────────────────────────────

export const saveHistory = async (h: DebugHistory): Promise<DebugHistory> => {
  const { data, error } = await supabase.from('debug_history').insert(h).select().single()
  if (error) throw error
  return data as DebugHistory
}

// ── Batch Run ──────────────────────────────────────────────────

export const createBatchRun = async (b: DebugBatchRun): Promise<DebugBatchRun> => {
  const { data, error } = await supabase.from('debug_batch_run').insert(b).select().single()
  if (error) throw error
  return data as DebugBatchRun
}

export const updateBatchRunName = async (id: string, name: string): Promise<void> => {
  const { error } = await supabase.from('debug_batch_run').update({ name }).eq('id', id)
  if (error) throw error
}

export const deleteBatchRuns = async (ids: string[]): Promise<void> => {
  const { error } = await supabase.from('debug_batch_run').delete().in('id', ids)
  if (error) throw error
}

// ── Evaluation ─────────────────────────────────────────────────

export const saveEvaluationResult = async (r: DebugEvaluationResult): Promise<DebugEvaluationResult> => {
  const { data, error } = await supabase
    .from('debug_evaluation_result')
    .upsert(r, { onConflict: 'history_id' })
    .select()
    .single()
  if (error) throw error
  return data as DebugEvaluationResult
}

export const getEvaluationReport = async (debugger_id: string, batch_run_id?: string) => {
  let query = supabase
    .from('debug_evaluation_result')
    .select(`
      *,
      debug_test_case ( name, test_data ),
      debug_history ( output_result, run_config, request_context, execution_time )
    `)
    .eq('debugger_id', debugger_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (batch_run_id) query = query.eq('batch_run_id', batch_run_id)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getBatchRunList = async (debugger_id: string) => {
  const { data, error } = await supabase
    .from('debug_batch_run')
    .select('id, name, created_at')
    .eq('debugger_id', debugger_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const clearEvaluationReport = async (debugger_id: string) => {
  const { error } = await supabase
    .from('debug_evaluation_result')
    .delete()
    .eq('debugger_id', debugger_id)
  if (error) throw error
}

export const deleteEvaluationResults = async (ids: string[]) => {
  const { error } = await supabase.from('debug_evaluation_result').delete().in('id', ids)
  if (error) throw error
}

export const deleteEvaluationResultsByBatch = async (debugger_id: string, batch_run_ids: string[]) => {
  const { error } = await supabase
    .from('debug_evaluation_result')
    .delete()
    .eq('debugger_id', debugger_id)
    .in('batch_run_id', batch_run_ids)
  if (error) throw error
}
