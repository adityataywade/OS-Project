# OS Lab Studio — Viva Notes

## 45-second project introduction

“My mini-project is **OS Lab Studio**, an interactive Operating Systems algorithm simulator built using HTML, CSS, and JavaScript. It contains six interactive labs: CPU Scheduling, Page Replacement, Disk Scheduling, Deadlock Avoidance using the Banker's algorithm, Semaphore Synchronization for the Producer–Consumer problem, and File Allocation using Contiguous, Linked, and Indexed methods. Users can edit input values, run algorithms, view charts and tables, compare results, and export result data as CSV. It is a client-side educational simulator; it does not modify the computer’s real operating system.”

## Project questions

**1. Why did you choose this project?**  
It combines several topics from the OS syllabus into one tool and makes algorithm decisions visible instead of showing only static code output.

**2. Which technologies did you use?**  
HTML5 for structure, CSS3 for responsive styling, and vanilla JavaScript for algorithms, validation, rendering, and CSV export.

**3. Is there any backend or database?**  
No. The algorithms are computed in the browser, so no backend or database is needed for these deterministic simulations.

**4. Does it change actual CPU scheduling or RAM?**  
No. It simulates algorithm behavior for educational purposes; it does not call kernel APIs or inspect physical system resources.

**5. What is a process?**  
A program in execution, with its own process state and resource context.

**6. What is CPU scheduling?**  
Selecting a process from the ready queue to use the CPU.

**7. What are arrival time, burst time, and priority?**  
Arrival time is when the process becomes ready; burst time is how much CPU time it needs; priority indicates relative scheduling precedence. In this simulator a lower number means higher priority.

**8. What is FCFS?**  
First Come, First Served. Processes run in order of arrival. It is simple but can suffer from the convoy effect.

**9. What is SJF?**  
Shortest Job First selects the available process with the smallest CPU burst. This project uses non-preemptive SJF.

**10. What is SRTF?**  
Shortest Remaining Time First is the preemptive form of SJF. If a newly available process has a shorter remaining burst, it can preempt the currently running process.

**11. What is Round Robin?**  
Each ready process gets at most a fixed time quantum before it is moved to the back of the ready queue if it is not finished.

**12. What is a time quantum?**  
The maximum CPU time given in one Round Robin turn.

**13. What is waiting time?**  
The total time a process spends waiting in the ready queue. Formula: turnaround time minus burst time.

**14. What is turnaround time?**  
Total time from arrival until completion. Formula: finish time minus arrival time.

**15. What is response time?**  
Time from arrival until the process first gets CPU service. Formula: first CPU start minus arrival time.

**16. What is a page fault?**  
An event that occurs when a requested page is not present in the simulated memory frames.

**17. Explain FIFO, LRU, and Optimal.**  
FIFO evicts the page that has been resident the longest; LRU evicts the page least recently used; Optimal evicts the page whose next use is farthest in the future.

**18. Why is Optimal not practical as a live policy?**  
It requires knowing future page references, which a real OS cannot generally know in advance. It serves as a theoretical benchmark.

**19. What is disk scheduling?**  
Ordering pending disk I/O requests to influence head movement and service behavior.

**20. Difference between SCAN and LOOK?**  
SCAN travels to the disk boundary before reversing when requests remain in the opposite direction. LOOK reverses at the last pending request instead of going all the way to the boundary.

**21. Difference between SCAN and C-SCAN?**  
SCAN sweeps to a boundary and reverses. C-SCAN services in one direction, wraps to the opposite boundary, then continues in that direction.

**22. How is total disk movement calculated?**  
Add the absolute difference between each consecutive cylinder position, including boundary and circular-wrap travel as defined in the simulator.

**23. What is deadlock?**  
A condition where processes wait indefinitely for resources held by one another.

**24. Name the four necessary Coffman conditions for deadlock.**  
Mutual exclusion, hold-and-wait, no preemption, and circular wait.

**25. What is the Banker's algorithm?**  
A deadlock-avoidance algorithm that evaluates the available resources, current allocations, maximum demands, and remaining needs to determine whether a safe sequence exists.

**26. What is the Need matrix?**  
Need equals Maximum minus Allocation for each process and resource type.

**27. What is a safe state?**  
A state is safe when there is at least one ordering in which all processes can finish using currently available resources plus resources released by completed processes.

