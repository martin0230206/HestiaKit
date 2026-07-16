<script setup lang="ts">
import {
  ArrowLeftRightIcon,
  CheckIcon,
  CircleHelpIcon,
  ClipboardIcon,
  SaveIcon,
} from '@lucide/vue'
import Base64HistoryDrawer from '@/components/base64/Base64HistoryDrawer.vue'
import SegmentedControl from '@/components/forms/SegmentedControl.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBase64 } from '@/composables/useBase64'

const {
  alphabet,
  base64AlphabetOptions,
  base64OperationOptions,
  clearHistory,
  clearSource,
  copyOutput,
  copyState,
  deleteHistoryRecord,
  history,
  historyState,
  isValid,
  issue,
  loadHistoryRecord,
  operation,
  output,
  outputStats,
  saveHistoryRecord,
  source,
  sourceStats,
  swapInputOutput,
} = useBase64()
</script>

<template>
  <section class="mx-auto grid w-full max-w-7xl gap-5">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Base64 編碼／解碼</h1>
      <p class="text-sm text-muted-foreground">即時轉換標準或 URL-safe Base64，內容只在瀏覽器內處理。</p>
    </header>

    <Card>
      <CardContent class="grid gap-5 px-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div class="grid gap-4 sm:grid-cols-2">
          <SegmentedControl v-model="operation" label="操作" :options="base64OperationOptions" />
          <div class="flex items-end gap-2">
            <div class="min-w-0 flex-1">
              <SegmentedControl v-model="alphabet" label="格式" :options="base64AlphabetOptions" />
            </div>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="outline" size="icon-lg" aria-label="格式說明">
                  <CircleHelpIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent class="max-w-72 leading-relaxed">
                標準格式適合一般資料交換；URL-safe 會以 - 和 _ 取代 + 和 /，並省略尾端 =。
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <Badge :variant="isValid ? 'secondary' : 'destructive'">
            <span class="size-1.5 rounded-full" :class="isValid ? 'bg-emerald-500' : 'bg-destructive'"></span>
            {{ isValid ? '可轉換' : issue }}
          </Badge>
          <Button :disabled="!isValid" @click="saveHistoryRecord">
            <SaveIcon />
            記錄本次
          </Button>
        </div>

        <div v-if="copyState === 'failed' || historyState !== 'idle'" class="md:col-span-2" aria-live="polite">
          <p v-if="copyState === 'failed'" class="text-sm text-destructive">無法存取剪貼簿，請手動選取輸出內容複製。</p>
          <p v-if="historyState === 'saved'" class="text-sm text-muted-foreground">已加入紀錄。</p>
          <p v-if="historyState === 'duplicate'" class="text-sm text-muted-foreground">已移到紀錄最上方。</p>
          <p v-if="historyState === 'empty'" class="text-sm text-destructive">沒有可記錄的內容。</p>
          <p v-if="historyState === 'invalid'" class="text-sm text-destructive">請先修正輸入內容。</p>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-5 lg:grid-cols-2" aria-label="Base64 編碼與解碼">
      <Card class="min-w-0">
        <CardHeader class="border-b px-4 pb-4 sm:px-5">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Input</p>
            <CardTitle class="mt-1">輸入</CardTitle>
          </div>
          <CardAction>
            <Button variant="outline" :disabled="!source" @click="clearSource">清空</Button>
          </CardAction>
        </CardHeader>
        <CardContent class="grid gap-4 px-4 sm:px-5">
          <Textarea
            v-model="source"
            class="min-h-80 resize-y field-sizing-fixed font-mono leading-relaxed"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            aria-label="Base64 輸入內容"
          />
          <dl class="flex gap-6 text-xs text-muted-foreground">
            <div class="flex gap-2"><dt>字元</dt><dd class="font-mono text-foreground">{{ sourceStats.characters }}</dd></div>
            <div class="flex gap-2"><dt>位元組</dt><dd class="font-mono text-foreground">{{ sourceStats.bytes }}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card class="min-w-0">
        <CardHeader class="border-b px-4 pb-4 sm:px-5">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Output</p>
            <CardTitle class="mt-1">輸出</CardTitle>
          </div>
          <CardAction class="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="交換輸入與輸出"
              title="交換輸入與輸出"
              :disabled="!output || !isValid"
              @click="swapInputOutput"
            >
              <ArrowLeftRightIcon />
            </Button>
            <Button
              size="icon"
              aria-label="複製輸出"
              :title="copyState === 'copied' ? '已複製' : '複製輸出'"
              :disabled="!output || !isValid"
              @click="copyOutput"
            >
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
            aria-label="Base64 輸出內容"
          />
          <dl class="flex gap-6 text-xs text-muted-foreground">
            <div class="flex gap-2"><dt>字元</dt><dd class="font-mono text-foreground">{{ outputStats.characters }}</dd></div>
            <div class="flex gap-2"><dt>位元組</dt><dd class="font-mono text-foreground">{{ outputStats.bytes }}</dd></div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <Base64HistoryDrawer
      :history="history"
      @clear="clearHistory"
      @delete="deleteHistoryRecord"
      @load="loadHistoryRecord"
    />
  </section>
</template>
