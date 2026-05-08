<template>
  <div class="pd-layout">
    <!-- 顶部导航 -->
    <div class="pd-header">
      <div class="pd-header-left">
        <span class="pd-title">🧪 Prompt Debugger 2.0</span>
        <el-select
          v-model="currentDebuggerId"
          placeholder="选择调试配置"
          @change="handleDebuggerChange"
          style="width: 260px; margin-left: 16px;"
          filterable
        >
          <el-option v-for="d in debuggerList" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-button @click="showDebuggerDialog = true" type="primary" size="small" style="margin-left: 8px;">
          + 新建
        </el-button>
        <el-button
          v-if="currentDebuggerId"
          @click="handleDeleteDebugger"
          type="danger"
          size="small"
          plain
          style="margin-left: 4px;"
        >
          删除
        </el-button>
      </div>
      <div class="pd-header-right">
        <el-button @click="showSettingsDialog = true" size="small">⚙️ LLM 设置</el-button>
      </div>
    </div>

    <div v-if="!currentDebugger" class="pd-empty">
      <el-empty description="请先选择或创建一个调试配置" />
    </div>

    <div v-else class="pd-body">
      <!-- 左侧配置面板 -->
      <div class="pd-left">
        <el-tabs v-model="activeTab" type="card">
          <!-- Prompt 配置 -->
          <el-tab-pane label="Prompt 配置" name="prompt">
            <div class="config-section">
              <!-- 类型选择 -->
              <div class="section-block">
                <div class="section-label">执行类型</div>
                <el-radio-group v-model="currentConfig!.prompt_type" @change="handleTypeChange" size="small">
                  <el-radio-button value="ai_prefill">单次 Prompt</el-radio-button>
                  <el-radio-button value="ai_diagnosis">并行 Prompt</el-radio-button>
                </el-radio-group>
              </div>

              <!-- 单次 Prompt 配置 -->
              <template v-if="currentConfig?.prompt_type === 'ai_prefill'">
                <div class="section-block">
                  <div class="section-label">System Prompt</div>
                  <el-input
                    v-model="currentConfig!.system_prompt"
                    type="textarea"
                    :rows="8"
                    placeholder="输入 System Prompt..."
                    @blur="saveCurrentConfig"
                  />
                </div>
                <div class="section-block">
                  <div class="section-label">User Prompt 模板 <span class="hint">（用 {{字段名}} 插入数据）</span></div>
                  <el-input
                    v-model="currentConfig!.user_prompt"
                    type="textarea"
                    :rows="6"
                    placeholder="输入 User Prompt 模板，例如：请分析以下数据：{{user_input}}"
                    @blur="saveCurrentConfig"
                  />
                </div>
              </template>

              <!-- 并行 Prompt 配置 -->
              <template v-if="currentConfig?.prompt_type === 'ai_diagnosis'">
                <div class="section-block">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                    <div class="section-label" style="margin:0;">并行 Prompts</div>
                    <el-button size="small" type="primary" @click="addStage2Prompt">+ 添加 Prompt</el-button>
                  </div>
                  <div v-for="(p, idx) in currentConfig!.type_config.stage2_prompts" :key="p.id" class="stage2-block">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <el-input v-model="p.name" size="small" placeholder="Prompt 名称" style="width:200px;" @blur="saveCurrentConfig" />
                      <el-button size="small" type="danger" text @click="removeStage2Prompt(idx)">删除</el-button>
                    </div>
                    <el-input v-model="p.system_prompt" type="textarea" :rows="4" placeholder="System Prompt..." @blur="saveCurrentConfig" />
                    <el-input v-model="p.user_prompt" type="textarea" :rows="3" placeholder="User Prompt 模板..." style="margin-top:6px;" @blur="saveCurrentConfig" />
                  </div>
                </div>
              </template>

              <!-- 模型配置 -->
              <div class="section-block">
                <div class="section-label">模型配置</div>
                <el-form :model="currentDebugger.model_config" label-width="80px" size="small">
                  <el-form-item label="模型">
                    <el-select v-model="currentDebugger.model_config.model" @change="saveDebuggerConfig" style="width:100%;" filterable>
                      <el-option v-for="m in modelList" :key="m" :label="m" :value="m" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="Temperature">
                    <el-slider v-model="currentDebugger.model_config.temperature" :min="0" :max="2" :step="0.1" show-input @change="saveDebuggerConfig" />
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </el-tab-pane>

          <!-- 测试用例 -->
          <el-tab-pane label="测试用例" name="cases">
            <div class="config-section">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-weight:600;">测试用例列表（{{ testCases.length }}）</span>
                <div>
                  <el-button size="small" type="primary" @click="showCaseDialog = true">+ 新增</el-button>
                  <el-upload
                    :show-file-list="false"
                    accept=".json"
                    :before-upload="handleImportCases"
                    style="display:inline-block; margin-left:8px;"
                  >
                    <el-button size="small">📥 导入 JSON</el-button>
                  </el-upload>
                  <el-button size="small" plain @click="showImportTemplate = !showImportTemplate" style="margin-left:4px;">📋 格式模板</el-button>
                </div>
              </div>

              <!-- 导入格式模板 -->
              <el-collapse-transition>
                <div v-if="showImportTemplate" class="import-template-block">
                  <div class="template-header">
                    <span>📋 JSON 导入格式说明</span>
                    <el-button size="small" text @click="downloadTemplate">⬇️ 下载模板文件</el-button>
                  </div>
                  <div class="template-desc">支持数组（批量）或单个对象，每条记录结构如下：</div>
                  <pre class="template-pre">{{ importTemplateStr }}</pre>
                  <div class="template-fields">
                    <div class="field-row"><span class="field-key">name</span><span class="field-desc">用例名称（必填）</span></div>
                    <div class="field-row"><span class="field-key">description</span><span class="field-desc">用例描述（可选）</span></div>
                    <div class="field-row"><span class="field-key">test_data.input</span><span class="field-desc">传给 Prompt 的输入数据，可用 <code>{{字段名}}</code> 在 User Prompt 中引用</span></div>
                    <div class="field-row"><span class="field-key">test_data.expected</span><span class="field-desc">期望值，用于自动评估（可选）</span></div>
                    <div class="field-row"><span class="field-key">expected.tier</span><span class="field-desc">期望档位，精确匹配</span></div>
                    <div class="field-row"><span class="field-key">expected.score_min/max</span><span class="field-desc">期望分数范围</span></div>
                    <div class="field-row"><span class="field-key">expected.reason_must_contain</span><span class="field-desc">输出原因必须包含的关键词数组</span></div>
                  </div>
                </div>
              </el-collapse-transition>

              <div v-if="testCases.length === 0" class="empty-tip">暂无测试用例，点击新增或导入</div>
              <div v-for="(tc, idx) in testCases" :key="tc.id" class="tc-item">
                <div class="tc-header">
                  <span class="tc-index">{{ idx + 1 }}</span>
                  <span class="tc-name">{{ tc.name }}</span>
                  <div>
                    <el-button size="small" text @click="editTestCase(tc)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="handleDeleteTestCase(tc.id!)">删除</el-button>
                  </div>
                </div>
                <div class="tc-preview">{{ JSON.stringify(tc.test_data).substring(0, 120) }}...</div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 评估报告 -->
          <el-tab-pane label="评估报告" name="evaluation">
            <EvaluationReport
              v-if="currentDebuggerId"
              :debugger-id="currentDebuggerId"
              :debugger-name="currentDebugger.name"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 右侧运行面板 -->
      <div class="pd-right">
        <div class="run-section">
          <h3>运行测试</h3>
          <el-tabs v-model="runMode" type="border-card">
            <!-- 单次运行 -->
            <el-tab-pane label="单次运行" name="single">
              <div class="run-block">
                <div class="section-label">选择测试用例（可选）</div>
                <el-select v-model="singleTestCaseId" placeholder="或直接填写自定义输入" clearable style="width:100%; margin-bottom:10px;">
                  <el-option v-for="tc in testCases" :key="tc.id" :label="tc.name" :value="tc.id" />
                </el-select>
                <div class="section-label">自定义输入 JSON</div>
                <el-input
                  v-model="customInputStr"
                  type="textarea"
                  :rows="5"
                  placeholder='{"key": "value"}'
                  style="margin-bottom:10px;"
                />
                <el-button type="primary" @click="runSingle" :loading="singleRunning" style="width:100%;">▶ 运行</el-button>
              </div>

              <!-- 单次运行结果 -->
              <div v-if="singleResult" class="result-block">
                <div class="result-header">
                  <span :class="singleResult.status === 'success' ? 'tag-success' : 'tag-fail'">
                    {{ singleResult.status === 'success' ? '✅ 成功' : '❌ 失败' }}
                  </span>
                  <span class="result-time">{{ singleResult.execution_time }}ms</span>
                </div>
                <template v-if="singleResult.execution_mode === 'single_stage'">
                  <pre class="output-pre">{{ JSON.stringify(singleResult.output, null, 2) }}</pre>
                </template>
                <template v-else>
                  <div v-for="(s2, i) in singleResult.stage2_outputs" :key="i" style="margin-bottom:8px;">
                    <div class="stage-label">{{ singleResult.stage2_outputs_with_messages?.[i]?.prompt_name || `Prompt ${i+1}` }}</div>
                    <pre class="output-pre">{{ JSON.stringify(s2.output, null, 2) }}</pre>
                  </div>
                </template>
                <div v-if="singleResult.error" class="error-text">{{ singleResult.error }}</div>
              </div>
            </el-tab-pane>

            <!-- 批量运行 -->
            <el-tab-pane label="批量运行" name="batch">
              <div class="run-block">
                <div class="section-label">选择用例范围</div>
                <el-checkbox v-model="runAllCases" style="margin-bottom:8px;">运行全部（{{ testCases.length }} 个）</el-checkbox>
                <div v-if="!runAllCases" style="margin-bottom:8px;">
                  <el-checkbox-group v-model="selectedCaseIds">
                    <el-checkbox v-for="tc in testCases" :key="tc.id" :value="tc.id" style="display:block; margin-bottom:4px;">{{ tc.name }}</el-checkbox>
                  </el-checkbox-group>
                </div>
                <el-button type="primary" @click="runBatch" :loading="batchRunning" style="width:100%;">▶ 开始批量运行</el-button>
              </div>

              <!-- 批量运行进度 -->
              <div v-if="batchResults.length > 0" class="batch-results">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                  <span style="font-weight:600;">运行结果（{{ batchResults.length }}）</span>
                  <el-tag :type="batchPassRate >= 0.8 ? 'success' : batchPassRate >= 0.6 ? 'warning' : 'danger'">
                    通过率 {{ (batchPassRate * 100).toFixed(0) }}%
                  </el-tag>
                </div>
                <div v-for="(r, i) in batchResults" :key="i" class="batch-item">
                  <span :class="r.status === 'success' ? 'tag-success' : 'tag-fail'" style="font-size:12px; margin-right:8px;">
                    {{ r.status === 'success' ? '✅' : '❌' }}
                  </span>
                  <span style="font-size:13px;">{{ r.testCaseName }}</span>
                  <span v-if="r.executionTime" style="font-size:11px; color:#999; margin-left:8px;">{{ r.executionTime }}ms</span>
                  <span v-if="r.error" style="font-size:11px; color:#f56c6c; margin-left:8px;">{{ r.error }}</span>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- 新建 Debugger 弹窗 -->
    <el-dialog v-model="showDebuggerDialog" title="新建调试配置" width="400px">
      <el-form :model="debuggerForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="debuggerForm.name" placeholder="调试配置名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="debuggerForm.description" placeholder="可选描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDebuggerDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateDebugger" :loading="saving">创建</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑测试用例弹窗 -->
    <el-dialog v-model="showCaseDialog" :title="editingCase?.id ? '编辑测试用例' : '新增测试用例'" width="600px">
      <el-form :model="caseForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="caseForm.name" placeholder="用例名称" />
        </el-form-item>
        <el-form-item label="输入数据">
          <el-input v-model="caseForm.testDataStr" type="textarea" :rows="8" placeholder='{"key": "value"}' />
          <div style="font-size:12px; color:#909399; margin-top:4px;">JSON 格式，可包含 expected 字段用于评估</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCaseDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveCase" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- LLM 设置弹窗 -->
    <el-dialog v-model="showSettingsDialog" title="LLM 配置" width="600px">
      <el-alert type="info" :closable="false" style="margin-bottom:16px;">
        配置你的 LLM API Key。Key 仅存在本地 localStorage，不会上传。
      </el-alert>
      <div v-for="(cfg, key) in llmConfigEdit" :key="key" class="llm-config-item">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:600;">{{ key }}</span>
          <el-button size="small" type="danger" text @click="removeLLMConfig(key)">删除</el-button>
        </div>
        <el-form :model="cfg" label-width="80px" size="small">
          <el-form-item label="Model ID">
            <el-input v-model="cfg.model" placeholder="e.g. gpt-4o" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="cfg.api_key" type="password" placeholder="sk-..." show-password />
          </el-form-item>
          <el-form-item label="Base URL">
            <el-input v-model="cfg.base_url" placeholder="https://api.openai.com" />
          </el-form-item>
        </el-form>
      </div>
      <el-button @click="addLLMConfig" size="small" style="margin-top:8px;">+ 添加模型配置</el-button>
      <template #footer>
        <el-button @click="showSettingsDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLLMSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDebuggerList, saveDebugger, deleteDebugger,
  getTestCases, saveTestCase, deleteTestCase, batchImportTestCases,
  saveHistory, saveEvaluationResult,
  type PromptDebugger, type DebugTestCase
} from '@/api/debugger'
import { chatLLM, getLLMConfig, saveLLMConfig, getModelList, type LLMConfig } from '@/api/llm'
import { useLocalConfig } from '@/composables/useLocalConfig'
import { ExecutorFactory, type ExecutionResult } from '@/executors'
import { evaluateSingleCase } from '@/lib/evaluator'
import EvaluationReport from '@/components/EvaluationReport.vue'

