// 评估引擎 - 从 Python 版 evaluator.py 移植

export interface EvalResult {
  overall_pass: boolean
  tier_match?: boolean
  score_match?: boolean
  reason_match?: boolean
  no_false_fail?: boolean  // 非误判：期望非fail时AI不输出fail；期望fail时AI必须输出fail
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
  no_false_fail_rate: number
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

  // 期望非fail → AI输出只要不是fail即通过；期望fail → AI必须输出fail
  let no_false_fail: boolean | undefined
  if (expected.tier !== undefined) {
    const expectedFail = expected.tier === 'fail'
    const aiFail = aiData?.tier === 'fail'
    no_false_fail = expectedFail ? aiFail : !aiFail
  }

  return { overall_pass: tier_match, tier_match, score_match: true, reason_match: true, no_false_fail, pass_rate: tier_match ? 1 : 0, format: 'simple' }
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
    return { total_count: 0, pass_count: 0, fail_count: 0, overall_pass_rate: 0, tier_pass_rate: 0, score_pass_rate: 0, reason_pass_rate: 0, no_false_fail_rate: 0 }
  }
  const pass_count = results.filter(r => r.overall_pass).length
  const simple = results.filter(r => r.format === 'simple')
  const rate = (arr: EvalResult[], key: keyof EvalResult) =>
    simple.length ? simple.filter(r => r[key] === true).length / simple.length : 0
  const nffApplicable = simple.filter(r => r.no_false_fail !== undefined)

  return {
    total_count: total,
    pass_count,
    fail_count: total - pass_count,
    overall_pass_rate: pass_count / total,
    tier_pass_rate: rate(simple, 'tier_match'),
    score_pass_rate: rate(simple, 'score_match'),
    reason_pass_rate: rate(simple, 'reason_match'),
    no_false_fail_rate: nffApplicable.length ? nffApplicable.filter(r => r.no_false_fail).length / nffApplicable.length : 0
  }
}
