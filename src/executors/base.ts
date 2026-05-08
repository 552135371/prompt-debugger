import type { ExecutionResult, ExecutionContext } from './types'
import type { PromptDebugger } from '@/api/debugger'
import type { PromptDebuggerLocalConfig } from '@/composables/useLocalConfig'

export abstract class BaseExecutor {
  protected debuggerConfig: PromptDebugger
  protected localConfig: PromptDebuggerLocalConfig
  protected testCase?: any
  protected customInput?: any
  protected startTime: number = 0

  constructor(
    debuggerConfig: PromptDebugger,
    localConfig: PromptDebuggerLocalConfig,
    context: ExecutionContext
  ) {
    this.debuggerConfig = debuggerConfig
    this.localConfig = localConfig
    if (context.test_case) this.testCase = context.test_case
    if (context.custom_input) this.customInput = context.custom_input
  }

  abstract execute(): Promise<ExecutionResult>
  abstract validateInput(): { valid: boolean; message?: string }

  protected getInputData(): any {
    if (this.customInput) return this.customInput
    if (this.testCase?.test_data) return this.testCase.test_data
    return {}
  }

  protected buildUserPrompt(template: string, data: Record<string, any>): string {
    let result = template
    Object.keys(data).forEach(key => {
      const ph = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      const val = typeof data[key] === 'object' ? JSON.stringify(data[key], null, 2) : String(data[key] || '')
      result = result.replace(ph, val)
    })
    return result
  }

  protected parseJSONOutput(text: string): any {
    const m = text.match(/```json\s*([\s\S]*?)\s*```/) ||
              text.match(/```\s*([\s\S]*?)\s*```/)
    return JSON.parse(m ? m[1] : text.trim())
  }

  protected recordStartTime() { this.startTime = Date.now() }
  protected getExecutionTime(): number { return Date.now() - this.startTime }
}
