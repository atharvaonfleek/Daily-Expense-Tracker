var CATS = {
  Food:          '🍔',
  Transport:     '🚌',
  Shopping:      '🛍',
  Bills:         '💡',
  Entertainment: '🎬',
  Health:        '💊',
  Other:         '·'
};

var CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f43f5e'];

var expenses   = [];
var pieInst    = null;
var barInst    = null;
var storageKey = '';

function initApp() {
  storageKey = 'xpense_exp_' + currentUser.email;
  expenses   = JSON.parse(localStorage.getItem(storageKey) || '[]');

  document.getElementById('inputDate').value = getToday();


  var theme = document.documentElement.getAttribute('data-theme') || 'light';
  document.querySelectorAll('.theme-icon').forEach(function(el) {
    el.textContent = theme === 'dark' ? '☀️' : '🌙';
  });

  render();
  buildInsights();
}


function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}



/* ── Add expense ── */
function handleAddExpense() {
  var amount = parseFloat(document.getElementById('inputAmount').value);
  var desc   = document.getElementById('inputDesc').value.trim();
  var date   = document.getElementById('inputDate').value;
  var cat    = document.getElementById('inputCategory').value;

  if (!amount || amount <= 0) { showToast('Enter a valid amount.');      return; }
  if (!desc)                  { showToast('What was this expense for?'); return; }
  if (!date)                  { showToast('Pick a date.');               return; }

  var btn = document.getElementById('addBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Adding…';
  saveExpense(amount, desc, cat, date, btn);
}

function saveExpense(amount, desc, cat, date, btn) {
  expenses.unshift({
    id:       Date.now().toString(),
    amount:   amount,
    desc:     desc,
    category: cat,
    date:     date
  });
  save();
  render();
  document.getElementById('inputAmount').value = '';
  document.getElementById('inputDesc').value   = '';
  document.getElementById('inputDate').value   = getToday();
  btn.disabled = false;
  btn.textContent = 'Add expense';
  showToast('✓ Expense added.');
  buildInsights();
}

/* ── Delete ── */
function deleteExpense(id) {
  expenses = expenses.filter(function(e) { return e.id !== id; });
  save();
  render();
  buildInsights();
}

/* ── Save ── */
function save() { localStorage.setItem(storageKey, JSON.stringify(expenses)); }

/* ── Render all ── */
function render() { renderStats(); renderTx(); renderCharts(); }

/* ── Stats ── */
function renderStats() {
  var total = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  var now   = new Date();
  var mExp  = expenses.filter(function(e) {
    var d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var mTotal = mExp.reduce(function(s,e) { return s + e.amount; }, 0);
  var avg    = now.getDate() > 0 ? mTotal / now.getDate() : 0;
  var tots   = catTotals();
  var sorted = Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; });

  document.getElementById('statTotal').textContent      = '₹' + fmt(total);
  document.getElementById('statMonth').textContent      = '₹' + fmt(mTotal);
  document.getElementById('statMonthLabel').textContent = now.toLocaleString('default', { month: 'long' });
  document.getElementById('statAvg').textContent        = '₹' + fmt(avg);
  document.getElementById('statTop').textContent        = sorted.length ? (CATS[sorted[0]] || '') + ' ' + sorted[0] : '—';
}

/* ── Transactions ── */
function renderTx() {
  var el = document.getElementById('txList');
  if (!expenses.length) { el.innerHTML = '<p class="empty-note">No expenses yet. Add your first one! 👆</p>'; return; }

  var html = '';
  expenses.slice(0, 60).forEach(function(e) {
    var d = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    html += '<div class="tx-row">' +
      '<span class="tx-emoji">' + (CATS[e.category] || '·') + '</span>' +
      '<div class="tx-info">' +
        '<div class="tx-name">' + esc(e.desc) + '</div>' +
        '<div class="tx-meta">' +
          '<span>' + d + '</span>' +
          '<span class="tx-pill">' + e.category + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="tx-amount">−₹' + fmt(e.amount) + '</span>' +
      '<button class="tx-del" onclick="deleteExpense(\'' + e.id + '\')" title="Remove">×</button>' +
    '</div>';
  });
  el.innerHTML = html;
}

/* ── Charts ── */
function renderCharts() {
  var tots   = catTotals();
  var labels = Object.keys(tots);
  var vals   = labels.map(function(k) { return tots[k]; });

  if (pieInst) { pieInst.destroy(); pieInst = null; }
  if (labels.length) {
    pieInst = new Chart(document.getElementById('pieChart'), {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: vals, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: 'transparent', hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'system-ui', size: 11 }, padding: 10, boxWidth: 10 } },
          tooltip: { callbacks: { label: function(c) { return ' ₹' + fmt(c.parsed); } } }
        }
      }
    });
  }

  if (barInst) { barInst.destroy(); barInst = null; }
  var now = new Date(), blabels = [], bvals = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    blabels.push(d.toLocaleString('default', { month: 'short' }));
    var mo = d.getMonth(), yr = d.getFullYear(), sum = 0;
    expenses.forEach(function(ex) {
      var ed = new Date(ex.date);
      if (ed.getMonth() === mo && ed.getFullYear() === yr) sum += ex.amount;
    });
    bvals.push(sum);
  }

  barInst = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels: blabels, datasets: [{ data: bvals, backgroundColor: 'rgba(99,102,241,.18)', borderColor: '#6366f1', borderWidth: 1.5, borderRadius: 6, hoverBackgroundColor: 'rgba(99,102,241,.32)' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ₹' + fmt(c.parsed.y); } } } },
      scales: {
        x: { ticks: { font: { family: 'system-ui', size: 11 } }, grid: { display: false } },
        y: { ticks: { font: { family: 'system-ui', size: 11 }, callback: function(v) { return '₹' + v; } }, grid: { color: 'rgba(99,102,241,.08)' } }
      }
    }
  });
}

