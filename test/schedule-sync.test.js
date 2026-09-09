const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

let failed = false;
function check(name, cond) {
  if (cond) console.log('✓', name);
  else { console.error('✗', name); failed = true; }
}

const idx = read('index.html');
const appUpdate = read('app-update.js');
const sw = read('sw.js');
const teacher = read('teacher.html');
const parent = read('parent.html');
const bump = read('bump-version.py');

// --- 個人班表：儲存鍵 + 跨裝置/跨分頁 ---
check('個人課表有儲存與同步按鈕',
  idx.includes('id="saveScheduleBtn"') && idx.includes('id="syncScheduleBtn"') &&
  idx.includes('id="saveScheduleBtn2"') && idx.includes('id="saveStatus"'));
check('儲存/同步按鈕有處理函式',
  idx.includes('function doManualSave()') && idx.includes('function doManualSync()') &&
  idx.includes("t.id==='saveScheduleBtn'") && idx.includes("t.id==='syncScheduleBtn'"));
check('雲端層提供立即儲存與抓取',
  idx.includes('window.__scheduleCloudFlush=') && idx.includes('window.__schedulePull=') &&
  idx.includes("upsert({key:KEY"));
check('跨分頁即時同步（storage 事件）',
  idx.includes("window.addEventListener('storage'") && idx.includes('e.key===STORAGE_KEY'));

// --- 版本更新橫幅 ---
check('app-update.js 具偵測與更新橫幅邏輯',
  appUpdate.includes("fetch('version.json") && appUpdate.includes('appUpdateBar') &&
  appUpdate.includes('立即更新') && appUpdate.includes("type:'SKIP_WAITING'") &&
  appUpdate.includes('caches.delete') && appUpdate.includes('window.top!==window.self'));
check('三個平台頁面都載入 app-update.js',
  teacher.includes('app-update.js?v=') && parent.includes('app-update.js?v=') && idx.includes('app-update.js?v='));
check('Service Worker 接收 SKIP_WAITING',
  sw.includes("event.data.type === 'SKIP_WAITING'") && sw.includes('self.skipWaiting()'));
check('bump-version.py 產生 version.json',
  bump.includes("open('version.json'") && bump.includes('"build"'));
check('version.json 存在且有 build',
  (() => { try { const v = JSON.parse(read('version.json')); return !!v.build; } catch (_) { return false; } })());

if (failed) process.exit(1);
console.log('schedule-sync checks passed');
