/** Drives the 成績成長 tab: exam entry list + dual-axis growth chart render. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const DIR = path.join(__dirname, '..');
const STUDENTS = [
  { id: 's1', name: '周桓安', subjects: '物理、化學', grade: '高三' },
  { id: 's2', name: '周禹安', subjects: '理化', grade: '國二' },
];
const EXAMS = [
  { id: 'e1', student_id: 's1', term: '115上', exam_name: '第一次段考', exam_date: '2026-09-20',
    subject: '物理', score: 78, full_marks: 100, target_score: 85, class_rank: 12, class_size: 30,
    school_rank: null, weak_points: [{ topic: '牛頓運動', lost: 8, type: '計算題' }], note: '' },
  { id: 'e2', student_id: 's1', term: '115上', exam_name: '第二次段考', exam_date: '2026-10-18',
    subject: '物理', score: 88, full_marks: 100, target_score: 85, class_rank: 8, class_size: 30,
    school_rank: null, weak_points: [], note: '' },
  { id: 'e3', student_id: 's2', term: '115上', exam_name: '第一次段考', exam_date: '2026-09-21',
    subject: '理化', score: 70, full_marks: 100, target_score: 80, class_rank: 20, class_size: 32,
    school_rank: null, weak_points: [], note: '' },
];
const LESSONS = [
  { id: 'l1', student_id: 's1', lesson_date: '2026-09-05', quiz_score: '80' },
  { id: 'l2', student_id: 's1', lesson_date: '2026-10-03', quiz_score: '90' },
];
const SESSION = { access_token: 'x', refresh_token: 'y', user: { id: 'u1' } };

const data = n => n === 'students' ? STUDENTS : n === 'exam_scores' ? EXAMS : n === 'lessons' ? LESSONS : [];
const q = n => { const o = {
  select: () => o, order: () => o, eq: () => o, in: () => o, limit: () => o,
  insert: () => Promise.resolve({ data: null, error: null }), update: () => o, delete: () => o,
  single: () => Promise.resolve({ data: { role: 'teacher', display_name: 'T', is_active: true, must_change_password: false }, error: null }),
  maybeSingle: () => Promise.resolve({ data: (data(n) || [])[0] || null, error: null }),
  then: r => Promise.resolve({ data: data(n), error: null }).then(r) }; return o; };
const client = () => ({
  from: q, rpc: () => Promise.resolve({ data: null, error: null }),
  functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  storage: { from: () => ({ createSignedUrl: () => Promise.resolve({ data: { signedUrl: 'blob:x' }, error: null }),
    upload: () => Promise.resolve({ error: null }), remove: () => Promise.resolve({ error: null }) }) },
  auth: { getSession: () => Promise.resolve({ data: { session: SESSION } }),
    setSession: () => Promise.resolve({ data: { session: SESSION } }),
    refreshSession: () => Promise.resolve({ data: { session: SESSION } }),
    signOut: () => Promise.resolve({}), updateUser: () => Promise.resolve({ error: null }),
    signInWithPassword: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
});

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? '  (' + extra + ')' : ''}`); }
};

(async () => {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/not implemented|Could not load/i.test(e.message)) errors.push(e.message); });

  let src = fs.readFileSync(path.join(DIR, 'teacher.html'), 'utf8');
  src = src.replace(/<script type="module"([^>]*)>([\s\S]*?)<\/script>/g, (m, attrs, body) => {
    if (/\bsrc=/.test(attrs)) return '';
    return '<scr' + 'ipt>(async()=>{' + body + '})();</scr' + 'ipt>';
  });
  src = src.replace(/<script type="module" src="[^"]*"><\/script>/g, '');

  const dom = new JSDOM(src, { runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://example.test/teacher.html', virtualConsole: vc,
    beforeParse(win) {
      win.SUPABASE_CONFIG = { url: 'https://x.supabase.co', publishableKey: 'k' };
      win.supabase = { createClient: client }; win.BOSSFU_DB = client();
      win.alert = m => errors.push('alert(): ' + m); win.confirm = () => true; win.print = () => {};
      win.scrollTo = () => {};
      Object.defineProperty(win.HTMLElement.prototype, 'scrollIntoView', { value() {}, writable: true });
    } });
  const win = dom.window, doc = win.document;
  const $ = id => doc.getElementById(id);
  await new Promise(r => setTimeout(r, 1200));

  console.log('\n=== 成績成長分頁 ===');
  const navBtn = doc.querySelector('[data-view="scores"]');
  check('導覽有「成績成長」分頁按鈕', !!navBtn);
  navBtn && navBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));

  check('切換到 scores 分頁', $('scores') && $('scores').classList.contains('active'));
  check('學生下拉填入學生', $('examStudent') && $('examStudent').options.length >= 2, String($('examStudent') && $('examStudent').options.length));
  check('科目下拉預設帶第一科', $('examSubject') && $('examSubject').value === '物理', $('examSubject') && $('examSubject').value);

  const listHtml = $('examList') ? $('examList').innerHTML : '';
  check('歷次段考列出該生段考', listHtml.includes('第一次段考') && listHtml.includes('第二次段考'));
  check('段考列出失分弱點標籤', listHtml.includes('牛頓運動'));

  const chart = $('growthChart') ? $('growthChart').innerHTML : '';
  check('成長曲線畫出 SVG', chart.includes('<svg'));
  check('成長曲線有分數主線（藍）', chart.includes('#1d5fb0'));
  check('成長曲線有名次線（紫）', chart.includes('#7c3aed'));
  check('成長曲線有目標虛線', chart.includes('stroke-dasharray'));

  const metrics = $('growthMetrics') ? $('growthMetrics').innerHTML : '';
  check('指標卡顯示最新分數', metrics.includes('最新分數') && metrics.includes('88'));
  check('指標卡顯示名次變化', metrics.includes('名次變化') || metrics.includes('最新名次'));

  const overview = $('growthOverview') ? $('growthOverview').innerHTML : '';
  check('全學生總覽有列', overview.includes('gov-row') && overview.includes('周桓安'));

  // 新增一筆弱點列
  $('examWeakAdd') && $('examWeakAdd').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 40));
  check('可新增失分弱點列', $('examWeakList') && $('examWeakList').querySelectorAll('.weak-row').length >= 1);

  // 疊加週考平均
  if ($('growthQuiz')) { $('growthQuiz').checked = true; $('growthQuiz').dispatchEvent(new win.Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 40)); }
  check('可疊加週考平均線', ($('growthChart').innerHTML || '').includes('#9bbcd6'));

  check('全程沒有 runtime error / alert', errors.length === 0, errors.join(' | '));

  win.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