/* ── Local insights ── */
function buildInsights() {
  var el = document.getElementById('insightsList');
  if (!expenses.length) { el.innerHTML = '<p class="empty-note">Add a few expenses to see patterns.</p>'; return; }

  var tots   = catTotals();
  var sorted = Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; });
  var total  = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  var top    = sorted[0];
  var pct    = Math.round(tots[top] / total * 100);
  var now    = new Date();
  var mExp   = expenses.filter(function(e) {
    var d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var mTotal = mExp.reduce(function(s,e) { return s + e.amount; }, 0);
  var month  = now.toLocaleString('default', { month: 'long' });

  var rows = [
    '<strong>' + top + '</strong> is your biggest category — ' + pct + '% (₹' + fmt(tots[top]) + ').',
    'You\'ve spent <strong>₹' + fmt(mTotal) + '</strong> in ' + month + ' across ' + mExp.length + ' transaction' + (mExp.length !== 1 ? 's' : '') + '.'
  ];

  el.innerHTML = rows.map(function(r) {
    return '<div class="insight-row"><span class="insight-dot">▸</span><span class="insight-text">' + r + '</span></div>';
  }).join('');
}

/* ── Export to Excel ── */
function exportToExcel() {
  if (!expenses.length) { showToast('No expenses to export yet.'); return; }
  var rows = [['Date','Description','Category','Amount (₹)']];
  expenses.slice().sort(function(a,b) { return new Date(a.date)-new Date(b.date); })
    .forEach(function(e) { rows.push([e.date, e.desc, e.category, e.amount]); });

  var tots  = catTotals();
  var total = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  rows.push([], ['--- Summary ---'], ['Total spent','','',total]);
  Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; })
    .forEach(function(k) { rows.push([k,'','',tots[k]]); });

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch:14 },{ wch:32 },{ wch:16 },{ wch:14 },{ wch:12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  var filename = (currentUser ? currentUser.name.split(' ')[0] : 'Xpense') + '_expenses_' + new Date().toISOString().split('T')[0] + '.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('📊 Excel file downloaded!');
}

/* ── Toast ── */
function showToast(msg) {
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(function() { el.classList.add('fade-out'); setTimeout(function() { el.remove(); }, 400); }, 2800);
}

