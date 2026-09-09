const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'teacher.html'), 'utf8');
let failed = false;
function check(name, condition) {
  if (condition) console.log('✓', name);
  else { console.error('✗', name); failed = true; }
}

check('拖曳後顯示移動／複製選擇',
  html.includes('mChooseAction(day.dataset.date,payload.kind)') &&
  html.includes('複製到新日期') && html.includes('移動到新日期'));
check('兼職班次也能拖曳移動或複製',
  html.includes('class="event shift" draggable="true"') &&
  html.includes("async function mMoveShift(id,date)") &&
  html.includes("async function mCopyShift(id,date)") &&
  html.includes("payload.kind==='shift'") &&
  html.includes("kind:ev.dataset.shift?'shift':ev.dataset.cevent?'cevent':'lesson'"));
check('兼職單位與班次都有修改入口',
  html.includes('data-edit-employer') && html.includes('data-edit-shift'));
check('修改單位時同步既有班次時薪',
  html.includes("from('work_shifts').update({rate:payload.default_rate}).eq('employer_id',wEditEmployerId)"));
check('薪資對帳單有可靠空狀態',
  html.includes('請先新增兼職單位') && html.includes('新增班次後會自動顯示薪資明細'));
check('教師端個人課表提供 PDF 按鈕',
  html.includes('id="exportSchedulePdf"') && html.includes('frame.contentWindow.print()'));
check('薪資對帳單只列印獨立內容',
  html.includes('function wPrintStatement()') &&
  html.includes('兼職薪資對帳單') &&
  html.includes('薪資核對說明') &&
  html.includes('對帳單編號') &&
  html.includes("safeStyle.textContent='body{padding:7mm!important}.sheet{min-height:245mm!important}'") &&
  !html.includes("wq('printStatement').onclick=()=>window.print()"));
check('月曆兼職班次可展開完整明細',
  html.includes('function showMainCalendarShift(id)') &&
  html.includes('workShifts.find(x=>String(x.id)===String(id))') &&
  html.includes('e.stopImmediatePropagation();showMainCalendarShift') &&
  html.includes('calendarShiftDetail') &&
  html.includes('兼職班次明細') &&
  html.includes('String(x.id)===String(id)') &&
  html.includes('找不到這筆兼職班次') &&
  html.includes("closest('.event[data-shift]')") &&
  html.includes('<th>開始</th><th>結束</th><th>時數</th><th>時薪</th><th>本次金額</th><th>備註</th>') &&
  !html.includes('<span>兼職單位</span>'));
check('月曆圖例改為統一「類別顏色對照」',
  html.includes('類別顏色對照') &&
  html.includes("const order=['tutor','coach','main','admin','parttime','misc']") &&
  !html.includes('const shiftEmployers=') &&
  !html.includes('🏫 兼職班次</span>'));
check('月曆同一類使用同一顏色（CATEGORY_STYLE）',
  html.includes('const CATEGORY_STYLE={') &&
  html.includes("tutor:['#fbd6d6','#a51c1c','家教']") &&
  html.includes("coach:['#d3e6fb','#15528c','輔導課']") &&
  html.includes("main:['#d1efdc','#12694a','正課']") &&
  html.includes("parttime:['#fbe7a2','#8a6a12','兼職（諾貝爾）']") &&
  html.includes('function eventStyle(l){const c=CATEGORY_STYLE.tutor') &&
  html.includes('function personalTypeStyle(e)'));
check('兼職班次月曆改用黃色',
  html.includes('--event-bg:#fbe7a2;--event-text:#8a6a12'));
check('匯入個人班表改為可勾選課程的清單',
  html.includes('function openImportPanel()') &&
  html.includes('function doImport(') &&
  html.includes("IMPORT_PICKS_KEY='bossfu-import-picks'") &&
  html.includes('data-imp="${esc(c.id)}"') &&
  html.includes('localStorage.setItem(IMPORT_PICKS_KEY'));
check('正職/個人/匯入行程也可拖曳移動或複製',
  html.includes('draggable="true" data-cevent="${e.id}"') &&
  html.includes("ev.dataset.cevent?'cevent':'lesson'") &&
  html.includes('async function mMoveCevent(id,date)') &&
  html.includes('async function mCopyCevent(id,date)') &&
  html.includes("payload.kind==='cevent'") &&
  html.includes("kind==='cevent'?'行程':'課次'"));
check('編輯器提供每週重複按鈕',
  html.includes('id="repeatWeekly"') &&
  html.includes('async function repeatWeekly()') &&
  html.includes('每週重複幾週') &&
  html.includes('base.getDate()+i*7') &&
  html.includes("$('repeatWeekly').onclick=repeatWeekly"));
check('提供一鍵清除匯入行程的按鈕（免 SQL）',
  html.includes('id="clearImported"') &&
  html.includes('async function clearImportedEvents()') &&
  html.includes('calEvents.filter(isImportedEvent).map(e=>e.id)') &&
  html.includes("delete().in('id',ids)") &&
  html.includes("$('clearImported').onclick=clearImportedEvents"));
