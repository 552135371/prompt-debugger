// 直接调用 LLM API（使用存储在 debugger model_config 中的 API key）
// 当前使用原项目的代理地址，后续可换成自己的

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequestData {
  model: string
  messages: ChatMessage[]
  temperature: number
  api_key?: string
  base_url?: string
}

export interface ChatResponseData {
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_cache_hit_tokens?: number
    prompt_cache_miss_tokens?: number
  }
}

export interface LLMConfig {
  [modelKey: string]: {
    api_key: string
    base_url: string
    model: string
  }
}

// 从原项目 llm_config.json 迁移的配置（含全部可用模型）
const BUILTIN_LLM_CONFIG: LLMConfig = {
  'doubao-seed-2-0-pro-260215': {
    api_key: '',
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-pro-260215'
  },
  'doubao-flash': {
    api_key: '',
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-lite-260215'
  },
  'kimi-k2': {
    api_key: '',
    base_url: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2-0905-preview'
  },
  'kimi-k2-thinking': {
    api_key: '',
    base_url: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2-thinking'
  },
  'deepseek-chat': {
    api_key: '',
    base_url: 'https://api.deepseek.com',
    model: 'deepseek-chat'
  },
  'deepseek-reasoner': {
    api_key: '',
    base_url: 'https://api.deepseek.com',
    model: 'deepseek-reasoner'
  },
  'google/gemini-2.5-flash': {
    api_key: '',
    base_url: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash'
  },
  'qwen/qwen3-max': {
    api_key: '',
    base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3-max'
  },
  'qwen/qwen3-max-thinking': {
    api_key: '',
    base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3-max'
  }
}

const LLM_CONFIG_KEY = 'pd_llm_config'

export const getLLMConfig = (): LLMConfig => {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY)
    const userConfig = raw ? JSON.parse(raw) : {}
    // 用户配置优先，内置配置兜底
    return { ...BUILTIN_LLM_CONFIG, ...userConfig }
  } catch {
    return BUILTIN_LLM_CONFIG
  }
}

export const saveLLMConfig = (config: LLMConfig) => {
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config))
}

export const getModelList = (): string[] => Object.keys(getLLMConfig())

export const chatLLM = async (data: ChatRequestData): Promise<{
  success: boolean
  data: ChatResponseData
  msg: string
}> => {
  const config = getLLMConfig()
  const modelConfig = config[data.model] || config['default']

  if (!modelConfig?.api_key) {
    return { success: false, data: {} as any, msg: '请先在设置中配置 API Key' }
  }

  const baseUrl = (modelConfig.base_url || 'https://api.openai.com').replace(/\/$/, '')
  const url = `${baseUrl}/v1/chat/completions`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${modelConfig.api_key}`
      },
      body: JSON.stringify({
        model: modelConfig.model || data.model,
        messages: data.messages,
        temperature: data.temperature,
        stream: false
      })
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return { success: false, data: {} as any, msg: err?.error?.message || `HTTP ${resp.status}` }
    }

    const json = await resp.json()
    return { success: true, data: json as ChatResponseData, msg: 'ok' }
  } catch (e: any) {
    return { success: false, data: {} as any, msg: e.message || '请求失败' }
  }
}