/* ── Helpers ── */
function catTotals() {
  var t = {};
  expenses.forEach(function(e) { t[e.category] = (t[e.category] || 0) + e.amount; });
  return t;
}
function fmt(n)    { return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function getToday(){ return new Date().toISOString().split('T')[0]; }
function esc(s)    { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── Enter key in expense form ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement ? document.activeElement.id : '';
  if (['inputAmount','inputDesc','inputDate'].includes(id)) handleAddExpense();
});  buildInsights();
}

/* ── Mobile sidebar ── */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* ── AI status ── */
function syncAI() {
  var chip  = document.getElementById('aiChip');
  var label = document.getElementById('aiLabel');
  var hint  = document.getElementById('aiHint');
  if (!chip) return;

  if (apiKey) {
    chip.classList.add('on');
    label.textContent = 'AI on';
    if (hint) hint.classList.remove('is-hidden');
  } else {
    chip.classList.remove('on');
    label.textContent = 'AI off';
    if (hint) hint.classList.add('is-hidden');
  }
}

/* ── API Modal ── */
function openApiModal() {
  document.getElementById('apiKeyInput').value = apiKey;
  document.getElementById('apiModal').classList.remove('is-hidden');
  closeSidebar();
}

function closeApiModal() {
  document.getElementById('apiModal').classList.add('is-hidden');
}

function modalBackdropClick(e) {
  if (e.target === document.getElementById('apiModal')) closeApiModal();
}

function saveApiKey() {
  var k = document.getElementById('apiKeyInput').value.trim();
  if (k && k.indexOf('sk-') !== 0) { showToast('API keys start with sk-'); return; }
  apiKey = k;
  if (k) localStorage.setItem('xpense_key_' + currentUser.email, k);
  else   localStorage.removeItem('xpense_key_' + currentUser.email);
  syncAI();
  closeApiModal();
  showToast(k ? '✨ AI is now on.' : 'AI turned off.');
  if (k) aiInsights(); else buildInsights();
}

