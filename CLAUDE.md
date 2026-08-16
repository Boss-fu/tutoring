# CLAUDE.md — 福大自然家教管理系統 專案記憶

給 Claude 的導覽：**先讀這裡定位，再用 Grep 搜尋「錨點名稱」讀該段落，不要重讀整個大檔**（`teacher.html`、`parent-preview.html` 皆為數萬字壓縮單行檔）。

## 部署與網址
- 正式站（給家長/老師用）：**Vercel** `https://bossfu-tutoring.vercel.app`（`main` 一 push 自動部署）。備援：GitHub Pages `https://boss-fu.github.io/tutoring/`（不讀 `vercel.json`，根目錄永遠是 `index.html`）。
- 路由由 `vercel.json` 控制：`/`→`/home`（選擇頁）；`/teacher`、`/parent`、`/parents`。
- 開發分支固定：`claude/through-this-5f7djl`。PR 合併進 `main` 才會上線。

## 檔案角色
- `home.html`：進站身分選擇頁（自包含、含 PWA/iOS standalone 標記 + `home.webmanifest`）。**不要外部載入 JS/CSS**（避免踩版本一致性測試）。
- `index.html`：個人班表引擎；被 `teacher.html` 以 iframe (`?embed=teacher`) 嵌入。**勿刪、勿改成別的頁**。
- `teacher.html`：教師端（DB 版）。單檔多個 `<script type="module">`，各自建 `window.BOSSFU_DB`。
- `parent.html`：家長端登入外殼，登入後 iframe 嵌 `parent-preview.html`。
- `parent-preview.html`：家長端**實際內容**（月曆/課務/學費單/親師溝通/檔案中心），也被教師端「家長端預覽」嵌用。
- `theme.css`：共用設計主題（品牌色 `--tzu-red:#850103`）。
- `supabase-config.js`：`window.SUPABASE_CONFIG`（url + publishable key）。

## 關鍵錨點（用 Grep 搜這些名字）
- 月曆配色（教師）：`COURSE_PALETTE` / `courseColorFor` / `eventStyle` / `renderCalendarLegend`（teacher.html）。12 色，不同課程配不同色。
- 月曆配色（家長）：`window.bossfuCourseColor` / `keyColor` / `recolor` / `renderCalLegend`（parent-preview.html，共用同一組）。
- 學費單開立：教師端 `issueInvoices` / `#issueInvoice`；家長端 `loadIssuedMonths` / `renderInvoices`（近 6 個月，未開立顯示「老師尚未開立」）。
- 家長隱私隔離：所有 `messages`/`student_files` 寫入都帶 `parent_id`；教師傳檔前選「指定家長」(`#fileParent` / `populateParents`)；教師預覽送訊息帶 `parentId`（`BossfuPreviewParent` → postMessage → `window.__bossfuPreviewParentId`）；教師端「清空未指定家長的舊資料」= `#purgeLegacy`。
- 教師檔案中心：`addTeacherFileCenter` / `#fileStudent`（學生清單從 `#workStudent` 複製，會重試填充）。
- 教師通知鈴鐺：`refreshBell`；家長通知：`startParentBell` / `enableTabNotices`。
- **分頁整併（重要）**：教師端已無獨立「兼職薪資」「收入分析」分頁。導覽只剩 首頁／課次與月曆／學生課務／檔案中心／學費與收入／學習狀況／家長端預覽／個人課表／新增·管理行程。
  - **首頁（`#home` / `renderHome`）＝收入儀表板**（沿用淺色風格，樣式在 teacher.html `<style>`「首頁：收入儀表板」段，class 前綴 `.dash`/`.dp`/`.dnut`/`.rank`/`.dbars`/`.mcal`）。元件：月份 chips（`#dashMonths`，點選 `.mchip[data-m]` 切月，delegation 綁在主模組）＋紅色漸層「本月總收入」卡（`#dashTotBig`/`#dashTotBrk`/`#dashTotYtd`）＋收入來源占比甜甜圈（`#srcDonut`/`#srcLegend`，conic-gradient）＋收入排行（`#incomeRank`，學生家教＋補習班兼職＋正職合併排序 top6）＋近12月堆疊柱（`#trendBars`）＋本月課表迷你月曆（`#miniCal`，有課的日子填紅漸層）＋本月每日收入（`#dailyBars`）＋今天課程（`#todayLessons`）。配色為經 dataviz 驗證的分類色盤（家教藍 `#2a78d6`、兼職橘 `#eb6834`、正職綠 `#1baf7a`；收入排行前 6 名用 6 色 `#2a78d6/#eb6834/#1baf7a/#eda100/#e87ba4/#008300`；迷你月曆有課日填藍漸層）。總收入 hero 卡維持品牌紅 `#850103`。數字標籤用文字色不用色相。舊的 `#dashboard`/`#studentDonut`/`#incomeChart`/`#incomeSplit`/`#incomeByEmployer` 已移除，`renderIncomeStats` 只剩填學費頁的 `#incomeStatMetrics`（其餘 `if($())` 防呆空跑）。（`#incomeTrend` 近12月堆疊、`#studentDonut` 學生占比、`#incomeSplit` 收入結構、`#incomeByEmployer` 各補習班兼職）。原「近六個月收入」`#incomeChart` 已移除，改由 12 個月趨勢取代。
  - **學費與收入（`#finance` / `renderFinance`）**：家教學費彙總 + 併入兼職（`#employerForm`/`#shiftForm`/薪資對帳單 `#statementEmployer`·`#statementMonth`·`#printStatement`）與正職薪資（Gemini 卡片）與 `#incomeStatMetrics`。三大類收入用可開合 `<details class="acc">` 分區（家教／兼職／正職，家教預設展開）；summary 留在正常文件流中，以免修改表單自動捲動時覆蓋文字，標題右側顯示當月金額（`#accTutSum`/`#accShfSum`/`#accSalSum`，於 `renderFinance` 內填）。
