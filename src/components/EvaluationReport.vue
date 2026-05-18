<template>
  <div class="eval-container">
    <div class="eval-header">
      <h3>📊 评估报告</h3>
      <div class="header-btns">
        <el-button size="small" type="primary" @click="loadReport" :loading="loading">🔄 刷新</el-button>
        <el-button size="small" type="success" @click="downloadHtmlReport" :disabled="!reportData || reportData.stats.total_count === 0">📥 下载报告</el-button>
        <el-button size="small" type="danger" plain @click="clearReport" :disabled="!reportData || reportData.stats.total_count === 0">🗑️ 清空</el-button>
      </div>
    </div>

    <div v-if="loading"><el-skeleton :rows="4" animated /></div>

    <div v-else-if="reportData" class="eval-body">
      <!-- 批次运行历史 -->
      <el-card shadow="never" class="batch-list-card">
        <template #header>
          <div style="display:flex;align-items:center;gap:12px;">
            <el-checkbox :model-value="allChecked" :indeterminate="someChecked" @change="toggleCheckAll" @click.stop />
            <span style="font-weight:600;">📋 批量运行历史</span>
            <el-button
              v-if="checkedBatchIds.length > 0"
              size="small" type="danger" plain
              style="margin-left:auto;"
              @click="deleteCheckedBatches"
            >🗑️ 删除选中（{{ checkedBatchIds.length }}）</el-button>
          </div>
        </template>
        <div v-if="batchRuns.length === 0" class="empty-tip">暂无批次运行记录</div>
        <div
          v-for="b in batchRuns"
          :key="b.batch_run_id"
          class="batch-run-item"
          :class="{ active: selectedBatchRunId === b.batch_run_id, checked: checkedBatchIds.includes(b.batch_run_id) }"
          @click="selectBatchRun(b.batch_run_id)"
        >
          <div class="batch-run-main">
            <el-checkbox
              :model-value="checkedBatchIds.includes(b.batch_run_id)"
              @change="toggleCheck(b.batch_run_id)"
              @click.stop
            />
            <div class="batch-name-area" @click.stop>
              <template v-if="b.editing">
                <el-input
                  v-model="b.editName"
                  size="small"
                  style="width:200px;"
                  @keyup.enter="saveEditName(b)"
                  @keyup.esc="b.editing = false"
                  @blur="saveEditName(b)"
                  autofocus
                />
              </template>
              <template v-else>
                <span class="batch-name">{{ b.name }}</span>
                <el-button size="small" text @click.stop="startEditName(b)" style="padding:0 4px;">✏️</el-button>
              </template>
            </div>
            <span class="batch-time">{{ formatTime(b.created_at) }}</span>
            <el-tag size="small" :type="b.pass_rate >= 0.8 ? 'success' : b.pass_rate >= 0.6 ? 'warning' : 'danger'">
              {{ (b.pass_rate * 100).toFixed(0) }}% 通过
            </el-tag>
            <span class="batch-count">{{ b.total }} 个用例</span>
            <el-button size="small" type="success" plain @click.stop="downloadBatchReport(b)" style="margin-left:auto;">📥 下载</el-button>
          </div>
          <!-- 展开：显示本次 system prompt -->
          <el-collapse-transition>
            <div v-if="selectedBatchRunId === b.batch_run_id && b.system_prompt" class="batch-prompt-preview">
              <div class="prompt-label">本次 System Prompt：</div>
              <pre class="prompt-pre">{{ b.system_prompt }}</pre>
            </div>
          </el-collapse-transition>
        </div>
      </el-card>

      <!-- 统计概览 -->
      <div class="stats-grid">
        <div class="stat-card total"><div class="stat-icon">📝</div><div><div class="stat-label">总测试数</div><div class="stat-val">{{ reportData.stats.total_count }}</div></div></div>
        <div class="stat-card pass"><div class="stat-icon">✅</div><div><div class="stat-label">通过</div><div class="stat-val pass-color">{{ reportData.stats.pass_count }}</div></div></div>
        <div class="stat-card fail"><div class="stat-icon">❌</div><div><div class="stat-label">失败</div><div class="stat-val fail-color">{{ reportData.stats.fail_count }}</div></div></div>
        <div class="stat-card rate"><div class="stat-icon">📈</div><div><div class="stat-label">通过率</div><div class="stat-val rate-color">{{ formatPct(reportData.stats.overall_pass_rate) }}</div></div></div>
        <div class="stat-card time"><div class="stat-icon">⏱️</div><div><div class="stat-label">平均耗时</div><div class="stat-val time-color">{{ reportData.stats.avg_execution_time != null ? reportData.stats.avg_execution_time + ' ms' : 'N/A' }}</div></div></div>
        <div class="stat-card model-card"><div class="stat-icon">🤖</div><div><div class="stat-label">使用模型</div><div class="stat-val model-val">{{ reportData.model || 'N/A' }}</div></div></div>
      </div>

      <!-- 分项指标 -->
      <el-card shadow="never" style="margin-bottom:16px;">
        <el-row :gutter="20">
          <el-col :span="8" v-for="[label, key] in metricItems" :key="key">
            <div class="metric-item">
              <div class="metric-label">{{ label }}</div>
              <el-progress v-if="(reportData.stats as any)[key] != null" :percentage="Math.round((reportData.stats as any)[key] * 100)" :color="progressColor((reportData.stats as any)[key])" />
              <span v-else style="font-size:12px;color:#c0c4cc;">暂无数据</span>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 误判 / 判对 Tab -->
      <el-tabs v-model="caseTab" type="border-card">
        <el-tab-pane name="failed">
          <template #label>
            ⚠️ 误判案例 <el-badge :value="reportData.failed_cases.length" type="danger" style="margin-left:6px;" />
          </template>
          <div v-if="reportData.failed_cases.length === 0" class="empty-tip">🎉 无误判！</div>
          <el-collapse v-else accordion>
            <el-collapse-item v-for="(c, i) in reportData.failed_cases" :key="c.id" :name="c.id">
              <template #title>
                <span style="color:#409eff; font-weight:700; margin-right:8px;">{{ i + 1 }}.</span>
                <span>{{ c.test_case_name }}</span>
                <el-tag size="small" type="danger" style="margin-left:10px;">误判</el-tag>
                <span v-if="c.execution_time" class="case-time">{{ c.execution_time }}ms</span>
              </template>
              <CaseDetail :case-data="c" />
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>

        <el-tab-pane name="passed">
          <template #label>
            ✅ 判对案例 <el-badge :value="reportData.passed_cases.length" type="success" style="margin-left:6px;" />
          </template>
          <div v-if="reportData.passed_cases.length === 0" class="empty-tip">暂无判对案例</div>
          <el-collapse v-else accordion>
            <el-collapse-item v-for="(c, i) in reportData.passed_cases" :key="c.id" :name="c.id">
              <template #title>
                <span style="color:#409eff; font-weight:700; margin-right:8px;">{{ i + 1 }}.</span>
                <span>{{ c.test_case_name }}</span>
                <el-tag size="small" type="success" style="margin-left:10px;">判对</el-tag>
                <span v-if="c.execution_time" class="case-time">{{ c.execution_time }}ms</span>
              </template>
              <CaseDetail :case-data="c" />
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEvaluationReport, getBatchRunList, clearEvaluationReport, deleteEvaluationResultsByBatch, updateBatchRunName, deleteBatchRuns } from '@/api/debugger'
import CaseDetail from './CaseDetail.vue'