/* ── Add expense ── */
function handleAddExpense() {
  var amount = parseFloat(document.getElementById('inputAmount').value);
  var desc   = document.getElementById('inputDesc').value.trim();
  var date   = document.getElementById('inputDate').value;
  var cat    = document.getElementById('inputCategory').value;

  if (!amount || amount <= 0) { showToast('Enter a valid amount.');      return; }
  if (!desc)                  { showToast('What was this expense for?'); return; }
  if (!date)                  { showToast('Pick a date.');               return; }

  var btn = document.getElementById('addBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Adding…';

  if (apiKey) {
    btn.innerHTML = '<span class="spinner"></span>Categorising…';
    aiCategorise(desc, cat, function(finalCat) {
      saveExpense(amount, desc, finalCat, date, btn);
    });
  } else {
    saveExpense(amount, desc, cat, date, btn);
  }
}

function saveExpense(amount, desc, cat, date, btn) {
  expenses.unshift({
    id:       Date.now().toString(),
    amount:   amount,
    desc:     desc,
    category: cat,
    date:     date,
    ai:       !!apiKey
  });
  save();
  render();
  document.getElementById('inputAmount').value = '';
  document.getElementById('inputDesc').value   = '';
  document.getElementById('inputDate').value   = getToday();
  btn.disabled = false;
  btn.textContent = 'Add expense';
  showToast('✓ Expense added.');
  if (apiKey) aiInsights(); else buildInsights();
}

/* ── Delete ── */
function deleteExpense(id) {
  expenses = expenses.filter(function(e) { return e.id !== id; });
  save();
  render();
  if (apiKey) aiInsights(); else buildInsights();
}

/* ── Save ── */
function save() { localStorage.setItem(storageKey, JSON.stringify(expenses)); }

/* ── Render all ── */
function render() { renderStats(); renderTx(); renderCharts(); }

/* ── Stats ── */
function renderStats() {
  var total = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  var now   = new Date();
  var mExp  = expenses.filter(function(e) {
    var d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var mTotal = mExp.reduce(function(s,e) { return s + e.amount; }, 0);
  var avg    = now.getDate() > 0 ? mTotal / now.getDate() : 0;
  var tots   = catTotals();
  var sorted = Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; });

  document.getElementById('statTotal').textContent      = '₹' + fmt(total);
  document.getElementById('statMonth').textContent      = '₹' + fmt(mTotal);
  document.getElementById('statMonthLabel').textContent = now.toLocaleString('default', { month: 'long' });
  document.getElementById('statAvg').textContent        = '₹' + fmt(avg);
  document.getElementById('statTop').textContent        = sorted.length ? (CATS[sorted[0]] || '') + ' ' + sorted[0] : '—';
}

/* ── Transactions ── */
function renderTx() {
  var el = document.getElementById('txList');
  if (!expenses.length) { el.innerHTML = '<p class="empty-note">No expenses yet. Add your first one! 👆</p>'; return; }

  var html = '';
  expenses.slice(0, 60).forEach(function(e) {
    var d = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    html += '<div class="tx-row">' +
      '<span class="tx-emoji">' + (CATS[e.category] || '·') + '</span>' +
      '<div class="tx-info">' +
        '<div class="tx-name">' + esc(e.desc) + '</div>' +
        '<div class="tx-meta">' +
          '<span>' + d + '</span>' +
          '<span class="tx-pill">' + e.category + '</span>' +
          (e.ai ? '<span class="tx-ai-tag">AI</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="tx-amount">−₹' + fmt(e.amount) + '</span>' +
      '<button class="tx-del" onclick="deleteExpense(\'' + e.id + '\')" title="Remove">×</button>' +
    '</div>';
  });
  el.innerHTML = html;
}

/* ── Charts ── */
function renderCharts() {
  var tots   = catTotals();
  var labels = Object.keys(tots);
  var vals   = labels.map(function(k) { return tots[k]; });

  if (pieInst) { pieInst.destroy(); pieInst = null; }
  if (labels.length) {
    pieInst = new Chart(document.getElementById('pieChart'), {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: vals, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: 'transparent', hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Sora', size: 11 }, padding: 10, boxWidth: 10 } },
          tooltip: { callbacks: { label: function(c) { return ' ₹' + fmt(c.parsed); } } }
        }
      }
    });
  }

  if (barInst) { barInst.destroy(); barInst = null; }
  var now = new Date(), blabels = [], bvals = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    blabels.push(d.toLocaleString('default', { month: 'short' }));
    var mo = d.getMonth(), yr = d.getFullYear(), sum = 0;
    expenses.forEach(function(ex) {
      var ed = new Date(ex.date);
      if (ed.getMonth() === mo && ed.getFullYear() === yr) sum += ex.amount;
    });
    bvals.push(sum);
  }

  barInst = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels: blabels, datasets: [{ data: bvals, backgroundColor: 'rgba(99,102,241,.18)', borderColor: '#6366f1', borderWidth: 1.5, borderRadius: 6, hoverBackgroundColor: 'rgba(99,102,241,.32)' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ₹' + fmt(c.parsed.y); } } } },
      scales: {
        x: { ticks: { font: { family: 'Sora', size: 11 } }, grid: { display: false } },
        y: { ticks: { font: { family: 'Sora', size: 11 }, callback: function(v) { return '₹' + v; } }, grid: { color: 'rgba(99,102,241,.08)' } }
      }
    }
  });
}