- 兼職薪資：`wLoad` / `wRender` / `wRenderStatement`（對帳單：應領薪資 − 勞保自付 − 健保自付 = 實領＋核章欄）。資料表 `employers`(含 `default_rate`/`labor_insurance`/`health_insurance`)、`work_shifts`。UI 卡片現位於學費與收入分頁。
- 收入分析：`renderIncomeStats`（家教＋兼職＋正職三來源；helper `shiftFee`=兼職毛額、`salaryFee`=正職實領）。填的元素散在首頁（趨勢/占比/結構/各補習班）與學費頁（`#incomeStatMetrics`），全部以 `if($(...))` 防呆。
- 正職薪資單分析（Gemini，UI 在學費與收入分頁，程式為 teacher.html 尾端獨立 module）：上傳薪資單 PDF／照片後，分別擷取應發、扣款、授課／家教逐筆紀錄（課程、日期時數、時薪、小計）及勞退／特休／補休資訊，並顯示應發－扣款＝核算實領與實際入帳。除了 Gemini API 自動分析，也提供「複製通用 Prompt」與外部結果匯入，可將薪資單交給 ChatGPT／Gemini／Claude App 後把 JSON 回覆貼回自動填表。分析結果以 `.salary-editor` 收合卡呈現：收起顯示應發／扣款／總薪資，展開才顯示所有分類明細與修改欄位；外部 AI 匯入為次要區塊。實領寫入 `site_settings.salary_income`，完整月明細寫入 `site_settings.salary_details`（`{月份:{gross,net,earnings,deductions,workDetails,benefits}}`）。明細卡有獨立月份選單，可查看所有歷史月份；「修改此月明細」會將該月各欄帶回表單並更新原月份。「預覽／存 PDF」只輸出該月完整 A4 正職薪資單，不列印整個財務頁。金鑰/模型只存 localStorage。
- 月曆拖曳／複製：teacher.html 尾端模組 `mMove`/`mCopy` 處理家教課次，`mMoveShift`/`mCopyShift` 處理兼職班次；兩種月曆事件皆為 `draggable`，拖曳 payload 帶 `kind` 與 `id`。拖放到其他日期後由 `mChooseAction` 依類型顯示對話框，明確選擇「移動／複製／取消」，不會直接改動資料；主模組重載入口 `window.BOSSFU_RELOAD`。
- 兼職修改：單位與班次清單皆提供「修改」。更新單位預設時薪時，會同步更新該單位所有既有 `work_shifts.rate`；單筆班次仍可再獨立修改日期、時間、時數、時薪與備註。薪資對帳單的單位／月份會可靠地選取第一個有效值並顯示明確空狀態。
- 月曆兼職明細：點擊 `.event[data-shift]` 由月曆主模組的 `showMainCalendarShift` 直接使用繪製事件的同一份 `workShifts`，不依賴兼職表單模組的非同步資料副本；事件會停止後續重複處理。班次 ID 轉為字串後比對，單位名稱只作為標題，選取班次以表格列出日期、開始、結束、時數、時薪、本次金額與備註，並可收起。
- 月曆兼職圖例：`renderCalendarLegend` 會依顯示月份彙整 `work_shifts.employers.name`，逐一顯示實際兼職單位名稱，不使用籠統的「兼職班次」。
- 兼職薪資對帳單列印：`wPrintStatement` 會依目前單位／月份重新產生完整 A4 正式文件（品牌抬頭、單據編號、結算資訊、摘要、班次表、扣款結算、核對聲明、簽章與頁尾），不會列印整個學費與收入頁面。列印視窗另注入四周 `7mm` 內安全邊距，搭配原有 `@page` 邊界，避免品牌文字與頁尾貼齊紙張或遭印表機裁切。
- 個人課表 PDF：教師端 `#schedule` 會加入 `#exportSchedulePdf`，呼叫嵌入的 `index.html` 列印版面，讓使用者從系統列印視窗另存 PDF 分享。
- 新增課次預填：`LESSON_DEFAULTS_KEY` / `lessonDefaults` / `rememberLesson`。表單輸入會保存在目前瀏覽器；下次新增時優先沿用上次輸入，若尚無本機紀錄則取該學生最近一堂課。日期固定使用今天，周考成績不沿用，避免誤植。
- 推播通知：`pwa.js` 的 `subscribePush` / `window.bossfuPush(ids,…)` / `bossfuPushRole('teacher',…)`；Edge Function `supabase/functions/send-push`（用 VAPID 密鑰）；`sw.js` 的 push/notificationclick。觸發點：開立學費單、老師傳檔/回饋、家長回饋。