const props = defineProps<{ debuggerId: string; debuggerName: string }>()

const loading = ref(false)
const caseTab = ref('failed')
const selectedBatchRunId = ref<string | null>(null)

const metricItems = [['档位准确率', 'tier_pass_rate'], ['误判保护率', 'no_false_fail_rate'], ['分数准确率', 'score_pass_rate'], ['原因匹配率', 'reason_pass_rate']]

interface BatchRun { batch_run_id: string; name: string; created_at: string; total: number; pass_rate: number; system_prompt?: string; editing?: boolean; editName?: string }
const batchRuns = ref<BatchRun[]>([])
const checkedBatchIds = ref<string[]>([])
const allChecked = computed(() => batchRuns.value.length > 0 && batchRuns.value.every(b => checkedBatchIds.value.includes(b.batch_run_id)))
const someChecked = computed(() => checkedBatchIds.value.length > 0 && !allChecked.value)

const toggleCheck = (id: string) => {
  const idx = checkedBatchIds.value.indexOf(id)
  if (idx >= 0) checkedBatchIds.value.splice(idx, 1)
  else checkedBatchIds.value.push(id)
}

const toggleCheckAll = () => {
  if (allChecked.value) {
    checkedBatchIds.value = []
  } else {
    checkedBatchIds.value = batchRuns.value.map(b => b.batch_run_id)
  }
}

