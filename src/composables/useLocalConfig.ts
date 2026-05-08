import { ref, computed } from 'vue'

export type PromptType = 'ai_prefill' | 'ai_diagnosis'

export interface Stage2Prompt {
  id: string
  name: string
  system_prompt: string
  user_prompt: string
}

export interface PromptDebuggerLocalConfig {
  debugger_id: string
  prompt_type: PromptType
  system_prompt?: string
  user_prompt?: string
  type_config: {
    execution_mode: 'single_stage' | 'two_stage_parallel'
    input_schema?: { type: string; description: string; placeholders?: string[] }
    output_schema?: { type: string; format: any }
    stage2_prompts?: Stage2Prompt[]
  }
  source_prompt_id?: number | null
  created_at?: string
  updated_at?: string
}

const STORAGE_PREFIX = 'pd_config_'

export function useLocalConfig() {
  const currentConfig = ref<PromptDebuggerLocalConfig | null>(null)

  const saveConfig = (config: PromptDebuggerLocalConfig) => {
    const withMeta = { ...config, updated_at: new Date().toISOString() }
    localStorage.setItem(`${STORAGE_PREFIX}${config.debugger_id}`, JSON.stringify(withMeta))
    currentConfig.value = withMeta
  }

  const loadConfig = (debuggerId: string): PromptDebuggerLocalConfig | null => {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${debuggerId}`)
    if (!raw) return null
    try {
      const config = JSON.parse(raw)
      currentConfig.value = config
      return config
    } catch { return null }
  }

  const deleteConfig = (debuggerId: string) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${debuggerId}`)
    if (currentConfig.value?.debugger_id === debuggerId) currentConfig.value = null
  }

  const createDefaultConfig = (debuggerId: string, promptType: PromptType = 'ai_prefill'): PromptDebuggerLocalConfig => ({
    debugger_id: debuggerId,
    prompt_type: promptType,
    type_config: {
      execution_mode: promptType === 'ai_prefill' ? 'single_stage' : 'two_stage_parallel',
      ...(promptType === 'ai_prefill' ? {
        input_schema: { type: 'json', description: '输入数据', placeholders: [] },
        output_schema: { type: 'json', format: {} }
      } : {
        stage2_prompts: []
      })
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  const hasConfig = (debuggerId: string) => !!localStorage.getItem(`${STORAGE_PREFIX}${debuggerId}`)

  const promptType = computed(() => currentConfig.value?.prompt_type)
  const typeConfig = computed(() => currentConfig.value?.type_config)

  return { currentConfig, promptType, typeConfig, saveConfig, loadConfig, deleteConfig, createDefaultConfig, hasConfig }
}
