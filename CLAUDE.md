# CLAUDE.md — 福大自然家教管理系統 專案記憶

給 Claude 的導覽：**先讀這裡定位，再用 Grep 搜尋「錨點名稱」讀該段落，不要重讀整個大檔**（`teacher.html`、`parent-preview.html` 皆為數萬字壓縮單行檔）。

## 部署與網址
- 正式站（給家長/老師用）：**Vercel** `https://bossfu-tutoring.vercel.app`（`main` 一 push 自動部署）。備援：GitHub Pages `https://boss-fu.github.io/tutoring/`（不讀 `vercel.json`，根目錄永遠是 `index.html`）。
- 路由由 `vercel.json` 控制：`/`→`/home`（選擇頁）；`/teacher`、`/parent`、`/parents`；`/parent-guide` 為家長端網頁使用說明書。
- 開發分支固定：`claude/through-this-5f7djl`。PR 合併進 `main` 才會上線。

## 檔案角色
- `home.html`：進站身分選擇頁（自包含、含 PWA/iOS standalone 標記 + `home.webmanifest`）。**不要外部載入 JS/CSS**（避免踩版本一致性測試）。
- `index.html`：個人班表引擎；被 `teacher.html` 以 iframe (`?embed=teacher`) 嵌入。**勿刪、勿改成別的頁**。班表資料原本只存 localStorage `my-schedule-v2`，現另加**雲端同步**：頁尾一段 script 把 `state.data` 讀寫到 Supabase `teacher_prefs(key='personal_schedule')`（老師身分才可讀寫）——`save()` 後 debounce upsert、載入時先 pull 雲端（有就套用並寫回 localStorage、沒有就用本機建立第一份備份），未登入時退回純本機。主 IIFE 曝露 `window.__scheduleApplyCloud` / `__scheduleCurrentData` / `__scheduleCloudSave` 供該層使用。**需先套用 `supabase/20260909_teacher_prefs.sql`**。
- `teacher.html`：教師端（DB 版）。單檔多個 `<script type="module">`，各自建 `window.BOSSFU_DB`。
- `parent.html`：家長端登入外殼，登入後 iframe 嵌 `parent-preview.html`。
- `parent-guide.html`：給家長閱讀的響應式使用說明書；登入畫面的「查看家長端使用說明」連至 `/parent-guide`，說明書中的返回按鈕固定回到 `/parent`。
- `parent-preview.html`：家長端**實際內容**（月曆/課務/學費單/親師溝通/檔案中心），也被教師端「家長端預覽」嵌用。
- `theme.css`：共用設計主題（品牌色 `--tzu-red:#850103`）。
- `supabase-config.js`：`window.SUPABASE_CONFIG`（url + publishable key）。

