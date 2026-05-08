import { BaseExecutor } from './base'
import type { ExecutionResult } from './types'
import { chatLLM } from '@/api/llm'

export class AIPrefillExecutor extends BaseExecutor {
  validateInput(): { valid: boolean; message?: string } {
    const d = this.getInputData()
    if (!d || typeof d !== 'object' || Object.keys(d).length === 0)
      return { valid: false, message: '输入数据不能为空' }
    return { valid: true }
  }

  async execute(): Promise<ExecutionResult> {
    this.recordStartTime()
    const validation = this.validateInput()
    if (!validation.valid) return { status: 'error', execution_mode: 'single_stage', error: validation.message, execution_time: this.getExecutionTime() }

    const inputData = this.getInputData()
    const userPromptTemplate = this.localConfig.user_prompt || this.debuggerConfig.user_prompt_template || ''
    let userPrompt = userPromptTemplate
    Object.keys(inputData).forEach(key => {
      userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        typeof inputData[key] === 'object' ? JSON.stringify(inputData[key], null, 2) : String(inputData[key] || ''))
    })

    const systemPrompt = this.localConfig.system_prompt || this.debuggerConfig.system_prompt || ''
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ]

    const response = await chatLLM({ model: this.debuggerConfig.model_config.model, messages, temperature: this.debuggerConfig.model_config.temperature || 0.7 })
    if (!response.success) return { status: 'error', execution_mode: 'single_stage', error: response.msg, execution_time: this.getExecutionTime() }

    const rawOutput = response.data.choices[0]?.message?.content || ''
    let parsedOutput: any
    try { parsedOutput = this.parseJSONOutput(rawOutput) } catch { parsedOutput = { raw_text: rawOutput } }

    return {
      status: 'success',
      execution_mode: 'single_stage',
      output: parsedOutput,
      token_usage: response.data.usage,
      execution_time: this.getExecutionTime(),
      debug_info: { model: this.debuggerConfig.model_config.model, temperature: this.debuggerConfig.model_config.temperature || 0.7, messages_count: messages.length },
      stage1_messages: messages
    }
  }
}
