import { AIPrefillExecutor } from './ai-prefill'
import { AIDiagnosisExecutor } from './ai-diagnosis'
import type { ExecutionContext } from './types'
import type { PromptDebugger } from '@/api/debugger'
import type { PromptDebuggerLocalConfig } from '@/composables/useLocalConfig'

export { AIPrefillExecutor, AIDiagnosisExecutor }
export type { ExecutionResult } from './types'

export class ExecutorFactory {
  static create(
    promptType: 'ai_prefill' | 'ai_diagnosis',
    debuggerConfig: PromptDebugger,
    localConfig: PromptDebuggerLocalConfig,
    testCase?: any,
    customInput?: any
  ) {
    const ctx: ExecutionContext = { test_case: testCase, custom_input: customInput, debugger_id: debuggerConfig.id, test_case_id: testCase?.id }
    if (promptType === 'ai_diagnosis') return new AIDiagnosisExecutor(debuggerConfig, localConfig, ctx)
    return new AIPrefillExecutor(debuggerConfig, localConfig, ctx)
  }
}
