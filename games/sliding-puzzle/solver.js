  /* ============================================================
     A* SOLVER
  ============================================================ */
  const SOLVER = {
    running:   false,
    paused:    false,
    steps:     [],
    stepIdx:   0,
    intervalId: null,
    DELAY:     420,   // ms بين كل خطوة
  };

  /* Manhattan Distance heuristic */
  function manhattanDistance(board, solution, size) {
    let dist = 0;
    for (let i = 0; i < board.length; i++) {
      const val = board[i];
      if (val === 0) continue;
      const goalIdx = solution.indexOf(val);
      const curRow  = Math.floor(i / size),       curCol  = i % size;
      const goalRow = Math.floor(goalIdx / size),  goalCol = goalIdx % size;
      dist += Math.abs(curRow - goalRow) + Math.abs(curCol - goalCol);
    }
    return dist;
  }

  /* A* Search — returns array of board states or null */
  function aStarSolve(startBoard, solution, size) {
    const key   = b => b.join(',');
    const start = {
      board:    [...startBoard],
      empty:    startBoard.indexOf(0),
      g:        0,
      h:        manhattanDistance(startBoard, solution, size),
      path:     [],
    };

    // Min-heap via sorted array (acceptable for 3×3/4×4)
    const open   = [start];
    const closed = new Set();
    let   iterations = 0;
    const MAX_ITER = size <= 3 ? 50000 : 120000;

    while (open.length > 0 && iterations++ < MAX_ITER) {
      // pop lowest f = g + h
      open.sort((a, b) => (a.g + a.h) - (b.g + b.h));
      const cur = open.shift();
      const k   = key(cur.board);

      if (closed.has(k)) continue;
      closed.add(k);

      // هل وصلنا للحل؟
      if (cur.h === 0) return cur.path;

      // توليد الجيران
      const nb = buildNeighbors(size);
      for (const neighborIdx of nb[cur.empty]) {
        const newBoard = [...cur.board];
        newBoard[cur.empty]   = newBoard[neighborIdx];
        newBoard[neighborIdx] = 0;
        const nk = key(newBoard);
        if (closed.has(nk)) continue;

        open.push({
          board: newBoard,
          empty: neighborIdx,
          g:     cur.g + 1,
          h:     manhattanDistance(newBoard, solution, size),
          path:  [...cur.path, neighborIdx], // القطعة التي تحركت إلى الفراغ
        });
      }
    }
    return null; // لم يجد حلاً
  }

  function toggleSolver() {
    if (!SOLVER.running) {
      startSolver();
    } else {
      stopSolver();
    }
  }

  function startSolver() {
    if (checkWin()) return;

    const size = STATE.gridSize;

    // 5×5 تحذير أداء
    if (size === 5) {
      const ok = confirm('⚠️ الشبكة 5×5 قد تستغرق بعض الوقت للحساب. هل تريد المتابعة؟');
      if (!ok) return;
    }

    const btn = document.getElementById('solverBtn');
    btn.textContent = '⏳ جارٍ الحساب...';
    btn.disabled = true;

    // نشغّل A* بعد frame واحد حتى يتحدث الـ UI
    setTimeout(() => {
      const path = aStarSolve([...STATE.board], STATE.solution, size);

      if (!path) {
        btn.textContent = '🤖 حل';
        btn.disabled = false;
        alert('❌ لم يتمكن الحل التلقائي من إيجاد مسار. جرّب خلطاً جديداً.');
        return;
      }

      SOLVER.steps   = path;
      SOLVER.stepIdx = 0;
      SOLVER.running = true;

      btn.textContent = '⏹ إيقاف';
      btn.classList.add('solving');
      btn.disabled = false;

      // أوقف مؤقت اللاعب وابدأ مؤقت الحل
      if (!STATE.gameStarted) {
        STATE.gameStarted = true;
        startTimer();
      }

      // أظهر شريط المعلومات
      document.getElementById('solverInfo').classList.add('visible');
      updateSolverStepsLeft();

      // شغّل الخطوات
      SOLVER.intervalId = setInterval(solverStep, SOLVER.DELAY);
    }, 50);
  }

  function solverStep() {
    if (SOLVER.stepIdx >= SOLVER.steps.length) {
      stopSolver(true);
      return;
    }

    const tileIdx = SOLVER.steps[SOLVER.stepIdx];
    SOLVER.stepIdx++;
    updateSolverStepsLeft();

    // نفّذ الحركة
    const emptyIdx       = STATE.emptyIndex;
    STATE.board[emptyIdx]  = STATE.board[tileIdx];
    STATE.board[tileIdx]   = 0;
    STATE.emptyIndex       = tileIdx;
    STATE.moves++;

    updateMovesDisplay();
    renderBoard();

    // Animation
    const tiles = document.querySelectorAll('.tile');
    if (tiles[emptyIdx]) {
      tiles[emptyIdx].classList.add('sliding');
      tiles[emptyIdx].addEventListener('animationend',
        () => tiles[emptyIdx].classList.remove('sliding'), { once: true });
    }

    if (checkWin()) {
      stopSolver(true);
      handleWin();
    }
  }

  function updateSolverStepsLeft() {
    const left = SOLVER.steps.length - SOLVER.stepIdx;
    document.getElementById('solverStepsLeft').textContent = left;
  }

  function stopSolver(finished = false) {
    clearInterval(SOLVER.intervalId);
    SOLVER.running   = false;
    SOLVER.intervalId = null;

    const btn = document.getElementById('solverBtn');
    btn.textContent = '🤖 حل';
    btn.classList.remove('solving');
    btn.disabled = false;

    if (!finished) {
      document.getElementById('solverInfo').classList.remove('visible');
    }
  }

