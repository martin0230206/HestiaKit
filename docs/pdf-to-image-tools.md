# HestiaKit PDF 轉 JPG／PNG 工具研究

> 查核日期：2026-07-14（Asia/Taipei）  
> 範圍：純前端、瀏覽器內處理、Vue 3／Vite／TypeScript、GitHub Pages 靜態部署。來源以官方文件、官方儲存庫、規格與 npm 套件頁為主。

## 結論

HestiaKit 的首選組合是：

1. **`pdfjs-dist`**：解析 PDF 並把每一頁渲染到 Canvas。
2. **瀏覽器原生 `canvas.toBlob()`**：輸出 `image/png` 或 `image/jpeg`，不需要另一個圖片編碼套件。
3. **`fflate`**：選配，用來把多頁結果打包成 ZIP 一次下載。

`pdfjs-dist` 由 Mozilla 支援、Apache-2.0 授權，功能範圍正好符合「讀取 PDF → 光柵化頁面」；官方範例已示範瀏覽器內以 `getDocument()`、`getPage()`、`getViewport()`、`page.render()` 渲染到 Canvas。[PDF.js 官方範例](https://mozilla.github.io/pdf.js/examples/)、[官方儲存庫與授權](https://github.com/mozilla/pdf.js)

技術能力上的第二選擇是 **MuPDF.js**。它可直接由 `Pixmap` 產生 PNG／JPEG，且 WASM renderer 很完整，但採 AGPLv3／商業雙授權。HestiaKit 目前沒有 `LICENSE`，不能假設現有專案可直接符合 AGPL，因此不建議在未先決定整個專案授權前採用。[MuPDF.js 官方說明與授權](https://github.com/ArtifexSoftware/mupdf.js)

## 快速比較

| 方案 | 瀏覽器內渲染 | PNG／JPG | 授權／成本 | HestiaKit 適合度 | 判斷 |
|---|---|---|---|---|---|
| **PDF.js / `pdfjs-dist`** | 是；解析由 Worker 處理，頁面渲染至 Canvas | 透過 Canvas 原生編碼 | Apache-2.0 | **高** | **首選** |
| **MuPDF.js / `mupdf`** | 是；WASM | `Pixmap.asPNG()`、`asJPEG()` | AGPLv3 或商業授權 | 中 | 技術佳，但授權不適合直接導入 |
| **PDFium** | 引擎可光柵化 | 可自行封裝 | 官方以 C++／GN／Ninja 為主；瀏覽器需自建 WASM 或第三方包 | 低 | 不建議此案自建工具鏈 |
| **Apryse WebViewer** | 是；WASM client-only | PNG、JPEG、TIFF 等 | 商業 SDK／license key | 低 | 功能過度完整且有成本、隱私治理負擔 |
| **`pdf-lib`** | 可在瀏覽器讀寫 PDF，但不是 renderer | 沒有頁面光柵化 API | MIT | 不適用 | 適合建立／修改 PDF，不適合本功能 |
| Poppler／Ghostscript／ImageMagick wrappers | 通常不是 | 是 | 各異，常依賴 native executable | 不適用 | 無法部署為 GitHub Pages 純前端功能 |

## 1. PDF.js：首選

截至查核日，npm 的 `pdfjs-dist` 最新版是 **6.1.200**，官方 release 日期為 2026-06-27。套件是 PDF.js 的預建版本，包含 TypeScript declarations；現代版以 ESM 發行。[npm 套件頁](https://www.npmjs.com/package/pdfjs-dist)、[v6.1.200 release](https://github.com/mozilla/pdf.js/releases/tag/v6.1.200)

### 適合本案的原因

- 官方定位就是用 Web Standards 解析與渲染 PDF，並提供瀏覽器 display API。[Getting Started](https://mozilla.github.io/pdf.js/getting_started/)
- 可把使用者本機 `File` 轉成 `ArrayBuffer`／`Uint8Array` 後傳入 `getDocument({ data })`，不必上傳或使用遠端 URL；官方 API 也指出 TypedArray 通常會轉移到 Worker，降低主執行緒持有的記憶體。[`getDocument` API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)
- `getViewport({ scale })` 會回傳渲染所需的像素尺寸與 transform；頁面旋轉也會納入 viewport。[`PDFPageProxy` API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html)
- `page.render()` 可直接畫到 Canvas，渲染完成後用瀏覽器原生 `toBlob()` 產出 PNG 或 JPEG。[PDF.js 官方範例](https://mozilla.github.io/pdf.js/examples/)、[HTML Canvas 規格](https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob-dev)
- PDF.js 使用 Apache-2.0，沒有 MuPDF 的 copyleft 或商業授權限制。[PDF.js LICENSE](https://github.com/mozilla/pdf.js/blob/master/LICENSE)
- 專案仍活躍維護；v6.1.200 包含 annotation rendering、font/image conversion 與 SMask rendering 等修正。[v6.1.200 release](https://github.com/mozilla/pdf.js/releases/tag/v6.1.200)

### 建議的轉換流程

```text
本機 File
  → file.arrayBuffer()
  → PDF.js getDocument({ data })
  → 逐頁 getPage(pageNumber)
  → getViewport({ scale: targetDpi / 72 })
  → page.render({ canvas, viewport, background: '#fff' })
  → canvas.toBlob('image/png')
     或 canvas.toBlob('image/jpeg', jpegQuality)
  → 單頁下載或加入 ZIP
```

PDF 頁面單位預設為 1/72 英吋，因此要產生 150 DPI 對應的像素尺寸，`scale` 為 `150 / 72`；300 DPI 則為 `300 / 72`。這裡的 DPI 主要用來計算像素尺寸。

PNG 是無損格式，不需要「品質」控制；JPEG 的 `quality` 是 0 到 1。PDF.js 的 `RenderParameters.background` 預設就是白色，但建議明確傳入白色，避免透明頁面轉 JPEG 時產生不可預期的底色。[PDF.js RenderParameters](https://mozilla.github.io/pdf.js/api/draft/api.js.html)

### Vite 與 GitHub Pages 整合重點

PDF.js 不只有主模組，還需要 Worker，近期版本也可能載入 WASM、CMap 或標準字型資產。HestiaKit 的 `vite.config.ts` 使用 `base: './'`，所以不能把 Worker 寫成固定站台根路徑，也不應從 CDN 載入。

建議做法：

- 用 Vite 的 `?url` 或 `new Worker(new URL(..., import.meta.url), { type: 'module' })` 資產模式處理本機 Worker；Vite 會在 production build 改寫 hashed asset URL。[Vite Static Asset Handling](https://vite.dev/guide/assets.html)
- Worker 與主模組必須來自同一個 `pdfjs-dist` 版本，避免 PDF.js 官方 FAQ 所述的 API／Worker version mismatch。[PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions)
- 先做最小 Vite spike，確認 v6 的 Worker 與 WASM 在 `npm run dev`、`npm run build` 以及實際 serve `dist/` 時都沒有 404。
- 不從 CDN 載入 Worker、WASM、CMap 或字型；所有 runtime 資產應隨 GitHub Pages 靜態檔部署，維持隱私與離線可預期性。
- 目前 `src/tools/index.ts` 會靜態 import 所有 View。為避免 PDF renderer 增加所有工具的首屏負擔，應在使用者選檔或開始轉換時才 `import('pdfjs-dist')`，而不是在 View 模組頂層載入整個 renderer。

官方 README 也明確指出 PDF.js 檔案偏大，production 應使用 minified build；實作後應比較建置資產大小，而不是只看 npm 套件目錄大小。[PDF.js 官方 README](https://github.com/mozilla/pdf.js#building-pdfjs)

### 限制與風險

- PDF.js 的 modern build 主要面向最新瀏覽器；官方另提供 `legacy` build，Safari 16.4+ 在 legacy 表中標示為「Mostly」。HestiaKit 若只支援現代瀏覽器可先用 modern build，但仍需在 Chrome、Firefox、Safari、Edge 實測。[PDF.js Browser Support](https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions#which-browsersenvironments-are-supported)
- PDF renderer 處理的是不可信的複雜檔案格式，應固定版本並持續升級安全修補。
- 不同 PDF 的字型、透明混合、遮罩、特殊色彩空間與 annotation appearance 可能有差異，必須用實際 corpus 做視覺比對。
- PDF.js 的 Worker 主要負責解析；Canvas 繪製與圖片編碼仍可能占用主執行緒，應逐頁處理並在頁面間讓出事件迴圈。

## 2. MuPDF.js：技術佳，授權是阻礙

官方 `mupdf` 套件截至查核日為 **1.28.0**。它把 MuPDF C engine 編譯成 WebAssembly，可在 Chrome、Firefox、Safari、Edge 執行，並提供 TypeScript definitions。[npm 套件頁](https://www.npmjs.com/package/mupdf)、[官方儲存庫](https://github.com/ArtifexSoftware/mupdf.js)

相對 PDF.js，它的優點是：

- `page.toPixmap()` 後可直接呼叫 `pixmap.asPNG()` 或 `pixmap.asJPEG(quality)`，不依賴 Canvas encoder。
- `pixmap.setResolution(x, y)` 可設定輸出 DPI metadata。
- 官方 API 範圍包含 render、annotation、redaction、merge、split、save，未來若要發展成完整 PDF 工具箱更有餘裕。

但官方明確採雙授權：AGPLv3 或商業授權；分發使用 MuPDF.js 的軟體或以網路服務提供時，若走 AGPL 必須依其條件釋出來源。授權同時涵蓋 JavaScript wrapper 與 WASM binary。[MuPDF.js License](https://github.com/ArtifexSoftware/mupdf.js#license)

此外，MuPDF.js 使用的 WASM memory 不會自動由 JavaScript GC 完整管理，官方要求對 Document、Page、Pixmap 等物件呼叫 `.destroy()`。[MuPDF.js Memory Management](https://github.com/ArtifexSoftware/mupdf.js#memory-management)

**判斷**：如果未來 HestiaKit 明確採 AGPLv3，或願意購買商業授權，MuPDF.js 值得重新評估；在目前沒有專案 `LICENSE` 的狀態下，不應直接導入。

## 3. PDFium：不建議自建瀏覽器版本

PDFium 是 Chromium 使用的 PDF engine，官方測試程式能把 PDF 頁面 rasterize 成 PNG／PPM；但官方建置流程以 C++20、Clang、GN、Ninja 與 `depot_tools` 為主，並沒有一條等同 `npm install pdfjs-dist` 的官方瀏覽器整合路徑。[PDFium 官方 README](https://pdfium.googlesource.com/pdfium/+/refs/heads/main/README.md)

要在 HestiaKit 使用，必須自行維護 Emscripten/WASM build，或信任第三方 wrapper 的編譯來源、更新節奏與安全修補。這對單一「PDF 轉圖片」功能的供應鏈與維護成本過高。

## 4. 商業 SDK：Apryse WebViewer

Apryse 官方文件確認 WebViewer 可完全在瀏覽器端把 PDF rasterize 為 PNG、JPEG、BMP、TIFF，並可使用 Full API 的 `PDFDraw.exportBuffer()`。[Apryse PDF to Image](https://docs.apryse.com/web/guides/conversion/convert-pdf-to-image)

它適合需要高階 PDF 編輯、annotation、redaction、Office/CAD 轉換與商業支援的產品，但 HestiaKit 只需要頁面轉圖片，導入範圍過大。官方範例需要 license key，且 PDF-to-image showcase 說明 SDK 會收集 API 名稱／次數與文件頁數等使用資料；這需要額外的隱私審查與設定，不符合本案「無遙測、資料不離開瀏覽器」的預設。[Apryse showcase 與資料收集說明](https://docs.apryse.com/web/samples/showcase-demo-pdf-to-image)

## 5. 不適用的常見選項

### `pdf-lib`

`pdf-lib` 的官方定位與 API 是建立、修改、合併、拆分、填寫與儲存 PDF；它能把 JPG／PNG 嵌入 PDF，但沒有把任意 PDF 頁面解譯並光柵化為圖片的 renderer。[pdf-lib 官方首頁](https://pdf-lib.js.org/)、[官方 API](https://pdf-lib.js.org/docs/api/)

因此它可用於未來的 PDF 編輯功能，但不能取代 PDF.js 或 MuPDF.js 完成本需求。

### Node／native wrappers

以 Poppler、Ghostscript、ImageMagick、GraphicsMagick 為底層的 npm 套件通常需要作業系統 executable、child process 或 server runtime。HestiaKit 部署在 GitHub Pages，瀏覽器無法執行這些 native 依賴，因此不列入候選。

## 多頁下載：建議 `fflate`

單頁可以直接以 Blob URL 下載；多頁若逐一觸發下載，瀏覽器可能阻擋多重下載，體驗也不好。因此建議提供「下載目前頁」與「全部下載 ZIP」。

`fflate` 是純 JavaScript、MIT、零依賴，支援瀏覽器、ESM、ZIP 與 streaming API。截至查核日 npm 最新版為 **0.8.3**；官方列出的 ZIP compression 功能約 7 kB minified，適合只匯入需要的 API。[fflate npm](https://www.npmjs.com/package/fflate)、[官方儲存庫](https://github.com/101arrowz/fflate)

PNG 和 JPEG 本身已壓縮，再用 DEFLATE 通常收益很小，建議 ZIP entry 使用 store／level 0，減少 CPU 時間。若第一版只支援少量頁數，也可以先不用 ZIP 套件，待「全部下載」需求確定後再加入。

JSZip 的 API 較直觀，也能在瀏覽器輸出 Blob，但目前 npm 版本仍為 3.10.1，套件較大；本案較偏向 `fflate`。[JSZip 官方文件](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html)

## 畫質、DPI 與 Canvas metadata

Canvas 的輸出像素尺寸可依目標 DPI 計算，但瀏覽器標準規定：若輸出格式支援解析度 metadata，Canvas 序列化必須寫成 **96 DPI**。[HTML Canvas 序列化規格](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file)

這代表：

- 用 `scale = 300 / 72` 可得到 A4 約 2480 × 3508 的像素，視覺上確實是 300 DPI 對應的像素量。
- 但 `canvas.toBlob()` 產生的 PNG/JPEG metadata 仍可能標成 96 DPI。
- 第一版 UI 應同時顯示「倍率／目標 DPI」與實際輸出像素尺寸，避免把 metadata 與像素密度混為一談。
- 如果需求包含印刷工作流，必須額外改寫 PNG `pHYs` 或 JPEG JFIF／EXIF density，或改用能寫入 DPI metadata 的 encoder；MuPDF.js 的 `Pixmap.setResolution()` 是其中一條路，但會回到授權問題。

## 記憶體與效能策略

PDF.js 官方 FAQ 不建議一次高解析度渲染大量頁面；一個 816 × 1056 的 96 DPI Canvas 約需 3.5 MB RGBA 記憶體，HiDPI 2 倍尺寸則約 14 MB。[PDF.js FAQ：大量頁面渲染](https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions#i-want-to-render-all-100-pages-in-a-document-at-a-high-resolution-is-it-a-good-idea)

A4 在 300 DPI 約為 2480 × 3508，單一 RGBA Canvas 約需 34.8 MB，尚未計 PDF parser、圖片解碼、輸出 Blob 與 ZIP 的記憶體。因此實作應：

- 嚴格逐頁渲染，避免 `Promise.all()` 同時轉換所有頁。
- 每頁完成後呼叫 `page.cleanup()`，不再需要 Canvas 時把寬高設為 0，完成或取消後 `pdf.destroy()`。
- 對單頁最大像素數設上限；第一版可從 30–34 megapixels 級距開始，再依手機實測調低。
- 在開始前估算總頁數、每頁像素與可能的記憶體需求；大量頁面先警告。
- 支援取消，頁面之間更新進度並讓出主執行緒。
- ZIP 若保留所有 Blob 才一次輸出，仍會累積記憶體；大文件要改用 streaming ZIP／File System Access API，或限制一次轉換頁數。
- 轉換完成與元件卸載時，對所有 `URL.createObjectURL()` 呼叫 `URL.revokeObjectURL()`。

## 隱私與安全要求

- 只接受使用者選取的本機 `File`，把 byte data 直接交給 renderer；不建立 upload endpoint，也不把檔名、頁數或錯誤傳到第三方。
- 所有 Worker、WASM、CMap、字型與 icon 都由本站靜態資產提供，不使用 CDN runtime dependency。
- 不把 PDF bytes、密碼或輸出 Blob 寫入 `localStorage`；若要保存偏好，只保存格式、品質與解析度等非文件資料。
- 設定輸入檔大小、頁數與單頁像素上限，防止壓縮炸彈或惡意 PDF 造成瀏覽器耗盡記憶體。
- 處理密碼保護 PDF 時只在記憶體保存密碼，結束或換檔即清除。PDF.js 的 `getDocument` 支援 `password` 參數。[PDF.js DocumentInitParameters](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)
- 只使用 Canvas render，不加入 PDF viewer 的 scripting layer；若未來加入 annotation links、XFA 或 embedded JavaScript，需另做安全審查。

## 建議的 HestiaKit 實作切分

若進入實作，建議維持既有分層：

- `src/utils/pdfImageOptions.ts`：頁碼範圍、DPI／像素計算、檔名、JPEG 品質與上限驗證等純函式。
- `src/utils/pdfRenderer.ts`：不依賴 Vue 的 PDF.js adapter；動態載入 renderer，逐頁回傳 Blob。
- `src/composables/usePdfImageConverter.ts`：File、進度、取消、密碼、Blob URL、下載與瀏覽器 API fallback。
- `src/views/PdfImageConverterView.vue`：選檔、頁面預覽、輸出格式、解析度、JPEG 品質、頁碼範圍與下載 UI。
- `src/tools/index.ts`：註冊於 `format`，或在未來有多個檔案工具時新增一致的 `file` 分類。

純函式測試至少涵蓋：

- `targetDpi / 72` 與像素上限計算。
- 頁碼範圍解析、去重、排序與越界。
- `.pdf` → `-page-001.png`／`.jpg` 的命名與特殊字元清理。
- JPEG quality 正規化；PNG 不接受 quality。
- 超大頁面與取消流程。

瀏覽器整合測試 corpus 應包含：一般文字、掃描圖片、CJK 字型、90/180/270 度旋轉、透明／遮罩、annotation、表單、密碼保護、損壞檔與大頁面。

## 建議驗證順序

1. 建立只轉第一頁 PNG 的最小 spike。
2. 驗證 Vite dev 與 production preview 的 Worker／WASM 資產 URL。
3. 加入 JPEG、品質與 96／150／300 DPI 對應像素尺寸。
4. 改成逐頁 queue、進度、取消與 cleanup。
5. 加入頁碼範圍、單頁下載與 `fflate` ZIP。
6. 以桌面與手機測試記憶體上限。
7. 執行 `npm run test`、`npm run build`，並實際 serve `dist/`；只跑 build 無法發現 runtime Worker/WASM 404。

## 最終建議

採用 **`pdfjs-dist` + Canvas `toBlob()`** 完成 MVP；需要「全部下載」時再加入 **`fflate`**。所有 PDF bytes、轉換與下載都留在瀏覽器，renderer 與 Worker 只從 HestiaKit 自己的靜態資產載入。

第一個技術 gate 不是 UI，而是建立一個小型 Vite spike，確認 `pdfjs-dist@6.1.200` 在 HestiaKit 的 `base: './'` 與 GitHub Pages 路徑下能正確載入 Worker／WASM，並用 CJK、旋轉、透明與密碼保護 PDF 做視覺驗證。若這一關通過，就沒有必要承擔 MuPDF.js 的授權風險或 PDFium 的自建成本。
