<script setup lang="ts">
import { CheckIcon, ClipboardIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import SwitchControl from '@/components/forms/SwitchControl.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useDuplicateItems } from '@/composables/useDuplicateItems'

const {
  clearSource,
  copyOutput,
  copyState,
  ignoreCase,
  ignoreEmptyItems,
  loadSample,
  output,
  outputStats,
  source,
  sourceStats,
  stats,
  statusLabel,
  trimItems,
} = useDuplicateItems()
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">去除重複項目</h1>
      <p class="text-sm text-muted-foreground">逐行整理清單，保留第一次出現的項目。</p>
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
        <Button class="ml-auto" :disabled="!output" @click="copyOutput">
          <CheckIcon v-if="copyState === 'copied'" data-icon="inline-start" />
          <ClipboardIcon v-else data-icon="inline-start" />
          {{ copyState === 'copied' ? '已複製' : '複製結果' }}
        </Button>
      </CardContent>
    </Card>

    <div class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <main class="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card class="min-w-0">
          <CardHeader class="border-b px-4 pb-4 sm:px-5">
            <CardTitle>項目清單</CardTitle>
            <CardDescription>每行輸入一筆項目。</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4 px-4 sm:px-5">
            <Textarea
              v-model="source"
              class="min-h-80 resize-y field-sizing-fixed font-mono leading-relaxed"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="off"
              aria-label="輸入項目，每行一筆"
            />
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">項目</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ sourceStats.items }}</dd>
              </div>
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">字元</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ sourceStats.characters }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card class="min-w-0">
          <CardHeader class="flex-row items-start justify-between gap-3 border-b px-4 pb-4 sm:px-5">
            <div class="space-y-1.5">
              <CardTitle>唯一項目</CardTitle>
              <CardDescription>依原始順序輸出去重結果。</CardDescription>
            </div>
            <Button size="icon" :disabled="!output" aria-label="複製結果" @click="copyOutput">
              <CheckIcon v-if="copyState === 'copied'" />
              <ClipboardIcon v-else />
            </Button>
          </CardHeader>
          <CardContent class="grid gap-4 px-4 sm:px-5">
            <Textarea
              :model-value="output"
              class="min-h-80 resize-y field-sizing-fixed font-mono leading-relaxed"
              readonly
              spellcheck="false"
              aria-label="去重後項目"
            />
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">項目</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.items }}</dd>
              </div>
              <div class="rounded-lg bg-muted/50 p-3">
                <dt class="text-muted-foreground">字元</dt>
                <dd class="mt-1 font-mono text-base font-semibold">{{ outputStats.characters }}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </main>

      <aside class="grid content-start gap-5" aria-label="去重設定">
        <Card>
          <CardHeader class="border-b px-4 pb-4">
            <div class="flex items-center justify-between gap-3">
              <CardTitle>比對設定</CardTitle>
              <Badge :variant="source ? 'default' : 'secondary'">{{ statusLabel }}</Badge>
            </div>
          </CardHeader>
          <CardContent class="grid gap-3 px-4">
            <SwitchControl v-model="trimItems" label="修剪空白" description="移除每列前後空白再比對" />
            <SwitchControl v-model="ignoreEmptyItems" label="忽略空白列" description="空白項目不輸出" />
            <SwitchControl v-model="ignoreCase" label="不分大小寫" description="Apple 與 apple 視為相同" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="border-b px-4 pb-4">
            <CardTitle>處理摘要</CardTitle>
          </CardHeader>
          <CardContent class="px-4">
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div><dt class="text-muted-foreground">原始項目</dt><dd class="font-mono font-semibold">{{ stats.sourceItems }}</dd></div>
              <div><dt class="text-muted-foreground">唯一項目</dt><dd class="font-mono font-semibold">{{ stats.outputItems }}</dd></div>
              <div><dt class="text-muted-foreground">重複項目</dt><dd class="font-mono font-semibold">{{ stats.duplicateItems }}</dd></div>
              <div><dt class="text-muted-foreground">略過空白</dt><dd class="font-mono font-semibold">{{ stats.skippedEmptyItems }}</dd></div>
            </dl>
            <p v-if="copyState === 'failed'" class="mt-4 text-sm text-destructive">
              無法存取剪貼簿，請手動選取輸出內容複製。
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </section>
</template>
