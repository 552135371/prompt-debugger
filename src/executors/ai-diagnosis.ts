import { BaseExecutor } from './base'
import type { ExecutionResult } from './types'
import { chatLLM } from '@/api/llm'

export class AIDiagnosisExecutor extends BaseExecutor {
  validateInput(): { valid: boolean; message?: string } {
    const d = this.getInputData()
    if (!d || typeof d !== 'object' || Object.keys(d).length === 0)
      return { valid: false, message: '输入数据不能为空' }
    const prompts = this.localConfig.type_config.stage2_prompts || []
    if (prompts.length === 0) return { valid: false, message: '未配置并行 prompts' }
    return { valid: true }
  }

  async execute(): Promise<ExecutionResult> {
    this.recordStartTime()
    const validation = this.validateInput()
    if (!validation.valid) return { status: 'error', execution_mode: 'two_stage_parallel', error: validation.message, execution_time: this.getExecutionTime() }

    const parallelPrompts = this.localConfig.type_config.stage2_prompts || []
    const inputData = this.getInputData()
    const inputStr = typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2)

    const tasks = parallelPrompts.map(async (promptConfig) => {
      let finalUserPrompt = promptConfig.user_prompt || ''
      const commonPH = ['{{user}}', '{{input}}', '{{data}}', '{{user_input}}']
      commonPH.forEach(ph => {
        if (finalUserPrompt.includes(ph)) finalUserPrompt = finalUserPrompt.replace(new RegExp(ph.replace(/[{}]/g, '\\$&'), 'g'), inputStr)
      })
      // also replace any {{key}} from inputData
      if (typeof inputData === 'object') {
        Object.keys(inputData).forEach(key => {
          finalUserPrompt = finalUserPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            typeof inputData[key] === 'object' ? JSON.stringify(inputData[key], null, 2) : String(inputData[key] || ''))
        })
      }

      const messages = [
        { role: 'system' as const, content: promptConfig.system_prompt || '' },
        { role: 'user' as const, content: finalUserPrompt }
      ]

      const response = await chatLLM({ model: this.debuggerConfig.model_config.model, messages, temperature: this.debuggerConfig.model_config.temperature || 0.7 })
      if (!response.success) return { prompt_id: promptConfig.id, prompt_name: promptConfig.name, output: null, error: response.msg, messages }

      const rawOutput = response.data.choices?.[0]?.message?.content || ''
      let output: any
      try { output = JSON.parse(rawOutput) } catch { output = rawOutput }
      return { prompt_id: promptConfig.id, prompt_name: promptConfig.name, output, error: undefined, messages }
    })

    const results = await Promise.all(tasks)
    const hasError = results.some(r => r.error)

    return {
      status: hasError ? 'error' : 'success',
      execution_mode: 'two_stage_parallel',
      stage2_outputs: results.map(r => ({ prompt_id: r.prompt_id, output: r.output, error: r.error })),
      execution_time: this.getExecutionTime(),
      stage2_outputs_with_messages: results.map(r => ({ prompt_id: r.prompt_id, prompt_name: r.prompt_name, messages: r.messages, output: r.output, error: r.error }))
    }
  }
}