check('匯入的行程可整批清除且不誤刪手動個人行程',
  html.includes('function isImportedEvent(e)') &&
  html.includes("e.note.indexOf('匯入')===0||IMPORTED_LABELS.includes(e.note)") &&
  html.includes("note:'匯入·'+(c.label") &&
  html.includes('先清除先前匯入的固定行程') &&
  html.includes("delete().in('id',oldIds)"));
check('學費與收入展開標題不再覆蓋表單文字',
  html.includes('position:relative;top:auto;background:var(--surface);z-index:1') &&
  !html.includes('position:sticky;top:76px;background:var(--surface);z-index:5'));
check('首頁同時顯示授課與兼職時數',
  html.includes('家教授課時數') && html.includes('兼職班次時數'));
check('正職薪資保存完整應發與扣款明細',
  html.includes('salary_details') && html.includes('salaryEarnings') &&
  html.includes('salaryDeductions') && html.includes('薪資明細JSON'));
check('正職薪資可查看歷史月份並修改',
  html.includes('salaryDetailMonth') && html.includes('修改此月明細') &&
  html.includes("salaryEditMonth||curMonth()") && html.includes('正在修改 '));
check('舊正職收入也可補齊明細且支援多行分析結果',
  html.includes('...Object.keys(incomeMap)') &&
  html.includes('舊資料，可修改補齊明細') &&
  html.includes("source.lastIndexOf('}')") && html.includes('上課日期與時數、時薪及該組小計'));
check('正職薪資分列授課紀錄與其他薪資資訊',
  html.includes('salaryWorkDetails') && html.includes('salaryBenefits') &&
  html.includes('workDetails:parseWork') && html.includes('benefits:parseBenefits') &&
  html.includes('授課與家教詳細紀錄') && html.includes('扣款合計'));
check('薪資單可用外部 AI App 分析後匯入',
  html.includes('複製通用 Prompt') && html.includes('salaryExternalResult') &&
  html.includes('importSalaryResult') && html.includes('navigator.clipboard.writeText') &&
  html.includes('ChatGPT、Gemini 或 Claude'));
check('薪資分析結果可收合總覽並展開全部明細',
  html.includes('salary-editor-head') && html.includes('salary-editor-body') &&
  html.includes('展開所有明細') && html.includes('收起，只看總薪資') &&
  html.includes('showSalaryEditor(false)'));
check('薪資卡收合時仍可直接永久儲存',
  html.includes('saveSalaryTop') &&
  html.includes("$('saveSalaryTop').onclick=()=>$('saveSalary').click()") &&
  html.includes("' 正職收入與明細'"));
check('正職薪資可獨立預覽並另存 PDF',
  html.includes('printSalaryDetail') && html.includes('printFulltimeSalary') &&
  html.includes('正職薪資明細_') && html.includes('@page{size:A4;margin:12mm}') &&
  html.includes('預覽／存 PDF'));
check('首頁提供完整工作儀表板與待處理提醒',
  html.includes('dashExecutive') && html.includes('MONTHLY WORK OVERVIEW') &&
  html.includes('總工作時數') && html.includes('工作平均時薪') &&
  html.includes('接下來的行程') && html.includes('本月待處理'));
check('首頁總工時包含每月正職工時',
  html.includes('salaryWorkHours') && html.includes('workHours:Number(salaryWorkHoursEl.value') &&
  html.includes('savedFulltimeHours=Number(salaryDetails[month]?.workHours') &&
  html.includes('家教 ${tutHours}h・兼職 ${shiftHours}h・正職 ${fulltimeHours}h'));
check('正職工時預設為平日工作天乘以八小時',
  html.includes('fulltimeWorkdays++') && html.includes('fulltimeWorkdays*8') &&
  html.includes('扣除五、日休假') && html.includes('空白時自動扣除每週五、日後 × 8 小時計算'));
check('AI 依薪資表調整加班缺曠與特殊假日工時',
  html.includes('workHoursNote') && html.includes('固定休假日是每週五與每週日') &&
  html.includes('加上實際加班時數、扣除缺曠／缺時') &&
  html.includes('國定假日、颱風假、補班或其他特殊日'));
check('Gmail 一鍵匯入沒有附件時不呼叫 AI',
  html.includes('importGmailSalary') && html.includes("gmailInvoke({action:'import'") &&
  html.includes("if(!found.found)") && html.includes('未使用 AI Token'));
check('Gmail 找到薪資單後自動分析填表且防止重複',
  html.includes('analyzeGmailAttachment(found)') && html.includes("action:'mark_imported'") &&
  html.includes('bossfu-gmail-connected'));
check('教師分頁可長按後拖曳排序並記住順序',
  html.includes("NAV_ORDER_KEY='bossfu-teacher-nav-order-v1'") &&
  html.includes('function setupNavOrder()') && html.includes('setTimeout(()=>') &&
  html.includes('order-editing') && html.includes('order-dragging') &&
  html.includes("localStorage.setItem(NAV_ORDER_KEY") &&
  html.includes('✓ 完成排序'));

if (failed) process.exit(1);