const { currentConfig, saveConfig, loadConfig, createDefaultConfig } = useLocalConfig()

// ── State ──────────────────────────────────────────────────────
const debuggerList = ref<PromptDebugger[]>([])
const currentDebuggerId = ref<string | null>(null)
const currentDebugger = ref<PromptDebugger | null>(null)
const activeTab = ref('prompt')
const runMode = ref('single')
const saving = ref(false)

const testCases = ref<DebugTestCase[]>([])

// Run state
const singleRunning = ref(false)
const batchRunning = ref(false)
const singleTestCaseId = ref<string | null>(null)
const customInputStr = ref('')
const singleResult = ref<ExecutionResult | null>(null)
const runAllCases = ref(true)
const selectedCaseIds = ref<string[]>([])
const batchResults = ref<any[]>([])

// Dialog state
const showDebuggerDialog = ref(false)
const showCaseDialog = ref(false)
const showSettingsDialog = ref(false)
const debuggerForm = ref({ name: '', description: '' })
const editingCase = ref<DebugTestCase | null>(null)
const caseForm = ref({ name: '', testDataStr: '{}' })

// LLM settings
const llmConfigEdit = ref<LLMConfig>({})
const modelList = ref<string[]>([])

// Import template
const showImportTemplate = ref(false)
const importTemplateStr = `[
  {
    "name": "用例名称（必填）",
    "description": "用例描述（可选）",
    "test_data": {
      "input": "传入 Prompt 的原始内容，可以是字符串或对象",
      "dimension": "可选，用于多维度评估场景",
      "expected": {
        "tier": "A",
        "score_min": 80,
        "score_max": 100,
        "reason_must_contain": ["关键词1", "关键词2"]
      }
    }
  },
  {
    "name": "第二个用例",
    "test_data": {
      "input": "另一条输入内容",
      "expected": {
        "tier": "B"
      }
    }
  }
]`