const deleteCheckedBatches = async () => {
  const ids = [...checkedBatchIds.value]
  await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条批次记录？不可恢复！`, '删除确认', { type: 'warning' })
  await Promise.all([
    deleteBatchRuns(ids),
    deleteEvaluationResultsByBatch(props.debuggerId, ids)
  ])
  checkedBatchIds.value = []
  await loadReport()
  ElMessage.success('已删除')
}

const startEditName = (b: BatchRun) => {
  b.editing = true
  b.editName = b.name
}

const saveEditName = async (b: BatchRun) => {
  const newName = b.editName?.trim()
  if (!newName) { b.editing = false; return }
  await updateBatchRunName(b.batch_run_id, newName)
  b.name = newName
  b.editing = false
  ElMessage.success('已重命名')
}

const reportData = ref<{
  stats: { total_count: number; pass_count: number; fail_count: number; overall_pass_rate: number; tier_pass_rate: number; score_pass_rate: number; reason_pass_rate: number; no_false_fail_rate: number | null; avg_execution_time: number | null }
  model: string
  failed_cases: any[]
  passed_cases: any[]
} | null>(null)

const loadBatchRuns = async () => {
  const batchList = await getBatchRunList(props.debuggerId)
  if (!batchList.length) { batchRuns.value = []; return }

  // 聚合每个批次的 total / pass
  const { data: evalRows } = await (await import('@/lib/supabase')).supabase
    .from('debug_evaluation_result')
    .select('batch_run_id, overall_pass')
    .eq('debugger_id', props.debuggerId)
    .not('batch_run_id', 'is', null)

  const statsMap = new Map<string, { total: number; pass: number }>()
  for (const row of evalRows ?? []) {
    if (!row.batch_run_id) continue
    const s = statsMap.get(row.batch_run_id) ?? { total: 0, pass: 0 }
    s.total++
    if (row.overall_pass) s.pass++
    statsMap.set(row.batch_run_id, s)
  }

  batchRuns.value = batchList.map((b: any) => {
    const s = statsMap.get(b.id) ?? { total: 0, pass: 0 }
    return { batch_run_id: b.id, name: b.name, created_at: b.created_at, total: s.total, pass_rate: s.total ? s.pass / s.total : 0 }
  })

  if (batchRuns.value.length && !selectedBatchRunId.value) {
    selectedBatchRunId.value = batchRuns.value[0].batch_run_id
  }
}

const loadReport = async () => {
  if (!props.debuggerId) return
  loading.value = true
  try {
    await loadBatchRuns()
    const rows = await getEvaluationReport(props.debuggerId, selectedBatchRunId.value ?? undefined)
    buildReportData(rows)
  } catch (e: any) { ElMessage.error(e.message) }
  finally { loading.value = false }
}

const selectBatchRun = async (id: string) => {
  if (selectedBatchRunId.value === id) {
    // toggle off → show all
    selectedBatchRunId.value = null
  } else {
    selectedBatchRunId.value = id
  }
  await loadReportForBatch()
}

const loadReportForBatch = async () => {
  loading.value = true
  try {
    const rows = await getEvaluationReport(props.debuggerId, selectedBatchRunId.value ?? undefined)
    buildReportData(rows)

    // fetch system_prompt for selected batch
    if (selectedBatchRunId.value) {
      const batchRow = batchRuns.value.find(b => b.batch_run_id === selectedBatchRunId.value)
      if (batchRow && rows.length > 0) {
        const firstRow = rows[0] as any
        batchRow.system_prompt = firstRow?.debug_history?.run_config?.system_prompt ?? ''
      }
    }
  } catch (e: any) { ElMessage.error(e.message) }
  finally { loading.value = false }
}

function buildReportData(rows: any[]) {
  if (!rows || rows.length === 0) {
    reportData.value = { stats: { total_count: 0, pass_count: 0, fail_count: 0, overall_pass_rate: 0, tier_pass_rate: 0, score_pass_rate: 0, reason_pass_rate: 0, no_false_fail_rate: null, avg_execution_time: null }, model: '', failed_cases: [], passed_cases: [] }
    return
  }

  const total = rows.length
  const passCount = rows.filter(r => r.overall_pass).length
  const simple = rows.filter(r => r.tier_match !== null)
  const tierPass = simple.filter(r => r.tier_match).length
  const scorePass = simple.filter(r => r.score_match).length
  const reasonPass = simple.filter(r => r.reason_match).length
  const nffRows = rows.filter(r => r.no_false_fail !== null && r.no_false_fail !== undefined)
  const nffRate = nffRows.length ? nffRows.filter(r => r.no_false_fail).length / nffRows.length : null

  const execTimes = rows.map(r => r.debug_history?.execution_time).filter((t): t is number => typeof t === 'number' && t > 0)
  const avgExecTime = execTimes.length ? Math.round(execTimes.reduce((a, b) => a + b, 0) / execTimes.length) : null

  const model = rows[0]?.debug_history?.run_config?.model ?? ''

  const mapCase = (r: any) => ({
    id: r.id,
    test_case_name: r.test_case_name || r.debug_test_case?.name || '未知',
    test_data: r.test_data || r.debug_test_case?.test_data,
    ai_output: r.ai_output || r.debug_history?.output_result,
    stage1_messages: r.debug_history?.request_context?.stage1_messages ?? [],
    execution_time: r.debug_history?.execution_time ?? null,
    overall_pass: r.overall_pass,
    no_false_fail: r.no_false_fail,
    tier_match: r.tier_match,
    score_match: r.score_match,
    reason_match: r.reason_match,
    evaluation_details: r.evaluation_details
  })

  // 按 no_false_fail 分组；无该字段的回退到 overall_pass
  const nffFailed = rows.filter(r => r.no_false_fail !== null && r.no_false_fail !== undefined ? !r.no_false_fail : !r.overall_pass)
  const nffPassed = rows.filter(r => r.no_false_fail !== null && r.no_false_fail !== undefined ? r.no_false_fail : r.overall_pass)

  reportData.value = {
    stats: {
      total_count: total,
      pass_count: passCount,
      fail_count: total - passCount,
      overall_pass_rate: passCount / total,
      tier_pass_rate: simple.length ? tierPass / simple.length : 0,
      score_pass_rate: simple.length ? scorePass / simple.length : 0,
      reason_pass_rate: simple.length ? reasonPass / simple.length : 0,
      no_false_fail_rate: nffRate,
      avg_execution_time: avgExecTime
    },
    model,
    failed_cases: nffFailed.slice(0, 100).map(mapCase),
    passed_cases: nffPassed.slice(0, 100).map(mapCase)
  }
}

const clearReport = async () => {
  await ElMessageBox.confirm(
    '此操作将清空该配置下所有评估记录和批次历史，不可恢复！\n\n如只想删除部分批次，请勾选后用"删除选中"。',
    '⚠️ 清空全部评估记录',
    { type: 'warning', confirmButtonText: '确认清空', confirmButtonClass: 'el-button--danger', cancelButtonText: '取消' }
  )
  await clearEvaluationReport(props.debuggerId)
  reportData.value = null
  batchRuns.value = []
  selectedBatchRunId.value = null
  ElMessage.success('已清空')
}

const formatPct = (v: number) => `${(v * 100).toFixed(1)}%`
const progressColor = (v: number) => v >= 0.8 ? '#67c23a' : v >= 0.6 ? '#e6a23c' : '#f56c6c'
const formatTime = (iso: string) => new Date(iso).toLocaleString('zh-CN')

// ── Download HTML ──────────────────────────────────────────────
const downloadHtmlReport = () => {
  if (!reportData.value) return
  const data = reportData.value
  const title = `${props.debuggerName} — Prompt 测试评估报告`
  const now = new Date().toLocaleString('zh-CN')

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const renderRows = (cases: any[], isPass: boolean) => {
    if (!cases.length) return `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px;">${isPass ? '暂无成功案例' : '🎉 全部通过！'}</td></tr>`
    return cases.map((c, i) => {
      const tag = (v: any, t = '✅', f = '❌') => v === true ? `<span style="color:#67c23a">${t}</span>` : v === false ? `<span style="color:#f56c6c">${f}</span>` : 'N/A'
      return `<tr>
        <td style="text-align:center;font-weight:bold;color:#409eff;">${i + 1}</td>
        <td>${esc(c.test_case_name || '')}</td>
        <td>${isPass ? '<span style="color:#67c23a">Passed</span>' : '<span style="color:#f56c6c">Failed</span>'}</td>
        <td style="text-align:center;">${tag(c.tier_match)}</td>
        <td style="text-align:center;">${tag(c.score_match)}</td>
        <td style="text-align:center;">${tag(c.reason_match)}</td>
        <td><details><summary style="cursor:pointer;color:#409eff;font-size:12px;">详情</summary>
          <pre style="background:#f5f7fa;padding:8px;font-size:11px;white-space:pre-wrap;">${esc(JSON.stringify(c.test_data, null, 2))}</pre>
          <pre style="background:#f5f7fa;padding:8px;font-size:11px;white-space:pre-wrap;margin-top:4px;">${esc(String(c.ai_output || ''))}</pre>
        </details></td></tr>`
    }).join('')
  }

  const batchRunLabel = selectedBatchRunId.value ? `批次：${formatTime(batchRuns.value.find(b => b.batch_run_id === selectedBatchRunId.value)?.created_at || '')}` : '全量汇总'

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f0f2f5;color:#303133}.container{max-width:1200px;margin:0 auto;padding:32px 24px}.page-title{font-size:22px;font-weight:700;margin-bottom:4px}.page-meta{font-size:13px;color:#909399;margin-bottom:24px}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}.stat-card{background:#fff;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.06)}.stat-icon{font-size:28px}.stat-label{font-size:12px;color:#909399}.stat-val{font-size:24px;font-weight:700}.section{background:#fff;border-radius:10px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.06)}.section-title{font-size:15px;font-weight:600;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f7fa;padding:10px 12px;text-align:left;border-bottom:2px solid #ebeef5}td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}</style></head>
<body><div class="container">
<div class="page-title">📊 ${esc(title)}</div>
<div class="page-meta">生成时间：${now}　|　${esc(batchRunLabel)}　|　总用例：${data.stats.total_count} 个</div>
<div class="stat-grid">
<div class="stat-card"><div class="stat-icon">📝</div><div><div class="stat-label">总测试数</div><div class="stat-val">${data.stats.total_count}</div></div></div>
<div class="stat-card"><div class="stat-icon">✅</div><div><div class="stat-label">通过</div><div class="stat-val" style="color:#67c23a">${data.stats.pass_count}</div></div></div>
<div class="stat-card"><div class="stat-icon">❌</div><div><div class="stat-label">失败</div><div class="stat-val" style="color:#f56c6c">${data.stats.fail_count}</div></div></div>
<div class="stat-card"><div class="stat-icon">📈</div><div><div class="stat-label">通过率</div><div class="stat-val" style="color:#409eff">${formatPct(data.stats.overall_pass_rate)}</div></div></div>
</div>
<div class="section"><div class="section-title">❌ 失败案例（${data.failed_cases.length}）</div>
<table><thead><tr><th>#</th><th>用例名称</th><th>状态</th><th>档位</th><th>分数</th><th>原因</th><th>详情</th></tr></thead>
<tbody>${renderRows(data.failed_cases, false)}</tbody></table></div>
<div class="section"><div class="section-title">✅ 成功案例（${data.passed_cases.length}）</div>
<table><thead><tr><th>#</th><th>用例名称</th><th>状态</th><th>档位</th><th>分数</th><th>原因</th><th>详情</th></tr></thead>
<tbody>${renderRows(data.passed_cases, true)}</tbody></table></div>
</div></body></html>`

  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${props.debuggerName}_评估报告_${ts}.html`; a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('报告下载成功')
}