**28. Does an unsafe state always mean the system is deadlocked?**  
No. Unsafe means the system cannot guarantee completion for all possible claims. It may not be deadlocked at that exact moment, but it lacks a guaranteed safe sequence.

**29. What happens when a resource request is tested?**  
The simulator verifies Request ≤ Need and Request ≤ Available, tentatively allocates resources, and runs the safety algorithm. It recommends granting only if the resulting state remains safe.

**30. What are the limitations?**  
It does not model context-switch overhead or interact with a real kernel; it uses a fixed five-process, three-resource Banker example; and Optimal replacement assumes future knowledge.

## Formulas to memorize

- Turnaround Time = Finish Time − Arrival Time
- Waiting Time = Turnaround Time − Burst Time
- Response Time = First CPU Start − Arrival Time
- CPU Utilization = Busy CPU Time ÷ Total Elapsed Time × 100
- Throughput = Completed Processes ÷ Total Elapsed Time
- Page-Fault Rate = Page Faults ÷ Total References × 100
- Need = Maximum − Allocation
- Disk Movement = Σ |Next Cylinder − Current Cylinder|

## Recommended demo sequence

1. CPU Scheduling → Run sample → Compare all → point to average waiting time and Gantt chart.
2. Page Replacement → Run sample → Compare FIFO, LRU and Optimal → identify an eviction.
3. Disk Scheduling → Compare all → discuss why the head movement changes by policy.
4. Deadlock Avoidance → Run safety check → show Need and safe sequence → test `[1, 0, 2]` from P1.
5. Semaphore Synchronization → run guided demo and explain `empty`, `full`, `mutex`, then point out the blocked operations.
6. File Allocation → choose Compare all and explain the sample’s fragmentation and index-block overhead.
7. OS Concepts → use definitions and formulas as a final revision page.


## Semaphore synchronization viva questions

**31. What is process synchronization?**  
Coordinating concurrent processes or threads so shared data remains consistent and critical-section rules are respected.

**32. What is a critical section?**  
The part of a program that accesses shared data or a shared resource and must be protected from conflicting concurrent access.

**33. What is a semaphore?**  
A synchronization variable that is accessed using atomic wait and signal operations to coordinate execution and resource access.

**34. Difference between binary and counting semaphore?**  
A binary semaphore takes values 0 or 1 and is often used for mutual exclusion. A counting semaphore can represent multiple instances of a resource, such as free buffer slots or available items.

**35. Explain the Producer–Consumer problem.**  
A producer inserts items into a bounded shared buffer and a consumer removes them. The producer must wait if the buffer is full, and the consumer must wait if it is empty.

**36. Why do we need `empty`, `full`, and `mutex`?**  
`empty` counts free slots, `full` counts available items, and `mutex` protects the shared buffer while it is modified.

**37. What does `wait()` do? What does `signal()` do?**  
`wait()` atomically attempts to acquire or reserve a resource and may block if it is unavailable. `signal()` releases a resource or announces that a resource/state is available.

**38. What does the synchronization module demonstrate—and not demonstrate?**  
It visualizes semaphore order, buffer updates and blocked attempts. It is a deterministic educational trace, not real parallel threads or an implementation inside the operating-system kernel.


## File allocation viva questions

**39. What is file allocation?**  
It is the method a file system uses to assign disk blocks to store a file’s data and keep track of where that data resides.

**40. Explain contiguous allocation.**  
A file occupies consecutive disk blocks. It offers simple block arithmetic and good sequential access, but external fragmentation can prevent a large file from fitting.

**41. Explain linked allocation.**  
A file is stored in scattered blocks, and each block points to the next block. It avoids the need for contiguous space but sequential traversal follows the links.

**42. Explain indexed allocation.**  
A separate index block stores pointers to a file’s data blocks. It supports direct lookup from the index, but index blocks consume storage.

**43. What is external fragmentation in this project?**  
Free blocks exist in several small runs, but no single run is large enough for a requested file. The sum of free blocks can be large enough while contiguous allocation still fails.

**44. Why can the sample Indexed method fail the final file when Linked succeeds?**  
The sample has four free blocks left, but the final file requires five data blocks plus an index block. Linked allocation needs only the five data blocks and can use scattered blocks when enough are available earlier in the allocation order.

**45. What are the limitations of this File Allocation Lab?**  
It is a simplified block-allocation model. It does not reproduce a complete file system with directories, permissions, metadata consistency, journaling, or crash recovery.