## 關鍵錨點（用 Grep 搜這些名字）
- 月曆配色（教師）：`COURSE_PALETTE` / `courseColorFor` / `eventStyle` / `renderCalendarLegend`（teacher.html）。12 色（2026-08 改為較飽和好分辨版，前幾色藍→橘→綠→紫…相鄰色差大），不同課程配不同色。**教師與家長端 `COURSE_PALETTE` 須同步一致**（parent-preview.html 有相同陣列；改任一邊要兩邊一起改並 bump）。月曆兼職事件與圖例**不再加 🏫 小房子**（只用色塊區分）。
- 月曆配色（家長）：`window.bossfuCourseColor` / `keyColor` / `recolor` / `renderCalLegend`（parent-preview.html，共用同一組）。
- 學費單開立：教師端 `issueInvoices` / `#issueInvoice`；家長端 `loadIssuedMonths` / `renderInvoices`（近 6 個月，未開立顯示「老師尚未開立」）。
- 家長隱私隔離：所有 `messages`/`student_files` 寫入都帶 `parent_id`；教師傳檔前選「指定家長」(`#fileParent` / `populateParents`)；教師預覽送訊息帶 `parentId`（`BossfuPreviewParent` → postMessage → `window.__bossfuPreviewParentId`）；教師端「清空未指定家長的舊資料」= `#purgeLegacy`。
- 教師檔案中心：`addTeacherFileCenter` / `#fileStudent`（學生清單從 `#workStudent` 複製，會重試填充）。
- 教師通知鈴鐺：`refreshBell`；家長通知：`startParentBell` / `enableTabNotices`。
- **分頁整併（重要）**：教師端已無獨立「兼職薪資」「收入分析」分頁。導覽只剩 首頁／課次與月曆／學生課務／檔案中心／學費與收入／學習狀況／家長端預覽／個人課表／新增·管理行程。
  - **首頁（`#home` / `renderHome`）＝工作與收入儀表板**：月份 chips 下方動態建立品牌紅金 `.exec-board`，上層顯示總收入、總工作時數、完成課次／班次、全收入平均時薪與服務學生數。總工時＝家教＋兼職＋正職；使用者正職固定休假為每週五、日，因此預設以當月總天數扣除所有星期五與星期日後 × 8 小時計算。若薪資單分析後的 `salary_details[月].workHours` 有值，則以加班、缺曠、國定假日、颱風假等調整後工時覆蓋，算式保存在 `workHoursNote`。下層顯示接下來三筆行程及本月課務／正職薪資待處理提醒。其後接一張**淺色**「本月收入拆解」卡（`.dp.breakdown`：家教／兼職／正職金額 `#dashTotBrk`＋授課／班次時數＋年累計 `#dashTotYtd`；不再是第二個紅色總收入卡，避免與 `.exec-board` 重複），再接收入來源占比、排行、近 12 月趨勢、迷你月曆（`#miniCal`：家教藍 `#2a78d6`／兼職橘 `#eb6834` 雙色標記，同日兩者為對角漸層，`.mcal-legend` 圖例；今天用 inset box-shadow 不用 outline 以免溢出）、本月工作時數分配（`#dailyBars`，已改為**水平長條** `.hwork`/`.hwork-list`）與今天課程等分析卡。`.dash-grid>*{min-width:0}` 防手機溢出。標題右側有**眼睛鈕 `#moneyEye`**（切換 `body.money-hidden`，狀態存 localStorage `bossfu-hide-money`）：開啟時把主要金額（`.exec-income`、`#dashTotBrk>div>b` 只遮金額不遮時數、`#dashTotYtd`、`#srcDonut`、`.rank .rv`、`#financeCards`/`#incomeStatMetrics`/`#lessonMetrics` 指標、學費彙總/明細金額欄、`.acc>summary .tag`）改用**圓點遮罩**（radial-gradient；紅卡白點、白卡灰點），`#statementOutput` 用 blur、`.dbars .cv` 透明。
  - **新增課次可選類型（`#formKind`）**：課次編輯器頂部有類型下拉 家教課／兼職班次／正職上班／個人行程。表單欄位以 `#lessonForm[data-kind]` ＋ `.kf/.kt/.kp/.kfu/.kpe` class 顯示對應欄位（`#formKind.onchange` 只切 `data-kind`＋補預設，**不可呼叫會 `form.reset()` 的 openEdit，否則 reset 會把類型彈回家教**）。存檔分流：家教→`lessons`、兼職→`work_shifts`、正職/個人→`calendar_events`（`kind='fulltime'|'personal'`，只是行事曆時段標記、不計金額；薪資仍以薪資單為準）。`openEdit(item,kind)` 依類型帶欄位；刪除／submit 都以 `#formKind` 值決定資料表。**注意 `openEdit` 尾端有一層 `openEditWithSafeDefaults` 包裝（強制新家教課 `formStatus='attended'`），該包裝必須 `function(l,kind){...(l,kind)...}` 把 `kind` 一起轉傳，否則所有 `openEdit(item,'personal'|'fulltime'|'parttime')` 都會被吃掉 kind 而彈回家教。** 月曆 `renderCalendar` 同時畫四種：家教課次(各課程 `COURSE_PALETTE` 色)、兼職(黃 `#fbe7a2`/`#8a6a12`)、正職(靛 `.ce-full` `#e7e9fb`/`#3f3f9e`)、個人/匯入行程(依類型上色)；點 `data-cevent` 可編輯。**同一天內四種事件都會合併後依 `start_time` 由早到晚排序**（`cell.sort`；無時間者排最後）；`showDayDetail` 當天明細清單同樣依 `start_time` 排序。**月曆格子上的事件只顯示名稱、不顯示時間前綴（避免小格子被 HH:MM 佔滿變雜）；排序仍依 `start_time`。點日期看的「當天明細」`.di-time` 仍保留時間。****個人/匯入行程用 `personalTypeStyle(e)` 依 `title`＋`note` 分類上色：名稱含「B班」→綠 `#d1efdc`、家教→紅 `#fbd6d6`、輔導(含諾貝爾)→藍 `#d3e6fb`、教務→灰 `#e4e7eb`、其他個人行程→中性灰 `#eceff3`；`.ce-personal` class 保留、顏色以 inline style 覆蓋。`renderCalendarLegend` 會列出本月出現的類型色塊＋正職＋各兼職單位（皆黃）。**（此為教師端月曆專用，家長端不顯示這些，故不需與 parent-preview 同步。）主模組 load 另抓 `calEvents`、`employers`。**需先套用 `supabase/20260907_calendar_events.sql` 建 `calendar_events` 表**（否則正職/個人存檔會失敗；load 端已防呆空跑）。
    - **點日期看當天明細（手機主操作）＝ `showDayDetail` / `#calendarDayDetail` / `.day-item`**：手機月曆事件被壓成 9px 色塊（`font-size:0`）難以點選，故改為「點日期空白處→在月曆下方展開當天全部課次／行程清單」。每筆 `.day-item`（`.di-time`＋`.di-body`）可點開對應編輯器：家教 `data-open-lesson`→`openEdit(l)`、兼職 `data-open-shift`→`openEdit(s,'parttime')`、正職/個人 `data-open-cevent`→`openEdit(ev,ev.kind)`；底部「＋ 在這天新增」`data-add-day` 會 `openEdit()` 後帶入該日期。點 `.event` 色塊本身仍直接開編輯（`if(e.target.closest('.event'))return`）。
    - **匯入個人班表（`#importSchedule` → `openImportPanel` / `doImport`）**：位於「快速操作」卡。按鈕不再一次全匯，改開 `#importPanel` **可勾選清單**：`readSchedule()` 讀 localStorage `my-schedule-v2`（與 `index.html` 同源，依當月選 `summer`(7–8月)/`fall` 季度）、`scheduleCourses()` 列出該季度用到的課程（去 `off`/`休`，附分類 label 與每週格數）；勾選記在 localStorage `bossfu-import-picks`。`doImport` 只把勾選的課攤平成未來 84 天（`SLOT_TIME` 早09-12/午13-17/晚18-21）寫入 `calendar_events`（`kind='personal'`、`title=課程名`、**`note='匯入·'+分類label`**）。面板有「匯入前先清除先前匯入的固定行程」選項＝先 `delete().in('id',oldIds)` 清掉 `isImportedEvent()` 判定的舊匯入（`note` 以「匯入·」開頭，或為舊版分類名 `IMPORTED_LABELS`），**不會誤刪手動加的個人行程**。之所以做成清單：整份班表全匯會與已另記的兼職／教務重複、太多。課程改名／新增學生在「個人課表／新增·管理行程」(index.html) 做，清單會跟著更新。**另在「快速操作」卡有一鍵「🗑 清除匯入的行程」`#clearImported`→`clearImportedEvents()`＝直接 `delete().in('id', calEvents.filter(isImportedEvent))`，讓使用者免跑 SQL 就能清掉所有匯入行程（不動手動家教/兼職/正職）。**
  - **課次與月曆（`#lessons` / `renderLessons`）**：「本月課次摘要」`#lessonMonthSummary` 改為依「學生＋課程主題」分組計數（`.lsum`：學生／課程名稱／`X 堂`，例：周桓安 學測化學複習 4堂），與下方「個別學生課次明細」`#lessonList` 做出區隔。
  - **學費與收入（`#finance` / `renderFinance`）**：家教學費彙總 + 併入兼職（`#employerForm`/`#shiftForm`/薪資對帳單 `#statementEmployer`·`#statementMonth`·`#printStatement`）與正職薪資（Gemini 卡片）與 `#incomeStatMetrics`。三大類收入用可開合 `<details class="acc">` 分區（家教／兼職／正職，家教預設展開）；summary 留在正常文件流中，以免修改表單自動捲動時覆蓋文字，標題右側顯示當月金額（`#accTutSum`/`#accShfSum`/`#accSalSum`，於 `renderFinance` 內填）。