const downloadBatchReport = async (b: BatchRun) => {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  let rows: any[]
  try {
    rows = await getEvaluationReport(props.debuggerId, b.batch_run_id)
  } catch (e: any) {
    ElMessage.error('获取批次数据失败：' + e.message)
    return
  }

  const firstRow = rows[0] as any
  const systemPrompt = b.system_prompt
    || firstRow?.debug_history?.run_config?.system_prompt
    || firstRow?.pd_histories?.run_config?.system_prompt
    || ''

  const total = rows.length
  const passCount = rows.filter(r => r.overall_pass).length

  const mapCase = (r: any) => ({
    test_case_name: r.test_case_name || r.pd_test_cases?.name || '未知',
    test_data: r.test_data || r.pd_test_cases?.test_data,
    ai_output: r.ai_output || r.debug_history?.output_result,
    overall_pass: r.overall_pass,
    tier_match: r.tier_match,
    score_match: r.score_match,
    reason_match: r.reason_match,
  })

  const renderRows = (cases: any[], isPass: boolean) => {
    if (!cases.length) return `<tr><td colspan="7" style="text-align:center;color:#999;padding:24px;">${isPass ? '暂无成功案例' : '🎉 全部通过！'}</td></tr>`
    return cases.map((c, i) => {
      const tag = (v: any, t = '✅', f = '❌') => v === true ? `<span style="color:#67c23a">${t}</span>` : v === false ? `<span style="color:#f56c6c">${f}</span>` : 'N/A'
      return `<tr>
        <td style="text-align:center;font-weight:bold;color:#409eff;">${i + 1}</td>
        <td>${esc(c.test_case_name || '')}</td>
        <td>${isPass ? '<span style="color:#67c23a">Passed</span>' : '<span style="color:#f56c6c">Failed</span>'}</td>
        <td style="text-align:center;">${tag(c.tier_match)}</td>
        <td style="text-align:center;">${tag(c.score_match)}</td>
        <td style="text-align:center;">${tag(c.reason_match)}</td>
        <td><details><summary style="cursor:pointer;color:#409eff;font-size:12px;">详情</summary>
          <pre style="background:#f5f7fa;padding:8px;font-size:11px;white-space:pre-wrap;">${esc(JSON.stringify(c.test_data, null, 2))}</pre>
          <pre style="background:#f5f7fa;padding:8px;font-size:11px;white-space:pre-wrap;margin-top:4px;">${esc(String(c.ai_output || ''))}</pre>
        </details></td></tr>`
    }).join('')
  }

  const failedCases = rows.filter(r => !r.overall_pass).map(mapCase)
  const passedCases = rows.filter(r => r.overall_pass).map(mapCase)
  const batchLabel = formatTime(b.created_at)
  const title = `${props.debuggerName} — 批次报告 ${batchLabel}`
  const now = new Date().toLocaleString('zh-CN')

  const systemPromptSection = systemPrompt ? `
<div class="section" style="margin-bottom:20px;">
  <details>
    <summary style="font-size:15px;font-weight:600;cursor:pointer;padding:4px 0;outline:none;">
      🗒️ 本次使用的 System Prompt（点击展开）
    </summary>
    <pre style="background:#f5f7fa;border:1px solid #e4e7ed;border-radius:6px;padding:16px;font-size:12px;color:#303133;white-space:pre-wrap;word-break:break-all;margin-top:12px;max-height:400px;overflow-y:auto;">${esc(systemPrompt)}</pre>
  </details>
</div>` : ''

  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f0f2f5;color:#303133}.container{max-width:1200px;margin:0 auto;padding:32px 24px}.page-title{font-size:22px;font-weight:700;margin-bottom:4px}.page-meta{font-size:13px;color:#909399;margin-bottom:24px}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}.stat-card{background:#fff;border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.06)}.stat-icon{font-size:28px}.stat-label{font-size:12px;color:#909399}.stat-val{font-size:24px;font-weight:700}.section{background:#fff;border-radius:10px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.06)}.section-title{font-size:15px;font-weight:600;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f7fa;padding:10px 12px;text-align:left;border-bottom:2px solid #ebeef5}td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}</style></head>
<body><div class="container">
<div class="page-title">📊 ${esc(title)}</div>
<div class="page-meta">生成时间：${now}　|　批次：${esc(batchLabel)}　|　总用例：${total} 个</div>
${systemPromptSection}
<div class="stat-grid">
<div class="stat-card"><div class="stat-icon">📝</div><div><div class="stat-label">总测试数</div><div class="stat-val">${total}</div></div></div>
<div class="stat-card"><div class="stat-icon">✅</div><div><div class="stat-label">通过</div><div class="stat-val" style="color:#67c23a">${passCount}</div></div></div>
<div class="stat-card"><div class="stat-icon">❌</div><div><div class="stat-label">失败</div><div class="stat-val" style="color:#f56c6c">${total - passCount}</div></div></div>
<div class="stat-card"><div class="stat-icon">📈</div><div><div class="stat-label">通过率</div><div class="stat-val" style="color:#409eff">${total ? ((passCount / total) * 100).toFixed(1) : 0}%</div></div></div>
</div>
<div class="section"><div class="section-title">❌ 失败案例（${failedCases.length}）</div>
<table><thead><tr><th>#</th><th>用例名称</th><th>状态</th><th>档位</th><th>分数</th><th>原因</th><th>详情</th></tr></thead>
<tbody>${renderRows(failedCases, false)}</tbody></table></div>
<div class="section"><div class="section-title">✅ 成功案例（${passedCases.length}）</div>
<table><thead><tr><th>#</th><th>用例名称</th><th>状态</th><th>档位</th><th>分数</th><th>原因</th><th>详情</th></tr></thead>
<tbody>${renderRows(passedCases, true)}</tbody></table></div>
</div></body></html>`

  const ts = formatTime(b.created_at).replace(/[/:]/g, '-').replace(/\s/g, '_')
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `${props.debuggerName}_批次报告_${ts}.html`; a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('批次报告下载成功')
}

onMounted(() => loadReport())
defineExpose({ loadReport })
</script>

<style scoped lang="scss">
.eval-container { padding: 16px; }
.eval-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; h3 { margin: 0; } }
.header-btns { display: flex; gap: 8px; }

.batch-list-card { margin-bottom: 16px; }
.batch-run-item {
  padding: 10px 12px; border-radius: 6px; cursor: pointer; border: 1px solid #ebeef5; margin-bottom: 6px;
  &:hover { border-color: #409eff; background: #f0f7ff; }
  &.active { border-color: #409eff; background: #ecf5ff; }
  &.checked { border-color: #f56c6c; background: #fff0f0; }
}
.batch-run-main { display: flex; align-items: center; gap: 10px; }
.batch-name-area { display: flex; align-items: center; gap: 2px; flex: 1; min-width: 0; }
.batch-name { font-size: 13px; font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.batch-time { font-size: 12px; color: #909399; white-space: nowrap; }
.batch-count { font-size: 12px; color: #909399; white-space: nowrap; }
.batch-prompt-preview { margin-top: 10px; }
.prompt-label { font-size: 12px; font-weight: 600; color: #606266; margin-bottom: 4px; }
.prompt-pre {
  background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px; padding: 10px;
  font-size: 12px; color: #606266; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
}

.stats-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
}
.stat-card {
  background: #fff; border-radius: 8px; padding: 14px; display: flex; align-items: center; gap: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,.05);
  .stat-icon { font-size: 28px; }
  .stat-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
  .stat-val { font-size: 22px; font-weight: 700; }
  .pass-color { color: #67c23a; }
  .fail-color { color: #f56c6c; }
  .rate-color { color: #409eff; }
  .time-color { color: #e6a23c; }
  .model-val { font-size: 13px; font-weight: 600; color: #606266; word-break: break-all; }
}

.case-time { font-size: 11px; color: #909399; margin-left: 10px; }

.metric-item { .metric-label { font-size: 13px; color: #606266; margin-bottom: 6px; } }
.empty-tip { color: #909399; font-size: 13px; text-align: center; padding: 24px 0; }
</style>
