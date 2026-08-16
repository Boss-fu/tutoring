const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'teacher.html'), 'utf8');
let failed = false;
function check(name, condition) {
  if (condition) console.log('✓', name);
  else { console.error('✗', name); failed = true; }
}

check('拖曳後顯示移動／複製選擇',
  html.includes('mChooseAction(day.dataset.date)') &&
  html.includes('複製到新日期') && html.includes('移動到新日期'));
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
  html.includes("wq('printStatement').onclick=wPrintStatement") &&
  !html.includes("wq('printStatement').onclick=()=>window.print()"));
check('月曆兼職班次可展開完整明細',
  html.includes('function wShowCalendarShift(id)') &&
  html.includes('calendarShiftDetail') &&
  html.includes('兼職班次明細') &&
  html.includes("closest('.event[data-shift]')") &&
  html.includes('本次金額'));
check('月曆圖例顯示實際兼職單位名稱',
  html.includes('const shiftEmployers=') &&
  html.includes("w.employers?.name||'未命名兼職單位'") &&
  html.includes('🏫 ${esc(name)}') &&
  !html.includes('🏫 兼職班次</span>'));

if (failed) process.exit(1);