/* ── Local insights ── */
function buildInsights() {
  var el = document.getElementById('insightsList');
  if (!expenses.length) { el.innerHTML = '<p class="empty-note">Add a few expenses to see patterns.</p>'; return; }

  var tots   = catTotals();
  var sorted = Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; });
  var total  = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  var top    = sorted[0];
  var pct    = Math.round(tots[top] / total * 100);
  var now    = new Date();
  var mExp   = expenses.filter(function(e) {
    var d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var mTotal = mExp.reduce(function(s,e) { return s + e.amount; }, 0);
  var month  = now.toLocaleString('default', { month: 'long' });

  var rows = [
    '<strong>' + top + '</strong> is your biggest category — ' + pct + '% (₹' + fmt(tots[top]) + ').',
    'You\'ve spent <strong>₹' + fmt(mTotal) + '</strong> in ' + month + ' across ' + mExp.length + ' transaction' + (mExp.length !== 1 ? 's' : '') + '.',
    'Enable AI from the sidebar for smarter, personalised insights. 🤖'
  ];

  el.innerHTML = rows.map(function(r) {
    return '<div class="insight-row"><span class="insight-dot">▸</span><span class="insight-text">' + r + '</span></div>';
  }).join('');
}

/* ── AI insights ── */
function aiInsights() {
  if (!apiKey || expenses.length < 2) { buildInsights(); return; }
  var el = document.getElementById('insightsList');
  el.innerHTML = '<p class="empty-note">Thinking…</p>';

  var tots    = catTotals();
  var summary = Object.keys(tots).map(function(k) { return k + ': ₹' + tots[k]; }).join(', ');
  var total   = expenses.reduce(function(s,e) { return s + e.amount; }, 0);

  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', max_tokens: 200,
      messages: [{ role: 'user', content: 'My expenses: ' + summary + '. Total: ₹' + total + '. Write 3 short, honest, friendly observations about my spending. One sentence each. Plain text, one per line, no bullets.' }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var lines = data.choices[0].message.content.trim().split('\n').filter(function(l) { return l.trim(); });
    el.innerHTML = lines.map(function(l) {
      return '<div class="insight-row"><span class="insight-dot">▸</span><span class="insight-text">' + esc(l) + '</span></div>';
    }).join('');
  })
  .catch(function() { buildInsights(); });
}

/* ── AI categorise ── */
function aiCategorise(desc, fallback, callback) {
  var cats = Object.keys(CATS).join(', ');
  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo', max_tokens: 8,
      messages: [{ role: 'user', content: 'Pick ONE category from: ' + cats + '.\nExpense: "' + desc + '"\nOnly the category name.' }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var cat = data.choices[0].message.content.trim();
    callback(CATS[cat] ? cat : fallback);
  })
  .catch(function() { callback(fallback); });
}

/* ── Export to Excel ── */
function exportToExcel() {
  if (!expenses.length) { showToast('No expenses to export yet.'); return; }
  var rows = [['Date','Description','Category','Amount (₹)','Added by AI']];
  expenses.slice().sort(function(a,b) { return new Date(a.date)-new Date(b.date); })
    .forEach(function(e) { rows.push([e.date, e.desc, e.category, e.amount, e.ai ? 'Yes' : 'No']); });

  var tots  = catTotals();
  var total = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  rows.push([], ['--- Summary ---'], ['Total spent','','',total]);
  Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; })
    .forEach(function(k) { rows.push([k,'','',tots[k]]); });

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch:14 },{ wch:32 },{ wch:16 },{ wch:14 },{ wch:12 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  var filename = (currentUser ? currentUser.name.split(' ')[0] : 'Xpense') + '_expenses_' + new Date().toISOString().split('T')[0] + '.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('📊 Excel file downloaded!');
}

/* ── Toast ── */
function showToast(msg) {
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(function() { el.classList.add('fade-out'); setTimeout(function() { el.remove(); }, 400); }, 2800);
}

/* ── Helpers ── */
function catTotals() {
  var t = {};
  expenses.forEach(function(e) { t[e.category] = (t[e.category] || 0) + e.amount; });
  return t;
}
function fmt(n)    { return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function getToday(){ return new Date().toISOString().split('T')[0]; }
function esc(s)    { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── Enter key in expense form ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement ? document.activeElement.id : '';
  if (['inputAmount','inputDesc','inputDate'].includes(id)) handleAddExpense();
});  var label = document.getElementById('aiLabel');
  var hint  = document.getElementById('aiHint');

  if (apiKey) {
    chip.classList.add('on');
    label.textContent = 'AI on';
    hint.classList.remove('is-hidden');
  } else {
    chip.classList.remove('on');
    label.textContent = 'AI off';
    hint.classList.add('is-hidden');
  }
}

/* ── API Modal ── */
function openApiModal() {
  document.getElementById('apiKeyInput').value = apiKey;
  document.getElementById('apiModal').classList.remove('is-hidden');
}