- 兼職薪資：`wLoad` / `wRender` / `wRenderStatement`（對帳單：應領薪資 − 勞保自付 − 健保自付 = 實領＋核章欄）。資料表 `employers`(含 `default_rate`/`labor_insurance`/`health_insurance`)、`work_shifts`。UI 卡片現位於學費與收入分頁。
- 收入分析：`renderIncomeStats`（家教＋兼職＋正職三來源；helper `shiftFee`=兼職毛額、`salaryFee`=正職實領）。填的元素散在首頁（趨勢/占比/結構/各補習班）與學費頁（`#incomeStatMetrics`），全部以 `if($(...))` 防呆。
- 正職薪資單分析（Gemini，UI 在學費與收入分頁，程式為 teacher.html 尾端獨立 module）：上傳薪資單 PDF／照片後，分別擷取應發、扣款、授課／家教逐筆紀錄（課程、日期時數、時薪、小計）及勞退／特休／補休資訊，並顯示應發－扣款＝核算實領與實際入帳。除了 Gemini API 自動分析，也提供「複製通用 Prompt」與外部結果匯入，可將薪資單交給 ChatGPT／Gemini／Claude App 後把 JSON 回覆貼回自動填表。分析結果以 `.salary-editor` 收合卡呈現：收起顯示應發／扣款／總薪資，展開才顯示所有分類明細與修改欄位；外部 AI 匯入為次要區塊。實領寫入 `site_settings.salary_income`，完整月明細寫入 `site_settings.salary_details`（`{月份:{gross,net,earnings,deductions,workDetails,benefits}}`）。明細卡有獨立月份選單，可查看所有歷史月份；「修改此月明細」會將該月各欄帶回表單並更新原月份。「預覽／存 PDF」只輸出該月完整 A4 正職薪資單，不列印整個財務頁。金鑰/模型只存 localStorage。
- Gmail 薪資單一鍵匯入：Edge Function `gmail-payroll` 負責 Google OAuth（唯讀 `gmail.readonly`）、依月份／薪資關鍵字搜尋郵件及下載 PDF／圖片。前端「從 Gmail 匯入本月薪資」在找不到附件時立即停止，不呼叫 Gemini；找到未處理附件才以本機 Gemini key 分析填表，成功後寫入 `gmail_payroll_imports` 防止重複。Refresh token 以 `GMAIL_TOKEN_ENCRYPTION_KEY` AES-GCM 加密後存在私有表 `gmail_payroll_connections`。需套用 `supabase/20260816_gmail_payroll.sql` 並設定 `GMAIL_CLIENT_ID`、`GMAIL_CLIENT_SECRET`、`GMAIL_OAUTH_REDIRECT_URI`、`GMAIL_TOKEN_ENCRYPTION_KEY`，可選 `PAYROLL_GMAIL_QUERY` 限定寄件者。
- 月曆拖曳／複製：teacher.html 尾端模組 `mMove`/`mCopy` 處理家教課次，`mMoveShift`/`mCopyShift` 處理兼職班次；兩種月曆事件皆為 `draggable`，拖曳 payload 帶 `kind` 與 `id`。拖放到其他日期後由 `mChooseAction` 依類型顯示對話框，明確選擇「移動／複製／取消」，不會直接改動資料；主模組重載入口 `window.BOSSFU_RELOAD`。
- 兼職修改：單位與班次清單皆提供「修改」。更新單位預設時薪時，會同步更新該單位所有既有 `work_shifts.rate`；單筆班次仍可再獨立修改日期、時間、時數、時薪與備註。薪資對帳單的單位／月份會可靠地選取第一個有效值並顯示明確空狀態。
- 月曆兼職明細：點擊 `.event[data-shift]` 由月曆主模組的 `showMainCalendarShift` 直接使用繪製事件的同一份 `workShifts`，不依賴兼職表單模組的非同步資料副本；事件會停止後續重複處理。班次 ID 轉為字串後比對，單位名稱只作為標題，選取班次以表格列出日期、開始、結束、時數、時薪、本次金額與備註，並可收起。
- 月曆兼職圖例：`renderCalendarLegend` 會依顯示月份彙整 `work_shifts.employers.name`，逐一顯示實際兼職單位名稱，不使用籠統的「兼職班次」。
- 兼職薪資對帳單列印：`wPrintStatement` 會依目前單位／月份重新產生完整 A4 正式文件（品牌抬頭、單據編號、結算資訊、摘要、班次表、扣款結算、核對聲明、簽章與頁尾），不會列印整個學費與收入頁面。列印視窗另注入四周 `7mm` 內安全邊距，搭配原有 `@page` 邊界，避免品牌文字與頁尾貼齊紙張或遭印表機裁切。
- 個人課表 PDF：教師端 `#schedule` 會加入 `#exportSchedulePdf`，呼叫嵌入的 `index.html` 列印版面，讓使用者從系統列印視窗另存 PDF 分享。
- 新增課次預填：`LESSON_DEFAULTS_KEY` / `lessonDefaults` / `rememberLesson`。表單輸入會保存在目前瀏覽器；下次新增時優先沿用上次輸入，若尚無本機紀錄則取該學生最近一堂課。日期固定使用今天，周考成績不沿用，避免誤植。
- 推播通知：`pwa.js` 的 `subscribePush` / `window.bossfuPush(ids,…)` / `bossfuPushRole('teacher',…)`；Edge Function `supabase/functions/send-push`（用 VAPID 密鑰）；`sw.js` 的 push/notificationclick。觸發點：開立學費單、老師傳檔/回饋、家長回饋。

