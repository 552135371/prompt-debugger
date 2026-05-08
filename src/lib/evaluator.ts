// 评估引擎 - 从 Python 版 evaluator.py 移植

export interface EvalResult {
  overall_pass: boolean
  tier_match?: boolean
  score_match?: boolean
  reason_match?: boolean
  pass_rate: number
  format?: string
  details?: any
  error?: string
}

export interface BatchStats {
  total_count: number
  pass_count: number
  fail_count: number
  overall_pass_rate: number
  tier_pass_rate: number
  score_pass_rate: number
  reason_pass_rate: number
}

function parseJSON(text: string): any {
  try {
    const m = text.match(/```json\s*([\s\S]*?)\s*```/) ||
              text.match(/```\s*([\s\S]*?)\s*```/)
    return JSON.parse(m ? m[1] : text.trim())
  } catch {
    throw new Error('AI 输出 JSON 解析失败')
  }
}

function evaluateSimple(aiData: any, expected: any): EvalResult {
  const tier_match = expected.tier !== undefined
    ? aiData?.tier === expected.tier
    : true

  let score_match = true
  if (expected.score_min !== undefined || expected.score_max !== undefined) {
    const actual = Number(aiData?.score ?? aiData?.score_value ?? 0)
    const min = Number(expected.score_min ?? -Infinity)
    const max = Number(expected.score_max ?? Infinity)
    score_match = actual >= min && actual <= max
  }

  let reason_match = true
  if (expected.reason_must_contain && Array.isArray(expected.reason_must_contain)) {
    const actual: string = String(aiData?.reason ?? aiData?.explanation ?? '')
    reason_match = expected.reason_must_contain.every((kw: string) => actual.includes(kw))
  }

  const matches = [tier_match, score_match, reason_match]
  const overall_pass = matches.every(Boolean)
  const pass_rate = matches.filter(Boolean).length / matches.length

  return { overall_pass, tier_match, score_match, reason_match, pass_rate, format: 'simple' }
}

export function evaluateSingleCase(
  aiOutputRaw: string,
  testData: any
): EvalResult {
  try {
    const expected = testData?.expected ?? testData
    let aiData: any
    try { aiData = parseJSON(aiOutputRaw) } catch {
      // try stage2 wrapper
      try {
        const wrapper = JSON.parse(aiOutputRaw)
        aiData = wrapper?.stage2?.[0]?.output ?? wrapper
      } catch {
        return { overall_pass: false, pass_rate: 0, error: 'AI 输出 JSON 解析失败' }
      }
    }

    return evaluateSimple(aiData, expected)
  } catch (e: any) {
    return { overall_pass: false, pass_rate: 0, error: e.message }
  }
}

export function evaluateBatch(results: EvalResult[]): BatchStats {
  const total = results.length
  if (total === 0) {
    return { total_count: 0, pass_count: 0, fail_count: 0, overall_pass_rate: 0, tier_pass_rate: 0, score_pass_rate: 0, reason_pass_rate: 0 }
  }
  const pass_count = results.filter(r => r.overall_pass).length
  const simple = results.filter(r => r.format === 'simple')
  const rate = (arr: EvalResult[], key: keyof EvalResult) =>
    simple.length ? simple.filter(r => r[key] === true).length / simple.length : 0

  return {
    total_count: total,
    pass_count,
    fail_count: total - pass_count,
    overall_pass_rate: pass_count / total,
    tier_pass_rate: rate(simple, 'tier_match'),
    score_pass_rate: rate(simple, 'score_match'),
    reason_pass_rate: rate(simple, 'reason_match')
  }
}
