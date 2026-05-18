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
    const td = this.testCase?.test_data
    if (!td) return {}
    // 只暴露 input 字段给模板，隔离 expected / expected_tier 等评估字段防止泄漏给模型
    if (td.input !== undefined) {
      return { input: typeof td.input === 'object' ? JSON.stringify(td.input, null, 2) : String(td.input) }
    }
    // 没有 input 子字段时（自定义输入场景），原样返回整个对象
    return td
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