function closeApiModal() {
  document.getElementById('apiModal').classList.add('is-hidden');
}

function modalBackdropClick(e) {
  if (e.target === document.getElementById('apiModal')) closeApiModal();
}

function saveApiKey() {
  var k = document.getElementById('apiKeyInput').value.trim();
  if (k && k.indexOf('sk-') !== 0) { showToast('API keys start with sk-'); return; }

  apiKey = k;
  if (k) {
    localStorage.setItem('xpense_key_' + currentUser.email, k);
  } else {
    localStorage.removeItem('xpense_key_' + currentUser.email);
  }

  syncAI();
  closeApiModal();
  showToast(k ? 'AI is now on.' : 'AI turned off.');
  if (k) aiInsights(); else buildInsights();
}

/* ── Add expense ── */
function handleAddExpense() {
  var amount = parseFloat(document.getElementById('inputAmount').value);
  var desc   = document.getElementById('inputDesc').value.trim();
  var date   = document.getElementById('inputDate').value;
  var cat    = document.getElementById('inputCategory').value;

  if (!amount || amount <= 0) { showToast('Enter an amount.');           return; }
  if (!desc)                  { showToast('What was this expense for?'); return; }
  if (!date)                  { showToast('Pick a date.');               return; }

  var btn = document.getElementById('addBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Adding…';

  if (apiKey) {
    btn.innerHTML = '<span class="spinner"></span>Categorising…';
    aiCategorise(desc, cat, function(finalCat) {
      saveExpense(amount, desc, finalCat, date, btn);
    });
  } else {
    saveExpense(amount, desc, cat, date, btn);
  }
}

function saveExpense(amount, desc, cat, date, btn) {
  expenses.unshift({
    id:       Date.now().toString(),
    amount:   amount,
    desc:     desc,
    category: cat,
    date:     date,
    ai:       !!apiKey
  });

  save();
  render();

  document.getElementById('inputAmount').value = '';
  document.getElementById('inputDesc').value   = '';
  document.getElementById('inputDate').value   = getToday();

  btn.disabled = false;
  btn.textContent = 'Add expense';

  showToast('Expense added.');
  if (apiKey) aiInsights(); else buildInsights();
}

/* ── Delete ── */
function deleteExpense(id) {
  expenses = expenses.filter(function(e) { return e.id !== id; });
  save();
  render();
  if (apiKey) aiInsights(); else buildInsights();
}

/* ── Save ── */
function save() {
  localStorage.setItem(storageKey, JSON.stringify(expenses));
}

/* ── Render all ── */
function render() {
  renderStats();
  renderTx();
  renderCharts();
}

/* ── Stats ── */
function renderStats() {
  var total = expenses.reduce(function(s,e) { return s + e.amount; }, 0);

  var now  = new Date();
  var mExp = expenses.filter(function(e) {
    var d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var mTotal = mExp.reduce(function(s,e) { return s + e.amount; }, 0);
  var avg    = now.getDate() > 0 ? mTotal / now.getDate() : 0;

  var tots   = catTotals();
  var sorted = Object.keys(tots).sort(function(a,b) { return tots[b] - tots[a]; });

  document.getElementById('statTotal').textContent      = '₹' + fmt(total);
  document.getElementById('statMonth').textContent      = '₹' + fmt(mTotal);
  document.getElementById('statMonthLabel').textContent = now.toLocaleString('default', { month: 'long' });
  document.getElementById('statAvg').textContent        = '₹' + fmt(avg);
  document.getElementById('statTop').textContent        = sorted.length ? (CATS[sorted[0]] || '') + ' ' + sorted[0] : '—';
}

/* ── Transactions ── */
function renderTx() {
  var el = document.getElementById('txList');

  if (!expenses.length) {
    el.innerHTML = '<p class="empty-note">No expenses yet.</p>';
    return;
  }

  var html = '';
  var list = expenses.slice(0, 60);

  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    var d = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    html += '<div class="tx-row">' +
      '<span class="tx-emoji">' + (CATS[e.category] || '·') + '</span>' +
      '<div class="tx-info">' +
        '<div class="tx-name">' + esc(e.desc) + '</div>' +
        '<div class="tx-meta">' +
          '<span>' + d + '</span>' +
          '<span class="tx-pill">' + e.category + '</span>' +
          (e.ai ? '<span class="tx-ai-tag">AI</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="tx-amount">−₹' + fmt(e.amount) + '</span>' +
      '<button class="tx-del" onclick="deleteExpense(\'' + e.id + '\')" title="Remove">×</button>' +
    '</div>';
  }

  el.innerHTML = html;
}

/* ── Charts ── */
function renderCharts() {
  var tots   = catTotals();
  var labels = Object.keys(tots);
  var vals   = Object.values ? Object.values(tots) : labels.map(function(k) { return tots[k]; });

  if (pieInst) { pieInst.destroy(); pieInst = null; }

  if (labels.length) {
    pieInst = new Chart(document.getElementById('pieChart'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: vals, backgroundColor: CHART_COLORS, borderWidth: 2, borderColor: '#fff', hoverOffset: 5 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '56%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'DM Sans', size: 11 }, color: '#52525b', padding: 10, boxWidth: 10 }
          },
          tooltip: { callbacks: { label: function(c) { return ' ₹' + fmt(c.parsed); } } }
        }
      }
    });
  }

  if (barInst) { barInst.destroy(); barInst = null; }

  var now     = new Date();
  var blabels = [];
  var bvals   = [];

  for (var i = 5; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    blabels.push(d.toLocaleString('default', { month: 'short' }));
    var mo = d.getMonth();
    var yr = d.getFullYear();
    var sum = 0;
    for (var j = 0; j < expenses.length; j++) {
      var ed = new Date(expenses[j].date);
      if (ed.getMonth() === mo && ed.getFullYear() === yr) sum += expenses[j].amount;
    }
    bvals.push(sum);
  }

  barInst = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: blabels,
      datasets: [{
        data: bvals,
        backgroundColor: 'rgba(99,102,241,.15)',
        borderColor: '#6366f1',
        borderWidth: 1.5,
        borderRadius: 5,
        hoverBackgroundColor: 'rgba(99,102,241,.28)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(c) { return ' ₹' + fmt(c.parsed.y); } } }
      },
      scales: {
        x: { ticks: { color: '#a1a1aa', font: { family: 'DM Sans', size: 11 } }, grid: { color: '#f4f4f5' } },
        y: { ticks: { color: '#a1a1aa', font: { family: 'DM Sans', size: 11 }, callback: function(v) { return '₹' + v; } }, grid: { color: '#f4f4f5' } }
      }
    }
  });
}

