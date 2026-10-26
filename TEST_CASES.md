# OS Lab Studio — Test Cases and Expected Results

These tests use the sample workloads shipped with the app. Small rounding differences are not expected for these integer inputs.

## 1. CPU Scheduling

### Sample workload

| Process | Arrival | Burst | Priority |
|---|---:|---:|---:|
| P1 | 0 | 7 | 2 |
| P2 | 2 | 4 | 1 |
| P3 | 4 | 1 | 3 |
| P4 | 5 | 4 | 2 |

With Round Robin quantum = 2, comparison mode should give the following metrics:

| Policy | Average waiting | Average turnaround | Average response | Finish time |
|---|---:|---:|---:|---:|
| FCFS | 4.75 | 8.75 | 4.75 | 16 |
| SJF | 4.00 | 8.00 | 4.00 | 16 |
| SRTF | 3.00 | 7.00 | 0.50 | 16 |
| Priority (non-preemptive) | 5.50 | 9.50 | 5.50 | 16 |
| Priority (preemptive) | 5.25 | 9.25 | 4.25 | 16 |
| Round Robin | 5.00 | 9.00 | 1.50 | 16 |

CPU utilization is 100% on this sample because there is no idle time after time zero and total burst time equals finish time (16 units).

### Idle-time check

Enter one process: P1, Arrival = 5, Burst = 3, Priority = 1. For FCFS, the timeline should contain Idle from time 0 to 5 and P1 from time 5 to 8. Waiting = 0, turnaround = 3, response = 0, and CPU utilization from t = 0 is 37.5%.

## 2. Page Replacement

Reference string: `7 0 1 2 0 3 0 4 2 3 0 3 2` with 3 frames.

| Policy | Page faults | Page hits |
|---|---:|---:|
| FIFO | 10 | 3 |
| LRU | 9 | 4 |
| Optimal | 7 | 6 |

The sum of hits and faults must equal the number of references (13). Each step must show exactly three frame slots.

## 3. Disk Scheduling

Requests: `98 183 37 122 14 124 65 67`; head = 53; cylinder range = 0–199; initial direction = right.

| Policy | Total movement (cylinders) |
|---|---:|
| FCFS | 640 |
| SSTF | 236 |
| SCAN | 331 |
| C-SCAN | 382 |
| LOOK | 299 |
| C-LOOK | 322 |

Change direction to left and run again. The path should service requests in the opposite directional order where appropriate, and C-SCAN/C-LOOK should display a wrap edge when requests exist on both sides of the starting head.

## 4. Banker's Algorithm

Use the default Allocation, Maximum, and Available matrices:

- Available = `[3, 3, 2]`
- Need = Maximum − Allocation
- A safe sequence should be `P1 → P3 → P4 → P0 → P2`.

For the resource request test, choose process P1 and request `[1, 0, 2]`. The request should be grantable and the tentative state should remain safe. Change the requesting process to P0 while keeping `[1, 0, 2]`; the tentative state should be rejected as unsafe.

## 5. Semaphore Synchronization

Use the default capacity of 3 and click **Run guided demo**.

- The 10 operations should contain 8 successful operations and 2 blocked attempts.
- The blocked operations should be a producer attempt against a full buffer and a consumer attempt against an empty buffer.
- Final state should be empty = 3, full = 0, mutex = 1, with an empty buffer.
- Between completed operations, `empty + full` should equal the buffer capacity and mutex should return to 1.
- Export should create `os-lab-semaphore-synchronization.csv` with one row for each wait/signal/critical-section event.
- Changing capacity to 2–6 and applying it should reset the trace and set empty to capacity, full to zero, and mutex to 1.

## 6. File Allocation

Use the sample disk size 24, reserved blocks `4 9 14 19`, and file requests `A:3, B:3, C:3, D:3, E:5`.

| Method | Allocated files | Data blocks used | Index blocks | Free blocks | Largest free run |
|---|---:|---:|---:|---:|---:|
| Contiguous | 4/5 | 12 | 0 | 8 | 4 |
| Linked | 5/5 | 17 | 0 | 3 | 3 |
| Indexed | 4/5 | 12 | 4 | 4 | 4 |

- Contiguous should fail file E because there is no five-block free run, despite eight free blocks remaining.
- Linked should allocate all files, including E across scattered free blocks.
- Indexed should allocate A–D, then fail E because only four free blocks remain and the fifth file requires five data blocks plus one index block.
- The sum of data, index, reserved, and free blocks should equal the disk capacity at the end.
- Comparison mode should show all three policies and render the Contiguous block map as its baseline.

## 7. Input validation and interaction checks

1. CPU burst time zero or a negative time quantum should show a validation error and should not crash the page.
2. Empty page reference input should show a validation error.
3. A frame count outside 1–12 should be rejected.
4. A cylinder request outside the configured minimum/maximum should be rejected.
5. Disk maximum must be larger than minimum, and head position must lie in the configured range.
6. Allocation greater than Maximum in any Banker cell should be rejected.
7. A resource request that exceeds Need or Available must not be granted.
8. CSV export buttons should be disabled before a result exists and enabled after a simulation.
9. Buffer capacity outside 2–6 should be rejected.
10. File requests must use unique names and the `NAME:BLOCKS` format; reserved block indices must be unique and within the disk range.
11. On a narrow mobile viewport, the page should not create horizontal overflow; matrix and result tables should scroll inside their own containers if necessary.
