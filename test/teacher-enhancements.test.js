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
  html.includes("kind:ev.dataset.shift?'shift':'lesson'"));
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
check('月曆圖例顯示實際兼職單位名稱',
  html.includes('const shiftEmployers=') &&
  html.includes("w.employers?.name||'未命名兼職單位'") &&
  html.includes('🏫 ${esc(name)}') &&
  !html.includes('🏫 兼職班次</span>'));
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

if (failed) process.exit(1);