/* ── Local insights ── */
function buildInsights() {
  var el = document.getElementById('insightsList');

  if (!expenses.length) {
    el.innerHTML = '<p class="empty-note">Add a few expenses to see patterns.</p>';
    return;
  }

  var tots   = catTotals();
  var sorted = Object.keys(tots).sort(function(a,b) { return tots[b] - tots[a]; });
  var total  = expenses.reduce(function(s,e) { return s + e.amount; }, 0);
  var top    = sorted[0];
  var pct    = Math.round(tots[top] / total * 100);

  var now    = new Date();
  var mExp   = expenses.filter(function(e) {
    var d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  var mTotal = mExp.reduce(function(s,e) { return s + e.amount; }, 0);
  var month  = now.toLocaleString('default', { month: 'long' });

  var rows = [
    '<strong>' + top + '</strong> makes up ' + pct + '% of your spending — ₹' + fmt(tots[top]) + ' total.',
    'You\'ve spent <strong>₹' + fmt(mTotal) + '</strong> this ' + month + ' across ' + mExp.length + ' expense' + (mExp.length !== 1 ? 's' : '') + '.',
    'Enable AI from the sidebar for smarter, personalised observations.'
  ];

  var html = '';
  for (var i = 0; i < rows.length; i++) {
    html += '<div class="insight-row">' +
      '<span class="insight-dot">▸</span>' +
      '<span class="insight-text">' + rows[i] + '</span>' +
    '</div>';
  }
  el.innerHTML = html;
}

/* ── AI insights ── */
function aiInsights() {
  if (!apiKey || expenses.length < 2) { buildInsights(); return; }

  var el = document.getElementById('insightsList');
  el.innerHTML = '<p class="empty-note">Thinking…</p>';

  var tots    = catTotals();
  var keys    = Object.keys(tots);
  var summary = keys.map(function(k) { return k + ': ₹' + tots[k]; }).join(', ');
  var total   = expenses.reduce(function(s,e) { return s + e.amount; }, 0);

  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: 'My expenses: ' + summary + '. Total: ₹' + total + '. Write 3 short, honest, friendly observations about my spending. One sentence each. Plain text, one per line, no bullets.'
      }]
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var lines = data.choices[0].message.content.trim().split('\n').filter(function(l) { return l.trim(); });
    var html  = '';
    for (var i = 0; i < lines.length; i++) {
      html += '<div class="insight-row">' +
        '<span class="insight-dot">▸</span>' +
        '<span class="insight-text">' + esc(lines[i]) + '</span>' +
      '</div>';
    }
    el.innerHTML = html;
  })
  .catch(function() { buildInsights(); });
}

