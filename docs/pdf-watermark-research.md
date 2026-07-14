# HestiaKit PDF 增加浮水印方案研究

> 查核日期：2026-07-14（Asia/Taipei）
> 範圍：純前端、瀏覽器內處理、Vue 3／Vite／TypeScript、GitHub Pages 靜態部署。來源以官方文件、官方儲存庫、GitHub Advisory、規格與 npm 套件頁為主。

## 結論

HestiaKit 的建議架構是：

1. **PDF writer 首選：`@pdfme/pdf-lib`，固定在已修補解壓炸彈的版本（至少 `5.5.10`；查核時最新版為 `6.1.11`）。**
2. **預覽沿用既有 `pdfjs-dist@6.1.200`**，不另加 viewer。
3. **MVP 的中文文字浮水印先用 Canvas 產生透明 PNG，再只把浮水印圖片嵌入原 PDF**；原頁面不光柵化，因此原本文字、向量與圖片仍保留。
4. **writer 放進獨立 Web Worker**，以 Vite module worker 載入；主執行緒只負責狀態、預覽、設定與下載。
5. **MVP 明確不接受加密 PDF，也不承諾保留數位簽章有效性。** 這兩項要到輸出保護與簽章語意都驗證清楚後再開放。

`@pdfme/pdf-lib` 是 upstream `pdf-lib` 的活躍 MIT fork，保留 `drawText`、`drawImage`、`opacity`、`rotate` 等適合浮水印的 API，並修正部分日／中文字型 subsetting 問題、相容 `fontkit` v2。更重要的是，GitHub Advisory `GHSA-vrqm-gvq7-rrwh` 指出的 FlateDecode 解壓炸彈已在 `5.5.10` 修補；目前原始碼對單一 decoded stream 設有 100 MB 上限。[`@pdfme/pdf-lib` 官方目錄與差異說明](https://github.com/pdfme/pdfme/tree/main/packages/pdf-lib)、[npm](https://www.npmjs.com/package/@pdfme/pdf-lib)、[GitHub Advisory](https://github.com/advisories/GHSA-vrqm-gvq7-rrwh)、[修補後 `DecodeStream`](https://github.com/pdfme/pdfme/blob/main/packages/pdf-lib/src/core/streams/DecodeStream.ts)

條件式 fallback 是 **`@cantoo/pdf-lib@2.7.1`**。它比 `@pdfme/pdf-lib` 多出加密輸入／輸出與 incremental save，功能很吸引人；但 `v2.7.1` 的 `DecodeStream.ensureBuffer()` 仍無 decoded-size 上限，且官方明說只保證維護自身 roadmap 需要的範圍。因此在它上游修補、或 HestiaKit 維護一個經審查的安全 patch 前，**不應直接拿它處理使用者選取的不可信 PDF**。[`@cantoo/pdf-lib` 官方 repo 與維護聲明](https://github.com/cantoo-scribe/pdf-lib)、[npm](https://www.npmjs.com/package/@cantoo/pdf-lib)、[`v2.7.1 DecodeStream`](https://github.com/cantoo-scribe/pdf-lib/blob/v2.7.1/src/core/streams/DecodeStream.ts)

新興的 **`@libpdf/core`** 已直接提供官方浮水印範例，文字與圖片都支援 opacity 與 rotate，並宣稱有瀏覽器、加密與 incremental save 能力；技術面非常符合本案。但官方仍標示 Beta、目前是 `0.x`，minor version 可能改 API，採用量與實際 PDF corpus 經驗也較少。建議列為觀察候選並做 spike，不作本次 production 首選。[LibPDF npm](https://www.npmjs.com/package/@libpdf/core)、[官方 Drawing／watermark 範例](https://libpdf.documenso.com/docs/guides/drawing)、[官方瀏覽器安裝](https://libpdf.documenso.com/docs/getting-started/installation)

## 快速比較

| 候選 | 浮水印 API | 加密 PDF | Incremental save | 安全／維護狀態 | 授權 | 本案判斷 |
|---|---|---|---|---|---|---|
| **`@pdfme/pdf-lib@6.1.11`** | 文字、PNG/JPEG、opacity、rotate；CJK 可搭 `fontkit` v2 | 可用密碼讀取；重存的保護狀態需另驗證 | 無官方高階支援 | 活躍；`>=5.5.10` 已修 GHSA，單 stream 100 MB 上限 | MIT | **writer 首選** |
| **`@cantoo/pdf-lib@2.7.1`** | 同 upstream，另有 SVG | 可讀取、可重新加密 | 有 | 活躍但只維護自身 roadmap；目前 decoded buffer 無上限 | MIT | **條件式 fallback；未修安全問題前不直接上線** |
| **upstream `pdf-lib@1.17.1`** | 文字、PNG/JPEG、opacity、rotate | 不支援真正解密；`ignoreEncryption` 不是解密 | 無 | 穩定、使用廣，但約五年未發新版；decoded buffer 無上限 | MIT | 不選作新功能首選 |
| **`@libpdf/core@0.4.1`** | 官方直接示範 existing PDF watermark；opacity、rotate、圖片 | 官方宣稱 RC4、AES-128/256 | 有 | 非常活躍，但官方標 Beta、API 可在 minor 改變 | MIT | **觀察／spike 候選** |
| **PDF.js / `pdfjs-dist`** | 能顯示 annotation editor，但不是通用內容 writer | 可讀取密碼 PDF | 不適用 | Mozilla 活躍維護；repo 已使用 | Apache-2.0 | **只負責預覽與輸出驗證** |
| **MuPDF.js / `mupdf`** | 可用 annotation 或較低階 PDF API完成 | 完整 | 有 | 引擎成熟、WASM；整合與生命週期管理較重 | AGPL-3.0-or-later 或商業 | 授權不適合直接導入 |
| **Apryse WebViewer / PDFNet** | `Stamper` 完整支援文字、圖片、PDF page、opacity、rotation | 完整 | 有 | 商業 SDK、資產大、trial 有額外治理事項 | 商業 | 功能過度、成本不合 |

## 需求邊界

### 建議 MVP

- 單一 PDF 上傳。
- 輸出仍為 PDF；保留原頁面結構，只追加浮水印內容，不輸出圖片或 ZIP。
- 文字浮水印或圖片浮水印；圖片先限 PNG／JPEG。
- 文字支援正體中文；預設以透明 PNG 表示。
- 透明度、角度、大小、顏色。
- 置中與平鋪兩種配置；平鋪可調水平／垂直間距。
- 全部頁面或指定頁碼範圍。
- 顯示目前頁預覽，能切換頁面。
- 顯示處理進度、取消、重新下載與清除。
- 所有檔案、密碼與輸出只存在瀏覽器記憶體；不使用 upload API、CDN runtime dependency、遙測或追蹤。

### 暫不納入 MVP

- 加密 PDF。
- 保留或重新建立數位簽章。
- 移除既有浮水印。
- 把浮水印當作防竄改或 DRM；一般 PDF editor 仍可能移除新增的 content stream。
- 背景層、annotation 型浮水印、PDF/A 合規宣稱。
- SVG、一次處理多份 PDF、自訂字型上傳。
- 把整頁 PDF 轉成圖片再重建 PDF。

最後一點很重要：本功能應只把**浮水印**做成圖片，而不是光柵化原始頁面。否則會破壞文字搜尋／選取、向量品質、表單、連結、annotation、無障礙結構與原始壓縮效率。

## writer 選型詳評

### 1. `@pdfme/pdf-lib`：首選

`@pdfme/pdf-lib` 延續 `pdf-lib` 的瀏覽器 API，可載入既有 `Uint8Array`，對每一頁呼叫 `drawText()` 或 `drawImage()`，最後 `save()` 回傳新 PDF bytes。`PDFPageDrawTextOptions` 與 `PDFPageDrawImageOptions` 原有 opacity、rotate、x/y、寬高與 blend mode，正好符合單點與平鋪浮水印。[upstream drawText options](https://pdf-lib.js.org/docs/api/interfaces/pdfpagedrawtextoptions)、[upstream drawImage options](https://pdf-lib.js.org/docs/api/interfaces/pdfpagedrawimageoptions)

相對 upstream，它對本案有三個實際優勢：

- 查核時仍活躍發版。
- 官方列出日／中文字型 subsetting 修正，並要求搭配 `fontkit` v2，而不是舊的 `@pdf-lib/fontkit`。
- `5.5.10` 已修正 GitHub Reviewed 的 decompression-bomb advisory；目前把每個 decoded stream 上限設為 100 MB，超過會拋出 `DecompressionBombError`。

仍需注意：

- 它是 fork，不是 upstream 官方續作；要由 HestiaKit 自己追蹤 fork 差異與 advisories。
- 100 MB 是**單一 decoded stream** 的上限，不是整份文件的總記憶體上限；大量壓縮 streams、字型、圖片、原始 bytes、輸出 bytes 仍可能同時占用大量記憶體。
- README 宣稱可用密碼讀取加密 PDF；從目前 `PDFDocument` 原始碼判讀，解密後 context 會移除 `/Encrypt` trailer。這表示重存結果可能變成未加密文件；這是依原始碼做的推論，必須以 RC4、AES-128、AES-256 fixtures 實測，不能只靠 README 宣稱。[`PDFDocument.ts`](https://github.com/pdfme/pdfme/blob/main/packages/pdf-lib/src/api/PDFDocument.ts)
- 沒有官方 incremental-save API；通常會重新序列化文件。

**採用條件**：固定已修補的明確版本、包在 HestiaKit 自己的 writer adapter 後面、先完成 Vite worker／旋轉頁／CropBox／CJK／惡意壓縮 stream 的 spike。

### 2. `@cantoo/pdf-lib`：功能完整的條件式 fallback

截至查核日，npm 最新版為 `2.7.1`，近期仍有多次發版。官方提供：

- 既有 PDF 的文字／圖片／SVG 繪製。
- `PDFDocument.load(bytes, { password })` 解密。
- `pdfDoc.encrypt({ userPassword, ownerPassword, permissions })` 重新加密。
- `forIncrementalUpdate: true`、`saveIncremental()` 與 `commit()`。
- MIT 授權。

來源：[`@cantoo/pdf-lib` README](https://github.com/cantoo-scribe/pdf-lib)、[`PDFDocumentOptions.ts`](https://github.com/cantoo-scribe/pdf-lib/blob/v2.7.1/src/api/PDFDocumentOptions.ts)、[`PDFDocument.ts`](https://github.com/cantoo-scribe/pdf-lib/blob/v2.7.1/src/api/PDFDocument.ts)、[`PDFSecurity.ts`](https://github.com/cantoo-scribe/pdf-lib/blob/v2.7.1/src/core/security/PDFSecurity.ts)

但目前有兩個不能忽略的 gate：

1. `v2.7.1` 的 `DecodeStream.ensureBuffer()` 與舊 upstream 相同，會持續倍增 `Uint8Array`，沒有 decoded-size 上限。HestiaKit 的 `File.size` 限制只能限制壓縮後輸入，擋不住高壓縮率 stream。
2. 官方 repo 首段即說明：他們會在自身需要期間維護，但不能保證處理離自身 roadmap 太遠的 issue。這不代表套件品質差，但代表 HestiaKit 不能假設所有 PDF 安全／相容性問題都會被優先修正。

第一點是比對固定版原始碼得到的 **code-equivalent risk**，不是 GitHub Advisory 對 `@cantoo/pdf-lib` 發布的官方 affected-version 判定；應持續追蹤 Cantoo 自己的修補狀態。[固定 `v2.7.1` 對應提交的 `DecodeStream`](https://github.com/cantoo-scribe/pdf-lib/blob/334c9e15daaeacf2fb1931c2210122580f276c0c/src/core/streams/DecodeStream.ts)

此外，incremental save 不能被誤解為「加浮水印後簽章仍有效」。它能保留原始 bytes 並附加變更，適合簽章流程；但浮水印是簽章後的新內容，仍可能違反 DocMDP／certification permissions，或讓驗證器標示文件在簽章後已變更。

**使用條件**：只有在「加密輸入後仍要重新加密輸出」成為必要需求，而且 `@pdfme` 無法滿足時才考慮；導入前必須等上游加入 decoded-size cap，或維護一個最小、可測、會隨版本更新的安全 patch。單靠 Worker、壓縮檔大小限制或 timeout 不足以取代 library-level cap。

### 3. upstream `pdf-lib`：穩定但不適合新選型

upstream `pdf-lib@1.17.1` 是 MIT、API 成熟、使用量大，也能完成未加密 PDF 的基本文字／圖片浮水印。然而：

- npm 最新版已多年沒有更新。[npm](https://www.npmjs.com/package/pdf-lib)
- 官方明確說明 encrypted PDFs 不受支援；`ignoreEncryption: true` 只略過錯誤，不會解密內容。[官方 README](https://github.com/Hopding/pdf-lib#encryption-handling)
- `SaveOptions` 沒有 incremental save 或輸出加密設定。[SaveOptions](https://pdf-lib.js.org/docs/api/interfaces/saveoptions)
- 目前 upstream `DecodeStream.ensureBuffer()` 仍無上限，具備與 advisory 描述相同的無界倍增結構。[upstream `DecodeStream.ts`](https://github.com/Hopding/pdf-lib/blob/master/src/core/streams/DecodeStream.ts)

因此它只能作 API 相容性的最後退路，不能因「較老、較多人用」就視為處理不可信 PDF 的較安全選擇。

### 4. `@libpdf/core`：最值得追蹤的新方案

`@libpdf/core@0.4.1` 的官方文件直接提供：

```ts
const pdf = await PDF.load(existingBytes)
const page = pdf.getPage(0)

page.drawText('CONFIDENTIAL', {
  x: 200,
  y: 400,
  size: 60,
  opacity: 0.3,
  rotate: degrees(45),
})

const bytes = await pdf.save()
```

圖片也支援 PNG alpha、JPEG、opacity；官方另外列出 RC4、AES-128、AES-256、incremental save、font subsetting、browser + Web Crypto 與 MIT。就功能表面而言，它比三個 pdf-lib 分支更完整。[Drawing](https://libpdf.documenso.com/docs/guides/drawing)、[Fonts](https://libpdf.documenso.com/docs/guides/fonts)、[npm capabilities](https://www.npmjs.com/package/@libpdf/core)

本次不選它作首選的理由是成熟度而非功能缺口：

- 官方明確標示 Beta，minor version 可能變更 API。
- `0.x` 發版頻繁，現在導入需接受較高的 adapter 與升級成本。
- 必須另外核對 malformed PDFs、page rotation／CropBox、CJK subsetting、整體 decoded-data 上限、browser memory 與 production Vite bundle；官方 README／API 沒有宣告 Flate decoded-size hard cap，本次也未完成其 decoder 安全稽核，因此不能假設已有 decompression-bomb 防護。

它的高階 `DrawTextOptions`／`DrawImageOptions` 已包含 opacity 與 rotation，官方 integration tests 也涵蓋文字 opacity、圖片 opacity／rotation 與 CJK embedded font，足以支持 PoC；但 integration coverage 仍不等於 production 安全與相容性證明。[drawing types](https://github.com/LibPDF-js/core/blob/2c7e9c4cd5b7911b92507fe5876c3ff68e57bdd3/src/drawing/types.ts)、[drawing integration tests](https://github.com/LibPDF-js/core/blob/2c7e9c4cd5b7911b92507fe5876c3ff68e57bdd3/src/integration/drawing/drawing.test.ts)

建議在 writer adapter 定義穩定後，用同一組 fixtures 對 `@pdfme/pdf-lib` 與 `@libpdf/core` 跑一次比較 spike。若 LibPDF 到正式版後 API 與相容性穩定，它可能成為未來較好的單一 PDF 工具底層。

### 5. PDF.js、MuPDF.js 與 Apryse

PDF.js 的核心定位仍是讀取與渲染。它現在可加入部分 annotation，但沒有適合本案的高階「在每頁追加任意文字／圖片 content stream 並重存」流程，因此不應為了避免 writer dependency 而濫用 annotation editor。它的正確角色是：

- 載入檔案、取得頁數與密碼狀態。
- 渲染目前頁做預覽。
- 將輸出 PDF 重新載入，驗證可讀取、頁數與頁面尺寸正確。

PDF.js 官方 FAQ 也要求 API 與 Worker 版本完全相同；HestiaKit 既有本機 Worker、CMap、ICC、標準字型與 WASM 資產應繼續沿用。[PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions)、[PDF.js API](https://mozilla.github.io/pdf.js/api/)

MuPDF.js 技術上更完整，也能處理密碼、annotations 與 incremental save，但官方採 AGPL-3.0-or-later／商業雙授權。HestiaKit 目前沒有根目錄 LICENSE，不能在未做專案授權決策前直接採用。[MuPDF 官方 repo](https://github.com/ArtifexSoftware/mupdf)、[JavaScript Document API](https://mupdf.readthedocs.io/en/latest/reference/javascript/types/Document.html)、[PDF write options](https://mupdf.readthedocs.io/en/latest/reference/common/pdf-write-options.html)

Apryse `PDFNet.Stamper` 是功能最完整的浮水印 API，可設定文字、圖片、PDF page、foreground/background/annotation、opacity 與 rotation，也能 client-only 運作；但需要商業 license、Full API 資產較大，trial 還有額外的使用資料治理事項。對免費、隱私優先的單一工具過度。[Apryse Stamper](https://sdk.apryse.com/api/web/Core.PDFNet.Stamper.html)、[client-only deployment](https://docs.apryse.com/web/guides/deployment-options)、[trial key 與資料說明](https://docs.apryse.com/web/guides/get-started/trial-key)

## CJK 文字：Canvas → PNG 與 fontkit + Noto Sans TC

### MVP 首選：Canvas → 透明 PNG

做法是用 `CanvasRenderingContext2D.fillText()` 畫出使用者輸入，輸出透明 PNG，writer 只 `embedPng()` 一次，再在多頁、多個 tile 重用同一個 PDF image object。Canvas 規格支援 FontFace／CSS font resolution、文字測量、alpha 與 transform。[WHATWG Canvas text](https://html.spec.whatwg.org/multipage/canvas.html#text-styles)

優點：

- 不需要 `fontkit` 與多 MB 的完整 CJK 字型來源。
- 能直接使用瀏覽器／作業系統的正體中文字型 fallback，MVP 成功率高。
- 文字排版先在瀏覽器完成，writer 只處理 PNG，降低不同 pdf-lib fork 的 CJK subsetting 差異。
- PNG 只嵌入一次，可在每一頁重複引用，不會按頁複製完整像素資料。
- 只有浮水印變成 bitmap；原始 PDF 頁面仍是原本的文字與向量內容。

缺點：

- 浮水印本身不可搜尋、選取、複製或交由輔助科技朗讀。
- 放大或高品質列印時不如真正的 PDF text 銳利。
- 使用 system font 時，不同 Windows／macOS／Linux／行動裝置的字形與尺寸可能不同。
- 透明 PNG 在很高解析度與長文字時會增加記憶體；需依 PDF point 尺寸產生約 144–300 DPI 的像素，並限制最大寬高／總像素。

對「機密、草稿、僅供某人使用」這類短浮水印，這些代價通常可接受。建議 UI 不宣稱它是可存取文字。

### 第二階段：`fontkit` v2 + 本機 Noto Sans TC

若需求明確要求浮水印可搜尋／選取、任意縮放仍為向量、跨裝置字形一致，改用：

- `@pdfme/pdf-lib`
- `fontkit` v2（依 pdfme 官方指示，不用舊 `@pdf-lib/fontkit`）
- 本機隨站部署的 Noto Sans TC Regular／Noto Sans CJK TC region subset font
- `embedFont(fontBytes, { subset: true })`

Noto Sans TC 是台灣正體中文設計，官方 Noto 文件列出完整 CJK 支援，所有 Noto fonts 採 SIL Open Font License，可再散布；仍應把對應 OFL 文件一併保留在 repo／第三方授權清單。[Noto Sans CJK TC](https://notofonts.github.io/noto-docs/specimen/NotoSansCJKtc/)、[Noto 使用與授權](https://notofonts.github.io/noto-docs/website/use/)、[官方 region-specific subset 選擇](https://github.com/notofonts/noto-cjk/blob/main/Sans/README.md)

代價是：

- app 需下載完整字型來源後，才能在輸出 PDF 內 subset；「輸出只嵌少數 glyph」不等於「網站不需攜帶大字型」。
- `fontkit` 與 CJK 字型解析會增加 bundle、記憶體與產生時間。
- upstream 曾記錄部分中文字型 subsetting 損壞；pdfme 的差異正是為此相容 fontkit v2，但仍必須用 Noto Sans TC 實際驗證。[upstream CJK subsetting issue](https://github.com/Hopding/pdf-lib/issues/494)、[pdfme 差異說明](https://github.com/pdfme/pdfme/tree/main/packages/pdf-lib)
- 不得在 runtime 從 Google Fonts 或其他 CDN 抓字型；必須從 HestiaKit 自己的靜態資產載入。

**判斷**：MVP 選 Canvas PNG；只有在收到真正的 vector/searchable 需求後，才加入 fontkit + Noto。不要一開始同時維護兩條輸出路徑。

## 建議架構

```text
本機 PDF File
  ├─→ 既有 PDF.js worker
  │     ├─ 頁數／密碼／錯誤狀態
  │     └─ 目前頁 Canvas 預覽 + 前端 overlay
  │
  └─→ 使用者按「產生 PDF」時重新 file.arrayBuffer()
        └─ transferable ArrayBuffer → pdfWatermark worker
             ├─ 動態載入 @pdfme/pdf-lib
             ├─ 嵌入一份文字 PNG 或使用者圖片
             ├─ 逐頁計算 CropBox／Rotate／placement
             ├─ append foreground content
             └─ save() → transferable ArrayBuffer
                    └─ 主執行緒建立 Blob URL → 下載
```

PDF.js 可能把傳入 TypedArray 的 buffer transfer 給其 Worker，因此 writer 不應重用預覽層的同一份 buffer；按下產生時從原始 `File` 重新取得 `ArrayBuffer`。

Vite 官方建議用以下形式建立 module worker，production 會輸出獨立 chunk 並改寫 URL：

```ts
new Worker(new URL('../workers/pdfWatermark.worker.ts', import.meta.url), {
  type: 'module',
})
```

這也符合本專案 `base: './'` 的 GitHub Pages 部署；不可寫死 `/assets/...`。[Vite Web Workers](https://vite.dev/guide/features.html#web-workers)

### 建議檔案切分

- `src/utils/pdfWatermark.ts`
  - options、頁碼範圍、尺寸與 placement、檔名、輸入正規化等純函式。
- `src/utils/pdfWatermark.test.ts`
  - 純函式 Vitest。
- `src/workers/pdfWatermark.worker.ts`
  - writer 載入、PDF 修改、進度事件與錯誤序列化。
- `src/utils/pdfWatermarkWriter.ts`
  - 穩定 adapter interface；隔離 `@pdfme/pdf-lib`，方便將來比較／替換 LibPDF。
- `src/composables/usePdfWatermark.ts`
  - reactive 狀態、PDF.js 預覽、Worker 生命週期、取消、Blob URL、下載與 browser API fallback。
- `src/composables/usePdfWatermark.test.ts`
  - mock worker、重入、換檔、取消、URL cleanup、錯誤狀態。
- `src/components/pdf-watermark/WatermarkPreview.vue`
  - canvas 尺寸、overlay、頁面切換等 DOM 行為。
- `src/views/PdfWatermarkView.vue`
  - 頁面組合與頁面專屬樣式。
- `src/tools/index.ts`
  - 註冊至既有 `format` 分類；不手寫 router／sidebar metadata。

現有 PDF 共用 helper 多半仍綁在 `usePdfImageConverter.ts` 與 `pdfImageConverter.ts`。目前工作樹已有使用者的 PDF 轉圖片變更，實作浮水印時不要同時大幅抽取／重構那些檔案。待既有變更穩定後，再小步抽出中性的 `pdfCommon.ts` 或 `usePdfDocumentPreview.ts`。

## 頁面座標與繪製策略

PDF 使用左下原點，UI overlay 通常使用左上原點。placement 必須集中在純函式，不能散落在 View／Worker：

- 以可見的 `CropBox` 為基準，不只看 `MediaBox`。
- 支援非零 box origin。
- 補償頁面 `/Rotate` 的 0／90／180／270 度。
- 先取得浮水印未旋轉寬高，再計算旋轉後 bounding box 與中心 anchor。
- 不同頁面可有不同尺寸與方向；每頁獨立計算。
- 圖片只 embed 一次；平鋪只重複 draw operator。
- MVP 只追加 foreground content。若要 background，需要驗證 content stream 插入順序與透明混合，不要把它當成同一個 switch 隨手加入。

第一階段位置建議只有「置中」與「平鋪」。九宮格／自訂座標可在 placement 純函式穩定後加入，避免 UI 選項先超過可測範圍。

## 加密 PDF 與數位簽章

### 加密 PDF

預覽能輸入密碼，不代表 writer 就能安全保留原本的保護：

- upstream `pdf-lib` 不支援真正解密。
- `@pdfme/pdf-lib` 能用 password 讀取，但目前程式碼看起來會在解密後移除 `/Encrypt`；輸出可能是未受保護的新 PDF。
- `@cantoo/pdf-lib` 可呼叫 `encrypt()` 建立新的 user／owner password 與 permissions，但不能假設只拿到 user password 就能完整重建原 owner password、權限與原加密參數。
- `@libpdf/core` 官方宣稱 decrypt on load、encrypt on save，但仍需用本案 fixtures 驗證。

因此 MVP 應偵測加密檔並顯示「目前不支援加密 PDF 加浮水印」，而不是靜默輸出未加密檔。第二階段若開放，UI 必須明確讓使用者選擇輸出未加密，或輸入一組新的輸出密碼；不能宣稱「保留原加密」而未驗證。

### 數位簽章

加浮水印會修改 document content。Adobe 說明數位簽章與文件狀態綁定，修改簽署後的文件會讓簽章失效；incremental update 只保留舊 bytes 並附加變更，不等於任意修改都被簽章政策允許。[Adobe Digital Signature API 說明](https://opensource.adobe.com/dc-acrobat-sdk-docs/library/plugin/Plugins_ExtendedAPI.html)

建議：

- 偵測到 AcroForm signature field／ByteRange 時顯示強警告。
- 不宣稱保留簽章。
- MVP 可允許使用者明確確認後輸出副本，或更保守地直接拒絕；原檔永遠不覆寫。
- 若未來要支援簽章後允許的變更，必須理解 DocMDP、FieldMDP 與驗證器差異，另立需求，不併入浮水印 MVP。

## 隱私、安全與資源限制

PDF 是複雜且不可信的輸入格式。建議至少同時採用：

- writer 固定 `@pdfme/pdf-lib >= 5.5.10` 的明確版本並提交 lockfile；升級時看 changelog、GitHub Advisories 與實際 corpus。
- writer 在獨立 Worker 執行；取消或超時時可 `terminate()`，避免主執行緒長時間凍結。
- Worker 不是完整 sandbox，也沒有獨立記憶體配額；惡意檔仍可能拖垮同一分頁甚至 browser process。
- 壓縮後 PDF 的初始上限建議先比 PDF 轉圖片的 100 MB 更保守，例如 50 MB，再依桌面／手機 benchmark 調整。
- 另設頁數、圖片浮水印檔案大小、decoded image pixels、文字長度與 tile 數量上限；避免極小間距產生數十萬個 draw operations。
- `@pdfme` 的 100 MB per-stream cap 不是總量防護；仍需在開始前估算，逐頁更新進度，且一次只允許一個 writer job。
- 使用者按取消、換檔、重新產生或元件卸載時，終止 Worker、撤銷所有 Object URLs、清空密碼與 image bytes。
- PDF、圖片、浮水印文字、密碼與輸出 Blob 不寫入 `localStorage`。若保存偏好，只保存 opacity、rotation、placement 等非文件資料，並用 `try/catch` 處理 storage 不可用。
- 不載入 remote font、CDN、API、tracking pixel 或 telemetry。
- 圖片 input 先限 PNG/JPEG，檢查檔案大小與 decoded pixel count；不能只相信副檔名與 MIME。

「檔案小於 50 MB」與「放 Worker」都不能取代 parser 內部的解壓上限。這也是目前 `@pdfme` 優先於未修補 `@cantoo`／upstream 的主要理由。

## 效能與 bundle 策略

- `src/tools/index.ts` 靜態 import View，所以 writer 不得在 View 模組頂層 import；只在建立 writer Worker 時載入。
- Canvas 文字 PNG 在主執行緒生成一次，或在確認 Safari／OffscreenCanvas 支援後移到 Worker；不要為一張小圖增加複雜 fallback。
- 產生流程會同時存在原始 `File`、預覽 parser、writer parsed objects、輸出 `Uint8Array` 與 Blob；實測峰值記憶體，而不是只看 PDF 檔案大小。
- 不用 `Promise.all()` 處理所有頁；逐頁加入 content 並回報進度。
- 輸出後用 PDF.js 只渲染目前／第一頁確認，不一次渲染全部頁面。
- 若未來加入 Noto/fontkit，字型與 fontkit 都應跟 writer chunk 一起 lazy-load；比較 production build 的 compressed 與 uncompressed asset，而不是 npm 安裝目錄。

## 實作階段

### Phase 0：技術 gate

先做不接 UI 的最小 spike，通過才進入完整開發：

1. 在 Vite module Worker 內載入固定版 `@pdfme/pdf-lib`。
2. 對同一份 PDF 加入中文 Canvas PNG 與 PNG/JPEG 圖片浮水印。
3. 驗證 A4、Letter、portrait、landscape、混合尺寸、CropBox non-zero 與 0／90／180／270 度頁面。
4. 驗證輸出可被 PDF.js、Chrome、Firefox、Edge、Safari Preview／macOS Preview 與 Acrobat 開啟。
5. 跑 advisory PoC 的受控變體，確認超過 decoded stream 上限會回傳可理解錯誤，而不是凍結主 UI。
6. 記錄 writer chunk、20／100／500 頁處理時間與桌面／手機峰值記憶體。
7. 額外用相同 fixtures 跑 `@libpdf/core` 小型比較；只記結果，不同時導入兩套 production writer。

停止條件：若旋轉／CropBox 定位不穩、輸出破壞原頁、Worker 在 production base path 404、或安全 fixture 會凍結整個頁面，就先修正架構／換 writer，不進入 UI。

### Phase 1：MVP

1. 建立 options／geometry／page-range 純函式與測試。
2. 建立 writer adapter、Worker protocol、進度、取消與錯誤分類。
3. 沿用 PDF.js 完成單頁預覽，前端 overlay 顯示近似結果。
4. 完成文字／圖片、置中／平鋪、透明度／角度／尺寸、頁碼範圍。
5. 加入輸入限制、加密 PDF 拒絕、簽章警告與清理。
6. 新增 View，最後只透過 `src/tools/index.ts` 註冊。

### Phase 2：強化

- 加入九宮格與自訂 offset。
- 依使用資料決定是否加入 vector CJK（fontkit + Noto）。
- 評估加密輸入／重新加密輸出；若成為必要需求，再比較 patched `@cantoo` 與穩定版 LibPDF。
- 建立 Playwright 瀏覽器 E2E／下載驗證；目前 repo 沒有 Playwright，不應為 MVP 未經評估就增加整套工具。
- 擴充 PDF corpus、視覺 regression 與 mobile memory telemetry；telemetry 僅指本機開發量測，不加入產品追蹤。

## 測試與驗收

### Vitest 純函式

- 頁碼範圍：空白、單頁、區間、重複、反向、越界與大頁數。
- opacity、rotation、scale、spacing、margin 與 tile count 的上下限。
- UI 左上座標轉 PDF 左下座標。
- CropBox non-zero、混合頁面尺寸與 0／90／180／270 度 rotation。
- 旋轉後 bounding box 與中心 anchor。
- 輸出檔名、Unicode、危險字元與 `.pdf` 重複副檔名。

### writer integration fixtures

- A4／Letter、直式／橫式／混合尺寸。
- CropBox／MediaBox 不同、non-zero origin。
- 0／90／180／270 度旋轉。
- 文字、掃描頁、透明 PNG、JPEG、表單、annotation、連結、附件。
- 正體中文、英文、數字、emoji、組合字元與長文字。
- 損壞 PDF、超大頁數、高壓縮 stream、密碼 RC4／AES-128／AES-256、數位簽章與 PDF/A 樣本。

至少驗證：

- 輸出可重新載入，頁數、CropBox、MediaBox 與 rotation 沒有意外改變。
- 只有指定頁出現浮水印。
- 原頁文字仍可搜尋／選取；Canvas 模式下只有浮水印不可搜尋。
- PNG alpha、opacity、rotation、中心與 tile spacing 視覺正確。
- 取消／換檔後舊 Worker 結果不會覆蓋新狀態。
- 失敗時不留下 Blob URL、Worker、密碼或 stale UI。

### 實作後命令

```powershell
npm run test
npm run build
npm run preview
```

除了 test／build，必須實際 serve production build，確認 `base: './'` 下 PDF.js 與 writer Worker 資產沒有 404；只跑 build 看不出 runtime asset 問題。

## 最終建議

先採 **`@pdfme/pdf-lib@6.1.11`（或當時最新且 `>=5.5.10` 的已審查固定版）+ 既有 `pdfjs-dist`**。MVP 的正體中文文字用 **Canvas → 透明 PNG**，writer 放在獨立 Vite Worker，頁面只追加 foreground content，不重建或光柵化原頁。

`@cantoo/pdf-lib` 保留為「加密／incremental 成為硬需求」時的條件式 fallback，但在 decoded-stream 無上限問題修補前不直接上線；upstream `pdf-lib` 也有相同風險，不能當安全退路。`@libpdf/core` 的 API 最貼近本功能且發展快速，應用同一組 corpus 做 spike 並持續觀察，等 Beta／相容性／安全邊界穩定後再評估取代首選。

第一個交付物不是完整 UI，而是 Phase 0 技術 gate。它必須證明：旋轉與 CropBox 定位正確、中文／圖片輸出品質可接受、惡意壓縮 stream 會受控失敗、Worker 在 production path 正常、且手機記憶體可接受。這些結果通過後，再依 HestiaKit 現有分層完成 View、composable、utils、tests 與工具註冊。
