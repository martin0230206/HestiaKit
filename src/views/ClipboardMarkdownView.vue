<script setup lang="ts">
import { CheckIcon, ClipboardIcon, FileTextIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useClipboardMarkdown } from '@/composables/useClipboardMarkdown'

const {
  clearSource,
  copyOutput,
  copyState,
  handleManualInput,
  handlePaste,
  inputMode,
  inputStats,
  isValid,
  issue,
  loadSample,
  output,
  outputStats,
  pasteState,
  source,
  statusLabel,
} = useClipboardMarkdown()
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">剪貼簿轉 Markdown</h1>
      <p class="text-sm text-muted-foreground">貼上網頁或純文字，在瀏覽器內轉成乾淨的 Markdown。</p>
    </header>

    <Card>
      <CardContent class="flex flex-wrap items-center gap-2 px-4 sm:px-5">
        <Button variant="outline" @click="loadSample">
          <SparklesIcon data-icon="inline-start" />
          載入範例
        </Button>
        <Button variant="destructive" :disabled="!source" @click="clearSource">
          <Trash2Icon data-icon="inline-start" />
          清空
        </Button>
        <Button class="ml-auto" :disabled="!output || !isValid" @click="copyOutput">
          <CheckIcon v-if="copyState === 'copied'" data-icon="inline-start" />
          <ClipboardIcon v-else data-icon="inline-start" />
          {{ copyState === 'copied' ? '已複製' : '複製 Markdown' }}
        </Button>
      </CardContent>
    </Card>

    <div class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <main class="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card class="min-w-0">
          <CardHeader class="border-b px-4 pb-4 sm:px-5">
            <CardTitle>來源</CardTitle>
            <CardDescription>可直接貼上含格式的網頁內容。</CardDescription>
            <CardAction>
              <Badge variant="outline">
                <FileTextIcon />
                {{ inputMode === 'html' ? 'HTML' : 'Text' }}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent class="grid gap-4 px-4 sm:px-5">
            <Textarea
              v-model="source"
              class="min-h-80 resize-y field-sizing-fixed leading-relaxed"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="來源內容"
              @input="handleManualInput"
              @paste="handlePaste"
            />
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">行數</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ inputStats.lines }}</dd>
              </div>
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">字元</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ inputStats.characters }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card class="min-w-0">
          <CardHeader class="border-b px-4 pb-4 sm:px-5">
            <CardTitle>Markdown</CardTitle>
            <CardDescription>轉換結果會隨來源內容更新。</CardDescription>
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
              aria-label="Markdown 輸出內容"
            />
            <dl class="grid grid-cols-3 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">行數</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.lines }}</dd>
              </div>
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">字數</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.words }}</dd>
              </div>
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">字元</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.characters }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </main>

      <aside class="grid content-start gap-5" aria-label="轉換狀態">
        <Card>
          <CardHeader class="border-b px-4 pb-4">
            <CardTitle>轉換狀態</CardTitle>
            <CardAction><Badge :variant="isValid ? 'default' : 'destructive'">{{ statusLabel }}</Badge></CardAction>
          </CardHeader>
          <CardContent class="px-4">
            <dl class="grid gap-4 text-sm">
              <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">來源</dt><dd class="font-medium">{{ pasteState === 'html' ? 'HTML' : pasteState === 'plain' ? '純文字' : pasteState === 'empty' ? '空白' : '手動' }}</dd></div>
              <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">處理方式</dt><dd class="font-medium">{{ inputMode === 'html' ? 'HTML' : '純文字' }}</dd></div>
              <div class="flex items-center justify-between gap-3"><dt class="text-muted-foreground">輸出字元</dt><dd class="font-mono font-semibold">{{ outputStats.characters }}</dd></div>
            </dl>
            <p v-if="issue" class="mt-4 text-sm text-destructive">{{ issue }}</p>
            <p v-if="copyState === 'failed'" class="mt-4 text-sm text-destructive">無法存取剪貼簿，請手動選取輸出內容複製。</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </section>
</template>
