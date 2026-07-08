// ============================================================
// 共通ユーティリティ・集計ロジック（候補者側／スタッフ側で共用）
// ============================================================

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isSupabaseConfigured() {
  const c = window.SUPABASE_CONFIG || {};
  return !!(c.url && c.anonKey && !c.url.includes('YOUR-PROJECT') && !c.anonKey.includes('YOUR-ANON-KEY'));
}

function getSupabaseClient() {
  const c = window.SUPABASE_CONFIG;
  return window.supabase.createClient(c.url, c.anonKey);
}

// 逆転項目を反転させたスコア（6 - 素点）
function reversedValue(raw) {
  return 6 - raw;
}

// カテゴリ別平均スコア（逆転処理後、小数第1位まで） 例: {A:4.2, B:3.6, ...}
function categoryScores(answers, questions, categoryOrder) {
  const sums = {};
  const counts = {};
  categoryOrder.forEach(c => { sums[c] = 0; counts[c] = 0; });
  questions.forEach(q => {
    const raw = answers[q.qid];
    if (raw == null) return;
    const scored = q.reverse ? reversedValue(raw) : raw;
    sums[q.category] += scored;
    counts[q.category]++;
  });
  const out = {};
  categoryOrder.forEach(c => {
    out[c] = counts[c] ? Math.round((sums[c] / counts[c]) * 10) / 10 : 0;
  });
  return out;
}

// 信頼性フラグ判定（仕様書 7章）
function detectFlags(answers, questions, categoryOrder, durationSec) {
  const flags = [];

  // 1. 良く見せすぎ疑い: D4=1 かつ 非逆転項目の平均が4.8以上
  const d4 = answers['D4'];
  const nonReverseVals = questions.filter(q => !q.reverse).map(q => answers[q.qid]).filter(v => v != null);
  const nonReverseAvg = avg(nonReverseVals);
  if (d4 === 1 && nonReverseVals.length > 0 && nonReverseAvg >= 4.8) {
    flags.push({ code: 'social_desirability', label: '回答が理想的すぎる可能性' });
  }

  // 2. ストレートライン回答: 同じ選択肢が15問以上連続（設問データの並び順で判定）
  const orderedIds = questions.map(q => q.qid);
  let maxRun = 0, curRun = 0, prev = null;
  orderedIds.forEach(qid => {
    const v = answers[qid];
    if (v != null && v === prev) {
      curRun++;
    } else {
      curRun = v != null ? 1 : 0;
    }
    prev = v;
    if (curRun > maxRun) maxRun = curRun;
  });
  if (maxRun >= 15) {
    flags.push({ code: 'straight_line', label: '機械的回答の可能性' });
  }

  // 3. 回答時間: 全体の回答時間が3分未満
  if (durationSec != null && durationSec < 180) {
    flags.push({ code: 'too_fast', label: '回答が速すぎる可能性' });
  }

  // 4. 逆転項目の矛盾: 同カテゴリ内で正項目平均と逆転項目(反転後)平均の差が2.0以上
  categoryOrder.forEach(c => {
    const qs = questions.filter(q => q.category === c);
    const normalVals = qs.filter(q => !q.reverse).map(q => answers[q.qid]).filter(v => v != null);
    const reverseVals = qs.filter(q => q.reverse).map(q => answers[q.qid]).filter(v => v != null).map(reversedValue);
    if (normalVals.length > 0 && reverseVals.length > 0) {
      const diff = Math.abs(avg(normalVals) - avg(reverseVals));
      if (diff >= 2.0) {
        flags.push({ code: 'reverse_contradiction_' + c, label: 'カテゴリ' + c + 'の回答に矛盾' });
      }
    }
  });

  return flags;
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ja-JP');
}
