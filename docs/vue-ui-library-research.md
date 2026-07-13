# HestiaKit Vue UI 元件方案研究

> 查核日期：2026-07-13（Asia/Taipei）
> 範圍：只引用官方文件、官方 GitHub、官方 LICENSE 與官方套件 metadata；版本與 GitHub 數字是查核當日快照。

## 結論

如果目標是「直接換掉現有 UI，保留所有既有功能，並明顯改善視覺」，首選 **shadcn-vue**；如果希望使用一般 npm 元件庫、由上游統一維護元件實作，首選改為 **Naive UI**。

本研究的建議順位如下：

1. **首選：shadcn-vue** — 最符合「現成、好看、可整套替換」；元件原始碼會進入專案，視覺與 DOM 都能自行掌控。
2. **備選：Naive UI** — 90+ 元件、Vue 3/TypeScript 原生、主題完整，整合成本比完整框架低。
3. **次備選：Element Plus** — 元件覆蓋很完整且穩定，但視覺較偏企業後台，主題與按需樣式設定較繁複。
4. **條件式選擇：Vuetify** — 適合明確想採 Material Design 與完整應用骨架的情況。
5. **不建議本案採用：Quasar、Reka UI 單獨使用、PrimeVue 4/5** — 原因分別是框架範圍過大、沒有現成視覺、以及授權／維護路線風險。

這裡的「首選 shadcn-vue」不是認為它在所有面向都勝出，而是本次需求的首要問題是視覺品質，且已允許全面替換。若團隊更重視「少維護一份元件原始碼」，Naive UI 是更保守的工程選擇。

## HestiaKit 現況與選型權重

HestiaKit 是 Vue 3.5、Vite 8、TypeScript 6 的純前端 GitHub Pages 工具箱。現有八個工具 View、側欄、主題切換、三個共用表單控制與 JSON 樹狀編輯器。多數 View 內含大量 scoped CSS，最大的單一 View 已超過 800 行，因此問題不只是換掉幾顆按鈕，而是建立一致的應用骨架、表單、工具列、狀態面板與 responsive 規則。

本案評估權重：

- 現成視覺與整套替換能力：30%
- 既有功能所需元件覆蓋：20%
- Vue 3／Vite／TypeScript 整合：15%
- 亮暗色與現有 accent 主題可遷移性：15%
- 免費授權與長期維護可預期性：15%
- bundle 與純前端定位：5%

SSR 對目前的靜態 SPA 不是決策關鍵，但仍列入技術查核，避免未來架構改變時踩坑。

## 快速比較

| 候選 | 免費授權（截至查核日） | Vue 3 / Vite / TS | 視覺模式與主題 | 選用內容控制 | HestiaKit 全面替換適合度 | 判斷 |
|---|---|---|---|---|---|---|
| **shadcn-vue** | MIT | 官方 Vite + `vue-ts` 流程；Tailwind CSS 4 | 有完整預設外觀；CSS variables、亮暗色、sidebar tokens | CLI 只加入選用元件，不是傳統 tree-shaking | **高** | **首選** |
| **Naive UI** | MIT；Result 圖形另為 CC-BY 4.0 | Vue 3 peer、完整 TS；Vite 專案可直接用 | type-safe JS theme；不需全域 CSS import；非 unstyled | 90+ 元件皆可 tree-shake，package `sideEffects: false` | **高** | **備選** |
| **Element Plus** | MIT | Vue 3 / TS；官方 Vite 按需方案 | BEM + Sass / CSS variables；官方 dark CSS vars | ESM tree-shaking；按需樣式通常需額外 plugin | **中高** | 次備選 |
| **Vuetify** | MIT | Vue 3；官方 Vite/TS scaffold 與 Vite plugin | Material Design；theme、Sass、blueprints | Vite plugin 自動 tree-shaking | **中** | 只在想要 Material 時選 |
| **Quasar** | MIT | Vue 3；Quasar CLI with Vite 或既有 Vite plugin；TS | Material 風格；Sass variables、Dark plugin | CLI / Vite plugin 支援 tree-shaking | **中低** | 對純網站工具箱過度完整 |
| **Reka UI** | MIT | Vue >= 3.4；TS；官方 Vite resolver | 完全 unstyled、headless；任何 CSS 方案 | `sideEffects: false`，官方宣稱 tree-shakeable | **低（單獨用）** | 不會直接讓 UI 變好看 |
| **PrimeVue 5 RC** | PrimeUI Community / Commercial，**不是 MIT** | Vite、TS、逐元件 import | styled / unstyled、design tokens、Pass Through | tree-shakeable | 技術高、治理低 | **不建議** |
| **PrimeVue 4.5.5** | MIT | Vue 3 / Vite / TS | styled / unstyled、design tokens | 逐元件 import | 短期可用 | 官方 repo 已封存，不作新導入 |

