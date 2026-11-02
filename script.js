(function () {
  'use strict';

  // ==========================================
  // 1. THEME TOGGLE LOGIC
  // ==========================================
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ==========================================
  // 2. CONSTANTS & DOM ELEMENTS
  // ==========================================
  const PRESETS = {
    neet:   { total: 180, correctMarks: 4,   negativeMarks: 1,      unansweredDeduction: 0 },
    jee:    { total: 75,  correctMarks: 4,   negativeMarks: 1,      unansweredDeduction: 0 },
    upsc:   { total: 100, correctMarks: 2,   negativeMarks: 0.6666, unansweredDeduction: 0 },
    ssc:    { total: 100, correctMarks: 2,   negativeMarks: 0.5,    unansweredDeduction: 0 },
    custom: { total: 100, correctMarks: 1,   negativeMarks: 0.25,   unansweredDeduction: 0 }
  };

  const $ = (id) => document.getElementById(id);
  
  const totalEl        = $('total');
  const maxMarksEl     = $('maxMarks');
  const correctEl      = $('correct');
  const incorrectEl    = $('incorrect');
  const attemptedEl    = $('attempted');
  const unattemptedEl  = $('unattempted');
  const correctMarksEl = $('correctMarks');
  const negativeMarksEl= $('negativeMarks');
  const unansweredDedEl= $('unansweredDeduction');
  const fractionSelect = $('fractionSelect');

  const form           = $('calcForm');
  const errorEl        = $('error');
  const resultsData    = $('resultsData');
  const resultsEmpty   = $('resultsEmpty');
  const staleEl        = $('staleNotice');
  const toolsGrid      = document.querySelector('.tools-grid');

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const round2 = (n) => Math.round(n * 100) / 100;
  const round4 = (n) => Math.round(n * 10000) / 10000;

  let syncing = false;
  let lastSnapshot = null;
  let resultsShown = false;

  // ==========================================
  // 3. AUTO-SAVE & LOAD STATE
  // ==========================================
  function saveState() {
    const state = {
      total: totalEl.value, maxMarks: maxMarksEl.value, correct: correctEl.value,
      incorrect: incorrectEl.value, attempted: attemptedEl.value, unattempted: unattemptedEl.value,
      correctMarks: correctMarksEl.value, negativeMarks: negativeMarksEl.value,
      unansweredDeduction: unansweredDedEl.value
    };
    localStorage.setItem('nmc_state', JSON.stringify(state));
  }

  function loadState() {
    const saved = localStorage.getItem('nmc_state');
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      totalEl.value = s.total ?? 100;
      maxMarksEl.value = s.maxMarks ?? 400;
      correctEl.value = s.correct ?? 70;
      incorrectEl.value = s.incorrect ?? 20;
      attemptedEl.value = s.attempted ?? 90;
      unattemptedEl.value = s.unattempted ?? 10;
      correctMarksEl.value = s.correctMarks ?? 4;
      negativeMarksEl.value = s.negativeMarks ?? 1;
      unansweredDedEl.value = s.unansweredDeduction ?? 0;
    } catch(e) {}
  }

  // ==========================================
  // 4. SMART SYNC
  // ==========================================
  function handleInput(name) {
    if (syncing) return;
    syncing = true;

    const total   = num(totalEl.value);
    const correct = num(correctEl.value);
    const incorrect = num(incorrectEl.value);
    const cMarks  = num(correctMarksEl.value);

    switch (name) {
      case 'total':
        attemptedEl.value   = correct + incorrect;
        unattemptedEl.value = Math.max(0, total - correct - incorrect);
        maxMarksEl.value    = round2(total * cMarks);
        break;
      case 'correct':
      case 'incorrect':
        attemptedEl.value   = correct + incorrect;
        unattemptedEl.value = Math.max(0, total - correct - incorrect);
        break;
      case 'attempted': 
        unattemptedEl.value = Math.max(0, total - num(attemptedEl.value));
        break;
      case 'unattempted':
        // Let validation catch the error if total is broken
        break;
      case 'correctMarks':
        maxMarksEl.value = round2(total * cMarks);
        break;
      case 'maxMarks':
        if (total > 0) correctMarksEl.value = round2(num(maxMarksEl.value) / total);
        break;
    }

    syncing = false;
    
    if (resultsShown) {
      staleEl.hidden = false;
      if (toolsGrid) toolsGrid.classList.add('is-stale');
    }
    saveState();
  }

  ['total', 'correct', 'incorrect', 'correctMarks', 'negativeMarks', 'unansweredDeduction']
    .forEach(n => { if($(n)) $(n).addEventListener('input', () => handleInput(n)); });
  ['attempted', 'unattempted', 'maxMarks']
    .forEach(n => { if($(n)) $(n).addEventListener('change', () => handleInput(n)); });

  if (fractionSelect) {
    fractionSelect.addEventListener('change', (e) => {
      const frac = e.target.value;
      if (!frac) return;
      const [n, d] = frac.split('/').map(Number);
      negativeMarksEl.value = round4(num(correctMarksEl.value) * (n / d));
      if (resultsShown) {
        staleEl.hidden = false;
        if (toolsGrid) toolsGrid.classList.add('is-stale');
      }
      saveState();
    });
  }

  // ==========================================
  // 5. PRESETS
  // ==========================================
  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      
      const p = PRESETS[btn.dataset.preset];
      totalEl.value = p.total;
      correctMarksEl.value = p.correctMarks;
      negativeMarksEl.value = p.negativeMarks;
      unansweredDedEl.value = p.unansweredDeduction;
      
      handleInput('total');
      fractionSelect.value = '';
      if (resultsShown) {
        staleEl.hidden = false;
        if (toolsGrid) toolsGrid.classList.add('is-stale');
      }
      saveState();
    });
  });

  // ==========================================
  // 6. STRICT VALIDATION
  // ==========================================
  function validate() {
    document.querySelectorAll('.calc-grid input').forEach(el => {
      el.classList.remove('error-input');
      el.removeAttribute('aria-invalid');
    });
    
    let hasError = false;
    let errMsg = '';

    const fields = {
      total: { el: totalEl, val: parseFloat(totalEl.value), name: 'Total Questions', max: 10000 },
      maxMarks: { el: maxMarksEl, val: parseFloat(maxMarksEl.value), name: 'Maximum Marks', max: 100000 },
      correct: { el: correctEl, val: parseFloat(correctEl.value), name: 'Correct Answers', max: 10000 },
      incorrect: { el: incorrectEl, val: parseFloat(incorrectEl.value), name: 'Incorrect Answers', max: 10000 },
      attempted: { el: attemptedEl, val: parseFloat(attemptedEl.value), name: 'Attempted', max: 10000 },
      unattempted: { el: unattemptedEl, val: parseFloat(unattemptedEl.value), name: 'Unattempted', max: 10000 },
      correctMarks: { el: correctMarksEl, val: parseFloat(correctMarksEl.value), name: 'Marks per Correct', max: 1000 },
      negativeMarks: { el: negativeMarksEl, val: parseFloat(negativeMarksEl.value), name: 'Negative Marks', max: 1000 },
      unansweredDeduction: { el: unansweredDedEl, val: parseFloat(unansweredDedEl.value), name: 'Unanswered Deduction', max: 1000 }
    };

    for (let key in fields) {
      const rawVal = fields[key].el.value.toLowerCase();
      if (rawVal === '' || isNaN(fields[key].val) || rawVal.includes('e')) {
        fields[key].el.classList.add('error-input');
        fields[key].el.setAttribute('aria-invalid', 'true');
        if (!hasError) errMsg = `Please enter a valid number for ${fields[key].name}.`;
        hasError = true;
      }
    }
    if (hasError) return errMsg;

    for (let key in fields) {
      if (fields[key].val < 0) {
        fields[key].el.classList.add('error-input');
        fields[key].el.setAttribute('aria-invalid', 'true');
        if (!hasError) errMsg = `${fields[key].name} cannot be negative.`;
        hasError = true;
      }
      if (fields[key].val > fields[key].max) {
        fields[key].el.classList.add('error-input');
        fields[key].el.setAttribute('aria-invalid', 'true');
        if (!hasError) errMsg = `${fields[key].name} is too large (Max: ${fields[key].max}).`;
        hasError = true;
      }
    }
    if (hasError) return errMsg;

    const wholeNumbers = ['total', 'correct', 'incorrect', 'attempted', 'unattempted'];
    for (let key of wholeNumbers) {
      if (!Number.isInteger(fields[key].val)) {
        fields[key].el.classList.add('error-input');
        fields[key].el.setAttribute('aria-invalid', 'true');
        if (!hasError) errMsg = `${fields[key].name} must be a whole number (no decimals).`;
        hasError = true;
      }
    }
    if (hasError) return errMsg;

    if (fields.total.val <= 0) {
      fields.total.el.classList.add('error-input');
      return 'Total Questions must be greater than 0.';
    }
    if (fields.maxMarks.val <= 0) {
      fields.maxMarks.el.classList.add('error-input');
      return 'Maximum Marks must be greater than 0.';
    }
    if (fields.correctMarks.val <= 0) {
      fields.correctMarks.el.classList.add('error-input');
      return 'Marks per Correct Answer must be greater than 0.';
    }

    if (fields.correct.val + fields.incorrect.val !== fields.attempted.val) {
      fields.correct.el.classList.add('error-input');
      fields.incorrect.el.classList.add('error-input');
      fields.attempted.el.classList.add('error-input');
      return 'Total Attempted must equal Correct + Incorrect.';
    }

    if (fields.attempted.val + fields.unattempted.val !== fields.total.val) {
      fields.total.el.classList.add('error-input');
      fields.attempted.el.classList.add('error-input');
      fields.unattempted.el.classList.add('error-input');
      return 'Total Questions must equal Total Attempted + Unattempted.';
    }

    const expectedMaxMarks = fields.total.val * fields.correctMarks.val;
    if (Math.abs(fields.maxMarks.val - expectedMaxMarks) > 0.05) {
      fields.maxMarks.el.classList.add('error-input');
      fields.correctMarks.el.classList.add('error-input');
      return `Maximum Marks must match Total × Marks per Correct (Expected: ${expectedMaxMarks}).`;
    }

    return null;
  }

  document.querySelectorAll('.calc-grid input').forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error-input');
      input.removeAttribute('aria-invalid');
      if (document.querySelectorAll('.error-input').length === 0 && errorEl) {
        errorEl.hidden = true;
      }
    });
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        input.value = '0';
        handleInput(input.id);
      }
    });
  });

  // ==========================================
  // 7. CALCULATE
  // ==========================================
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const err = validate();
      if (err) {
        errorEl.textContent = err;
        errorEl.hidden = false;
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 
        return;
      }
      
      errorEl.hidden = true; 
      staleEl.hidden = true;
      if (toolsGrid) toolsGrid.classList.remove('is-stale');

      const t = num(totalEl.value), c = num(correctEl.value), i = num(incorrectEl.value), u = num(unattemptedEl.value);
      const cm = num(correctMarksEl.value), mm = num(maxMarksEl.value), nm = num(negativeMarksEl.value), ud = num(unansweredDedEl.value);
      
      const a = c + i;
      const mg = c * cm;
      const ml = i * nm;
      const ul = u * ud;
      const td = ml + ul;
      const fs = mg - td;
      
      const pct = mm > 0 ? (fs / mm) * 100 : 0;
      let estPercentile = 'N/A';
      if (fs >= 0 && mm > 0) {
        const mean = mm * 0.4; 
        const stdDev = mm * 0.15;
        const z = (fs - mean) / stdDev;
        const p = 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI)));
        estPercentile = (p * 100).toFixed(1) + '%';
      }

      const acc = a > 0 ? (c / a) * 100 : null;
      const attRate = t > 0 ? (a / t) * 100 : 0;
      const netAtt = a > 0 ? fs / a : 0;

      lastSnapshot = { t, c, i, u, cm, mm, nm, ud, mg, ml, ul, td, fs, pct, acc, attRate, netAtt, estPercentile };

      $('finalScore').textContent = fs.toFixed(2);
      $('maxScoreOut').textContent = mm.toFixed(2);
      $('scorePct').textContent = pct.toFixed(1) + '%';
      $('accuracy').textContent = acc === null ? 'N/A' : acc.toFixed(2) + '%';
      $('attemptRate').textContent = attRate.toFixed(1) + '%';
      $('netPerAttempt').textContent = netAtt.toFixed(2);
      $('percentileEst').textContent = estPercentile;

      const cP = t ? (c / t) * 100 : 0, iP = t ? (i / t) * 100 : 0, uP = t ? (u / t) * 100 : 0;
      $('barCorrect').style.width = cP + '%';
      $('barIncorrect').style.width = iP + '%';
      $('barUnattempted').style.width = uP + '%';
      
      $('legendCorrect').textContent = c;
      $('legendIncorrect').textContent = i;
      $('legendUnattempted').textContent = u;

      resultsEmpty.hidden = true;
      resultsData.hidden = false;
      resultsShown = true;
      
      $('guessResult').hidden = true;
      $('targetResult').hidden = true;

      const url = new URL(window.location);
      url.searchParams.set('q', t); url.searchParams.set('c', c); url.searchParams.set('i', i);
      url.searchParams.set('m', cm); url.searchParams.set('n', nm); url.searchParams.set('u', ud);
      window.history.replaceState({}, '', url);

      if (navigator.vibrate) navigator.vibrate(50); 

      if (window.matchMedia('(max-width: 960px)').matches) {
        $('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // ==========================================
  // 8. RESET
  // ==========================================
  const resetBtn = $('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('.preset').forEach(b => b.classList.remove('is-active'));
      const customBtn = document.querySelector('.preset[data-preset="custom"]');
      if (customBtn) customBtn.classList.add('is-active');
      
      totalEl.value = 100; correctEl.value = 0; incorrectEl.value = 0;
      attemptedEl.value = 0; unattemptedEl.value = 100;
      correctMarksEl.value = 1; maxMarksEl.value = 100;
      negativeMarksEl.value = 0.25; unansweredDedEl.value = 0;
      fractionSelect.value = '';
      
      errorEl.hidden = true; resultsData.hidden = true; resultsEmpty.hidden = false;
      staleEl.hidden = true; resultsShown = false; lastSnapshot = null;
      if (toolsGrid) toolsGrid.classList.remove('is-stale');
      
      localStorage.removeItem('nmc_state');
      window.history.replaceState({}, '', window.location.pathname);
    });
  }

  // ==========================================
  // 9. ACTIONS (COPY, SHARE, PRINT)
  // ==========================================
  const copyBtn = $('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!lastSnapshot) return;
      const s = lastSnapshot;
      const txt = `Negative Marking Score\nFinal: ${s.fs.toFixed(2)} / ${s.mm.toFixed(2)} (${s.pct.toFixed(2)}%)\nAccuracy: ${s.acc === null ? 'N/A' : s.acc.toFixed(2) + '%'}\nPercentile: ${s.estPercentile}\nC: ${s.c} | I: ${s.i} | U: ${s.u}`;
      try { 
        await navigator.clipboard.writeText(txt); 
        copyBtn.style.color = 'var(--accent)'; 
        setTimeout(() => copyBtn.style.color = '', 500); 
      } catch { alert('Copy failed.'); }
    });
  }

  const shareLinkBtn = $('shareLinkBtn');
  if (shareLinkBtn) {
    shareLinkBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Share link copied to clipboard!');
      } catch { alert('Failed to copy link.'); }
    });
  }

  const printBtn = $('printBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  // ==========================================
  // 10. STRATEGY TOOLS
  // ==========================================
  const guessBtn = $('guessBtn');
  if (guessBtn) {
    guessBtn.addEventListener('click', () => {
      if (!lastSnapshot) { 
        $('guessResult').hidden = false; 
        $('guessResult').innerHTML = '<span style="color:var(--red)">Calculate your score first.</span>'; 
        return; 
      }
      const q = num($('guessQ').value);
      if (q <= 0) { $('guessResult').hidden = true; return; }
      
      const s = lastSnapshot;
      const ev = (q * 0.25 * s.cm) - (q * 0.75 * s.nm);
      
      $('guessResult').hidden = false;
      $('guessResult').innerHTML = `
        <span>Expected Score Change: <strong id="guessEV" style="color: ${ev >= 0 ? 'var(--green)' : 'var(--red)'}">${(ev >= 0 ? '+' : '') + ev.toFixed(2)}</strong></span>
        <span style="font-size:0.7rem; color:var(--ink-3); width:100%; margin-top:4px;">(Assumes 4 options, 25% chance of being correct.)</span>
      `;
    });
  }

  const targetBtn = $('targetBtn');
  if (targetBtn) {
    targetBtn.addEventListener('click', () => {
      const box = $('targetResult');
      if (!lastSnapshot) { 
        box.hidden = false; 
        box.innerHTML = '<span style="color:var(--red)">Calculate your score first.</span>'; 
        return; 
      }
      
      const s = lastSnapshot;
      const target = num($('targetScore').value);
      box.hidden = false;
      
      if (target <= s.fs) { 
        box.innerHTML = `Already reached (${s.fs.toFixed(2)}).`; 
        return; 
      }
      if (s.cm <= 0) { box.innerHTML = `Cannot compute.`; return; }
      
      const needed = Math.ceil((target - s.fs) / s.cm);
      box.innerHTML = `Need <strong>~${needed}</strong> more correct answers${needed > s.u ? ` (only ${s.u} unattempted left)` : ''}.`;
    });
  }

  // ==========================================
  // 11. INITIALIZATION
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    const params = new URLSearchParams(window.location.search);
    if (params.has('q')) {
      totalEl.value = params.get('q') || 100;
      correctEl.value = params.get('c') || 0;
      incorrectEl.value = params.get('i') || 0;
      correctMarksEl.value = params.get('m') || 1;
      negativeMarksEl.value = params.get('n') || 0;
      unansweredDedEl.value = params.get('u') || 0;
      
      handleInput('total');
      if (form) form.dispatchEvent(new Event('submit'));
    }
  });

})();