const downloadTemplate = () => {
  const blob = new Blob([importTemplateStr], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'test_cases_template.json'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Computed ───────────────────────────────────────────────────
const batchPassRate = computed(() => {
  if (!batchResults.value.length) return 0
  return batchResults.value.filter(r => r.status === 'success').length / batchResults.value.length
})

// ── Init ───────────────────────────────────────────────────────
onMounted(async () => {
  modelList.value = getModelList()
  await loadDebuggerList()
  llmConfigEdit.value = { ...getLLMConfig() }
})

const loadDebuggerList = async () => {
  try {
    debuggerList.value = await getDebuggerList()
    if (debuggerList.value.length && !currentDebuggerId.value) {
      await selectDebugger(debuggerList.value[0].id!)
    }
  } catch (e: any) { ElMessage.error('加载失败: ' + e.message) }
}

const selectDebugger = async (id: string) => {
  currentDebuggerId.value = id
  currentDebugger.value = debuggerList.value.find(d => d.id === id) || null
  if (!currentDebugger.value) return

  const db = currentDebugger.value
  let config = loadConfig(id)
  if (!config) {
    // 从数据库字段初始化 localConfig
    config = createDefaultConfig(id, db.prompt_type)
  }
  // 始终用数据库的 prompt 内容覆盖（保持同步）
  config.system_prompt = db.system_prompt ?? config.system_prompt
  config.user_prompt = db.user_prompt ?? config.user_prompt
  config.prompt_type = db.prompt_type
  if (db.type_config && Object.keys(db.type_config).length) {
    config.type_config = db.type_config
  }
  saveConfig(config)

  testCases.value = await getTestCases(id)
}

const handleDebuggerChange = async (id: string) => {
  await selectDebugger(id)
}

// ── Debugger CRUD ──────────────────────────────────────────────
const handleCreateDebugger = async () => {
  if (!debuggerForm.value.name.trim()) { ElMessage.warning('请输入名称'); return }
  saving.value = true
  try {
    const created = await saveDebugger({
      name: debuggerForm.value.name.trim(),
      description: debuggerForm.value.description,
      prompt_type: 'ai_prefill',
      system_prompt: '',
      user_prompt: '',
      model_config: { model: 'doubao-seed-2-0-pro-260215', temperature: 0.7 },
      type_config: { execution_mode: 'single_stage', stage2_prompts: [] }
    })
    debuggerList.value.unshift(created)
    showDebuggerDialog.value = false
    debuggerForm.value = { name: '', description: '' }
    await selectDebugger(created.id!)
    ElMessage.success('创建成功')
  } catch (e: any) { ElMessage.error(e.message) }
  finally { saving.value = false }
}

const handleDeleteDebugger = async () => {
  await ElMessageBox.confirm('确定删除该调试配置？所有关联数据将一并删除。', '删除确认', { type: 'warning' })
  await deleteDebugger(currentDebuggerId.value!)
  debuggerList.value = debuggerList.value.filter(d => d.id !== currentDebuggerId.value)
  currentDebuggerId.value = null
  currentDebugger.value = null
  if (debuggerList.value.length) await selectDebugger(debuggerList.value[0].id!)
  ElMessage.success('已删除')
}

const saveDebuggerConfig = async () => {
  if (!currentDebugger.value?.id) return
  try { await saveDebugger(currentDebugger.value) } catch (e: any) { ElMessage.error(e.message) }
}

// ── Prompt config ──────────────────────────────────────────────
const handleTypeChange = () => {
  if (!currentConfig.value) return
  if (currentConfig.value.prompt_type === 'ai_prefill') {
    currentConfig.value.type_config = { execution_mode: 'single_stage', stage2_prompts: [] }
  } else {
    currentConfig.value.type_config = { execution_mode: 'two_stage_parallel', stage2_prompts: [] }
  }
  saveCurrentConfig()
}

const saveCurrentConfig = async () => {
  if (!currentConfig.value || !currentDebugger.value) return
  saveConfig(currentConfig.value)
  // 同步 prompt 内容到数据库
  currentDebugger.value.system_prompt = currentConfig.value.system_prompt ?? ''
  currentDebugger.value.user_prompt = currentConfig.value.user_prompt ?? ''
  currentDebugger.value.prompt_type = currentConfig.value.prompt_type
  currentDebugger.value.type_config = currentConfig.value.type_config
  try { await saveDebugger(currentDebugger.value) } catch (e: any) { console.warn('自动保存失败', e.message) }
}

const addStage2Prompt = () => {
  if (!currentConfig.value?.type_config.stage2_prompts) currentConfig.value!.type_config.stage2_prompts = []
  currentConfig.value!.type_config.stage2_prompts.push({ id: crypto.randomUUID(), name: `Prompt ${currentConfig.value!.type_config.stage2_prompts.length + 1}`, system_prompt: '', user_prompt: '' })
  saveCurrentConfig()
}

const removeStage2Prompt = (idx: number) => {
  currentConfig.value!.type_config.stage2_prompts!.splice(idx, 1)
  saveCurrentConfig()
}

// ── Test cases ─────────────────────────────────────────────────
const editTestCase = (tc: DebugTestCase) => {
  editingCase.value = tc
  caseForm.value = { name: tc.name, testDataStr: JSON.stringify(tc.test_data, null, 2) }
  showCaseDialog.value = true
}

const handleSaveCase = async () => {
  if (!caseForm.value.name.trim()) { ElMessage.warning('请输入用例名称'); return }
  let testData: any
  try { testData = JSON.parse(caseForm.value.testDataStr) } catch { ElMessage.error('输入数据不是合法 JSON'); return }

  saving.value = true
  try {
    const tc: DebugTestCase = {
      ...(editingCase.value || {}),
      debugger_id: currentDebuggerId.value!,
      name: caseForm.value.name,
      test_data: testData,
      order: editingCase.value?.order ?? testCases.value.length
    }
    const saved = await saveTestCase(tc)
    if (editingCase.value?.id) {
      const idx = testCases.value.findIndex(t => t.id === saved.id)
      if (idx >= 0) testCases.value[idx] = saved
    } else {
      testCases.value.push(saved)
    }
    showCaseDialog.value = false
    editingCase.value = null
    ElMessage.success('保存成功')
  } catch (e: any) { ElMessage.error(e.message) }
  finally { saving.value = false }
}

const handleDeleteTestCase = async (id: string) => {
  await ElMessageBox.confirm('确定删除该测试用例？', '删除确认', { type: 'warning' })
  await deleteTestCase(id)
  testCases.value = testCases.value.filter(t => t.id !== id)
  ElMessage.success('已删除')
}

const handleImportCases = (file: File) => {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target!.result as string)
      const cases: DebugTestCase[] = (Array.isArray(data) ? data : [data]).map((item: any, i: number) => ({
        debugger_id: currentDebuggerId.value!,
        name: item.name || `用例 ${testCases.value.length + i + 1}`,
        description: item.description || '',
        test_data: item.test_data ?? item,
        order: testCases.value.length + i
      }))
      const saved = await batchImportTestCases(cases)
      testCases.value.push(...saved)
      ElMessage.success(`成功导入 ${saved.length} 个用例`)
    } catch (err: any) { ElMessage.error('导入失败: ' + err.message) }
  }
  reader.readAsText(file)
  return false
}