## Supabase 資料表（線上實際）
`profiles`(role: teacher/parent)、`students`、`parent_students`(多對多)、`lessons`、`messages`(有 `author_role`、`parent_id`)、`student_files`(有 `uploader_id`、`parent_id`)、`issued_invoices`(student_id, month, PK)、`site_settings`(key/value，如 `finance_profile`、`salary_income`＝正職各月實領 JSON)、`employers`(兼職單位；`default_rate`/`labor_insurance`/`health_insurance`)、`work_shifts`(兼職班次；`employer_id`/`work_date`/`hours`/`rate`)、`push_subscriptions`(user_id/endpoint/p256dh/auth，推播訂閱)、`teacher_prefs`(key/value jsonb，老師專用設定；`key='personal_schedule'`＝個人班表雲端備份；RLS 只有 `is_teacher()` 可讀寫，家長讀不到，故**不放 site_settings**；SQL＝`supabase/20260909_teacher_prefs.sql`)、`calendar_events`(老師專用一站式行事曆：`kind`=fulltime正職上班/personal個人行程、`title`/`event_date`/`start_time`/`end_time`/`note`；只放時段標記、不計金額；SQL＝`supabase/20260907_calendar_events.sql`，RLS 用 `is_teacher()`)。Storage bucket：`exam-papers`（上傳已移除前端 10MB 限制；Storage 端仍有預設上限）。
- RLS 輔助函式：`is_teacher()`、`can_view_student(uuid)`。
- 隱私隔離用 **restrictive** policy：`isolate parent messages` / `isolate parent files`（非老師只能 select `parent_id = auth.uid()`）。
- **DDL 只能由使用者在 Supabase SQL Editor 執行**（環境無 DB 憑證）。改 schema 時要寫「可重複執行」的 SQL（`if not exists` / `drop policy if exists`）。

