# OS Lab Studio

**An interactive Operating Systems mini-project for CS1502 — Operating System.**

OS Lab Studio is a browser-based teaching lab that combines six interactive OS labs in one visual workspace. It runs locally and requires no Node.js, Python, database, backend, or package installation.

## Start here

1. Download and extract the project ZIP.
2. Open the `OSLabStudio` folder.
3. Double-click `launch.bat` on Windows, or open `index.html` directly in Chrome or Edge.
4. Choose a module from the left sidebar, load the sample data, and click **Run simulation**.

All calculations happen in the browser. Internet access is not required. The app does not control the computer's real CPU scheduler, physical memory, disk, or kernel.

## Modules and working functionality

### 1. CPU Scheduling Simulator

Implements six scheduling policies:

- **FCFS** — First Come, First Served
- **SJF** — non-preemptive Shortest Job First
- **SRTF** — preemptive Shortest Remaining Time First
- **Priority** — non-preemptive (a smaller priority number means higher priority)
- **Priority P.** — preemptive priority scheduling
- **Round Robin** — configurable positive integer time quantum

Features: editable arrival/burst/priority values; add/remove process controls; idle-period handling; Gantt chart; per-process first-start, finish, waiting, turnaround, and response metrics; averages, throughput, CPU utilization; comparison mode; CSV export.

### 2. Page Replacement Simulator

Implements FIFO, LRU, and Optimal page replacement.

Features: editable page reference string; 1–12 frames; step-by-step frame-state table; hit/fault status; evicted-page display; cumulative fault count; hit rate; policy comparison; CSV export.

### 3. Disk Scheduling Simulator

Implements FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK.

Features: editable request queue, initial head, minimum/maximum cylinder and direction; disk-head path plot; service sequence; movement-by-movement seek distance; total movement; comparison mode; CSV export. Boundary movement for SCAN and circular wrap for C-SCAN are included in the total seek movement.

### 4. Deadlock Avoidance Lab

Implements the Banker's safety algorithm for a configurable **5-process × 3-resource sample state** (Allocation, Maximum and Available values are editable).

Features: computed Need matrix; safe/unsafe state classification; safe sequence; step-by-step Work-vector trace; resource-request test checking Request ≤ Need, Request ≤ Available, then safety of the tentative state; CSV export of the safety trace.

### 5. Semaphore Synchronization Lab

Demonstrates the bounded Producer–Consumer problem using `empty`, `full`, and binary `mutex` semaphores.

Features: adjustable 2–6 slot buffer; interactive Produce and Consume operations; blocked attempts when the buffer is full or empty; live buffer visualization; semaphore values; operation history; detailed `wait()`/`signal()` and critical-section event trace; guided scenario; CSV export.

The lab is a deterministic teaching model rather than actual parallel OS threads. It traces the semaphore logic and shows when an operation would block, without starting concurrent processes.

### 6. File Allocation Visualizer

Compares three file-system allocation strategies on the same block map: Contiguous, Linked, and Indexed allocation.

Features: editable disk capacity, reserved system block indices, and file-size requests; visual block map with reserved/free/data/index block states; per-file allocation table; contiguous-run and linked-chain information; index-block overhead; free-block count and largest free run; one-method run or comparison mode; CSV export.

The sample includes reserved blocks that make the trade-offs visible: Contiguous allocation can fail a large file even when the total number of free blocks is sufficient; Linked allocation can use scattered free blocks; Indexed allocation needs an extra index block for each allocated file.

### Reference Desk

A concise OS concepts and viva page covers processes/threads, scheduling, context switches, virtual memory, page replacement, race conditions, deadlock, disk scheduling, file systems, system calls, and thrashing. Its print button opens the browser's print dialog, where **Save as PDF** can be selected.

## Formulas and invariants used

| Metric | Formula |
|---|---|
| Turnaround time | Finish time − Arrival time |
| Waiting time | Turnaround time − Burst time |
| Response time | First CPU start − Arrival time |
| CPU utilization | Total CPU burst time ÷ total elapsed time from t = 0 × 100 |
| Throughput | Number of completed processes ÷ finish time |
| Page-fault rate | Page faults ÷ total references × 100 |
| Hit rate | Page hits ÷ total references × 100 |
| Disk head movement | Sum of absolute differences between consecutive head positions |
| Need matrix | Maximum demand − Allocation |
| Producer–Consumer semaphore invariant | `empty + full = buffer capacity` between completed operations |
| File allocation occupancy | Data blocks + index blocks + reserved blocks + free blocks = disk block count |

## Files

```text
OSLabStudio/
├── index.html          # Application shell and dialog
├── styles.css          # Responsive dark theme, charts, tables, layouts
├── app.js              # Scheduling algorithms, simulators, interactions, exports
├── launch.bat          # One-click launcher for Windows
├── README.md           # Setup and feature guide
├── PROJECT_REPORT.md   # Editable Markdown report
├── PROJECT_REPORT.docx # Formatted, editable report
├── PROJECT_REPORT.pdf  # Printable report
├── VIVA_NOTES.md       # Oral examination preparation
├── TEST_CASES.md       # Manual test plan with known expected values
└── docs/
    ├── preview.png      # Dashboard preview
    ├── cpu-preview.png  # CPU scheduling comparison preview
    ├── sync-preview.png  # Semaphore synchronization trace preview
    └── files-preview.png # File allocation and fragmentation preview
```

## Technology stack

- HTML5 — semantic structure and controls
- CSS3 — responsive visual interface, diagrams and animations
- Vanilla JavaScript — algorithms, validation, rendering, and CSV exports
- Browser APIs — Blob-based CSV download and print dialog

No external JavaScript libraries or font/CDN requests are used.

## Known assumptions and limitations

- This is a learning simulator, not a live operating-system monitor.
- Scheduling uses integer arrival and burst times. Priority 1 is higher than priority 2, etc.
- CPU workload controls are bounded to keep the simulator responsive; use small classroom workloads for the clearest Gantt chart.
- Page replacement accepts non-negative integer page IDs and up to 100 references for a readable step table.
- Disk movement counts boundary travel and the circular jump in SCAN-family algorithms; the convention is stated in the UI.
- Banker’s algorithm uses three resource types (A, B, C) and five sample processes. Allocation cannot exceed the declared maximum.
- Optimal page replacement assumes knowledge of future references, so it is an educational lower-bound benchmark rather than a directly implementable real-time policy.
- The semaphore lab models one producer/consumer attempt at a time, rather than real concurrent OS threads.
- The file-allocation lab is a block-level educational model; it does not simulate directories, permissions, journaling, or crash recovery.

## Presentation flow

1. Open Overview and introduce the six interactive labs.
2. Run CPU Scheduling with the sample values; switch to Compare all and explain waiting time vs response time.
3. Run Page Replacement and point to the first page fault, an eviction, and the hit/fault summary.
4. Run Disk Scheduling and compare SSTF with SCAN or C-SCAN; explain the boundary/wrap movement.
5. Run the Banker's safety check, show the Need matrix and safe sequence, then test the default request from P1 (`[1, 0, 2]`).
6. Open Semaphore Synchronization, run the guided trace, and identify the full-buffer and empty-buffer blocked attempts.
7. Open File Allocation, choose Compare all, and explain why the final file fits Linked allocation but not Contiguous or Indexed in the sample.
8. Open OS Concepts for definitions and formulas during viva preparation.

See `PROJECT_REPORT.md`, `VIVA_NOTES.md`, and `TEST_CASES.md` for supporting material.
