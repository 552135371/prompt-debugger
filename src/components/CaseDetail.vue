<template>
  <div class="case-detail">
    <div class="section">
      <h4>📥 测试输入数据</h4>
      <pre class="json-pre">{{ JSON.stringify(caseData.test_data, null, 2) }}</pre>
    </div>
    <div class="section">
      <h4>🤖 AI 输出</h4>
      <pre class="json-pre">{{ caseData.ai_output || '无输出' }}</pre>
    </div>
    <div class="section">
      <h4>📊 评估结果</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="总体">
          <el-tag :type="caseData.overall_pass ? 'success' : 'danger'" size="small">{{ caseData.overall_pass ? '✅ 通过' : '❌ 失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="档位">
          <el-tag :type="caseData.tier_match ? 'success' : 'danger'" size="small">{{ caseData.tier_match ? '✅' : '❌' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="分数">
          <el-tag :type="caseData.score_match ? 'success' : 'danger'" size="small">{{ caseData.score_match ? '✅' : '❌' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="原因">
          <el-tag :type="caseData.reason_match ? 'success' : 'danger'" size="small">{{ caseData.reason_match ? '✅' : '❌' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ caseData: any }>()
</script>

<style scoped lang="scss">
.case-detail { padding: 10px 0; }
.section { margin-bottom: 16px; h4 { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ebeef5; } }
.json-pre { background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px; padding: 10px; font-size: 12px; color: #606266; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }
</style>