// ── Run single ─────────────────────────────────────────────────
const runSingle = async () => {
  if (!currentDebugger.value || !currentConfig.value) { ElMessage.error('请先选择调试配置'); return }

  let testCase: any = null
  if (singleTestCaseId.value) {
    testCase = testCases.value.find(t => t.id === singleTestCaseId.value)
  }
  let customInput: any = null
  if (customInputStr.value.trim()) {
    try { customInput = JSON.parse(customInputStr.value) } catch { ElMessage.error('自定义输入不是合法 JSON'); return }
  }
  if (!testCase && !customInput) { ElMessage.warning('请选择测试用例或填写自定义输入'); return }

  singleRunning.value = true
  singleResult.value = null

  try {
    const executor = ExecutorFactory.create(currentConfig.value.prompt_type, currentDebugger.value, currentConfig.value, testCase, customInput)
    const result = await executor.execute()
    singleResult.value = result

    // save history
    const outputStr = result.execution_mode === 'two_stage_parallel'
      ? JSON.stringify({ stage2: result.stage2_outputs }, null, 2)
      : JSON.stringify(result.output || {}, null, 2)

    await saveHistory({
      debugger_id: currentDebuggerId.value!,
      test_case_id: testCase?.id,
      run_config: { prompt_type: currentConfig.value.prompt_type, system_prompt: currentConfig.value.system_prompt, model: currentDebugger.value.model_config.model },
      input_data: testCase?.test_data ?? customInput,
      request_context: { stage1_messages: result.stage1_messages },
      output_result: outputStr,
      status: result.status,
      error_message: result.error,
      execution_time: result.execution_time || 0,
      token_usage: result.token_usage
    })
  } catch (e: any) { ElMessage.error(e.message) }
  finally { singleRunning.value = false }
}