/* ── AI categorise ── */
function aiCategorise(desc, fallback, callback) {
  var cats = Object.keys(CATS).join(', ');

  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: 8,
      messages: [{
        role: 'user',
        content: 'Pick ONE category from: ' + cats + '.\nExpense: "' + desc + '"\nOnly the category name.'
      }]
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var cat = data.choices[0].message.content.trim();
    callback(CATS[cat] ? cat : fallback);
  })
  .catch(function() { callback(fallback); });
}

/* ── Export to Excel ── */
function exportToExcel() {
  if (!expenses.length) {
    showToast('No expenses to export yet.');
    return;
  }

  // Build rows — one per expense, nicely labelled
  var rows = [
    ['Date', 'Description', 'Category', 'Amount (₹)', 'Added by AI']
  ];

  // Sort by date oldest → newest for the sheet
  var sorted = expenses.slice().sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });

  for (var i = 0; i < sorted.length; i++) {
    var e = sorted[i];
    rows.push([
      e.date,
      e.desc,
      e.category,
      e.amount,
      e.ai ? 'Yes' : 'No'
    ]);
  }

  // Add a summary block below the data
  var tots   = catTotals();
  var total  = expenses.reduce(function(s, e) { return s + e.amount; }, 0);

  rows.push([]);  // blank row
  rows.push(['--- Summary ---']);
  rows.push(['Total spent', '', '', total]);

  var catKeys = Object.keys(tots).sort(function(a,b) { return tots[b]-tots[a]; });
  for (var j = 0; j < catKeys.length; j++) {
    rows.push([catKeys[j], '', '', tots[catKeys[j]]]);
  }

  // Create workbook using SheetJS
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths so it looks nice when opened
  ws['!cols'] = [
    { wch: 14 },  // Date
    { wch: 32 },  // Description
    { wch: 16 },  // Category
    { wch: 14 },  // Amount
    { wch: 12 }   // AI
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  // File name includes user name and today's date
  var today    = new Date().toISOString().split('T')[0];
  var firstName = currentUser ? currentUser.name.split(' ')[0] : 'Xpense';
  var filename  = firstName + '_expenses_' + today + '.xlsx';

  XLSX.writeFile(wb, filename);
  showToast('Excel file downloaded!');
}

/* ── Toast ── */
function showToast(msg) {
  var el = document.createElement('div');
  el.className   = 'toast';
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}

/* ── Helpers ── */
function catTotals() {
  var t = {};
  for (var i = 0; i < expenses.length; i++) {
    var cat = expenses[i].category;
    t[cat]  = (t[cat] || 0) + expenses[i].amount;
  }
  return t;
}

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── Enter key in expense form ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement ? document.activeElement.id : '';
  if (id === 'inputAmount' || id === 'inputDesc' || id === 'inputDate') {
    handleAddExpense();
  }
});
