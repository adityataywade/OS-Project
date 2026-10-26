'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const COLORS = ['#4ecdc4', '#8299ff', '#c1a3ff', '#ffbd76', '#ff8195', '#72d9a7', '#5dbbff', '#ff9cce', '#c6d77f', '#f29f75'];
  const ALGORITHMS = [
    { value: 'fcfs', label: 'FCFS', full: 'First Come, First Served' },
    { value: 'sjf', label: 'SJF', full: 'Shortest Job First (non-preemptive)' },
    { value: 'srtf', label: 'SRTF', full: 'Shortest Remaining Time First' },
    { value: 'priority', label: 'Priority', full: 'Priority (non-preemptive)' },
    { value: 'priority-p', label: 'Priority P.', full: 'Priority (preemptive)' },
    { value: 'rr', label: 'Round Robin', full: 'Round Robin' }
  ];
  const CPU_SAMPLE = [
    { id: 'P1', arrival: 0, burst: 7, priority: 2 },
    { id: 'P2', arrival: 2, burst: 4, priority: 1 },
    { id: 'P3', arrival: 4, burst: 1, priority: 3 },
    { id: 'P4', arrival: 5, burst: 4, priority: 2 }
  ];
  const BANKER_SAMPLE = {
    allocation: [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],
    maximum: [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],
    available: [3,3,2]
  };
  let currentView = 'dashboard';
  let cpuProcesses = CPU_SAMPLE.map(p => ({ ...p }));
  let cpuAlgorithm = 'fcfs';
  let cpuQuantum = 2;
  let cpuResult = null;
  let memoryInput = { reference: '7 0 1 2 0 3 0 4 2 3 0 3 2', frames: 3, algorithm: 'lru' };
  let memoryResult = null;
  let diskInput = { requests: '98 183 37 122 14 124 65 67', head: 53, min: 0, max: 199, direction: 'right', algorithm: 'sstf' };
  let diskResult = null;
  let bankerData = cloneBanker(BANKER_SAMPLE);
  let bankerResult = null;
  let bankerRequestResult = null;
  let bankerRequestProcess = 1;
  let bankerRequest = [1, 0, 2];
  let syncCapacity = 3;
  let syncBuffer = [];
  let syncNextItem = 1;
  let syncOperations = [];
  let syncEvents = [];
  let syncSemaphores = { empty: 3, full: 0, mutex: 1 };
  let fileDiskBlockCount = 24;
  let fileReservedText = '4 9 14 19';
  let fileRequestsText = 'A:3, B:3, C:3, D:3, E:5';
  let fileAllocationMethod = 'contiguous';
  let fileAllocationResult = null;
  let fileAllocationComparison = null;

  function cloneBanker(d) {
    return { allocation: d.allocation.map(r => [...r]), maximum: d.maximum.map(r => [...r]), available: [...d.available] };
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
  function number(v) { return Number(v); }
  function intField(value, label, min = 0, max = 1000000) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
    return n;
  }
  function parseIntList(value, label) {
    const tokens = String(value).trim().split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) throw new Error(`${label} cannot be empty.`);
    return tokens.map((token, i) => intField(token, `${label} item ${i + 1}`, 0, 1000000));
  }
  function avg(arr, key) { return arr.length ? arr.reduce((s, x) => s + x[key], 0) / arr.length : 0; }
  function fmt(n, digits = 2) { return Number.isFinite(n) ? Number(n).toFixed(digits).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') : '—'; }
  function algLabel(key) { return ALGORITHMS.find(a => a.value === key)?.full || key; }
  function algShort(key) { return ALGORITHMS.find(a => a.value === key)?.label || key; }
  function tag(text, cls = '') { return `<span class="pill ${cls}">${text}</span>`; }
  function processColor(id) { const m = String(id).match(/\d+/); return COLORS[((m ? Number(m[0]) - 1 : 0) % COLORS.length + COLORS.length) % COLORS.length]; }
  function showToast(title, message, type = 'success') {
    const region = $('#toastRegion');
    const node = document.createElement('div');
    node.className = `toast ${type === 'error' ? 'error' : ''}`;
    node.innerHTML = `<span class="toast-icon">${type === 'error' ? '!' : '✓'}</span><div><strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
    region.appendChild(node);
    window.setTimeout(() => node.remove(), 3600);
  }
  function setTheme(theme) {
    const bright = theme === 'bright';
    document.body.dataset.theme = bright ? 'bright' : 'dark';
    const toggle = $('#themeToggle');
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(bright));
    toggle.setAttribute('aria-label', bright ? 'Switch to dark mode' : 'Switch to bright mode');
    toggle.title = bright ? 'Switch to dark mode' : 'Switch to bright mode';
    $('.theme-toggle-label', toggle).textContent = bright ? 'Dark' : 'Bright';
    $('.theme-toggle-icon', toggle).textContent = bright ? '☾' : '☀';
  }
  const savedTheme = window.localStorage.getItem('os-lab-theme');
  setTheme(savedTheme === 'bright' ? 'bright' : 'dark');
  function setView(view) {
    currentView = view;
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    $('#pageCrumb').textContent = ({ dashboard:'Overview', cpu:'CPU Scheduling', memory:'Page Replacement', disk:'Disk Scheduling', banker:'Deadlock Avoidance', sync:'Synchronization', files:'File Allocation', cpp:'C++ Practical Guide', concepts:'OS Concepts' })[view] || 'Overview';
    $('#sidebar').classList.remove('open');
    if (view === 'dashboard') renderDashboard();
    else if (view === 'cpu') renderCpu();
    else if (view === 'memory') renderMemory();
    else if (view === 'disk') renderDisk();
    else if (view === 'banker') renderBanker();
    else if (view === 'sync') renderSync();
    else if (view === 'files') renderFileAllocation();
    else if (view === 'cpp') renderCppGuide();
    else renderConcepts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function heading(eyebrow, title, description, actions = '') {
    return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
  }
  function panel(title, desc, body, actions = '') {
    return `<section class="panel"><div class="panel-header"><div><h2>${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div>${actions}</div><div class="panel-body">${body}</div></section>`;
  }
  function emptyState(symbol, title, description) {
    return `<div class="empty-state"><div class="empty-symbol">${symbol}</div><strong>${title}</strong><p>${description}</p></div>`;
  }
  function metricCard(label, value, caption, symbol, accent = 'cyan') {
    const colors = { cyan: ['#17343b','#64e3d3','rgba(97,231,212,.08)'], blue: ['#1c2947','#8ba6ff','rgba(125,155,255,.08)'], purple: ['#2b2345','#c1abff','rgba(181,161,255,.08)'], orange: ['#38291e','#ffc383','rgba(255,189,118,.08)'] }[accent];
    return `<div class="metric-card" style="--icon-bg:${colors[0]};--icon-color:${colors[1]};--glow:${colors[2]}"><div class="metric-top"><span>${label}</span><span class="metric-symbol">${symbol}</span></div><div class="metric-value">${value}</div><div class="metric-caption">${caption}</div></div>`;
  }
  function renderDashboard() {
    const content = $('#appContent');
    content.innerHTML = `
      <section class="dashboard-hero">
        <div class="hero-copy"><span class="hero-label"><span class="status-dot"></span> INTERACTIVE OPERATING SYSTEMS LAB</span><h1>Understand the OS.<br><em>One simulation at a time.</em></h1><p>A hands-on lab for exploring scheduling, virtual memory, disk movement, semaphore synchronization, deadlock avoidance, and file allocation—with editable workloads and visual results.</p><div class="hero-actions"><button class="btn btn-primary" data-open="cpu">Launch CPU Lab <span>↗</span></button><button class="btn" data-open="concepts">Explore OS concepts</button></div></div>
        <div class="hero-visual" aria-hidden="true"><div class="chip-graphic"><div class="chip-core"><span>OS</span></div><i class="orbit-dot one"></i><i class="orbit-dot two"></i><i class="orbit-dot three"></i></div></div>
      </section>
      <div class="metric-grid">${metricCard('SIMULATION MODULES','06','Core OS lab areas','⌘','cyan')}${metricCard('CPU ALGORITHMS','06','Preemptive and non-preemptive','▥','blue')}${metricCard('MEMORY POLICIES','03','FIFO · LRU · Optimal','▤','purple')}${metricCard('INSTALLATION','0','Packages required','↯','orange')}</div>
      <div class="section-title-row"><div><h2>Choose your lab</h2><p>Each module includes input controls, algorithm execution, and an interpretation-ready result.</p></div><span class="pill cyan">6 MODULES AVAILABLE</span></div>
      <div class="module-grid">
        <article class="module-card" data-open="cpu" tabindex="0" role="button" aria-label="Open CPU scheduling lab" style="--icon-bg:#15343b;--icon-border:#2a5d62;--icon-color:#69e2d1"><div class="module-icon">▥</div><h3>CPU Scheduling</h3><p>Compare process dispatch policies with a live Gantt chart and per-process waiting, turnaround, and response metrics.</p><div class="tag-row"><span class="tag">FCFS</span><span class="tag">SJF / SRTF</span><span class="tag">Priority</span><span class="tag">Round Robin</span></div><div class="module-link">Open scheduler <span>→</span></div></article>
        <article class="module-card" data-open="memory" tabindex="0" role="button" aria-label="Open page replacement lab" style="--icon-bg:#20274c;--icon-border:#414e7f;--icon-color:#a6b4ff"><div class="module-icon">▤</div><h3>Page Replacement</h3><p>See exactly which page is evicted from memory. Inspect each reference step, frame contents, hits, and page faults.</p><div class="tag-row"><span class="tag">FIFO</span><span class="tag">LRU</span><span class="tag">Optimal</span></div><div class="module-link">Open memory lab <span>→</span></div></article>
        <article class="module-card" data-open="disk" tabindex="0" role="button" aria-label="Open disk scheduling lab" style="--icon-bg:#38291f;--icon-border:#60442e;--icon-color:#ffc080"><div class="module-icon">◉</div><h3>Disk Scheduling</h3><p>Visualize disk-head travel across cylinders and compare total seek movement for six request-ordering algorithms.</p><div class="tag-row"><span class="tag">FCFS / SSTF</span><span class="tag">SCAN / C-SCAN</span><span class="tag">LOOK / C-LOOK</span></div><div class="module-link">Open disk lab <span>→</span></div></article>
        <article class="module-card" data-open="banker" tabindex="0" role="button" aria-label="Open deadlock avoidance lab" style="--icon-bg:#183328;--icon-border:#2c5945;--icon-color:#8fe7b6"><div class="module-icon">⛨</div><h3>Deadlock Avoidance</h3><p>Apply the Banker's safety algorithm, derive the Need matrix, find a safe sequence, and test a resource request safely.</p><div class="tag-row"><span class="tag">Allocation</span><span class="tag">Need matrix</span><span class="tag">Safe sequence</span></div><div class="module-link">Open deadlock lab <span>→</span></div></article>
        <article class="module-card" data-open="sync" tabindex="0" role="button" aria-label="Open process synchronization lab" style="--icon-bg:#302546;--icon-border:#59457a;--icon-color:#d1b4ff"><div class="module-icon">⇄</div><h3>Semaphore Synchronization</h3><p>Explore the Producer–Consumer problem using empty, full, and mutex semaphores. Trigger successful operations and blocked cases with a live buffer.</p><div class="tag-row"><span class="tag">IPC</span><span class="tag">Mutex</span><span class="tag">Producer–Consumer</span></div><div class="module-link">Open synchronization lab <span>→</span></div></article>
        <article class="module-card" data-open="files" tabindex="0" role="button" aria-label="Open file allocation lab" style="--icon-bg:#253a2b;--icon-border:#3d6646;--icon-color:#a5edaa"><div class="module-icon">▦</div><h3>File Allocation Lab</h3><p>Compare Contiguous, Linked, and Indexed allocation across a block map. Inspect fragmentation, pointer chains, index overhead, and allocation failures.</p><div class="tag-row"><span class="tag">Contiguous</span><span class="tag">Linked</span><span class="tag">Indexed</span></div><div class="module-link">Open file-system lab <span>→</span></div></article>
      </div>
      <div class="helper-note" style="margin-top:17px"><strong>Lab tip:</strong> Start with sample values, run the algorithm once, then change one input at a time. In your viva, explain both the rule used by the algorithm and what the resulting chart or table demonstrates.</div>`;
    bindOpenButtons();
  }

  // ------------------------------- CPU SCHEDULING -------------------------------
  function readCpuDom() {
    const rows = $$('#cpuProcessBody tr');
    cpuProcesses = rows.map((tr, index) => ({
      id: tr.dataset.pid,
      arrival: intField($('[data-prop="arrival"]', tr).value, `${tr.dataset.pid} arrival time`, 0, 100000),
      burst: intField($('[data-prop="burst"]', tr).value, `${tr.dataset.pid} burst time`, 1, 1000),
      priority: intField($('[data-prop="priority"]', tr).value, `${tr.dataset.pid} priority`, 1, 100000),
      index
    }));
    if (!cpuProcesses.length) throw new Error('Add at least one process to run a simulation.');
    cpuAlgorithm = $('#cpuAlgorithm').value;
    const quantumValue = Number($('#cpuQuantum').value);
    cpuQuantum = ['rr', 'compare'].includes(cpuAlgorithm)
      ? intField($('#cpuQuantum').value, 'Time quantum', 1, 100000)
      : (Number.isFinite(quantumValue) && quantumValue > 0 ? quantumValue : 2);
  }
  function processRowsHtml() {
    return cpuProcesses.map((p, i) => `<tr data-pid="${esc(p.id)}"><td><span class="process-id"><i class="process-dot" style="--pc:${processColor(p.id)}"></i>${esc(p.id)}</span></td><td><input type="number" min="0" max="100000" step="1" data-prop="arrival" aria-label="${p.id} arrival time" value="${p.arrival}"></td><td><input type="number" min="1" max="1000" step="1" data-prop="burst" aria-label="${p.id} burst time" value="${p.burst}"></td><td><input type="number" min="1" max="100000" step="1" data-prop="priority" aria-label="${p.id} priority" value="${p.priority}"></td><td><button class="delete-row" data-remove-pid="${esc(p.id)}" aria-label="Remove ${esc(p.id)}" title="Remove process">×</button></td></tr>`).join('');
  }
  function renderCpu() {
    $('#appContent').innerHTML = `${heading('PROCESS MANAGEMENT / LAB 01','CPU Scheduling Simulator','Edit a process workload, choose a scheduling policy, and inspect exactly how the CPU is assigned over time.', '<button class="btn" id="cpuCppBtn">&lt;/&gt; View C++ practical</button><button class="btn" id="cpuExportBtn" '+(cpuResult?'':'disabled')+'>↓ Export CSV</button><button class="btn" id="cpuSampleBtn">↺ Load sample</button><button class="btn btn-primary" id="cpuRunTop">Run simulation →</button>')}
      <div class="workspace-grid">
        <div class="stack">
          ${panel('01 / Process workload','Arrival = when a process joins the ready queue. Lower priority number means higher priority.', `<div class="table-wrap"><table class="data-table"><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr></thead><tbody id="cpuProcessBody">${processRowsHtml()}</tbody></table></div><div class="form-actions" style="margin-top:10px;padding-top:10px"><button class="btn" id="cpuAddBtn">＋ Add process</button><span class="inline-tip">Use positive burst times and non-negative arrivals.</span></div>`)}
          ${panel('02 / Scheduling policy','Select an algorithm and configure the time quantum when using Round Robin.', `<div class="field"><label for="cpuAlgorithm">Scheduling algorithm</label><select id="cpuAlgorithm">${ALGORITHMS.map(a => `<option value="${a.value}" ${cpuAlgorithm === a.value ? 'selected' : ''}>${a.full}</option>`).join('')}<option value="compare" ${cpuAlgorithm === 'compare' ? 'selected' : ''}>Compare all algorithms</option></select></div><div class="field" id="quantumField" style="margin-top:12px"><label for="cpuQuantum">Round Robin time quantum</label><input id="cpuQuantum" type="number" min="1" step="1" value="${cpuQuantum}"><div class="input-hint">Each process can run for at most this many time units per turn.</div></div><div class="form-actions"><button class="btn btn-primary" id="cpuRunBtn">▶ Run simulation</button><button class="btn" id="cpuResetBtn">Reset sample</button></div><div class="helper-note"><strong>Scheduling rule:</strong> In FCFS, SJF and Priority (non-preemptive), a selected process runs until completion. SRTF and preemptive Priority may interrupt it. Round Robin cycles through a ready queue.</div>`)}
        </div>
        <div class="stack" id="cpuOutput">${renderCpuOutput()}</div>
      </div>`;
    bindCpuEvents();
  }
  function mergeSegment(segments, id, start, end) {
    if (end <= start) return;
    const last = segments[segments.length - 1];
    if (last && last.id === id && last.end === start) last.end = end;
    else segments.push({ id, start, end });
  }
  function scheduleCpu(input, alg, quantum = 2) {
    const jobs = input.map((p, index) => ({ ...p, index: p.index ?? index, remaining: p.burst, first: null, finish: null }));
    let time = 0;
    let done = 0;
    const segments = [];
    if (['fcfs', 'sjf', 'priority'].includes(alg)) {
      while (done < jobs.length) {
        let ready = jobs.filter(p => p.remaining > 0 && p.arrival <= time);
        if (!ready.length) {
          const next = Math.min(...jobs.filter(p => p.remaining > 0).map(p => p.arrival));
          mergeSegment(segments, 'Idle', time, next);
          time = next;
          ready = jobs.filter(p => p.remaining > 0 && p.arrival <= time);
        }
        let p;
        if (alg === 'fcfs') p = ready.sort((a,b) => a.arrival-b.arrival || a.index-b.index)[0];
        else if (alg === 'sjf') p = ready.sort((a,b) => a.burst-b.burst || a.arrival-b.arrival || a.index-b.index)[0];
        else p = ready.sort((a,b) => a.priority-b.priority || a.arrival-b.arrival || a.index-b.index)[0];
        if (p.first === null) p.first = time;
        const start = time;
        time += p.remaining;
        p.remaining = 0;
        p.finish = time;
        mergeSegment(segments, p.id, start, time);
        done++;
      }
    } else if (alg === 'srtf' || alg === 'priority-p') {
      while (done < jobs.length) {
        let ready = jobs.filter(p => p.remaining > 0 && p.arrival <= time);
        if (!ready.length) {
          const next = Math.min(...jobs.filter(p => p.remaining > 0).map(p => p.arrival));
          mergeSegment(segments, 'Idle', time, next);
          time = next;
          ready = jobs.filter(p => p.remaining > 0 && p.arrival <= time);
        }
        const p = alg === 'srtf'
          ? ready.sort((a,b) => a.remaining-b.remaining || a.arrival-b.arrival || a.index-b.index)[0]
          : ready.sort((a,b) => a.priority-b.priority || a.arrival-b.arrival || a.index-b.index)[0];
        if (p.first === null) p.first = time;
        const start = time;
        p.remaining--;
        time++;
        mergeSegment(segments, p.id, start, time);
        if (p.remaining === 0) { p.finish = time; done++; }
      }
    } else if (alg === 'rr') {
      const sorted = jobs.slice().sort((a,b) => a.arrival-b.arrival || a.index-b.index);
      const queue = [];
      let nextIndex = 0;
      while (done < jobs.length) {
        while (nextIndex < sorted.length && sorted[nextIndex].arrival <= time) queue.push(sorted[nextIndex++]);
        if (!queue.length) {
          const next = sorted[nextIndex].arrival;
          mergeSegment(segments, 'Idle', time, next);
          time = next;
          while (nextIndex < sorted.length && sorted[nextIndex].arrival <= time) queue.push(sorted[nextIndex++]);
        }
        const p = queue.shift();
        if (p.first === null) p.first = time;
        const start = time;
        const runFor = Math.min(quantum, p.remaining);
        time += runFor;
        p.remaining -= runFor;
        mergeSegment(segments, p.id, start, time);
        while (nextIndex < sorted.length && sorted[nextIndex].arrival <= time) queue.push(sorted[nextIndex++]);
        if (p.remaining > 0) queue.push(p);
        else { p.finish = time; done++; }
      }
    } else throw new Error('Choose a valid scheduling algorithm.');
    const rows = jobs.map(p => {
      const turnaround = p.finish - p.arrival;
      const waiting = turnaround - p.burst;
      const response = p.first - p.arrival;
      return { id:p.id, arrival:p.arrival, burst:p.burst, priority:p.priority, first:p.first, finish:p.finish, turnaround, waiting, response, index:p.index };
    }).sort((a,b) => a.index-b.index);
    const burstTotal = rows.reduce((s,p) => s+p.burst, 0);
    const finish = Math.max(...rows.map(p => p.finish));
    const busyStart = Math.min(...rows.map(p => p.arrival));
    const elapsedAfterFirstArrival = finish - busyStart;
    return {
      algorithm: alg, rows, segments, finish, burstTotal,
      avgWait: avg(rows,'waiting'), avgTurn: avg(rows,'turnaround'), avgResponse: avg(rows,'response'),
      utilization: finish > 0 ? burstTotal / finish * 100 : 0,
      utilizationFromFirstArrival: elapsedAfterFirstArrival > 0 ? burstTotal / elapsedAfterFirstArrival * 100 : 0,
      throughput: finish > 0 ? rows.length / finish : 0
    };
  }
  function runCpuAndRender() {
    try {
      readCpuDom();
      const base = cpuProcesses.map((p,index) => ({ ...p, index }));
      if (cpuAlgorithm === 'compare') {
        const results = ALGORITHMS.map(a => scheduleCpu(base, a.value, cpuQuantum));
        results.sort((a,b) => a.avgWait-b.avgWait || a.avgTurn-b.avgTurn);
        cpuResult = { compare: results, primary: results[0] };
      } else cpuResult = { primary: scheduleCpu(base, cpuAlgorithm, cpuQuantum), compare: null };
      renderCpu();
      showToast('Simulation completed', cpuAlgorithm === 'compare' ? 'All six scheduling policies were compared.' : `${algLabel(cpuAlgorithm)} completed successfully.`);
    } catch (error) { showToast('Unable to run simulation', error.message, 'error'); }
  }
  function ganttHtml(result) {
    if (!result || !result.segments.length) return emptyState('▥','No simulation result yet','Run the scheduler to generate the Gantt chart and timing metrics.');
    const total = Math.max(1, result.finish);
    const segments = result.segments.map((s, i) => {
      const duration = s.end-s.start;
      const scale = Math.min(48, 1100 / total);
      const width = Math.max(22, duration * scale);
      const bg = s.id === 'Idle' ? '#2a3445' : processColor(s.id);
      return `<div class="gantt-segment ${s.id === 'Idle' ? 'idle' : ''}" style="width:${width}px;background:${bg};flex-basis:${width}px" title="${esc(s.id)}: ${s.start} to ${s.end}"><span>${esc(s.id)}</span><small>${duration} unit${duration === 1 ? '' : 's'}</small><i class="end-tick">${s.end}</i></div>`;
    }).join('');
    const legend = [...new Set(result.segments.map(s=>s.id))].map(id=>`<span class="legend-item"><i class="legend-square" style="background:${id==='Idle'?'#2a3445':processColor(id)}"></i>${esc(id)}</span>`).join('');
    return `<div class="chart-card"><div class="chart-topline"><strong>CPU execution timeline</strong><span>TIME → ${result.finish}</span></div><div class="gantt-scroll"><div class="gantt-track">${segments}</div></div><div class="legend-row">${legend}</div></div>`;
  }
  function cpuMetricsTable(result) {
    const rows = result.rows.map(p => `<tr><td><span class="process-id"><i class="process-dot" style="--pc:${processColor(p.id)}"></i>${p.id}</span></td><td class="numeric">${p.arrival}</td><td class="numeric">${p.burst}</td><td class="numeric">${p.first}</td><td class="numeric">${p.finish}</td><td class="numeric">${fmt(p.waiting)}</td><td class="numeric">${fmt(p.turnaround)}</td><td class="numeric">${fmt(p.response)}</td></tr>`).join('');
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>First start</th><th>Finish</th><th>Waiting</th><th>Turnaround</th><th>Response</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function compareCpuHtml(results) {
    const min = Math.min(...results.map(r => r.avgWait));
    const max = Math.max(1, ...results.map(r => r.avgWait));
    return `<section class="panel"><div class="panel-header"><div><h2>Policy comparison</h2><p>Average waiting time across the same process workload. Lower is better for this metric.</p></div>${tag(`${results.length} POLICIES`,'cyan')}</div><div class="panel-body"><div class="alg-comparison">${results.map(r=>`<div class="compare-row"><div class="compare-name">${esc(algShort(r.algorithm))}${r.avgWait===min?` <span style="color:var(--green)">★</span>`:''}</div><div class="compare-bar-bg"><div class="compare-bar" style="width:${Math.max(2,r.avgWait/max*100)}%;${r.avgWait===min?'background:linear-gradient(90deg,#66e0af,#a8f3cf)':''}"></div></div><div class="compare-value">${fmt(r.avgWait)}</div></div>`).join('')}</div><div class="helper-note"><strong>Best for this input:</strong> ${esc(algLabel(results[0].algorithm))} has the lowest average waiting time (${fmt(results[0].avgWait)} units). This does not make it universally best; performance depends on the workload and the metric being optimized.</div></div></section>`;
  }
  function renderCpuOutput() {
    if (!cpuResult) return panel('03 / Simulation output','The chart and process metrics appear here after a run.', emptyState('⌁','Ready to simulate','Use the sample workload or enter your own processes, then select Run simulation.'));
    const result = cpuResult.primary;
    const comp = cpuResult.compare;
    const title = comp ? `Best average waiting time: ${algShort(result.algorithm)}` : algLabel(result.algorithm);
    const body = `<div class="result-head"><div><h3>${esc(title)}</h3><p>${comp ? 'Selected display uses the lowest average waiting time among the policies tested.' : 'Process execution order and timing details for the selected policy.'}</p></div>${tag(comp ? 'COMPARE MODE' : 'COMPLETED','good')}</div><div class="result-stats"><div class="result-stat"><label>AVG. WAITING</label><strong>${fmt(result.avgWait)}</strong><small>time units</small></div><div class="result-stat"><label>AVG. TURNAROUND</label><strong>${fmt(result.avgTurn)}</strong><small>time units</small></div><div class="result-stat"><label>CPU UTILIZATION</label><strong>${fmt(result.utilization)}%</strong><small>from t = 0</small></div></div>${ganttHtml(result)}<div class="section-divider"></div><div class="result-head"><div><h3>Per-process metrics</h3><p>Waiting = turnaround − burst · response = first start − arrival.</p></div><span class="mini-label">${result.rows.length} PROCESSES</span></div>${cpuMetricsTable(result)}<div class="legend-row"><span>Throughput: <strong style="color:#c6d6eb">${fmt(result.throughput,3)}</strong> processes / time unit</span><span>·</span><span>Finish time: <strong style="color:#c6d6eb">${result.finish}</strong></span></div>`;
    return `<div class="stack">${panel('03 / Simulation output','Gantt chart, summary metrics, and process-by-process results.',body)}${comp ? compareCpuHtml(comp) : ''}</div>`;
  }
  function bindCpuEvents() {
    const sample = () => { cpuProcesses = CPU_SAMPLE.map(p=>({...p})); cpuAlgorithm='fcfs'; cpuQuantum=2; cpuResult=null; renderCpu(); showToast('Sample loaded','Default four-process workload restored.'); };
    $('#cpuCppBtn')?.addEventListener('click', () => setView('cpp'));
    $('#cpuExportBtn')?.addEventListener('click', exportCpuCsv);
    $('#cpuSampleBtn')?.addEventListener('click', sample);
    $('#cpuResetBtn')?.addEventListener('click', sample);
    $('#cpuRunBtn')?.addEventListener('click', runCpuAndRender);
    $('#cpuRunTop')?.addEventListener('click', runCpuAndRender);
    $('#cpuAddBtn')?.addEventListener('click', () => {
      try { readCpuDom(); } catch (e) { showToast('Check process values',e.message,'error'); return; }
      if (cpuProcesses.length >= 10) { showToast('Process limit reached','Use at most 10 processes to keep the Gantt chart readable.','error'); return; }
      let index = cpuProcesses.length + 1;
      while (cpuProcesses.some(p => p.id === `P${index}`)) index++;
      cpuProcesses.push({ id:`P${index}`, arrival:0, burst:3, priority:2 });
      cpuResult=null; renderCpu();
    });
    $$('#cpuProcessBody [data-remove-pid]').forEach(btn => btn.addEventListener('click', () => {
      try { readCpuDom(); } catch (e) { showToast('Check process values',e.message,'error'); return; }
      if (cpuProcesses.length <= 1) { showToast('At least one process required','The last process cannot be removed.','error'); return; }
      cpuProcesses = cpuProcesses.filter(p=>p.id!==btn.dataset.removePid); cpuResult=null; renderCpu();
    }));
    $('#cpuAlgorithm')?.addEventListener('change', e => { cpuAlgorithm=e.target.value; const q=$('#quantumField'); if(q) q.style.opacity=['rr','compare'].includes(cpuAlgorithm)?'1':'.58'; });
  }

  // ------------------------------- PAGE REPLACEMENT -------------------------------
  function simulatePages(reference, frameCount, algorithm) {
    const slots = Array(frameCount).fill(null);
    const fifoOrder = [];
    const lastUsed = new Map();
    const steps = [];
    let faults = 0, hits = 0;
    reference.forEach((page, index) => {
      let hit = slots.includes(page);
      let evicted = null;
      if (hit) {
        hits++;
        lastUsed.set(page,index);
      } else {
        faults++;
        let slot = slots.indexOf(null);
        if (slot === -1) {
          if (algorithm === 'fifo') {
            evicted = fifoOrder.shift();
            slot = slots.indexOf(evicted);
          } else if (algorithm === 'lru') {
            evicted = slots.reduce((oldest,p) => lastUsed.get(p) < lastUsed.get(oldest) ? p : oldest, slots[0]);
            slot = slots.indexOf(evicted);
          } else if (algorithm === 'optimal') {
            let farthest = -1;
            slots.forEach(p => {
              const next = reference.indexOf(p,index+1);
              const distance = next === -1 ? Infinity : next;
              if (distance > farthest) { farthest = distance; evicted = p; }
            });
            slot = slots.indexOf(evicted);
          } else throw new Error('Choose FIFO, LRU, or Optimal.');
        }
        slots[slot] = page;
        if (algorithm === 'fifo') fifoOrder.push(page);
        lastUsed.set(page,index);
      }
      steps.push({ index, page, frames:[...slots], hit, evicted, faults, hits });
    });
    return { reference, frameCount, algorithm, steps, faults, hits, faultRate:reference.length ? faults/reference.length*100 : 0, hitRate:reference.length ? hits/reference.length*100 : 0 };
  }
  function renderMemory() {
    $('#appContent').innerHTML = `${heading('MEMORY MANAGEMENT / LAB 02','Page Replacement Simulator','Trace the contents of physical frames for each page reference and compare FIFO, LRU, and Optimal replacement.', '<button class="btn" id="memExportBtn" '+(memoryResult?'':'disabled')+'>↓ Export CSV</button><button class="btn" id="memSampleBtn">↺ Load sample</button><button class="btn btn-primary" id="memRunTop">Run simulation →</button>')}
      <div class="workspace-grid"><div class="stack">
        ${panel('01 / Reference string','Enter page numbers separated by spaces or commas.', `<div class="field"><label for="pageReference">Page reference string</label><textarea id="pageReference" rows="3" spellcheck="false">${esc(memoryInput.reference)}</textarea><div class="input-hint">Example: 7 0 1 2 0 3 0 4 2</div></div><div class="field-grid" style="margin-top:13px"><div class="field"><label for="frameCount">Number of frames</label><input id="frameCount" type="number" min="1" max="12" value="${memoryInput.frames}"></div><div class="field"><label for="memoryAlgorithm">Replacement policy</label><select id="memoryAlgorithm"><option value="fifo" ${memoryInput.algorithm==='fifo'?'selected':''}>FIFO — First In First Out</option><option value="lru" ${memoryInput.algorithm==='lru'?'selected':''}>LRU — Least Recently Used</option><option value="optimal" ${memoryInput.algorithm==='optimal'?'selected':''}>Optimal — Farthest future use</option><option value="compare" ${memoryInput.algorithm==='compare'?'selected':''}>Compare all policies</option></select></div></div><div class="form-actions"><button class="btn btn-primary" id="memRunBtn">▶ Run simulation</button><button class="btn" id="memResetBtn">Reset sample</button></div><div class="helper-note"><strong>Page fault:</strong> the requested page is not currently in a frame. If all frames are occupied, the selected policy decides which page to evict.</div>`)}
        ${panel('Algorithm rules','What decides the victim page?', `<div class="stack" style="gap:11px"><div><strong style="font-size:10px;color:#d0dced">FIFO</strong><p class="inline-tip">Evicts the page that has been in memory the longest.</p></div><div><strong style="font-size:10px;color:#d0dced">LRU</strong><p class="inline-tip">Evicts the page that has not been used for the longest time in the past.</p></div><div><strong style="font-size:10px;color:#d0dced">Optimal</strong><p class="inline-tip">Evicts the page whose next use is farthest in the future (or will never occur again).</p></div></div>`)}
      </div><div class="stack" id="memoryOutput">${renderMemoryOutput()}</div></div>`;
    bindMemoryEvents();
  }
  function memoryResultBlock(result, labelOverride = '') {
    const frameHead = Array.from({length:result.frameCount},(_,i)=>`<th>Frame ${i+1}</th>`).join('');
    const rows = result.steps.map((s,i)=>`<tr class="${i===result.steps.length-1?'step-current':''}"><td class="numeric">${s.index+1}</td><td class="numeric"><strong>${s.page}</strong></td>${s.frames.map(p=>`<td><span class="frame-cell ${p===null?'empty':''}">${p===null?'—':p}</span></td>`).join('')}<td class="${s.hit?'step-hit':'step-fault'}">${s.hit?'HIT':'FAULT'}${s.evicted!==null?` · out ${s.evicted}`:''}</td><td class="numeric">${s.faults}</td></tr>`).join('');
    return `<section class="panel"><div class="panel-header"><div><h2>${labelOverride || algLabelMemory(result.algorithm)}</h2><p>Frame contents after each page reference. Scroll horizontally for long strings.</p></div>${tag(`${result.faults} FAULTS`,result.faults<=result.hits?'good':'cyan')}</div><div class="panel-body"><div class="result-stats"><div class="result-stat"><label>PAGE FAULTS</label><strong>${result.faults}</strong><small>misses</small></div><div class="result-stat"><label>PAGE HITS</label><strong>${result.hits}</strong><small>resident pages</small></div><div class="result-stat"><label>HIT RATE</label><strong>${fmt(result.hitRate)}%</strong><small>of references</small></div></div><div class="table-wrap"><table class="data-table frame-table"><thead><tr><th>#</th><th>Reference</th>${frameHead}<th>Status</th><th>Faults so far</th></tr></thead><tbody>${rows}</tbody></table></div><div class="legend-row"><span class="legend-item"><i class="legend-square" style="background:#7de5b4"></i>Hit</span><span class="legend-item"><i class="legend-square" style="background:#ffb3a1"></i>Page fault</span></div></div></section>`;
  }
  function algLabelMemory(key) { return ({ fifo:'FIFO — First In First Out', lru:'LRU — Least Recently Used', optimal:'Optimal Page Replacement' })[key] || key; }
  function memoryCompareHtml(results) {
    const min = Math.min(...results.map(r=>r.faults));
    const max = Math.max(1,...results.map(r=>r.faults));
    return panel('Policy comparison','Fewer page faults is better for this exact reference string and frame count.', `<div class="alg-comparison">${results.map(r=>`<div class="compare-row"><div class="compare-name">${algLabelMemory(r.algorithm)}${r.faults===min?' ★':''}</div><div class="compare-bar-bg"><div class="compare-bar" style="width:${Math.max(2,r.faults/max*100)}%;${r.faults===min?'background:linear-gradient(90deg,#66e0af,#a8f3cf)':''}"></div></div><div class="compare-value">${r.faults} faults</div></div>`).join('')}</div><div class="helper-note"><strong>Lowest faults:</strong> ${results.filter(r=>r.faults===min).map(r=>({fifo:'FIFO',lru:'LRU',optimal:'Optimal'}[r.algorithm])).join(' and ')}. Optimal is a theoretical benchmark because it uses knowledge of future references.</div>`);
  }
  function renderMemoryOutput() {
    if (!memoryResult) return panel('02 / Simulation output','Step-by-step frame changes and fault counts.',emptyState('▤','Memory is ready','Run the simulation to see which page is loaded or evicted at each step.'));
    if (memoryResult.compare) return `<div class="stack">${memoryResult.compare.map(r=>memoryResultBlock(r)).join('')}${memoryCompareHtml(memoryResult.compare)}</div>`;
    return memoryResultBlock(memoryResult);
  }
  function readMemoryInput() {
    memoryInput.reference = $('#pageReference').value;
    memoryInput.frames = intField($('#frameCount').value,'Number of frames',1,12);
    memoryInput.algorithm = $('#memoryAlgorithm').value;
    const reference = parseIntList(memoryInput.reference,'Page reference string');
    if (reference.length > 100) throw new Error('Use at most 100 page references for a readable lab table.');
    return { reference, frameCount:memoryInput.frames, algorithm:memoryInput.algorithm };
  }
  function runMemoryAndRender() {
    try {
      const input = readMemoryInput();
      if (input.algorithm === 'compare') {
        memoryResult = { compare:['fifo','lru','optimal'].map(a=>simulatePages(input.reference,input.frameCount,a)) };
      } else memoryResult = simulatePages(input.reference,input.frameCount,input.algorithm);
      renderMemory(); showToast('Memory simulation completed',`Processed ${input.reference.length} page references.`);
    } catch (e) { showToast('Unable to run simulation',e.message,'error'); }
  }
  function bindMemoryEvents() {
    const sample = () => { memoryInput={reference:'7 0 1 2 0 3 0 4 2 3 0 3 2',frames:3,algorithm:'lru'}; memoryResult=null; renderMemory(); showToast('Sample loaded','Reference string and three frames restored.'); };
    $('#memExportBtn')?.addEventListener('click',exportMemoryCsv);
    $('#memSampleBtn')?.addEventListener('click',sample); $('#memResetBtn')?.addEventListener('click',sample);
    $('#memRunBtn')?.addEventListener('click',runMemoryAndRender); $('#memRunTop')?.addEventListener('click',runMemoryAndRender);
  }

  // ------------------------------- DISK SCHEDULING -------------------------------
  function orderDiskRequests(requests, head, min, max, algorithm, direction) {
    const req = requests.map((c,index)=>({c,index}));
    let path = [head];
    let wrapEdges = [];
    const add = c => { path.push(c); };
    const sortedAsc = arr => arr.slice().sort((a,b)=>a.c-b.c || a.index-b.index);
    const sortedDesc = arr => arr.slice().sort((a,b)=>b.c-a.c || a.index-b.index);
    if (algorithm === 'fcfs') req.forEach(r=>add(r.c));
    else if (algorithm === 'sstf') {
      let pending=req.slice(), current=head;
      while(pending.length){ pending.sort((a,b)=>Math.abs(a.c-current)-Math.abs(b.c-current) || a.index-b.index); const r=pending.shift(); add(r.c); current=r.c; }
    } else if (algorithm === 'scan' || algorithm === 'look' || algorithm === 'cscan' || algorithm === 'clook') {
      const isCircular = algorithm === 'cscan' || algorithm === 'clook';
      const isLook = algorithm === 'look' || algorithm === 'clook';
      const left = req.filter(r=>r.c < head);
      const sameOrRight = req.filter(r=>r.c >= head);
      if (direction === 'right') {
        const rightSorted=sortedAsc(sameOrRight);
        const leftSorted=(algorithm==='cscan'||algorithm==='clook') ? sortedAsc(left) : sortedDesc(left);
        rightSorted.forEach(r=>add(r.c));
        if (left.length) {
          if (isCircular) {
            if (!isLook && path[path.length-1] !== max) add(max);
            const wrapStartIndex = path.length-1;
            if (!isLook && path[path.length-1] !== min) add(min);
            else if (isLook) add(leftSorted[0].c);
            if (isLook) {
              // C-LOOK jumps directly from the highest pending request to the lowest pending request.
              wrapEdges.push(path.length-2);
              leftSorted.slice(1).forEach(r=>add(r.c));
            } else {
              wrapEdges.push(wrapStartIndex);
              leftSorted.forEach(r=>add(r.c));
            }
          } else {
            if (!isLook && path[path.length-1] !== max) add(max);
            sortedDesc(left).forEach(r=>add(r.c));
          }
        }
      } else {
        const leftSorted=sortedDesc(left);
        const rightSorted=(algorithm==='cscan'||algorithm==='clook') ? sortedDesc(sameOrRight) : sortedAsc(sameOrRight);
        leftSorted.forEach(r=>add(r.c));
        if (sameOrRight.length) {
          if (isCircular) {
            if (!isLook && path[path.length-1] !== min) add(min);
            const wrapStartIndex = path.length-1;
            if (isLook) add(rightSorted[0].c);
            else if (path[path.length-1] !== max) add(max);
            if (isLook) {
              wrapEdges.push(path.length-2);
              rightSorted.slice(1).forEach(r=>add(r.c));
            } else {
              wrapEdges.push(wrapStartIndex);
              rightSorted.forEach(r=>add(r.c));
            }
          } else {
            if (!isLook && path[path.length-1] !== min) add(min);
            sortedAsc(sameOrRight).forEach(r=>add(r.c));
          }
        }
      }
    } else throw new Error('Choose a valid disk scheduling algorithm.');
    const movements = [];
    let total = 0;
    for(let i=1;i<path.length;i++){ const distance=Math.abs(path[i]-path[i-1]); total+=distance; movements.push({from:path[i-1],to:path[i],distance,wrap:wrapEdges.includes(i-1)}); }
    return {path, movements, total, algorithm, direction, min, max, requests, head, wrapEdges};
  }
  function readDiskInput() {
    diskInput.requests=$('#diskRequests').value;
    diskInput.head=intField($('#diskHead').value,'Initial head position',0,1000000);
    diskInput.min=intField($('#diskMin').value,'Minimum cylinder',0,1000000);
    diskInput.max=intField($('#diskMax').value,'Maximum cylinder',1,1000000);
    diskInput.direction=$('#diskDirection').value;
    diskInput.algorithm=$('#diskAlgorithm').value;
    if(diskInput.max<=diskInput.min) throw new Error('Maximum cylinder must be greater than minimum cylinder.');
    if(diskInput.head<diskInput.min||diskInput.head>diskInput.max) throw new Error('Initial head position must be within the cylinder range.');
    const requests=parseIntList(diskInput.requests,'Disk request list');
    if(requests.length>80) throw new Error('Use at most 80 requests for a readable plot.');
    if(requests.some(r=>r<diskInput.min||r>diskInput.max)) throw new Error(`Every cylinder request must be between ${diskInput.min} and ${diskInput.max}.`);
    return {requests,head:diskInput.head,min:diskInput.min,max:diskInput.max,direction:diskInput.direction,algorithm:diskInput.algorithm};
  }
  const DISK_ALGS=[['fcfs','FCFS — First Come, First Served'],['sstf','SSTF — Shortest Seek Time First'],['scan','SCAN — Elevator'],['cscan','C-SCAN — Circular SCAN'],['look','LOOK'],['clook','C-LOOK — Circular LOOK']];
  function renderDisk() {
    $('#appContent').innerHTML = `${heading('SECONDARY STORAGE / LAB 03','Disk Scheduling Simulator','Visualize disk-head movement across cylinder requests and measure total seek distance for six scheduling policies.', '<button class="btn" id="diskExportBtn" '+(diskResult?'':'disabled')+'>↓ Export CSV</button><button class="btn" id="diskSampleBtn">↺ Load sample</button><button class="btn btn-primary" id="diskRunTop">Run simulation →</button>')}
      <div class="workspace-grid"><div class="stack">
        ${panel('01 / Disk workload','Cylinder values must stay inside the configured disk range.', `<div class="field"><label for="diskRequests">Request queue</label><textarea id="diskRequests" rows="3" spellcheck="false">${esc(diskInput.requests)}</textarea><div class="input-hint">Example: 98 183 37 122 14 124 65 67</div></div><div class="field-grid" style="margin-top:12px"><div class="field"><label for="diskHead">Initial head position</label><input id="diskHead" type="number" min="0" value="${diskInput.head}"></div><div class="field"><label for="diskDirection">Initial direction</label><select id="diskDirection"><option value="right" ${diskInput.direction==='right'?'selected':''}>Toward higher cylinders →</option><option value="left" ${diskInput.direction==='left'?'selected':''}>Toward lower cylinders ←</option></select></div><div class="field"><label for="diskMin">Minimum cylinder</label><input id="diskMin" type="number" min="0" value="${diskInput.min}"></div><div class="field"><label for="diskMax">Maximum cylinder</label><input id="diskMax" type="number" min="1" value="${diskInput.max}"></div></div><div class="field" style="margin-top:12px"><label for="diskAlgorithm">Scheduling algorithm</label><select id="diskAlgorithm">${DISK_ALGS.map(([v,l])=>`<option value="${v}" ${diskInput.algorithm===v?'selected':''}>${l}</option>`).join('')}<option value="compare" ${diskInput.algorithm==='compare'?'selected':''}>Compare all algorithms</option></select></div><div class="form-actions"><button class="btn btn-primary" id="diskRunBtn">▶ Run simulation</button><button class="btn" id="diskResetBtn">Reset sample</button></div><div class="helper-note"><strong>Seek distance:</strong> absolute cylinder movement from one head position to the next. SCAN reaches the disk boundary before reversing; LOOK reverses at the last request.</div>`)}
        ${panel('Algorithm quick guide','How each policy chooses the next request.', `<div class="stack" style="gap:10px">${[['FCFS','Preserves arrival order.'],['SSTF','Chooses the nearest pending cylinder.'],['SCAN / C-SCAN','Sweeps toward a boundary; C-SCAN services in one direction and wraps.'],['LOOK / C-LOOK','Like SCAN / C-SCAN, but turns at the outermost pending request.']].map(([a,b])=>`<div><strong style="font-size:10px;color:#c9d8ea">${a}</strong><p class="inline-tip">${b}</p></div>`).join('')}</div>`)}
      </div><div class="stack" id="diskOutput">${renderDiskOutput()}</div></div>`;
    bindDiskEvents();
  }
  function diskSvg(result) {
    const values=result.path; const width=Math.max(620,values.length*57); const height=205; const padL=38,padR=22,padT=24,padB=32; const plotW=width-padL-padR,plotH=height-padT-padB;
    const span=Math.max(1,result.max-result.min);
    const x=i=>padL+(values.length<=1?plotW/2:(i/(values.length-1))*plotW);
    const y=v=>padT+((result.max-v)/span)*plotH;
    let grid='';
    for(let i=0;i<=4;i++){const v=result.max-span*i/4;const yy=y(v);grid+=`<line x1="${padL}" y1="${yy}" x2="${width-padR}" y2="${yy}" stroke="#263851" stroke-dasharray="3 5"/><text x="${padL-8}" y="${yy+3}" fill="#7489a6" font-size="9" text-anchor="end" font-family="DM Mono,monospace">${Math.round(v)}</text>`;}
    let lines='';
    for(let i=1;i<values.length;i++){ const dashed=result.wrapEdges.includes(i-1); lines+=`<line x1="${x(i-1)}" y1="${y(values[i-1])}" x2="${x(i)}" y2="${y(values[i])}" stroke="${dashed?'#c4a9ff':'#61e7d4'}" stroke-width="2.1" ${dashed?'stroke-dasharray="5 4"':''} stroke-linecap="round"/>`; }
    const points=values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===0?'4.5':'3.5'}" fill="${i===0?'#7d9bff':'#61e7d4'}" stroke="#0c1728" stroke-width="2"><title>Step ${i}: cylinder ${v}</title></circle><text x="${x(i)}" y="${Math.max(12,y(v)-9)}" fill="#c5d6e9" font-size="9" text-anchor="middle" font-family="DM Mono,monospace">${v}</text>`).join('');
    return `<div class="chart-card"><div class="chart-topline"><strong>Disk-head path</strong><span>CYLINDER POSITION vs. ORDER</span></div><div style="overflow:auto"><svg class="visual-canvas" viewBox="0 0 ${width} ${height}" style="width:${width}px;max-width:none;min-width:${width}px" role="img" aria-label="Disk head movement path over cylinders">${grid}${lines}${points}</svg></div><div class="legend-row"><span class="legend-item"><i class="legend-square" style="background:#7d9bff"></i>Start head</span><span class="legend-item"><i class="legend-square" style="background:#61e7d4"></i>Request / movement point</span><span class="legend-item"><i class="legend-square" style="background:#c4a9ff"></i>Circular wrap</span></div></div>`;
  }
  function diskOutputBlock(result) {
    return `<section class="panel"><div class="panel-header"><div><h2>${DISK_ALGS.find(a=>a[0]===result.algorithm)?.[1]||'Disk scheduling result'}</h2><p>Movement path starts at cylinder ${result.head}; lower total movement means fewer head-travel cylinders.</p></div>${tag(`${result.total} CYLINDERS`,'cyan')}</div><div class="panel-body"><div class="result-stats"><div class="result-stat"><label>TOTAL MOVEMENT</label><strong>${result.total}</strong><small>cylinders</small></div><div class="result-stat"><label>REQUESTS SERVICED</label><strong>${result.requests.length}</strong><small>in the workload</small></div><div class="result-stat"><label>AVG. SEEK DISTANCE</label><strong>${fmt(result.total/result.requests.length)}</strong><small>per request* </small></div></div>${diskSvg(result)}<div class="section-divider"></div><div class="result-head"><div><h3>Service path</h3><p>Ordered head positions, including boundary travel or circular wrap where applicable.</p></div><span class="mini-label">${result.path.length} POSITIONS</span></div><div class="path-flow">${result.path.map((p,i)=>`${i?`<span class="path-edge" ${result.wrapEdges.includes(i-1)?'style="background:#9c88d8"':''}></span>`:''}<div class="path-node ${i===0?'start':i===result.path.length-1?'end':''}" title="Path step ${i}">${p}<small>${i===0?'START':result.wrapEdges.includes(i-1)?'WRAP':`STEP ${i}`}</small></div>`).join('')}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Step</th><th>From</th><th>To</th><th>Movement</th><th>Note</th></tr></thead><tbody>${result.movements.map((m,i)=>`<tr><td>${i+1}</td><td class="numeric">${m.from}</td><td class="numeric">${m.to}</td><td class="numeric"><strong>${m.distance}</strong></td><td>${m.wrap?'Circular wrap':m.distance===0?'Same cylinder':'Head movement'}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="3">Total head movement</th><th class="numeric">${result.total}</th><th>cylinders</th></tr></tfoot></table></div><p class="inline-tip" style="margin-top:9px">*Average seek distance is total head movement divided by the number of pending requests; boundary and wrap travel contribute to total movement.</p></div></section>`;
  }
  function diskCompareHtml(results) {
    const min=Math.min(...results.map(r=>r.total)); const max=Math.max(1,...results.map(r=>r.total));
    const sorted=results.slice().sort((a,b)=>a.total-b.total);
    return panel('Algorithm comparison','Total cylinder movement for the same request queue. Results depend on starting head and direction.',`<div class="alg-comparison">${sorted.map(r=>`<div class="compare-row"><div class="compare-name">${DISK_ALGS.find(a=>a[0]===r.algorithm)?.[0]}${r.total===min?' ★':''}</div><div class="compare-bar-bg"><div class="compare-bar" style="width:${Math.max(2,r.total/max*100)}%;${r.total===min?'background:linear-gradient(90deg,#66e0af,#a8f3cf)':''}"></div></div><div class="compare-value">${r.total}</div></div>`).join('')}</div><div class="helper-note"><strong>Lowest movement:</strong> ${sorted.filter(r=>r.total===min).map(r=>r.algorithm.toUpperCase()).join(' and ')} for this workload. SSTF can reduce movement but may postpone far-away requests; SCAN-style policies provide more structured service.</div>`);
  }
  function renderDiskOutput() {
    if(!diskResult) return panel('02 / Simulation output','Path plot, ordered service sequence, and total seek movement.',emptyState('◉','Waiting for disk requests','Run the simulation to draw the head path and calculate the total cylinder movement.'));
    if(diskResult.compare) { const best=diskResult.compare.slice().sort((a,b)=>a.total-b.total)[0]; return `<div class="stack">${diskOutputBlock(best)}${diskCompareHtml(diskResult.compare)}</div>`; }
    return diskOutputBlock(diskResult);
  }
  function runDiskAndRender() {
    try {
      const input=readDiskInput();
      if(input.algorithm==='compare') diskResult={compare:DISK_ALGS.map(([a])=>orderDiskRequests(input.requests,input.head,input.min,input.max,a,input.direction))};
      else diskResult=orderDiskRequests(input.requests,input.head,input.min,input.max,input.algorithm,input.direction);
      renderDisk(); showToast('Disk simulation completed',`${input.requests.length} requests processed.`);
    } catch(e) { showToast('Unable to run simulation',e.message,'error'); }
  }
  function bindDiskEvents() {
    const sample=()=>{diskInput={requests:'98 183 37 122 14 124 65 67',head:53,min:0,max:199,direction:'right',algorithm:'sstf'};diskResult=null;renderDisk();showToast('Sample loaded','Eight-cylinder request workload restored.');};
    $('#diskExportBtn')?.addEventListener('click',exportDiskCsv);
    $('#diskSampleBtn')?.addEventListener('click',sample); $('#diskResetBtn')?.addEventListener('click',sample);
    $('#diskRunBtn')?.addEventListener('click',runDiskAndRender); $('#diskRunTop')?.addEventListener('click',runDiskAndRender);
  }

  // ------------------------------- BANKER'S ALGORITHM -------------------------------
  function bankerNeed(data) { return data.maximum.map((row,i)=>row.map((v,j)=>v-data.allocation[i][j])); }
  function bankerSafety(allocation, maximum, available) {
    const n=allocation.length, m=available.length;
    const need=maximum.map((row,i)=>row.map((v,j)=>v-allocation[i][j]));
    const work=[...available], finish=Array(n).fill(false), sequence=[], steps=[];
    let advanced=true;
    while(sequence.length<n && advanced) {
      advanced=false;
      for(let i=0;i<n;i++) {
        if(finish[i]) continue;
        if(need[i].every((v,j)=>v<=work[j])) {
          const before=[...work];
          for(let j=0;j<m;j++) work[j]+=allocation[i][j];
          finish[i]=true; sequence.push(i); steps.push({process:i,need:[...need[i]],before,after:[...work]}); advanced=true;
        }
      }
    }
    return { safe:sequence.length===n, sequence, steps, need, work, unfinished:finish.map((done,i)=>done?null:i).filter(v=>v!==null) };
  }
  function bankerMatrixHtml(kind, matrix, editable=true) {
    return `<div class="matrix-block"><h4>${kind==='allocation'?'ALLOCATION MATRIX':kind==='maximum'?'MAXIMUM DEMAND':'NEED MATRIX'}</h4><div class="table-wrap"><table class="matrix-table"><thead><tr><th>Process</th>${['A','B','C'].map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>${matrix.map((row,i)=>`<tr><th>P${i}</th>${row.map((v,j)=>`<td>${editable?`<input type="number" min="0" max="100000" data-matrix="${kind}" data-p="${i}" data-r="${j}" value="${v}" aria-label="${kind} P${i} resource ${j}">`:`<span>${v}</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  function readBankerDom() {
    const n=bankerData.allocation.length;
    const allocation=Array.from({length:n},(_,i)=>Array.from({length:3},(_,j)=>intField($(`[data-matrix="allocation"][data-p="${i}"][data-r="${j}"]`).value,`Allocation P${i}, resource ${j}`,0,100000)));
    const maximum=Array.from({length:n},(_,i)=>Array.from({length:3},(_,j)=>intField($(`[data-matrix="maximum"][data-p="${i}"][data-r="${j}"]`).value,`Maximum P${i}, resource ${j}`,0,100000)));
    const available=Array.from({length:3},(_,j)=>intField($(`[data-available="${j}"]`).value,`Available resource ${j}`,0,100000));
    for(let i=0;i<n;i++) for(let j=0;j<3;j++) if(allocation[i][j]>maximum[i][j]) throw new Error(`Allocation cannot exceed maximum demand at P${i}, resource ${j}.`);
    bankerData={allocation,maximum,available};
    return bankerData;
  }
  function bankerSummaryHtml(result) {
    if(!result) return emptyState('⛨','Safety check not run','Run the safety algorithm to determine whether the current state has a safe sequence.');
    const needTable=bankerMatrixHtml('need',result.need,false);
    const seq=result.safe ? `<div class="sequence-list">${result.sequence.map((p,i)=>`${i?'<span class="sequence-arrow">→</span>':''}<span class="sequence-chip">P${p}</span>`).join('')}</div>` : `<div class="sequence-list">${result.sequence.map((p,i)=>`${i?'<span class="sequence-arrow">→</span>':''}<span class="sequence-chip">P${p}</span>`).join('')}<span class="pill bad">Stuck: ${result.unfinished.map(p=>`P${p}`).join(', ')}</span></div>`;
    return `<div class="stack">${`<div class="result-stats"><div class="result-stat"><label>STATE</label><strong style="font-size:17px;color:${result.safe?'var(--green)':'var(--red)'}">${result.safe?'SAFE':'UNSAFE'}</strong><small>${result.safe?'all processes can finish':'no complete safe sequence'}</small></div><div class="result-stat"><label>COMPLETED</label><strong>${result.sequence.length}/${result.need.length}</strong><small>processes in order</small></div><div class="result-stat"><label>RESOURCES</label><strong>${result.work.join(' · ')}</strong><small>final work vector</small></div></div>`}${panel('Need matrix','Need = Maximum demand − Allocation.',needTable)}${panel('Safe execution sequence',result.safe?'A valid order in which each process can complete.':'The system cannot find a full safe sequence from this state.',seq)}${panel('Safety trace','For each accepted process, its need fits the current Work vector; after it finishes, its allocation returns to Work.',result.steps.length?result.steps.map((s,i)=>`<div class="safe-step"><span class="safe-step-num">${i+1}</span><div><strong>P${s.process} can finish</strong><p>Need [${s.need.join(', ')}] ≤ Work [${s.before.join(', ')}]. After release, Work = [${s.after.join(', ')}].</p></div></div>`).join(''):emptyState('!','No process can currently finish','Every unfinished process needs more than the available Work vector in at least one resource type.'))}</div>`;
  }
  function bankerRequestCheck(data, process, request) {
    const n=data.allocation.length;
    if(process<0||process>=n) throw new Error('Choose a valid process for the resource request.');
    const need=bankerNeed(data);
    if(request.some((v,j)=>v>need[process][j])) return {grant:false,reason:'The request exceeds the selected process’s remaining Need. It cannot be granted.'};
    if(request.some((v,j)=>v>data.available[j])) return {grant:false,reason:'The request exceeds currently Available resources. The process must wait.'};
    const allocation=data.allocation.map(r=>[...r]), maximum=data.maximum.map(r=>[...r]), available=data.available.map((v,j)=>v-request[j]);
    for(let j=0;j<3;j++) allocation[process][j]+=request[j];
    const safety=bankerSafety(allocation,maximum,available);
    return {grant:safety.safe,reason:safety.safe?'The request can be granted immediately; the resulting state remains safe.':'Do not grant this request now: the tentative state is unsafe.',safety,available,request,process};
  }
  function renderBanker() {
    const n=bankerData.allocation.length;
    const requestProcessOptions=bankerData.allocation.map((_,i)=>`<option value="${i}" ${i===bankerRequestProcess?'selected':''}>P${i}</option>`).join('');
    const allocationTable=bankerMatrixHtml('allocation',bankerData.allocation,true);
    const maximumTable=bankerMatrixHtml('maximum',bankerData.maximum,true);
    const availInputs=`<div class="resource-vector">${bankerData.available.map((v,i)=>`<div class="resource-input"><label>Available ${['A','B','C'][i]}</label><input type="number" min="0" max="100000" data-available="${i}" value="${v}" aria-label="Available resource ${['A','B','C'][i]}"></div>`).join('')}</div>`;
    const requestBody=`<div class="field"><label for="requestProcess">Requesting process</label><select id="requestProcess">${requestProcessOptions}</select></div><div class="field" style="margin-top:12px"><label>Request vector [A, B, C]</label><div class="resource-vector">${bankerRequest.map((v,i)=>`<div class="resource-input"><label>${['A','B','C'][i]}</label><input type="number" min="0" max="100000" id="requestR${i}" value="${v}"></div>`).join('')}</div></div><div class="form-actions"><button class="btn btn-primary" id="bankerRequestBtn">Check request safely</button></div><div id="requestResult">${renderRequestResult()}</div>`;
    $('#appContent').innerHTML = `${heading('RESOURCE MANAGEMENT / LAB 04','Deadlock Avoidance Lab','Explore the Banker’s algorithm with editable Allocation, Maximum, and Available resource data. Test whether a state or request is safe.', '<button class="btn" id="bankerExportBtn" '+(bankerResult?'':'disabled')+'>↓ Export CSV</button><button class="btn" id="bankerSampleBtn">↺ Restore sample</button><button class="btn btn-primary" id="bankerRunTop">Run safety check →</button>')}
      <div class="workspace-grid"><div class="stack">
        ${panel('01 / System resource state','Example uses 5 processes and 3 resource types: A, B, and C.', `<div class="matrix-grid">${allocationTable}${maximumTable}</div><div class="section-divider"></div><h3 class="subheading">AVAILABLE RESOURCE VECTOR</h3>${availInputs}<div class="form-actions"><button class="btn btn-primary" id="bankerRunBtn">▶ Run safety algorithm</button><button class="btn" id="bankerResetBtn">Restore sample</button></div><div class="helper-note"><strong>Key rule:</strong> a process can finish when Need ≤ Work for every resource. Its allocated resources are then released back to Work.</div>`)}
        ${panel('02 / Test a resource request','Check the Request vector against Need and Available, then safely test the tentative allocation.',requestBody)}
      </div><div class="stack" id="bankerOutput">${panel('03 / Safety analysis','Derived Need matrix, safe sequence, and the reasoning trace.',bankerSummaryHtml(bankerResult))}</div></div>`;
    bindBankerEvents();
  }
  function renderRequestResult() {
    if(!bankerRequestResult) return `<p class="inline-tip" style="margin-top:10px">Default request is [1, 0, 2] from P1. Change the process and request vector, then test the tentative allocation.</p>`;
    const r=bankerRequestResult;
    return `<div class="helper-note" style="margin-top:12px;background:${r.grant?'#102c29':'#301e29'};border-color:${r.grant?'#24564a':'#5a3244'};color:${r.grant?'#9bdfcb':'#e7a8b3'}"><strong>${r.grant?'REQUEST CAN BE GRANTED':'REQUEST MUST WAIT'}</strong><br>${esc(r.reason)}${r.safety?`<br><br>Safe order after tentative grant: ${r.safety.sequence.map(p=>`P${p}`).join(' → ')}`:''}</div>`;
  }
  function runBankerAndRender() {
    try {
      readBankerDom();
      bankerResult=bankerSafety(bankerData.allocation,bankerData.maximum,bankerData.available);
      bankerRequestResult=null;
      renderBanker();
      showToast('Safety check completed',bankerResult.safe?'The resource state is safe.':'The resource state is unsafe.');
    } catch(e) { showToast('Unable to check state',e.message,'error'); }
  }
  function runRequestAndRender() {
    try {
      readBankerDom();
      const process=intField($('#requestProcess').value,'Requesting process',0,bankerData.allocation.length-1);
      const request=[0,1,2].map(i=>intField($(`#requestR${i}`).value,`Request resource ${['A','B','C'][i]}`,0,100000));
      bankerRequestProcess=process; bankerRequest=request;
      bankerRequestResult=bankerRequestCheck(bankerData,process,request);
      bankerResult=bankerSafety(bankerData.allocation,bankerData.maximum,bankerData.available);
      renderBanker();
      showToast('Resource request evaluated',bankerRequestResult.grant?'The tentative allocation remains safe.':'The request cannot be granted immediately.',bankerRequestResult.grant?'success':'error');
    } catch(e) { showToast('Unable to check request',e.message,'error'); }
  }
  function bindBankerEvents() {
    const sample=()=>{bankerData=cloneBanker(BANKER_SAMPLE);bankerResult=null;bankerRequestResult=null;bankerRequestProcess=1;bankerRequest=[1,0,2];renderBanker();showToast('Sample restored','Classic five-process, three-resource example loaded.');};
    $('#bankerExportBtn')?.addEventListener('click',exportBankerCsv);
    $('#bankerSampleBtn')?.addEventListener('click',sample); $('#bankerResetBtn')?.addEventListener('click',sample);
    $('#bankerRunBtn')?.addEventListener('click',runBankerAndRender); $('#bankerRunTop')?.addEventListener('click',runBankerAndRender);
    $('#bankerRequestBtn')?.addEventListener('click',runRequestAndRender);
  }


  // ------------------------------ FILE ALLOCATION ------------------------------
  const FILE_ALLOCATION_METHODS = [
    { value: 'contiguous', label: 'Contiguous', full: 'Contiguous allocation' },
    { value: 'linked', label: 'Linked', full: 'Linked allocation' },
    { value: 'indexed', label: 'Indexed', full: 'Indexed allocation' }
  ];
  function parseFileRequests(text, capacity) {
    const raw = String(text).split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean);
    if (!raw.length) throw new Error('Enter at least one file and its requested data-block count, for example A:3, B:4.');
    if (raw.length > 12) throw new Error('Use at most 12 files so the allocation map remains readable.');
    const names = new Set();
    return raw.map((token,i)=>{
      const match = token.match(/^([A-Za-z][A-Za-z0-9_-]{0,7})\s*:\s*(\d+)$/);
      if (!match) throw new Error(`File entry ${i+1} must use the format NAME:BLOCKS (for example A:3).`);
      const name = match[1];
      const size = intField(match[2], `${name} block count`, 1, capacity);
      if (names.has(name.toLowerCase())) throw new Error(`File name ${name} is repeated. Use unique names.`);
      names.add(name.toLowerCase());
      return { name, size };
    });
  }
  function runFileAllocation(method, capacity, reserved, requests) {
    const blocks = Array.from({length:capacity},(_,index)=>({index,kind:reserved.includes(index)?'reserved':'free',file:null,role:null,next:null}));
    const files=[];
    const markData=(index,file,role='data')=>{blocks[index].kind=role==='index'?'index':'data';blocks[index].file=file.name;blocks[index].role=role;};
    for (const file of requests) {
      let dataBlocks=[]; let indexBlock=null; let reason='';
      if (method==='contiguous') {
        let start=-1, run=0;
        for(let i=0;i<blocks.length;i++){
          if(blocks[i].kind==='free') run++; else run=0;
          if(run===file.size){start=i-file.size+1;break;}
        }
        if(start<0) reason=`No contiguous run of ${file.size} free blocks exists (external fragmentation may be present).`;
        else { dataBlocks=Array.from({length:file.size},(_,i)=>start+i);dataBlocks.forEach(b=>markData(b,file)); }
      } else {
        const free=blocks.filter(b=>b.kind==='free').map(b=>b.index);
        const need=file.size+(method==='indexed'?1:0);
        if(free.length<need) reason=`Needs ${need} free blocks${method==='indexed'?' including one index block':''}, but only ${free.length} remain.`;
        else if(method==='linked') {
          dataBlocks=free.slice(0,file.size);
          dataBlocks.forEach((b,i)=>{markData(b,file);blocks[b].next=i<dataBlocks.length-1?dataBlocks[i+1]:null;});
        } else {
          indexBlock=free[0];markData(indexBlock,file,'index');
          dataBlocks=free.slice(1,file.size+1);dataBlocks.forEach(b=>markData(b,file));
          blocks[indexBlock].next=dataBlocks.length?dataBlocks[0]:null;
        }
      }
      const ok=dataBlocks.length===file.size;
      files.push({name:file.name,requested:file.size,dataBlocks:ok?dataBlocks:[],indexBlock:ok?indexBlock:null,allocated:ok,reason:ok?'Allocated successfully.':reason});
    }
    const allocatedData=blocks.filter(b=>b.kind==='data').length;
    const indexBlocks=blocks.filter(b=>b.kind==='index').length;
    const freeBlocks=blocks.filter(b=>b.kind==='free').length;
    let largestFreeRun=0,run=0;
    for(const b of blocks){if(b.kind==='free'){run++;largestFreeRun=Math.max(largestFreeRun,run);}else run=0;}
    return {method,capacity,reserved:[...reserved],requests:requests.map(r=>({...r})),blocks,files,allocatedFiles:files.filter(f=>f.allocated).length,failedFiles:files.filter(f=>!f.allocated).length,allocatedData,indexBlocks,freeBlocks,largestFreeRun,totalDataRequested:requests.reduce((n,f)=>n+f.size,0),status:files.every(f=>f.allocated)?'All files allocated':`${files.filter(f=>!f.allocated).length} file(s) could not be allocated`};
  }
  function validateFileAllocationDom() {
    fileDiskBlockCount=intField($('#fileBlockCount').value,'Disk block count',16,64);
    fileReservedText=$('#fileReservedBlocks').value.trim();
    fileRequestsText=$('#fileRequests').value;
    fileAllocationMethod=$('#fileAllocationMethod').value;
    const reserved=fileReservedText?parseIntList(fileReservedText,'Reserved block list'):[];
    if(reserved.some(b=>b>=fileDiskBlockCount)) throw new Error(`Reserved block indices must be in the range 0–${fileDiskBlockCount-1}.`);
    if(new Set(reserved).size!==reserved.length) throw new Error('Reserved block list contains duplicates.');
    const requests=parseFileRequests(fileRequestsText,fileDiskBlockCount);
    return {capacity:fileDiskBlockCount,reserved,requests};
  }
  function fileAllocBlockMap(result) {
    return `<div class="file-block-grid">${result.blocks.map(b=>{
      const label=b.kind==='reserved'?'SYS':b.kind==='index'?`IDX ${b.file}`:b.kind==='data'?b.file:'FREE';
      const role=b.kind==='index'?'Index block':b.kind==='data'?`File ${b.file} data block`:b.kind==='reserved'?'Reserved by system':'Free disk block';
      const klass=b.kind==='reserved'?'reserved':b.kind==='index'?'index':b.kind==='data'?'allocated':'free';
      return `<div class="file-block ${klass}" title="Block ${b.index}: ${role}"><span>${b.index}</span><strong>${esc(label)}</strong></div>`;
    }).join('')}</div>`;
  }
  function fileAllocTable(result) {
    return `<div class="table-wrap"><table class="data-table file-result-table"><thead><tr><th>File</th><th>Requested</th><th>Data block locations</th><th>Index block</th><th>Status</th><th>Explanation</th></tr></thead><tbody>${result.files.map(f=>{
      const locations=f.allocated?(result.method==='contiguous'?`${f.dataBlocks[0]}–${f.dataBlocks[f.dataBlocks.length-1]}`:f.dataBlocks.join(' → ')):'—';
      return `<tr><td><strong>${esc(f.name)}</strong></td><td>${f.requested}</td><td>${esc(locations)}</td><td>${f.indexBlock===null?'—':f.indexBlock}</td><td>${tag(f.allocated?'ALLOCATED':'FAILED',f.allocated?'good':'bad')}</td><td>${esc(f.reason)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function fileAllocCompareHtml(results) {
    return `<div class="table-wrap"><table class="data-table file-result-table file-compare-table"><thead><tr><th>Method</th><th>Files</th><th>Data</th><th>Index</th><th>Free / max run</th><th>Outcome</th></tr></thead><tbody>${results.map(r=>`<tr><td><strong>${FILE_ALLOCATION_METHODS.find(m=>m.value===r.method).label}</strong></td><td>${r.allocatedFiles}/${r.files.length}</td><td>${r.allocatedData}/${r.totalDataRequested}</td><td>${r.indexBlocks}</td><td>${r.freeBlocks} / ${r.largestFreeRun}</td><td>${r.failedFiles?tag(`${r.failedFiles} FAILED`,'bad'):tag('ALL ALLOCATED','good')}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function fileAllocResultHtml(result) {
    const title=FILE_ALLOCATION_METHODS.find(m=>m.value===result.method).full;
    const explanation={
      contiguous:'Each file occupies consecutive blocks. The largest free run shows how external fragmentation can prevent a large file from fitting even if the sum of free blocks is sufficient.',
      linked:'A file can use scattered blocks connected by pointers. This avoids the contiguous-run requirement, but sequential traversal follows the block chain.',
      indexed:'Each file has an index block containing pointers to its data blocks. The index block adds storage overhead but supports direct access to listed data blocks.'
    }[result.method];
    return `<div class="panel"><div class="panel-header"><div><h2>${title} · Block map</h2><p>${esc(result.status)}. Block indices start at zero.</p></div>${tag(`${result.allocatedFiles}/${result.files.length} FILES`,result.failedFiles?'bad':'good')}</div><div class="panel-body"><div class="result-stats"><div class="result-stat"><label>DATA BLOCKS USED</label><strong>${result.allocatedData}</strong><small>of ${result.totalDataRequested} requested</small></div><div class="result-stat"><label>FREE BLOCKS</label><strong>${result.freeBlocks}</strong><small>${result.reserved.length} system-reserved</small></div><div class="result-stat"><label>INDEX OVERHEAD</label><strong>${result.indexBlocks}</strong><small>index blocks used</small></div></div><div class="file-map-legend"><span><i class="allocated"></i>Data block</span><span><i class="index"></i>Index block</span><span><i class="reserved"></i>Reserved</span><span><i class="free"></i>Free</span></div>${fileAllocBlockMap(result)}<p class="inline-tip" style="margin-top:11px">${explanation}</p><div class="section-divider"></div><div class="result-head"><div><h3>Per-file allocation table</h3><p>Failed files do not hold a partial allocation.</p></div><span class="mini-label">${result.files.length} FILES REQUESTED</span></div>${fileAllocTable(result)}</div></div>`;
  }
  function renderFileAllocationOutput() {
    const target=$('#fileAllocationOutput');
    if(!target) return;
    if(!fileAllocationResult){target.innerHTML=emptyState('▦','Allocation not run','Choose a file allocation method and run the simulation to inspect the disk blocks.');return;}
    const comparison=fileAllocationComparison?panel('01 / Method comparison','All methods receive the same file sizes, reserved blocks, and disk capacity.',fileAllocCompareHtml(fileAllocationComparison)):'';
    const compareNote=fileAllocationComparison?`<div class="helper-note" style="margin-bottom:12px"><strong>Comparison view:</strong> the block map below shows Contiguous allocation. Choose a single method from the selector to inspect its exact map.</div>`:'';
    target.innerHTML=`${comparison}${compareNote}${fileAllocResultHtml(fileAllocationResult)}`;
  }
  function allocateFilesAndRender() {
    try {
      const input=validateFileAllocationDom();
      if(fileAllocationMethod==='compare'){
        fileAllocationComparison=FILE_ALLOCATION_METHODS.map(m=>runFileAllocation(m.value,input.capacity,input.reserved,input.requests));
        fileAllocationResult=fileAllocationComparison[0];
      } else {
        fileAllocationComparison=null;
        fileAllocationResult=runFileAllocation(fileAllocationMethod,input.capacity,input.reserved,input.requests);
      }
      renderFileAllocationOutput();
      $('#fileAllocationExportBtn').disabled=false;
      showToast('Allocation calculated',fileAllocationComparison?'Contiguous, Linked, and Indexed policies have been compared.':fileAllocationResult.status);
    } catch(e) {showToast('Unable to allocate files',e.message,'error');}
  }
  function renderFileAllocation() {
    $('#appContent').innerHTML=`${heading('FILE MANAGEMENT / LAB 06','File Allocation Visualizer','Compare how a file system maps files onto disk blocks using Contiguous, Linked, and Indexed allocation. Observe fragmentation, pointer chains, and index-block overhead.', '<button class="btn" id="fileAllocationExportBtn" '+(fileAllocationResult?'':'disabled')+'>↓ Export CSV</button><button class="btn" id="fileAllocationSampleBtn">↺ Load sample</button><button class="btn btn-primary" id="fileAllocationRunTop">Allocate files →</button>')}
      <div class="workspace-grid file-workspace"><div class="stack">
        ${panel('01 / Disk and file workload','The sample deliberately includes reserved blocks to demonstrate the difference between total free space and contiguous free space.',`<div class="field-grid"><div class="field"><label for="fileBlockCount">Disk block count (16–64)</label><input id="fileBlockCount" type="number" min="16" max="64" value="${fileDiskBlockCount}"></div><div class="field"><label for="fileAllocationMethod">Allocation method</label><select id="fileAllocationMethod"><option value="contiguous" ${fileAllocationMethod==='contiguous'?'selected':''}>Contiguous</option><option value="linked" ${fileAllocationMethod==='linked'?'selected':''}>Linked</option><option value="indexed" ${fileAllocationMethod==='indexed'?'selected':''}>Indexed</option><option value="compare" ${fileAllocationMethod==='compare'?'selected':''}>Compare all</option></select></div></div><div class="field" style="margin-top:11px"><label for="fileRequests">Files and requested data blocks</label><textarea id="fileRequests" rows="3" spellcheck="false">${esc(fileRequestsText)}</textarea><p class="inline-tip">Format: <code>A:3, B:4, report:5</code>. Use unique names and sizes ≥ 1.</p></div><div class="field" style="margin-top:11px"><label for="fileReservedBlocks">Reserved block indices (optional)</label><input id="fileReservedBlocks" type="text" value="${esc(fileReservedText)}" placeholder="e.g. 4 9 14 19"><p class="inline-tip">Zero-based block indices; these blocks are unavailable to files.</p></div><div class="form-actions"><button class="btn btn-primary" id="fileAllocationRunBtn">▶ Run allocation</button><button class="btn" id="fileAllocationResetBtn">Restore sample</button></div>`)}
        ${panel('02 / Allocation rule','The policy changes how a file is assigned to the same disk.',`<div class="file-rule-list"><div><span class="file-rule-icon contig">C</span><section><strong>Contiguous</strong><p>Every file occupies one continuous run of blocks. Simple access, but vulnerable to external fragmentation.</p></section></div><div><span class="file-rule-icon linked">L</span><section><strong>Linked</strong><p>Each file is a chain of blocks. Blocks can be scattered; each block points to the next.</p></section></div><div><span class="file-rule-icon indexed">I</span><section><strong>Indexed</strong><p>An index block stores pointers to all data blocks. It supports direct access but costs an extra block.</p></section></div></div>`)}
      </div><div class="stack" id="fileAllocationOutput">${fileAllocationResult?fileAllocResultHtml(fileAllocationResult):emptyState('▦','Allocation not run','Choose a file allocation method and run the simulation to inspect the disk blocks.')}</div></div>
      <div class="helper-note" style="margin-top:15px"><strong>Sample interpretation:</strong> blocks 4, 9, 14, and 19 are reserved. Four 3-block files can leave separate 1-block gaps; a final 5-block file may fail under Contiguous allocation even though the total free block count is sufficient. Linked allocation can connect scattered free blocks. Indexed allocation additionally reserves one index block per file.</div>`;
    bindOpenButtons();
    $('#fileAllocationRunBtn')?.addEventListener('click',allocateFilesAndRender);
    $('#fileAllocationRunTop')?.addEventListener('click',allocateFilesAndRender);
    $('#fileAllocationExportBtn')?.addEventListener('click',exportFileAllocationCsv);
    const loadSample=()=>{fileDiskBlockCount=24;fileReservedText='4 9 14 19';fileRequestsText='A:3, B:3, C:3, D:3, E:5';fileAllocationMethod='contiguous';fileAllocationResult=null;fileAllocationComparison=null;renderFileAllocation();showToast('Sample loaded','Loaded a fragmented block-map example for the three allocation policies.');};
    $('#fileAllocationSampleBtn')?.addEventListener('click',loadSample);
    $('#fileAllocationResetBtn')?.addEventListener('click',()=>{loadSample();});
    renderFileAllocationOutput();
  }
  function exportFileAllocationCsv() {
    if(!fileAllocationResult) return;
    const results=fileAllocationComparison||[fileAllocationResult];
    const rows=[];
    results.forEach(r=>r.files.forEach(f=>rows.push([FILE_ALLOCATION_METHODS.find(m=>m.value===r.method).full,r.capacity,f.name,f.requested,f.allocated?f.dataBlocks.join(' '):'',f.indexBlock===null?'':f.indexBlock,f.allocated?'ALLOCATED':'FAILED',f.reason,r.freeBlocks,r.largestFreeRun])));
    downloadCsv('os-lab-file-allocation.csv',['Method','Disk Blocks','File','Requested Data Blocks','Allocated Data Blocks','Index Block','Status','Reason','Free Blocks After Allocation','Largest Free Run'],rows);
  }


  // -------------------------- PROCESS SYNCHRONIZATION --------------------------
  function resetSyncState(capacity = syncCapacity) {
    syncCapacity = capacity;
    syncBuffer = [];
    syncNextItem = 1;
    syncOperations = [];
    syncEvents = [];
    syncSemaphores = { empty: capacity, full: 0, mutex: 1 };
  }
  function addSyncEvent(operation, actor, event) {
    syncEvents.push({
      step: syncEvents.length + 1,
      operation,
      actor,
      event,
      empty: syncSemaphores.empty,
      full: syncSemaphores.full,
      mutex: syncSemaphores.mutex,
      buffer: syncBuffer.length ? syncBuffer.join(' · ') : '∅'
    });
  }
  function syncAction(action, redraw = true) {
    const op = syncOperations.length + 1;
    const actor = action === 'produce' ? 'Producer' : 'Consumer';
    const before = syncBuffer.length ? syncBuffer.join(' · ') : '∅';
    let item = '—';
    let status = 'SUCCESS';
    let detail = '';
    if (action === 'produce') {
      if (syncSemaphores.empty === 0) {
        status = 'BLOCKED';
        detail = 'wait(empty) blocks: the buffer is full; no slot can be reserved.';
        addSyncEvent(op, actor, detail);
      } else {
        syncSemaphores.empty--;
        addSyncEvent(op, actor, 'wait(empty) succeeds; reserve one empty slot.');
        syncSemaphores.mutex = 0;
        addSyncEvent(op, actor, 'wait(mutex) acquires the critical section (mutex: 1 → 0).');
        item = `T${syncNextItem++}`;
        syncBuffer.push(item);
        addSyncEvent(op, actor, `Critical section: produce ${item} and place it in the buffer.`);
        syncSemaphores.mutex = 1;
        addSyncEvent(op, actor, 'signal(mutex) releases the critical section (mutex: 0 → 1).');
        syncSemaphores.full++;
        addSyncEvent(op, actor, 'signal(full) announces one more available item.');
        detail = `${item} added to the buffer.`;
      }
    } else {
      if (syncSemaphores.full === 0) {
        status = 'BLOCKED';
        detail = 'wait(full) blocks: the buffer is empty; no item can be consumed.';
        addSyncEvent(op, actor, detail);
      } else {
        syncSemaphores.full--;
        addSyncEvent(op, actor, 'wait(full) succeeds; reserve one available item.');
        syncSemaphores.mutex = 0;
        addSyncEvent(op, actor, 'wait(mutex) acquires the critical section (mutex: 1 → 0).');
        item = syncBuffer.shift();
        addSyncEvent(op, actor, `Critical section: consume ${item} from the buffer.`);
        syncSemaphores.mutex = 1;
        addSyncEvent(op, actor, 'signal(mutex) releases the critical section (mutex: 0 → 1).');
        syncSemaphores.empty++;
        addSyncEvent(op, actor, 'signal(empty) announces one more free slot.');
        detail = `${item} removed from the buffer.`;
      }
    }
    syncOperations.push({
      step: op, actor, action: action === 'produce' ? 'Produce' : 'Consume', item,
      status, before, after: syncBuffer.length ? syncBuffer.join(' · ') : '∅',
      empty: syncSemaphores.empty, full: syncSemaphores.full, detail
    });
    if (redraw) renderSyncOutput();
    return status;
  }
  function runSyncDemo() {
    resetSyncState(syncCapacity);
    ['produce','produce','produce','produce','consume','consume','consume','consume','produce','consume'].forEach(a => syncAction(a, false));
    renderSyncOutput();
    showToast('Guided trace complete', 'The trace shows both successful operations and blocked producer/consumer attempts.');
  }
  function syncBufferHtml() {
    return `<div class="sync-buffer-slots">${Array.from({length:syncCapacity},(_,i)=>{
      const item=syncBuffer[i];
      return `<div class="sync-buffer-slot ${item?'filled':''}"><span>SLOT ${String(i+1).padStart(2,'0')}</span><strong>${item||'EMPTY'}</strong><small>${item?'occupied':'free slot'}</small></div>`;
    }).join('')}</div>`;
  }
  function renderSyncOutput() {
    const empty=$('#syncEmptyCount');
    if (!empty) return;
    empty.textContent=syncSemaphores.empty;
    $('#syncFullCount').textContent=syncSemaphores.full;
    $('#syncMutexCount').textContent=syncSemaphores.mutex;
    $('#syncBufferVisual').innerHTML=syncBufferHtml();
    $('#syncBufferSummary').textContent=`${syncBuffer.length} of ${syncCapacity} slots occupied`;
    $('#syncUsageFill').style.width=`${(syncBuffer.length/syncCapacity)*100}%`;
    $('#syncOperationCount').textContent=syncOperations.length;
    $('#syncSuccessCount').textContent=syncOperations.filter(x=>x.status==='SUCCESS').length;
    $('#syncBlockedCount').textContent=syncOperations.filter(x=>x.status==='BLOCKED').length;
    $('#syncOperationBody').innerHTML=syncOperations.length?syncOperations.map(o=>`<tr><td>${o.step}</td><td>${o.actor}</td><td>${o.action}</td><td>${o.item}</td><td>${tag(o.status,o.status==='SUCCESS'?'good':'bad')}</td><td>${o.empty}</td><td>${o.full}</td></tr>`).join(''):`<tr><td colspan="7">Run a producer or consumer operation to build the trace.</td></tr>`;
    $('#syncEventBody').innerHTML=syncEvents.length?syncEvents.map(e=>`<tr><td>${e.step}</td><td>${e.operation}</td><td>${e.actor}</td><td>${esc(e.event)}</td><td>${e.empty}</td><td>${e.full}</td><td>${e.mutex}</td><td>${esc(e.buffer)}</td></tr>`).join(''):`<tr><td colspan="8">Semaphore events will appear here.</td></tr>`;
    const last=syncOperations[syncOperations.length-1];
    const status=$('#syncLastStatus');
    status.className=`sync-last-status ${last?(last.status==='SUCCESS'?'success':'blocked'):''}`;
    status.innerHTML=last?`<strong>${last.status==='SUCCESS'?'Operation completed':'Operation blocked'}</strong><span>${esc(last.detail)}</span>`:`<strong>Ready to simulate</strong><span>Choose Produce or Consume. A blocked operation leaves the buffer and semaphore counts unchanged.</span>`;
    $('#syncExportBtn').disabled=!syncEvents.length;
  }
  function renderSync() {
    $('#appContent').innerHTML = `${heading('INTER-PROCESS COMMUNICATION / LAB 05','Semaphore Synchronization Lab','Explore the bounded Producer–Consumer problem. See how counting semaphores track empty slots and filled slots while a mutex protects the critical section.', '<button class="btn" id="syncExportBtn" disabled>↓ Export CSV</button><button class="btn" id="syncResetBtn">↺ Reset lab</button><button class="btn btn-primary" id="syncDemoBtn">Run guided demo →</button>')}
      <div class="sync-layout">
        <div class="stack">
          ${panel('01 / Semaphore state','empty counts free slots · full counts items · mutex protects the shared buffer.', `<div class="sync-semaphore-grid"><div class="sync-semaphore-card empty-sem"><span>COUNTING SEMAPHORE</span><strong id="syncEmptyCount">${syncSemaphores.empty}</strong><label>EMPTY</label><small>free slots</small></div><div class="sync-semaphore-card full-sem"><span>COUNTING SEMAPHORE</span><strong id="syncFullCount">${syncSemaphores.full}</strong><label>FULL</label><small>available items</small></div><div class="sync-semaphore-card mutex-sem"><span>BINARY SEMAPHORE</span><strong id="syncMutexCount">${syncSemaphores.mutex}</strong><label>MUTEX</label><small>${syncSemaphores.mutex===1?'unlocked':'locked'}</small></div></div><div class="section-divider"></div><div class="field"><label for="syncCapacity">Buffer capacity (2–6 slots)</label><div class="sync-capacity-row"><input id="syncCapacity" type="number" min="2" max="6" value="${syncCapacity}"><button class="btn" id="syncApplyCapacityBtn">Apply & reset</button></div></div><p class="inline-tip" style="margin-top:10px">Invariant after each completed operation: empty + full = buffer capacity; mutex returns to 1.</p>`)}
          ${panel('02 / Run process operations','Each button executes one atomic producer or consumer attempt. Attempts that cannot proceed are recorded as BLOCKED.', `<div class="sync-action-buttons"><button class="btn btn-primary" id="syncProduceBtn">＋ Produce item</button><button class="btn btn-violet" id="syncConsumeBtn">− Consume item</button></div><div id="syncLastStatus" class="sync-last-status"><strong>Ready to simulate</strong><span>Choose Produce or Consume to see semaphore transitions.</span></div><div class="sync-kpi-strip"><div><span>OPERATIONS</span><strong id="syncOperationCount">0</strong></div><div><span>SUCCEEDED</span><strong id="syncSuccessCount">0</strong></div><div><span>BLOCKED</span><strong id="syncBlockedCount">0</strong></div></div>`)}
        </div>
        <div class="stack">
          ${panel('03 / Bounded buffer','Items are consumed in FIFO order. Empty slots are shown explicitly.', `<div class="sync-buffer-head"><strong>SHARED BUFFER</strong><span id="syncBufferSummary">0 of ${syncCapacity} slots occupied</span></div><div class="sync-usage-track"><div id="syncUsageFill" style="width:0%"></div></div><div id="syncBufferVisual">${syncBufferHtml()}</div><div class="helper-note" style="margin-top:13px"><strong>Critical section:</strong> only the process holding mutex may modify the shared buffer. In this step-by-step model mutex is released at the end of every successful operation.</div>`)}
          ${panel('04 / Operation history','A compact summary of each button press, including attempts that were blocked.', `<div class="table-wrap"><table class="data-table sync-table"><thead><tr><th>#</th><th>Process</th><th>Action</th><th>Item</th><th>Status</th><th>Empty</th><th>Full</th></tr></thead><tbody id="syncOperationBody"><tr><td colspan="7">Run a producer or consumer operation to build the trace.</td></tr></tbody></table></div>`)}
        </div>
      </div>
      ${panel('05 / Semaphore execution trace','Every wait/signal and critical-section event is logged with the semaphore values and buffer snapshot at that point.', `<div class="table-wrap sync-trace-wrap"><table class="data-table sync-table"><thead><tr><th>Event</th><th>Op</th><th>Process</th><th>Semaphore / critical-section event</th><th>Empty</th><th>Full</th><th>Mutex</th><th>Buffer</th></tr></thead><tbody id="syncEventBody"><tr><td colspan="8">Semaphore events will appear here.</td></tr></tbody></table></div>`)}
      <div class="helper-note"><strong>What this demonstrates:</strong> Producer executes wait(empty), wait(mutex), writes to the shared buffer, then signal(mutex) and signal(full). Consumer executes wait(full), wait(mutex), reads an item, then signal(mutex) and signal(empty). A real concurrent implementation must also schedule blocked processes; this deterministic teaching model records blocked attempts rather than running operating-system threads.</div>`;
    bindOpenButtons();
    $('#syncProduceBtn')?.addEventListener('click',()=>syncAction('produce'));
    $('#syncConsumeBtn')?.addEventListener('click',()=>syncAction('consume'));
    $('#syncDemoBtn')?.addEventListener('click',runSyncDemo);
    const reset=()=>{resetSyncState(syncCapacity);renderSync();showToast('Lab reset','The buffer and semaphore trace have been cleared.');};
    $('#syncResetBtn')?.addEventListener('click',reset);
    $('#syncApplyCapacityBtn')?.addEventListener('click',()=>{
      try { const n=intField($('#syncCapacity').value,'Buffer capacity',2,6);resetSyncState(n);renderSync();showToast('Capacity applied',`The shared buffer now has ${n} slots.`); }
      catch(e){showToast('Invalid capacity',e.message,'error');}
    });
    $('#syncExportBtn')?.addEventListener('click',exportSyncCsv);
    renderSyncOutput();
  }
  function exportSyncCsv() {
    if (!syncEvents.length) return;
    downloadCsv('os-lab-semaphore-synchronization.csv',['Event','Operation','Process','Semaphore / Critical Section Event','Empty','Full','Mutex','Buffer Snapshot'],syncEvents.map(e=>[e.step,e.operation,e.actor,e.event,e.empty,e.full,e.mutex,e.buffer]));
  }


  function csvCell(value) {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }
  function downloadCsv(filename, headers, rows) {
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href=url; link.download=filename; link.style.display='none';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('CSV prepared', `${filename} is ready to save.`);
  }
  function exportCpuCsv() {
    if (!cpuResult) return;
    if (cpuResult.compare) {
      const rows=cpuResult.compare.map(r=>[algLabel(r.algorithm),fmt(r.avgWait),fmt(r.avgTurn),fmt(r.avgResponse),fmt(r.utilization),r.finish,fmt(r.throughput,3)]);
      downloadCsv('os-lab-cpu-policy-comparison.csv',['Algorithm','Average Waiting Time','Average Turnaround Time','Average Response Time','CPU Utilization %','Finish Time','Throughput'],rows);
    } else {
      const r=cpuResult.primary;
      downloadCsv('os-lab-cpu-scheduling.csv',['Algorithm','Process','Arrival Time','Burst Time','Priority','First Start','Finish Time','Waiting Time','Turnaround Time','Response Time'],r.rows.map(p=>[algLabel(r.algorithm),p.id,p.arrival,p.burst,p.priority,p.first,p.finish,p.waiting,p.turnaround,p.response]));
    }
  }
  function exportMemoryCsv() {
    if (!memoryResult) return;
    if (memoryResult.compare) {
      downloadCsv('os-lab-page-policy-comparison.csv',['Algorithm','Frames','References','Page Faults','Page Hits','Fault Rate %','Hit Rate %'],memoryResult.compare.map(r=>[algLabelMemory(r.algorithm),r.frameCount,r.reference.length,r.faults,r.hits,fmt(r.faultRate),fmt(r.hitRate)]));
    } else {
      const r=memoryResult;
      downloadCsv('os-lab-page-replacement.csv',['Step','Page Reference',...Array.from({length:r.frameCount},(_,i)=>`Frame ${i+1}`),'Status','Evicted Page','Cumulative Faults'],r.steps.map(s=>[s.index+1,s.page,...s.frames.map(v=>v===null?'':v),s.hit?'HIT':'FAULT',s.evicted===null?'':s.evicted,s.faults]));
    }
  }
  function exportDiskCsv() {
    if (!diskResult) return;
    if (diskResult.compare) {
      downloadCsv('os-lab-disk-policy-comparison.csv',['Algorithm','Starting Head','Direction','Request Count','Total Cylinder Movement'],diskResult.compare.map(r=>[r.algorithm,r.head,r.direction,r.requests.length,r.total]));
    } else {
      const r=diskResult;
      downloadCsv('os-lab-disk-scheduling.csv',['Step','From Cylinder','To Cylinder','Movement','Circular Wrap'],r.movements.map((m,i)=>[i+1,m.from,m.to,m.distance,m.wrap?'Yes':'No']));
    }
  }
  function exportBankerCsv() {
    if (!bankerResult) return;
    downloadCsv('os-lab-bankers-safety-trace.csv',['Step','Process','Need Vector','Work Before','Work After','Safe State'],bankerResult.steps.map((s,i)=>[i+1,`P${s.process}`,`[${s.need.join(' ')}]`,`[${s.before.join(' ')}]`,`[${s.after.join(' ')}]`,bankerResult.safe?'SAFE':'UNSAFE']));
  }

  // ------------------------------- C++ PRACTICAL GUIDE -------------------------------
  const CPP_PRACTICALS = {
    fcfs: {
      label: 'FCFS CPU Scheduling',
      summary: 'First Come, First Served runs processes in increasing arrival order. It is simple and non-preemptive, so the selected process keeps the CPU until its burst is complete.',
      steps: [
        ['01', 'Read the process table', 'Store each process with its ID, arrival time, and burst time.'],
        ['02', 'Sort by arrival time', 'The process that entered the ready queue first gets the first chance to run.'],
        ['03', 'Execute to completion', 'Move the current time forward by the process burst time and record its completion time.'],
        ['04', 'Calculate metrics', 'Turnaround = completion − arrival; waiting = turnaround − burst.']
      ],
      code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <vector>
using namespace std;

struct Process {
    int id, arrival, burst, completion, waiting, turnaround;
};

int main() {
    vector<Process> p = {{1, 0, 7}, {2, 2, 4}, {3, 4, 1}, {4, 5, 4}};
    sort(p.begin(), p.end(), [](const Process& a, const Process& b) {
        return a.arrival < b.arrival;
    });

    int time = 0;
    double totalWaiting = 0, totalTurnaround = 0;
    for (auto& job : p) {
        time = max(time, job.arrival);
        time += job.burst;
        job.completion = time;
        job.turnaround = job.completion - job.arrival;
        job.waiting = job.turnaround - job.burst;
        totalWaiting += job.waiting;
        totalTurnaround += job.turnaround;
    }

    cout << "PID\\tCT\\tTAT\\tWT\\n";
    for (const auto& job : p)
        cout << "P" << job.id << "\\t" << job.completion << "\\t"
             << job.turnaround << "\\t" << job.waiting << "\\n";
    cout << fixed << setprecision(2)
         << "Average WT: " << totalWaiting / p.size() << "\\n"
         << "Average TAT: " << totalTurnaround / p.size() << "\\n";
}`
    },
    sjf: {
      label: 'SJF CPU Scheduling',
      summary: 'Shortest Job First selects the arrived process with the smallest burst time. This version is non-preemptive: once selected, a process runs to completion.',
      steps: [
        ['01', 'Find arrived processes', 'At the current time, inspect only processes whose arrival time is less than or equal to the clock.'],
        ['02', 'Choose the shortest burst', 'Select the ready process with the smallest burst time; break ties by arrival time.'],
        ['03', 'Run without interruption', 'Advance the clock by the selected burst and mark the process complete.'],
        ['04', 'Repeat and measure', 'Continue until every process finishes, then calculate waiting and turnaround averages.']
      ],
      code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <vector>
using namespace std;

struct Process {
    int id, arrival, burst, completion = 0;
    bool done = false;
};

int main() {
    vector<Process> p = {{1, 0, 7}, {2, 2, 4}, {3, 4, 1}, {4, 5, 4}};
    int time = 0, completed = 0;
    double totalWaiting = 0, totalTurnaround = 0;

    while (completed < static_cast<int>(p.size())) {
        int chosen = -1;
        for (int i = 0; i < static_cast<int>(p.size()); ++i) {
            if (!p[i].done && p[i].arrival <= time &&
                (chosen == -1 || p[i].burst < p[chosen].burst))
                chosen = i;
        }
        if (chosen == -1) {
            ++time; // CPU is idle until the next process arrives.
            continue;
        }
        time += p[chosen].burst;
        p[chosen].completion = time;
        p[chosen].done = true;
        ++completed;
        int turnaround = time - p[chosen].arrival;
        int waiting = turnaround - p[chosen].burst;
        totalWaiting += waiting;
        totalTurnaround += turnaround;
        cout << "P" << p[chosen].id << " completed at " << time
             << " (WT=" << waiting << ", TAT=" << turnaround << ")\\n";
    }
    cout << fixed << setprecision(2)
         << "Average WT: " << totalWaiting / p.size() << "\\n"
         << "Average TAT: " << totalTurnaround / p.size() << "\\n";
}`
    },
    rr: {
      label: 'Round Robin CPU Scheduling',
      summary: 'Round Robin gives each ready process a fixed time quantum. A process that is not finished goes to the back of the ready queue, giving every process a fair turn.',
      steps: [
        ['01', 'Create the ready queue', 'Add processes as they arrive, preserving their queue order.'],
        ['02', 'Dispatch one quantum', 'Run the front process for min(quantum, remaining burst) time units.'],
        ['03', 'Re-queue unfinished work', 'If remaining burst is greater than zero, place the process at the back of the queue.'],
        ['04', 'Record completion', 'When remaining time reaches zero, calculate completion, turnaround, and waiting time.']
      ],
      code: `#include <iomanip>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

struct Process {
    int id, arrival, burst, remaining, completion = 0;
};

int main() {
    vector<Process> p = {{1, 0, 7, 7}, {2, 2, 4, 4},
                         {3, 4, 1, 1}, {4, 5, 4, 4}};
    const int quantum = 2;
    queue<int> ready;
    int time = 0, completed = 0;
    vector<bool> queued(p.size(), false);

    while (completed < static_cast<int>(p.size())) {
        for (int i = 0; i < static_cast<int>(p.size()); ++i)
            if (!queued[i] && p[i].arrival <= time) {
                ready.push(i);
                queued[i] = true;
            }
        if (ready.empty()) {
            ++time;
            continue;
        }
        int i = ready.front();
        ready.pop();
        int slice = min(quantum, p[i].remaining);
        p[i].remaining -= slice;
        time += slice;
        for (int j = 0; j < static_cast<int>(p.size()); ++j)
            if (!queued[j] && p[j].arrival <= time) {
                ready.push(j);
                queued[j] = true;
            }
        if (p[i].remaining > 0) ready.push(i);
        else {
            p[i].completion = time;
            ++completed;
        }
    }

    double totalWaiting = 0, totalTurnaround = 0;
    for (const auto& job : p) {
        int turnaround = job.completion - job.arrival;
        int waiting = turnaround - job.burst;
        totalWaiting += waiting;
        totalTurnaround += turnaround;
        cout << "P" << job.id << ": CT=" << job.completion
             << ", TAT=" << turnaround << ", WT=" << waiting << "\\n";
    }
    cout << fixed << setprecision(2)
         << "Average WT: " << totalWaiting / p.size() << "\\n"
         << "Average TAT: " << totalTurnaround / p.size() << "\\n";
}`
    }
  };
  let cppPractical = 'fcfs';

  function renderCppGuide() {
    const practical = CPP_PRACTICALS[cppPractical];
    const steps = practical.steps.map(([number, title, description], index) => `<article class="cpp-step"><div class="cpp-step-number">${number}</div><div class="cpp-step-line"></div><div><h3>${title}</h3><p>${description}</p></div><span class="cpp-step-check">${index === practical.steps.length - 1 ? '✓' : '→'}</span></article>`).join('');
    $('#appContent').innerHTML = `${heading('C++ / PRACTICAL NOTEBOOK','C++ Practical Guide','Understand the algorithm first, then use a clean C++ implementation in your OS practical file. Select a practical to update the visual explanation and code.', '<button class="btn" id="cppBackBtn">← Back to simulator</button>')}
      <div class="cpp-toolbar panel"><div><span class="panel-kicker">SELECT PRACTICAL</span><label class="sr-only" for="cppPractical">Select C++ practical</label><select id="cppPractical">${Object.entries(CPP_PRACTICALS).map(([key, item]) => `<option value="${key}" ${key === cppPractical ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div><span class="pill cyan">COMPILE WITH C++17</span></div>
      <div class="cpp-layout"><div class="stack"><section class="panel cpp-overview"><div class="panel-header"><div><h2>${practical.label}</h2><p>${practical.summary}</p></div><span class="pill good">VISUAL WALKTHROUGH</span></div><div class="panel-body"><div class="cpp-steps">${steps}</div></div></section></div>
        <section class="panel cpp-code-panel"><div class="panel-header"><div><h2>Complete C++17 code</h2><p>Copy this program into your compiler or practical record.</p></div><button class="btn" id="cppCopyBtn">Copy code</button></div><div class="code-window"><div class="code-window-bar"><span></span><span></span><span></span><small>main.cpp</small></div><pre><code id="cppCode">${esc(practical.code)}</code></pre></div></section></div>`;
    $('#cppPractical')?.addEventListener('change', e => { cppPractical = e.target.value; renderCppGuide(); });
    $('#cppBackBtn')?.addEventListener('click', () => setView('cpu'));
    $('#cppCopyBtn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(practical.code);
        showToast('Code copied', 'The C++17 program is ready to paste into your compiler.');
      } catch {
        showToast('Copy unavailable', 'Select the code manually and copy it from the code panel.', 'error');
      }
    });
  }

  // ------------------------------- OS CONCEPTS -------------------------------
  function renderConcepts() {
    const concepts=[
      ['01','Operating System','System software that manages hardware, executes applications, allocates resources, and offers services to programs.','Core idea: a resource manager and an abstraction layer.'],
      ['02','Process vs. Thread','A process is a program in execution with its own address space. Threads are execution paths that usually share a process’s code and data.','Process = resource container · Thread = execution unit'],
      ['03','CPU Scheduling','The scheduler selects a process from the ready queue. Policies balance waiting time, response time, fairness, and throughput.','Waiting = Turnaround − Burst'],
      ['04','Context Switch','The OS saves the state of one running process and restores another. Switching has overhead because it performs management work rather than application work.','A context switch is not the same as a mode switch.'],
      ['05','Virtual Memory','Virtual memory lets processes use logical address spaces larger or more flexible than the currently resident physical-memory pages.','A page fault occurs when a needed page is not resident.'],
      ['06','Page Replacement','When a page must be loaded and frames are full, a policy chooses which resident page to evict. FIFO, LRU, and Optimal use different information.','Optimal is a theoretical benchmark; it requires future knowledge.'],
      ['07','Race Condition','A result depends on the unpredictable ordering of concurrent operations on shared state. Synchronization protects critical sections.','Mutual exclusion limits simultaneous critical-section access.'],
      ['08','Deadlock','Processes wait indefinitely for resources held by one another. The four Coffman conditions are mutual exclusion, hold-and-wait, no preemption, and circular wait.','Banker’s algorithm avoids unsafe states using maximum claims.'],
      ['09','Semaphores & IPC','A semaphore is an integer synchronization primitive used through atomic wait and signal operations. A mutex enforces exclusive access to a critical section.','Producer–Consumer uses empty/full counting semaphores and a mutex.'],
      ['10','Disk Scheduling','Policies order I/O requests to reduce head movement or improve service behavior. FCFS is simple; SSTF seeks nearby requests; SCAN moves like an elevator.','Total head movement = sum of consecutive absolute cylinder differences.'],
      ['11','File System','The OS organizes files and directories, maps names to stored data, tracks metadata, and enforces access protection.','Contiguous, linked, and indexed are common file-allocation strategies.'],
      ['12','System Call','A controlled interface through which a user program requests a kernel service, such as file I/O, process creation, or memory mapping.','Examples: open, read, write, fork/exec (Unix-like systems).'],
      ['13','Thrashing','A system spends excessive time paging instead of executing useful work, often because active processes do not have enough frames.','Working-set and page-fault-frequency approaches can help control it.']
    ];
    $('#appContent').innerHTML=`${heading('REFERENCE DESK / THEORY','OS Concepts & Viva Desk','Compact definitions, equations, and connections to the simulators. Use this page to prepare the theory behind your experimental results.', '<button class="btn btn-primary" id="conceptPrintBtn">Print / Save as PDF ↗</button>')}<div class="concept-grid">${concepts.map(c=>`<article class="concept-card"><span class="concept-number">${c[0]} / CONCEPT</span><h3>${c[1]}</h3><p>${c[2]}</p><div class="formula">${c[3]}</div></article>`).join('')}</div><div class="section-title-row" style="margin-top:24px"><div><h2>Formulas to remember</h2><p>These are the formulas used by the interactive modules.</p></div></div><div class="glossary-grid">${[['Turnaround time','Completion time − Arrival time'],['Waiting time','Turnaround time − Burst time'],['Response time','First CPU start − Arrival time'],['CPU utilization','Busy CPU time ÷ Total elapsed time × 100'],['Page-fault rate','Page faults ÷ Total references × 100'],['Disk movement','Σ |Next cylinder − Current cylinder|'],['Need matrix','Maximum demand − Allocation'],['Safe state','At least one ordering lets all processes finish'],['Throughput','Completed processes ÷ Total elapsed time']].map(([a,b])=>`<div class="glossary-item"><strong>${a}</strong><p>${b}</p></div>`).join('')}</div><div class="helper-note" style="margin-top:18px"><strong>For your report:</strong> describe the algorithm’s rule, input format, output visualization, formulas, sample observation, and limitations. Clearly state that this website is a simulation—not a replacement for the real OS kernel.</div>`;
    $('#conceptPrintBtn')?.addEventListener('click',()=>window.print());
  }

  // ------------------------------- GLOBAL EVENTS -------------------------------
  function bindOpenButtons() {
    $$('[data-open]').forEach(el=>{
      const open=()=>setView(el.dataset.open);
      el.addEventListener('click',open);
      if(el.tagName!=='BUTTON') el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    });
  }
  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
  $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#themeToggle').addEventListener('click',()=>{
    const theme = document.body.dataset.theme === 'bright' ? 'dark' : 'bright';
    window.localStorage.setItem('os-lab-theme', theme);
    setTheme(theme);
  });
  $('#helpBtn').addEventListener('click',()=>$('#helpDialog').showModal());
  $('#closeHelp').addEventListener('click',()=>$('#helpDialog').close());
  $('#helpDialog').addEventListener('click',e=>{ if(e.target===$('#helpDialog')) $('#helpDialog').close(); });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#sidebar').classList.remove('open');});

  // Public read-only hooks make the scheduling logic testable in a browser console.
  window.OSLabStudio = Object.freeze({
    scheduleCpu,
    simulatePages,
    orderDiskRequests,
    bankerSafety,
    bankerRequestCheck,
    runFileAllocation,
    parseFileRequests,
    simulateSynchronization: (actions, capacity = 3) => {
      resetSyncState(intField(capacity, 'Buffer capacity', 2, 6));
      actions.forEach(action => { if (!['produce','consume'].includes(action)) throw new Error('Action must be produce or consume.'); syncAction(action, false); });
      return { capacity: syncCapacity, buffer: [...syncBuffer], semaphores: { ...syncSemaphores }, operations: syncOperations.map(x=>({...x})), events: syncEvents.map(x=>({...x})) };
    },
    algorithms: ALGORITHMS.map(a=>({ ...a }))
  });
  renderDashboard();
})();