來源：

- shadcn-vue：[定位與 code ownership](https://www.shadcn-vue.com/docs/introduction)、[Vite 安裝](https://www.shadcn-vue.com/docs/installation/vite)、[主題](https://www.shadcn-vue.com/docs/theming)、[元件清單](https://www.shadcn-vue.com/docs/components)、[MIT LICENSE](https://github.com/unovue/shadcn-vue/blob/dev/LICENSE)
- Naive UI：[官方 GitHub README、功能與授權](https://github.com/tusen-ai/naive-ui)、[package metadata](https://raw.githubusercontent.com/tusen-ai/naive-ui/main/package.json)
- Element Plus：[快速開始與 tree-shaking](https://element-plus.org/en-US/guide/quickstart)、[主題](https://element-plus.org/en-US/guide/theming)、[暗色模式](https://element-plus.org/en-US/guide/dark-mode)、[元件總覽](https://element-plus.org/en-US/component/overview)、[MIT LICENSE](https://github.com/element-plus/element-plus/blob/dev/LICENSE)
- Vuetify：[官方安裝](https://vuetifyjs.com/en/getting-started/installation/)、[tree-shaking](https://vuetifyjs.com/en/features/treeshaking/)、[官方 GitHub 與 MIT 授權](https://github.com/vuetifyjs/vuetify)
- Quasar：[方案比較](https://quasar.dev/start/pick-quasar-flavour/)、[既有 Vite 專案 plugin](https://quasar.dev/start/vite-plugin/)、[暗色模式](https://quasar.dev/style/dark-mode/)、[官方 GitHub 與 MIT 授權](https://github.com/quasarframework/quasar)
- Reka UI：[定位](https://www.reka-ui.com/docs/overview/introduction)、[安裝](https://reka-ui.com/docs/overview/installation)、[樣式](https://reka-ui.com/docs/guides/styling)、[無障礙](https://reka-ui.com/docs/overview/accessibility)、[MIT LICENSE](https://github.com/unovue/reka-ui/blob/v2/LICENSE)
- PrimeVue：[v5 Vite 安裝與 license key](https://primevue.dev/vite)、[v5 設定](https://primevue.dev/configuration/)、[PrimeUI Community License](https://primeui.dev/licenses/community)、[PrimeUI 定價](https://primeui.dev/pricing)、[v4 GitHub releases 與封存狀態](https://github.com/primefaces/primevue/releases)

## 候選詳評

### 1. shadcn-vue：首選

**為什麼適合**

- 官方明確將它定位為「不是傳統 component library，而是建立自己 component library 的方式」；CLI 把實際 Vue 元件加入專案，因此可以直接修改外觀、結構與行為，不需要與第三方 CSS specificity 對抗。[官方介紹](https://www.shadcn-vue.com/docs/introduction)
- 元件清單包含 Sidebar、Button、Button Group、Card、Input、Textarea、Switch、Slider、Tabs、Toggle Group、Tooltip、Sheet、Table、Field、Drawer 等，已覆蓋 HestiaKit 的主要共通 UI。[官方元件清單](https://www.shadcn-vue.com/docs/components)
- 主題採 semantic CSS variables，已有 background、card、popover、primary、muted、accent、border、input、ring，以及 sidebar 專用 tokens；非常適合把現有 `theme.css` 的色彩語意映射過去。[官方主題](https://www.shadcn-vue.com/docs/theming)
- 官方 Vite 流程以 Vue TypeScript template、Tailwind CSS 4 與 `vite.config.ts` 為基準。[Vite 安裝](https://www.shadcn-vue.com/docs/installation/vite)
- 使用 MIT 授權。[LICENSE](https://github.com/unovue/shadcn-vue/blob/dev/LICENSE)

**代價與風險**

- 會引入 Tailwind CSS 4 與其 Vite plugin，這是本案最大的工具鏈變動。
- code ownership 代表元件更新不是單純升級 npm 套件；專案必須維護加入的元件原始碼，也要審查 CLI 更新造成的 diff。
- shadcn-vue 提供的是 UI 層，不會取代 JSON parser、CSV 轉換、clipboard、localStorage 等 composable / utils。這其實符合 HestiaKit 分層，但全面替換時必須刻意保持事件與狀態契約。
- JSON 樹狀「可直接編輯 key / type / value、增刪節點」是專案專屬工作台，不應硬換成一般 Tree。保留 `JsonTreeNode.vue` 的資料行為，改用 shadcn-vue 的 Input、Textarea、Button、Collapsible / Toggle 樣式即可。

**維護狀態**

- 官方 GitHub 約 10.3k stars；最新可核實 release 為 `v2.7.4`（2026-06-03）。[GitHub](https://github.com/unovue/shadcn-vue)、[Releases](https://github.com/unovue/shadcn-vue/releases)

### 2. Naive UI：最穩健的傳統元件庫備選

**為什麼適合**

- 官方列出 90+ components、全部可 tree-shake、以 TypeScript 撰寫，且不需另外 import CSS。[官方 README](https://github.com/tusen-ai/naive-ui)
- type-safe theme overrides 很適合從 `useTheme` 產生 light / dark 與 accent override；不像 shadcn-vue，不需把每個元件實作放進 repo。
- package metadata 顯示 Vue peer dependency `^3.0.0`、ES module、types、`sideEffects: false`，與本案 Vue 3.5 / Vite / TS 相容。[package.json](https://raw.githubusercontent.com/tusen-ai/naive-ui/main/package.json)
- Button、Input、Switch、Slider、Tabs、Menu、Layout、Card、DataTable、Tree、Tooltip、Drawer、Scrollbar 等覆蓋充足，適合工具型介面。
- MIT 授權；但若使用 Result component 的 Twemoji 圖形資源，官方特別註明圖形為 CC-BY 4.0。HestiaKit 不需要該元件即可避開額外 attribution。[官方 README](https://github.com/tusen-ai/naive-ui)

**代價與風險**

- 不是 unstyled；深度客製仍須透過 theme overrides 與局部樣式，DOM 控制不如 shadcn-vue。
- 預設視覺偏中性應用／後台。它能大幅改善一致性，但若真正問題是資訊架構，仍需同步重排頁面，不是換元件就會自動解決。
- 元件有自己的 runtime dependencies（日期、CSS render、utility packages）；應以實際 production build 比較 bundle，而非只看套件宣稱。

**維護狀態**

- 官方站與 package metadata 顯示 `2.44.1`；GitHub 約 18.4k stars。專案不以 GitHub Releases 發版，最新 tag 為 `v2.44.1`（2026-03-08），但 `main` 至 2026-07-02 仍有功能、修正與測試 commit，不能因 tag 較舊就推論停更。[官方站](https://www.naiveui.com/)、[Tags](https://github.com/tusen-ai/naive-ui/tags)、[Commits](https://github.com/tusen-ai/naive-ui/commits/main/)

### 3. Element Plus：元件覆蓋最直觀的次備選

**優點**

- Vue 3 專用且 MIT；官方元件總覽包含 Segmented、Slider、Switch、Input / Textarea、Table、Tree、Menu、Drawer、Tooltip、Layout 等，本案需要的控制項大多有直接對應。[元件總覽](https://element-plus.org/en-US/component/overview)、[GitHub](https://github.com/element-plus/element-plus)
- ES module 可 tree-shake；官方提供全量、auto import 與手動 import 三種方式。[快速開始](https://element-plus.org/en-US/guide/quickstart)
- 主題支援 Sass 與 CSS variables，暗色模式也以 `html.dark` 與 CSS vars 啟用，能與目前 `data-theme` 邏輯對接，但需選定單一主題 selector 規格。[主題](https://element-plus.org/en-US/guide/theming)、[暗色模式](https://element-plus.org/en-US/guide/dark-mode)

**限制**

- 視覺語彙較像 enterprise admin；若期待更輕、更像現代開發工具的介面，需要額外設計。
- 按需 import 樣式通常要加入 `unplugin-element-plus`，auto import 又會增加 `unplugin-vue-components` 與 `unplugin-auto-import`；也可手動 import 以控制複雜度。
- 不是 unstyled，大規模改外觀時會同時碰 CSS variables、BEM selectors 或 Sass variables。

**維護狀態**

- 官方 GitHub 約 27.6k stars；最新可核實 release 為 `2.14.3`（2026-07-10），同日仍有 release / commit，近期也已更新 Vite 8 與 TypeScript 6。[GitHub](https://github.com/element-plus/element-plus)、[Releases](https://github.com/element-plus/element-plus/releases)、[Commits](https://github.com/element-plus/element-plus/commits/dev)

### 4. Vuetify：只有在選定 Material Design 時採用

**優點**

- 是完整 Vue component framework，包含 responsive layout、navigation drawer、form、data、feedback 元件與一致 theme system。
- 官方 Vite 安裝可選 TypeScript；`vite-plugin-vuetify` 支援自動 tree-shaking。[安裝](https://vuetifyjs.com/en/getting-started/installation/)、[tree-shaking](https://vuetifyjs.com/en/features/treeshaking/)
- MIT 授權，官方 GitHub 約 41k stars；最新可核實 release 為 `v4.1.4`（2026-07-07）。[GitHub](https://github.com/vuetifyjs/vuetify)、[Release](https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.4)

**為何不是首選**

- 會把全站帶向明確 Material Design，這是產品設計決策，不只是替換 UI controls。
- 通常需要 `v-app`、Vuetify plugin、全域樣式與 layout primitives，對既有殼層的侵入比 Naive UI / shadcn-vue 大。
- 查核時正處 Vuetify 4 的新 major 階段；全面替換前應再驗證所需元件是否已離開 labs，以及 Vue 3.5 / TS 6 的實際 typecheck。
- `v4.1.4` release note 同時表示 OpenCollective 資金已耗盡、目前無法補償貢獻者；這是可核實的永續性風險訊號，但不能據此推論專案已停維護。[Release](https://github.com/vuetifyjs/vuetify/releases/tag/v4.1.4)

### 5. Quasar：能力強，但本案用不到大部分能力

**優點**

- MIT、Vue 3、TypeScript、Vite；既有 Vite 專案可使用 `@quasar/vite-plugin`，官方明列 tree-shaking 與 Sass variables integration。[Vite plugin](https://quasar.dev/start/vite-plugin/)
- 元件、responsive helpers、dark mode 與應用 layout 非常完整；若未來需要 PWA、Electron、Capacitor 或 browser extension，可共享同一體系。[官方方案比較](https://quasar.dev/start/pick-quasar-flavour/)
- 官方 GitHub 約 27k stars，最新可核實 release 為 `quasar-v2.19.3`（2026-04-06）。[GitHub](https://github.com/quasarframework/quasar)

**為何不建議**

- HestiaKit 的正式部署只是 GitHub Pages 靜態 SPA；Quasar CLI 的多平台與 app framework 能力大多沒有實際收益。
- 使用 Vite plugin 雖能留在現有 Vite，但會加入 Quasar 全域 CSS、Sass 與 Material 視覺；若改採 Quasar CLI，還會擴大到目錄、路由與 build convention 的遷移。
- 需求是改善現有工具箱 UI，不是把產品轉成跨平台 app framework。

### 6. Reka UI：好底層，但不是現成視覺方案

**優點**

- MIT、Vue >= 3.4、TypeScript、unstyled、`sideEffects: false`；可使用任何 CSS 方案，並提供 WAI-ARIA pattern、keyboard navigation 與 focus management。[介紹](https://www.reka-ui.com/docs/overview/introduction)、[無障礙](https://reka-ui.com/docs/overview/accessibility)、[package.json](https://github.com/unovue/reka-ui/blob/v2/packages/core/package.json)
- 官方有 Vite resolver、SSR / static rendering 指南；可作為自建 design system 的互動 primitives。[安裝](https://reka-ui.com/docs/overview/installation)、[SSR](https://www.reka-ui.com/docs/guides/server-side-rendering)
- 官方 GitHub 約 6.6k stars；最新可核實 release 為 `v2.10.1`（2026-06-26）。[GitHub](https://github.com/unovue/reka-ui)、[Releases](https://github.com/unovue/reka-ui/releases)

**為何不符合本次需求**

- 官方明確說明元件是 unstyled，連 Dialog overlay 是否覆蓋 viewport 這類 functional styles 也由使用者負責。[Styling](https://reka-ui.com/docs/guides/styling)
- 它能改善互動與 accessibility，但不會直接解決「UI 不好看」。單獨採用會繼續維持大量自製 CSS。
- shadcn-vue 已在上層提供 Reka-based 的現成樣式；本案要用 Reka，較合理的途徑就是選 shadcn-vue，而不是從 primitives 自建一套。

### 7. PrimeVue：技術契合，但授權與產品路線已改變

PrimeVue 必須分版本看，不能再籠統寫成「免費 MIT 元件庫」。

**PrimeVue 4.5.5**

- v4 及以前仍是 MIT，styled / unstyled、design tokens、Pass Through、元件覆蓋與 accessibility 都很適合本案。
- 但官方 GitHub `primefaces/primevue` 已於 2026-06-28 封存；最後 release 為 4.5.5（2026-04-08）。[GitHub releases](https://github.com/primefaces/primevue/releases)
- 官方 PrimeUI Security 頁明確說 v4 與以前保留 MIT，而 2026-07 起新 major 改為 compiled packages 與新授權。[官方 Security](https://primeui.dev/security)

**PrimeVue 5.0.0-rc.1**

- 官方安裝頁要求提供 PrimeUI license key，仍支援 Vite、逐元件 import、tree-shaking、styled / unstyled、design tokens 與 TypeScript。[Vite 安裝](https://primevue.dev/vite)、[設定](https://primevue.dev/configuration/)
- Community license 免費但有持續資格門檻：年營收低於 US$1M、少於 5 名 developers、少於 10 名 employees、外部資金低於 US$3M；每名 developer 要 seat，最多 4 seats，license 有效 12 個月並需續期。[Community License](https://primeui.dev/licenses/community)
- 政府／稅收資助組織、公立大學等即使非營利也不符合 Community 資格；超出門檻要購買 Commercial license。[Community License](https://primeui.dev/licenses/community)
- license validation 是 offline，官方宣稱沒有 remote connection、telemetry 或 phone-home，這點不違背 HestiaKit 隱私定位；問題是治理、續期、資格與未來成本，而不是 runtime 資料外傳。[Community License](https://primeui.dev/licenses/community)

**結論**：不建議以已封存的 v4 開始長期 UI 重寫，也不建議在「尋找免費 UI」的前提下把專案綁到 v5 的資格型免費授權。除非專案 owner 明確接受 license key、年度續期與成長後付費，才重新列入評選。

## 對既有功能的元件映射

以下用首選 shadcn-vue 說明，Naive UI / Element Plus 都有近似對應：

| HestiaKit 區域 | 建議 UI 元件 | 必須保留的現有邏輯 |
|---|---|---|
| AppLayout / SidebarNav | Sidebar、ScrollArea、Separator、Button、Sheet（mobile） | `src/tools/index.ts` 作為唯一 metadata；hash router named routes；收合狀態 |
| ThemeToggle | DropdownMenu / Popover、Toggle Group、Button | `useTheme`、system theme、localStorage 失敗處理、accent 選擇 |
| 共用 forms | Slider、Toggle Group、Switch、Field、Label | 既有 `defineModel` 契約、正體中文 label / description |
| 一般工具頁 | Card、Button、Textarea、Input、Badge、Tooltip、Separator | 所有 composable 狀態、clipboard fallback、history 上限、下載與檔案處理 |
| 工具列 | Button Group、Toggle Group、Tooltip | 原本的 disabled、aria-label、title、active state 與 keyboard 行為 |
| 狀態側欄 | Card、Alert、Badge、ScrollArea | 解析錯誤、修復清單、成功／失敗 feedback |
| CSV / Markdown 輸出 | Table、ScrollArea、Textarea | 純轉換函式；表格 overflow 與手機呈現 |
| JSON Tree | 保留專用 `JsonTreeNode`，內部換 Input / Textarea / Button / Collapsible 樣式 | path、expandedPaths、增刪節點、key/value/type 編輯、最小寬度與水平捲動 |

任何元件庫都不應取代 `src/utils/` 的純函式或 `src/composables/` 的 browser API fallback。UI 替換應主要發生在 layout、view template、共用 UI components 與樣式。

## 建議導入策略

使用者已允許直接取代現有 UI，因此建議採 **開發過程分段、產品一次切換**，避免 production 長期同時存在兩套設計系統。

### A. 推薦：單次全面替換，內部以小步驟完成

1. **凍結行為基線**
   - 先跑 `npm run test`、`npm run build`。
   - 為每個工具列出操作清單：輸入、清除、載入範例、複製、下載、歷史、localStorage、手機版、鍵盤與錯誤狀態。
   - 現有 utils 測試保留；為關鍵 UI event 補少量 Vue Test Utils 測試，避免只靠肉眼判斷「功能完整」。

2. **只導入真正會用的基礎元件**
   - shadcn-vue：Sidebar、Button、Button Group、Card、Input、Textarea、Switch、Slider、Toggle Group、Tooltip、Badge、Alert、Table、ScrollArea、Sheet、DropdownMenu、Collapsible、Separator、Field。
   - 不要先加入 Calendar、Chart、Form schema 等未使用元件。
   - icon 使用本機 bundle 的 Vue icon package，不從 CDN / remote URL 載入。

3. **先完成 design tokens 與應用殼層**
   - 把 `theme.css` 的 `--color-*` 映射為 shadcn semantic tokens，保留現有 light / dark / accent 選項。
   - 重做 AppLayout、SidebarNav、ThemeToggle；路由與 `src/tools/index.ts` 不動。
   - 在 320px、620px、900px、desktop 驗證 sidebar、內容寬度與 overlay。

4. **建立 HestiaKit 的薄封裝層**
   - 可保留 `components/forms/RangeControl.vue`、`SegmentedControl.vue`、`SwitchControl.vue` 的 public props / model，只改內部為新的 UI 元件。
   - 再新增少量真正共用的 `ToolShell`、`ToolToolbar`、`StatusPanel`；不要讓每個 View 再次複製幾百行相似 CSS。

5. **按風險遷移所有 View**
   - 先做結構單純的 MD5 / Base64。
   - 再做 Clipboard Markdown、Duplicate Items、JSON Markdown Table、CSV Table。
   - 最後做 Password Generator 與 JSON Editor；JSON tree 保留專用資料行為。
   - 每完成一頁就對照行為清單，但在所有頁完成前不要合併成正式 UI。

6. **一次切換與移除舊樣式**
   - 所有頁完成、測試與 visual QA 通過後，才刪除已無引用的舊 class / tokens / duplicated CSS。
   - 驗證 `npm run test`、`npm run build`，並檢查 `dist/` 沒有 staged。
   - 比較替換前後 production asset 大小；若成長明顯，檢查是否加入了未使用元件或 icon 全量 import。

### B. 若改選 Naive UI

- 不需要 Tailwind；在 App root 用 `NConfigProvider` 建立 theme / themeOverrides，並讓 `useTheme` 只負責產生應用主題狀態。
- 優先使用局部 component imports；可先不導入 auto-import plugins，保持 import 可追蹤，再依重複程度決定是否加入 resolver。
- 仍採上述「殼層 → 共用控制 → 簡單 View → 複雜 View → 一次切換」順序。

## 驗收與停止條件

全面 UI 替換只有在以下條件都滿足時才算完成：

- 八個現有工具都仍可從 `src/tools/index.ts` 產生的側欄與 hash route 進入。
- 每個工具原有操作、disabled 條件、錯誤提示、clipboard fallback、檔案匯入／下載與有限歷史紀錄均保留。
- theme、system preference、dark accents 與 localStorage 不可用時的 fallback 均保留。
- JSON tree 的展開、收合、增刪與編輯均保留；CSV / table 在手機可水平捲動，不截斷主要操作。
- 只載入本機打包資產，沒有為 UI 核心功能加入遠端 API、telemetry、tracking 或 CDN runtime dependency。
- `npm run test` 與 `npm run build` 通過；至少以 320px、620px、900px 與 desktop 寬度完成視覺 QA。

## 最終建議

選 **shadcn-vue**，使用 Tailwind CSS 4 與 semantic CSS variables 重建完整 UI，保留現有 utils / composables / tools registry；JSON editor 的專屬 tree 行為不換，只更換視覺與基礎互動元件。這條路最可能讓使用者直接感受到 UI 品質提升。

若不想承擔 Tailwind 與 local component ownership，改選 **Naive UI**。它是本案工程風險最低、授權最單純、傳統元件庫形式最完整的方案。

不要新導入 PrimeVue 4；也不要在未明確接受 PrimeUI v5 授權條件前導入 PrimeVue 5。