// ── Run batch ──────────────────────────────────────────────────
const runBatch = async () => {
  if (!currentDebugger.value || !currentConfig.value) { ElMessage.error('请先选择调试配置'); return }

  const casesToRun = runAllCases.value
    ? testCases.value
    : testCases.value.filter(tc => selectedCaseIds.value.includes(tc.id!))

  if (casesToRun.length === 0) { ElMessage.warning('请选择要运行的测试用例'); return }

  batchRunning.value = true
  batchResults.value = []

  const batchRunId = crypto.randomUUID()

  for (const tc of casesToRun) {
    try {
      const executor = ExecutorFactory.create(currentConfig.value.prompt_type, currentDebugger.value, currentConfig.value, tc)
      const result = await executor.execute()

      const outputStr = result.execution_mode === 'two_stage_parallel'
        ? JSON.stringify({ stage2: result.stage2_outputs }, null, 2)
        : JSON.stringify(result.output || {}, null, 2)

      // save history
      const history = await saveHistory({
        debugger_id: currentDebuggerId.value!,
        test_case_id: tc.id,
        batch_run_id: batchRunId,
        run_config: { prompt_type: currentConfig.value.prompt_type, system_prompt: currentConfig.value.system_prompt, model: currentDebugger.value.model_config.model },
        input_data: tc.test_data,
        request_context: { stage1_messages: result.stage1_messages, stage2_outputs_with_messages: result.stage2_outputs_with_messages },
        output_result: outputStr,
        status: result.status,
        error_message: result.error,
        execution_time: result.execution_time || 0,
        token_usage: result.token_usage
      })

      // evaluate
      const evalResult = evaluateSingleCase(outputStr, tc.test_data)
      await saveEvaluationResult({
        history_id: history.id!,
        test_case_id: tc.id!,
        batch_run_id: batchRunId,
        debugger_id: currentDebuggerId.value!,
        tier_match: evalResult.tier_match ?? false,
        score_match: evalResult.score_match ?? false,
        reason_match: evalResult.reason_match ?? false,
        overall_pass: evalResult.overall_pass,
        pass_rate: evalResult.pass_rate,
        evaluation_details: evalResult,
        test_case_name: tc.name,
        test_data: tc.test_data,
        ai_output: outputStr
      })

      batchResults.value.push({ testCaseName: tc.name, status: result.error ? 'error' : 'success', error: result.error, executionTime: result.execution_time })
    } catch (e: any) {
      batchResults.value.push({ testCaseName: tc.name, status: 'error', error: e.message, executionTime: 0 })
    }
  }

  batchRunning.value = false
  ElMessage.success(`批量运行完成，通过率 ${(batchPassRate.value * 100).toFixed(0)}%`)
}

