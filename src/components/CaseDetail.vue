<template>
  <div class="case-detail">
    <!-- 实际发给模型的 messages -->
    <div class="section">
      <h4>📤 实际发送给模型的 Input</h4>
      <div v-if="caseData.stage1_messages?.length">
        <div v-for="(msg, i) in caseData.stage1_messages" :key="i" class="msg-block">
          <div class="msg-role">{{ msg.role }}</div>
          <pre class="json-pre">{{ msg.content }}</pre>
        </div>
      </div>
      <div v-else class="empty-tip">无 messages 记录（旧数据）</div>
    </div>

    <!-- AI 输出 -->
    <div class="section">
      <h4>🤖 AI 输出</h4>
      <pre class="json-pre">{{ caseData.ai_output || '无输出' }}</pre>
    </div>

    <!-- 预期结果 -->
    <div class="section">
      <h4>🎯 预期结果（Expected）</h4>
      <pre class="json-pre">{{ JSON.stringify(caseData.test_data?.expected ?? '无预期数据', null, 2) }}</pre>
    </div>

    <!-- 评估结果 -->
    <div class="section">
      <h4>📊 评估结果</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="总体">
          <el-tag :type="caseData.overall_pass ? 'success' : 'danger'" size="small">{{ caseData.overall_pass ? '✅ 通过' : '❌ 失败' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="档位">
          <el-tag :type="caseData.tier_match ? 'success' : 'danger'" size="small">{{ caseData.tier_match ? '✅' : '❌' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <div v-if="caseData.evaluation_details?.error" class="error-text" style="margin-top:8px;">
        错误：{{ caseData.evaluation_details.error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ caseData: any }>()
</script>

<style scoped lang="scss">
.case-detail { padding: 10px 0; }
.section { margin-bottom: 16px; h4 { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #ebeef5; } }
.json-pre { background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 4px; padding: 10px; font-size: 12px; color: #606266; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; margin: 0; }
.msg-block { margin-bottom: 8px; }
.msg-role { font-size: 11px; font-weight: 700; color: #909399; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
.empty-tip { color: #909399; font-size: 12px; }
.error-text { color: #f56c6c; font-size: 12px; }
</style>
