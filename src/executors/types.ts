export interface ExecutionResult {
  status: 'success' | 'error'
  execution_mode: 'single_stage' | 'two_stage_parallel'
  output?: any
  stage1_output?: any
  stage2_outputs?: Array<{ prompt_id: string; output: any; error?: string }>
  error?: string
  token_usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_cache_hit_tokens?: number
    prompt_cache_miss_tokens?: number
  }
  execution_time?: number
  debug_info?: any
  stage1_messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  stage2_outputs_with_messages?: Array<{
    prompt_id: string
    prompt_name?: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    output: any
    error?: string
  }>
}

export interface ExecutionContext {
  debugger_id?: string
  test_case_id?: string
  test_case?: any
  custom_input?: any
}