// ── LLM Settings ───────────────────────────────────────────────
const addLLMConfig = () => {
  const key = `model_${Date.now()}`
  llmConfigEdit.value[key] = { model: '', api_key: '', base_url: 'https://api.openai.com' }
}
const removeLLMConfig = (key: string) => { delete llmConfigEdit.value[key] }
const saveLLMSettings = () => {
  saveLLMConfig(llmConfigEdit.value)
  showSettingsDialog.value = false
  ElMessage.success('LLM 配置已保存')
}
</script>

<style scoped lang="scss">
.pd-layout { display: flex; flex-direction: column; height: 100vh; background: #f0f2f5; }

.pd-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: #fff; border-bottom: 1px solid #e4e7ed;
  .pd-title { font-size: 16px; font-weight: 700; color: #303133; }
}

.pd-empty { display: flex; align-items: center; justify-content: center; flex: 1; }

.pd-body {
  display: flex; flex: 1; overflow: hidden; gap: 0;
}

.pd-left {
  width: 520px; min-width: 420px; background: #fff; border-right: 1px solid #e4e7ed;
  overflow-y: auto; padding: 0;
  .config-section { padding: 16px; }
}

.pd-right { flex: 1; padding: 16px; overflow-y: auto; }

.section-block { margin-bottom: 20px; }
.section-label { font-size: 13px; font-weight: 600; color: #606266; margin-bottom: 6px; }
.hint { font-weight: 400; color: #909399; }

.stage2-block {
  border: 1px solid #e4e7ed; border-radius: 6px; padding: 12px; margin-bottom: 10px; background: #fafafa;
}

.run-section { h3 { margin: 0 0 12px; font-size: 15px; } }
.run-block { padding: 12px 0; }

.result-block {
  margin-top: 16px; border: 1px solid #e4e7ed; border-radius: 8px; padding: 12px;
}
.result-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.result-time { font-size: 12px; color: #909399; }

.output-pre {
  background: #f5f7fa; border-radius: 4px; padding: 10px; font-size: 12px;
  color: #606266; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
}
.stage-label { font-size: 12px; font-weight: 600; color: #409eff; margin-bottom: 4px; }
.error-text { color: #f56c6c; font-size: 13px; margin-top: 8px; }

.tag-success { color: #67c23a; font-weight: 600; }
.tag-fail { color: #f56c6c; font-weight: 600; }

.tc-item {
  border: 1px solid #e4e7ed; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px;
  &:hover { border-color: #409eff; }
}
.tc-header { display: flex; align-items: center; margin-bottom: 4px; }
.tc-index { font-weight: 700; color: #409eff; margin-right: 8px; font-size: 13px; }
.tc-name { flex: 1; font-size: 13px; font-weight: 500; }
.tc-preview { font-size: 11px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty-tip { color: #909399; font-size: 13px; text-align: center; padding: 24px 0; }

.batch-results { margin-top: 16px; }
.batch-item {
  padding: 8px 12px; border-radius: 4px; margin-bottom: 4px; background: #f5f7fa;
  display: flex; align-items: center;
}

.llm-config-item { border: 1px solid #e4e7ed; border-radius: 6px; padding: 12px; margin-bottom: 12px; }

.import-template-block {
  background: #f8f9ff; border: 1px solid #d0d7f5; border-radius: 8px;
  padding: 14px 16px; margin-bottom: 16px;
}
.template-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px;
}
.template-desc { font-size: 12px; color: #606266; margin-bottom: 8px; }
.template-pre {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 4px;
  padding: 12px; font-size: 12px; color: #303133; line-height: 1.7;
  overflow-x: auto; white-space: pre; margin-bottom: 12px;
  max-height: 260px; overflow-y: auto;
}
.template-fields { display: flex; flex-direction: column; gap: 5px; }
.field-row {
  display: flex; align-items: baseline; gap: 10px; font-size: 12px;
}
.field-key {
  background: #eef0ff; color: #5c6bc0; border-radius: 3px;
  padding: 1px 6px; font-family: monospace; white-space: nowrap; min-width: 180px;
}
.field-desc { color: #606266; code { background: #f0f0f0; padding: 0 4px; border-radius: 3px; font-size: 11px; } }
</style>