## 關鍵錨點（續）
- **版本更新橫幅**：`app-update.js`（teacher/parent/index 皆載入；`index` 內嵌時 `window.top!==self` 不顯示）。比對「本頁載入版本」(自身 `?v=` 版本戳) 與伺服器 `version.json.build`，不同就在頁面最上方顯示紅色橫幅「有新版本可用／立即更新」。按下＝清 `caches`＋對 SW `postMessage({type:'SKIP_WAITING'})`＋以一次性 `?_v=` 參數 `location.replace` 重載（繞過 HTML 快取），下次載入再把 `_v` 清掉。`sw.js` 已加 `message`→`skipWaiting()`。`bump-version.py` 每次會把同一版本戳寫進 `version.json`。（家長端 iframe 內容 parent-preview、home、parent-guide 目前未掛此橫幅。）
- **個人課表儲存/同步鈕**（index.html）：頂列與管理面板各有「💾 儲存」；頂列另有「↻ 同步」。`doManualSave`＝`save()`＋`window.__scheduleCloudFlush()`（立即 upsert，回 Promise），`doManualSync`＝`window.__schedulePull()`（抓雲端最新）；狀態顯示在 `#saveStatus`/`#saveStatus2`。跨分頁即時同步：監聽 `storage` 事件（同瀏覽器其他分頁/iframe 存檔時即時套用重畫）。

## 慣例 / 部署前
- 改任何被 `?v=` 載入的子資源（js/css/被 iframe 的 html）後，跑 `python3 bump-version.py` 統一版本號（測試 `cache-bust` 會檢查一致）＋自動更新 `version.json`。頂層 HTML 文件本身改動不需 bump。
- 測試：`npm test`（含 cache-bust / boot / pages / preview / parent 等）。改行為時記得同步更新對應測試的 DB stub。
- 只推 `claude/through-this-5f7djl`；PR 合併進 `main`。原 PR 合併後，follow-up 要從最新 `main` 重開同名分支（`git checkout -B ... origin/main`），force-with-lease 推。

## 已完成的大功能（歷史）
- F 兼職薪資＋可蓋章薪資對帳單、勞健保自付額扣除、收入分析、月曆拖曳/複製課次、家長隱私隔離、學費單開立、推播通知（`send-push` 已部署、VAPID 密鑰已設）皆已上線。
- 正職收入（Gemini 讀薪資單）已上線；分頁整併：收入分析移入首頁、兼職＋正職併入「學費與收入」、首頁加「今天課程」，刪除獨立的兼職薪資／收入分析分頁。

## 慣例：更新此檔
- **每次新增功能或結構性改動，都要同步更新本 `CLAUDE.md`**（錨點／資料表／待辦），隨 PR 一起合併。

## 待辦（未完成）
- （目前無）正職收入已改用「上傳薪資單 PDF＋Gemini 判讀實領」完成（HR 系統無 API，不連動）。