## Supabase 資料表（線上實際）
`profiles`(role: teacher/parent)、`students`、`parent_students`(多對多)、`lessons`、`messages`(有 `author_role`、`parent_id`)、`student_files`(有 `uploader_id`、`parent_id`)、`issued_invoices`(student_id, month, PK)、`site_settings`(key/value，如 `finance_profile`、`salary_income`＝正職各月實領 JSON)、`employers`(兼職單位；`default_rate`/`labor_insurance`/`health_insurance`)、`work_shifts`(兼職班次；`employer_id`/`work_date`/`hours`/`rate`)、`push_subscriptions`(user_id/endpoint/p256dh/auth，推播訂閱)。Storage bucket：`exam-papers`（上傳已移除前端 10MB 限制；Storage 端仍有預設上限）。
- RLS 輔助函式：`is_teacher()`、`can_view_student(uuid)`。
- 隱私隔離用 **restrictive** policy：`isolate parent messages` / `isolate parent files`（非老師只能 select `parent_id = auth.uid()`）。
- **DDL 只能由使用者在 Supabase SQL Editor 執行**（環境無 DB 憑證）。改 schema 時要寫「可重複執行」的 SQL（`if not exists` / `drop policy if exists`）。

## 慣例 / 部署前
- 改任何被 `?v=` 載入的子資源（js/css/被 iframe 的 html）後，跑 `python3 bump-version.py` 統一版本號（測試 `cache-bust` 會檢查一致）。頂層 HTML 文件本身改動不需 bump。
- 測試：`npm test`（含 cache-bust / boot / pages / preview / parent 等）。改行為時記得同步更新對應測試的 DB stub。
- 只推 `claude/through-this-5f7djl`；PR 合併進 `main`。原 PR 合併後，follow-up 要從最新 `main` 重開同名分支（`git checkout -B ... origin/main`），force-with-lease 推。

## 已完成的大功能（歷史）
- F 兼職薪資＋可蓋章薪資對帳單、勞健保自付額扣除、收入分析、月曆拖曳/複製課次、家長隱私隔離、學費單開立、推播通知（`send-push` 已部署、VAPID 密鑰已設）皆已上線。
- 正職收入（Gemini 讀薪資單）已上線；分頁整併：收入分析移入首頁、兼職＋正職併入「學費與收入」、首頁加「今天課程」，刪除獨立的兼職薪資／收入分析分頁。

## 慣例：更新此檔
- **每次新增功能或結構性改動，都要同步更新本 `CLAUDE.md`**（錨點／資料表／待辦），隨 PR 一起合併。

## 待辦（未完成）
- （目前無）正職收入已改用「上傳薪資單 PDF＋Gemini 判讀實領」完成（HR 系統無 API，不連動）。
