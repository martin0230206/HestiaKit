<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, ClipboardIcon, SparklesIcon, TablePropertiesIcon, Trash2Icon } from '@lucide/vue'
import SegmentedControl from '@/components/forms/SegmentedControl.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useJsonMarkdownTable } from '@/composables/useJsonMarkdownTable'

const {
  clearSource,
  copyOutput,
  copyState,
  inputStats,
  isValid,
  issue,
  loadSample,
  mode,
  modeOptions,
  output,
  outputStats,
  source,
  statusLabel,
  tableStats,
} = useJsonMarkdownTable()

function formatIssueLocation(issueValue: { line?: number; column?: number } | undefined) {
  if (!issueValue?.line || !issueValue.column) {
    return ''
  }

  return `第 ${issueValue.line} 行，第 ${issueValue.column} 欄`
}

const issueLocation = computed(() => formatIssueLocation(issue.value))
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">JSON 轉 Markdown 表格</h1>
      <p class="text-sm text-muted-foreground">將物件陣列轉成可直接貼入文件的 Markdown 表格。</p>
    </header>

    <Card>
      <CardContent class="grid gap-4 px-4 sm:grid-cols-[auto_minmax(18rem,28rem)] sm:items-end sm:px-5">
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" @click="loadSample">
            <SparklesIcon data-icon="inline-start" />
            載入範例
          </Button>
          <Button variant="destructive" :disabled="!source" @click="clearSource">
            <Trash2Icon data-icon="inline-start" />
            清空
          </Button>
          <Button :disabled="!output || !isValid" @click="copyOutput">
            <CheckIcon v-if="copyState === 'copied'" data-icon="inline-start" />
            <ClipboardIcon v-else data-icon="inline-start" />
            {{ copyState === 'copied' ? '已複製' : '複製 Markdown' }}
          </Button>
        </div>
        <SegmentedControl v-model="mode" label="轉換模式" :options="modeOptions" />
      </CardContent>
    </Card>

    <div class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <main class="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card class="min-w-0">
          <CardHeader class="border-b px-4 pb-4 sm:px-5">
            <CardTitle>JSON</CardTitle>
            <CardDescription>貼上物件或物件陣列。</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 px-4 sm:px-5">
            <Textarea
              v-model="source"
              class="min-h-80 resize-y field-sizing-fixed font-mono leading-relaxed"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="JSON 輸入內容"
            />
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">行數</dt><dd class="mt-1 font-mono text-base font-semibold">{{ inputStats.lines }}</dd></div>
              <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">字元</dt><dd class="mt-1 font-mono text-base font-semibold">{{ inputStats.characters }}</dd></div>
            </dl>
          </CardContent>
        </Card>

        <Card class="min-w-0">
          <CardHeader class="border-b px-4 pb-4 sm:px-5">
            <CardTitle>Markdown 表格</CardTitle>
            <CardDescription>特殊字元與換行會自動處理。</CardDescription>
            <CardAction>
              <Button size="icon" :disabled="!output || !isValid" aria-label="複製 Markdown" @click="copyOutput">
                <CheckIcon v-if="copyState === 'copied'" />
                <ClipboardIcon v-else />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent class="grid gap-4 px-4 sm:px-5">
            <Textarea
              :model-value="output"
              class="min-h-80 resize-y field-sizing-fixed font-mono leading-relaxed"
              readonly
              spellcheck="false"
              aria-label="Markdown 表格輸出內容"
            />
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">行數</dt><dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.lines }}</dd></div>
              <div class="rounded-lg bg-muted/50 p-3"><dt class="text-muted-foreground">字元</dt><dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.characters }}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </main>

      <aside class="grid content-start gap-5" aria-label="轉換狀態">
        <Card>
          <CardHeader class="border-b px-4 pb-4">
            <CardTitle>表格摘要</CardTitle>
            <CardAction>
              <Badge :variant="isValid ? 'default' : 'destructive'">
                <TablePropertiesIcon />
                {{ statusLabel }}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent class="px-4">
            <dl class="grid gap-4 text-sm">
              <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">欄數</dt><dd class="font-mono font-semibold">{{ tableStats.columns }}</dd></div>
              <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">資料列</dt><dd class="font-mono font-semibold">{{ tableStats.rows }}</dd></div>
              <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">輸出字元</dt><dd class="font-mono font-semibold">{{ outputStats.characters }}</dd></div>
            </dl>
            <p v-if="issue" class="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {{ issueLocation || issue.message }}
            </p>
            <p v-if="copyState === 'failed'" class="mt-4 text-sm text-destructive">無法存取剪貼簿，請手動選取輸出內容複製。</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </section>
</template>
