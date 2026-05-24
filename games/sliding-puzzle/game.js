/* ============================================================
   SLIDING PUZZLE — Game Logic
   ============================================================ */


  /* ============================================================
     GAME STATE
  ============================================================ */
  const STATE = {
    mode:        'numbers',   // 'numbers' | 'letters' | 'images'
    imageDataURL: null,       // base64 صورة اللاعب المخصصة
    _defaultImageURL: null,    // صورة افتراضية مولَّدة بـ Canvas
    gridSize:     3,           // 3 | 4 | 5
    board:       [],          // current tile values (0 = empty)
    solution:    [],          // solved state for current mode
    emptyIndex:  8,           // position of empty tile (0-8)
    moves:       0,
    timerSecs:   0,
    timerRunning: false,
    timerInterval: null,
    gameStarted: false,
    initialBoard: [],         // snapshot after shuffle (for reset)
  };

  /* ============================================================
     CONSTANTS
  ============================================================ */
  /* Generates tile values dynamically for any grid size */
  function buildSolution(size) {
    const total = size * size;
    if (STATE.mode === 'letters') {
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, total - 1);
      return [...alpha, 0];
    }
    const nums = Array.from({length: total - 1}, (_, i) => i + 1);
    return [...nums, 0];
  }

  /* Build NEIGHBORS map dynamically for N×N grid */
  function buildNeighbors(size) {
    const total = size * size;
    const nb = {};
    for (let i = 0; i < total; i++) {
      nb[i] = [];
      const row = Math.floor(i / size), col = i % size;
      if (col > 0)        nb[i].push(i - 1);
      if (col < size - 1) nb[i].push(i + 1);
      if (row > 0)        nb[i].push(i - size);
      if (row < size - 1) nb[i].push(i + size);
    }
    return nb;
  }

  let NEIGHBORS = buildNeighbors(3);


  /* ============================================================
     SOLVABLE SHUFFLE
     Ensures the puzzle is always solvable by counting inversions
     and adjusting if needed.
  ============================================================ */
  function isSolvable(arr) {
    const flat = arr.filter(v => v !== 0);
    let inversions = 0;
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        // Compare by index in the solution (not value directly for letters)
        const sol = STATE.solution;
        const idxI = sol.indexOf(flat[i]);
        const idxJ = sol.indexOf(flat[j]);
        if (idxI > idxJ) inversions++;
      }
    }
    return inversions % 2 === 0;
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateSolvableBoard() {
    let attempt;
    do {
      attempt = shuffleArray(STATE.solution);
    } while (!isSolvable(attempt) || isAlreadySolved(attempt));
    return attempt;
  }

  function isAlreadySolved(board) {
    return board.every((v, i) => v === STATE.solution[i]);
  }


  /* ============================================================
     INIT GAME
  ============================================================ */
  function initGame() {
    const size  = STATE.gridSize;
    NEIGHBORS   = buildNeighbors(size);
    STATE.solution = buildSolution(size);

    STATE.board       = generateSolvableBoard();
    STATE.initialBoard = [...STATE.board];
    STATE.emptyIndex  = STATE.board.indexOf(0);
    STATE.moves       = 0;
    STATE.gameStarted = false;

    stopTimer();
    STATE.timerSecs = 0;

    // ضبط CSS grid ديناميكياً
    const board = document.getElementById('board');
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    board.style.gridTemplateRows    = `repeat(${size}, 1fr)`;

    // ضبط حجم الخط حسب الشبكة
    const fontScale = size === 3 ? '1' : size === 4 ? '0.75' : '0.6';
    document.documentElement.style.setProperty('--font-scale', fontScale);

    updateMovesDisplay();
    updateTimerDisplay();
    renderBoard();
    updateHighScoreDisplay();
    document.getElementById('boardContainer').classList.remove('winning');
    document.getElementById('solverInfo').classList.remove('visible');
  }

  function startNewGame() {
    stopSolver();
    closeWin();
    initGame();
  }

  function resetBoard() {
    stopSolver();
    // Reset to the shuffled state (not resolved)
    STATE.board      = [...STATE.initialBoard];
    STATE.emptyIndex = STATE.board.indexOf(0);
    STATE.moves      = 0;
    STATE.gameStarted = false;

    stopTimer();
    STATE.timerSecs = 0;

    updateMovesDisplay();
    updateTimerDisplay();
    renderBoard();
    document.getElementById('boardContainer').classList.remove('winning');
  }


  /* ============================================================
     RENDER BOARD
  ============================================================ */
  function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';

    STATE.board.forEach((val, idx) => {
      const tile = document.createElement('div');
      tile.classList.add('tile');

      if (val === 0) {
        tile.classList.add('empty');
        tile.setAttribute('aria-hidden', 'true');
      } else {
        tile.setAttribute('data-mode', STATE.mode);
        tile.setAttribute('data-value', val);
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-label', `قطعة ${val}`);
        tile.setAttribute('tabindex', '0');

        if (STATE.mode === 'numbers' || STATE.mode === 'letters') {
          const span = document.createElement('span');
          span.classList.add('tile-number');
          span.textContent = val;
          tile.appendChild(span);
        } else {
          // Images mode — show background slice
          renderImageTile(tile, val);
        }

        tile.addEventListener('click', () => handleTileClick(idx));
        tile.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') handleTileClick(idx);
        });

        // Ghost Mode — show correct value hint + correct-pos highlight
        if (GHOST.active && STATE.mode !== 'images') {
          const correctVal = STATE.solution[idx];
          if (correctVal > 0) {
            const ghost = document.createElement('span');
            ghost.className = 'ghost-hint';
            ghost.textContent = STATE.mode === 'letters'
              ? String.fromCharCode(64 + correctVal)
              : correctVal;
            tile.appendChild(ghost);
            if (val === correctVal) tile.classList.add('correct-pos');
          }
        }
      }

      board.appendChild(tile);
    });
  }

  /* Image tile rendering — Phase 2 */
  /* ============================================================
     DEFAULT IMAGE — generated once with Canvas, cached in STATE
  ============================================================ */
  function generateDefaultImage() {
    const sz  = 512;
    const cv  = document.createElement('canvas');
    cv.width  = sz;
    cv.height = sz;
    const ctx = cv.getContext('2d');

    // Background: deep dark
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, sz, sz);

    // Radial gradient base
    const base = ctx.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz*0.72);
    base.addColorStop(0,   'rgba(168,85,247,0.55)');
    base.addColorStop(0.5, 'rgba(0,212,255,0.25)');
    base.addColorStop(1,   'rgba(13,13,26,0.0)');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, sz, sz);

    // Geometric grid — glowing squares
    const cols = [
      '#a855f7','#00d4ff','#f5c842',
      '#22c55e','#f472b6','#fb923c',
      '#60a5fa','#f87171','#34d399',
    ];
    const grid = 3, cell = sz / grid;
    cols.forEach((color, i) => {
      const col = i % grid, row = Math.floor(i / grid);
      const x = col * cell, y = row * cell;
      const pad = 18;
      // Glow
      const grd = ctx.createRadialGradient(
        x + cell/2, y + cell/2, 0,
        x + cell/2, y + cell/2, cell * 0.65
      );
      grd.addColorStop(0,   color + 'cc');
      grd.addColorStop(0.6, color + '44');
      grd.addColorStop(1,   color + '00');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, cell, cell);

      // Rounded tile
      ctx.save();
      ctx.beginPath();
      const r = 22;
      ctx.moveTo(x+pad+r, y+pad);
      ctx.lineTo(x+cell-pad-r, y+pad);
      ctx.quadraticCurveTo(x+cell-pad, y+pad, x+cell-pad, y+pad+r);
      ctx.lineTo(x+cell-pad, y+cell-pad-r);
      ctx.quadraticCurveTo(x+cell-pad, y+cell-pad, x+cell-pad-r, y+cell-pad);
      ctx.lineTo(x+pad+r, y+cell-pad);
      ctx.quadraticCurveTo(x+pad, y+cell-pad, x+pad, y+cell-pad-r);
      ctx.lineTo(x+pad, y+pad+r);
      ctx.quadraticCurveTo(x+pad, y+pad, x+pad+r, y+pad);
      ctx.closePath();
      ctx.fillStyle = color + 'bb';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Shine
      ctx.save();
      const shine = ctx.createLinearGradient(x+pad, y+pad, x+cell/2, y+cell/2);
      shine.addColorStop(0, 'rgba(255,255,255,0.22)');
      shine.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = shine;
      ctx.fill();
      ctx.restore();
    });

    // Center glow overlay
    const cg = ctx.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/3);
    cg.addColorStop(0, 'rgba(255,255,255,0.06)');
    cg.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0,0,sz,sz);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < grid; i++) {
      ctx.beginPath(); ctx.moveTo(i*cell,0); ctx.lineTo(i*cell,sz); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i*cell); ctx.lineTo(sz,i*cell); ctx.stroke();
    }

    return cv.toDataURL('image/png');
  }

  function renderImageTile(tile, val) {
    // Generate default image once if not set
    if (!STATE.imageDataURL) {
      if (!STATE._defaultImageURL) {
        STATE._defaultImageURL = generateDefaultImage();
      }
      // Use generated image as default
      const url = STATE._defaultImageURL;
      const solIdx = STATE.solution.indexOf(val);
      const sz  = STATE.gridSize;
      const col = solIdx % sz;
      const row = Math.floor(solIdx / sz);
      const boardEl  = document.getElementById('board');
      const tileSize = boardEl.offsetWidth / sz;
      const imgSize  = tileSize * sz;
      tile.setAttribute('data-mode', 'images');
      tile.style.backgroundImage    = `url(\${url})`;
      tile.style.backgroundSize     = `\${imgSize}px \${imgSize}px`;
      tile.style.backgroundPosition = `\${-col * tileSize}px \${-row * tileSize}px`;
      tile.style.boxShadow = '4px 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)';
      return;
    }

    // حساب موضع القطعة في الشبكة الأصلية
    const solIdx = STATE.solution.indexOf(val); // موضعها في الحل
    const sz  = STATE.gridSize;
    const col = solIdx % sz;
    const row = Math.floor(solIdx / sz);

    const boardEl  = document.getElementById('board');
    const tileSize = boardEl.offsetWidth / sz;
    const imgSize  = tileSize * sz;

    tile.style.backgroundImage    = `url(${STATE.imageDataURL})`;
    tile.style.backgroundSize     = `${imgSize}px ${imgSize}px`;
    tile.style.backgroundPosition = `${-col * tileSize}px ${-row * tileSize}px`;
    tile.style.boxShadow = '4px 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)';
  }


  /* ============================================================
     HANDLE TILE CLICK
  ============================================================ */
  function handleTileClick(tileIdx) {
    if (STATE.board[tileIdx] === 0) return;
    if (!NEIGHBORS[tileIdx].includes(STATE.emptyIndex)) return;

    // Start game on first move
    if (!STATE.gameStarted) {
      STATE.gameStarted = true;
      startTimer();
    }

    // Play tick sound
    AUDIO.playTick();

    // Swap tile with empty
    const emptyIdx = STATE.emptyIndex;
    STATE.board[emptyIdx] = STATE.board[tileIdx];
    STATE.board[tileIdx]  = 0;
    STATE.emptyIndex = tileIdx;
    STATE.moves++;

    updateMovesDisplay();
    renderBoard();

    // Add sliding animation to moved tile
    const tiles = document.querySelectorAll('.tile');
    const movedTile = tiles[emptyIdx];
    if (movedTile) {
      movedTile.classList.add('sliding');
      movedTile.addEventListener('animationend', () => movedTile.classList.remove('sliding'), { once: true });
    }

    // Check win
    if (checkWin()) {
      handleWin();
    }
  }

  /* ============================================================
     WIN DETECTION
  ============================================================ */
  function checkWin() {
    return STATE.board.every((v, i) => v === STATE.solution[i]);
  }

  /* ============================================================
     HANDLE WIN
  ============================================================ */
  function handleWin() {
    stopTimer();
    AUDIO.playWin();
    document.getElementById('boardContainer').classList.add('winning');

    // Animate tiles
    const tiles = document.querySelectorAll('.tile:not(.empty)');
    tiles.forEach((t, i) => {
      setTimeout(() => t.classList.add('win-tile'), i * 60);
    });

    // Update high score
    const isNewRecord = updateHighScore();

    // Show win overlay after brief delay
    setTimeout(() => {
      document.getElementById('winTime').textContent  = formatTime(STATE.timerSecs);
      document.getElementById('winMoves').textContent = STATE.moves;
      document.getElementById('newRecordBadge').classList.toggle('hidden', !isNewRecord);
      document.getElementById('winOverlay').classList.add('visible');
      launchConfetti();
    }, 600);
  }

  function closeWin() {
    document.getElementById('winOverlay').classList.remove('visible');
    stopConfetti();
  }


  /* ============================================================
     TIMER
  ============================================================ */
  function startTimer() {
    STATE.timerRunning = true;
    STATE.timerInterval = setInterval(() => {
      STATE.timerSecs++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    STATE.timerRunning = false;
    clearInterval(STATE.timerInterval);
    STATE.timerInterval = null;
  }

  function updateTimerDisplay() {
    document.getElementById('timerDisplay').textContent = formatTime(STATE.timerSecs);
  }

  function updateMovesDisplay() {
    document.getElementById('movesDisplay').textContent = STATE.moves;
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /* ============================================================
     HIGH SCORE (LocalStorage)
  ============================================================ */
  function getHSKey() {
    return `sliding_hs_${STATE.mode}_${STATE.gridSize}x${STATE.gridSize}`;
  }

  function loadHighScore() {
    try {
      const raw = localStorage.getItem(getHSKey());
      return raw ? JSON.parse(raw) : { bestMoves: null, bestTime: null, totalGames: 0 };
    } catch { return { bestMoves: null, bestTime: null, totalGames: 0 }; }
  }

  function saveHighScore(hs) {
    try { localStorage.setItem(getHSKey(), JSON.stringify(hs)); } catch {}
  }

  function updateHighScore() {
    const hs = loadHighScore();
    hs.totalGames++;
    let isRecord = false;

    if (hs.bestMoves === null || STATE.moves < hs.bestMoves) {
      hs.bestMoves = STATE.moves;
      isRecord = true;
    }
    if (hs.bestTime === null || STATE.timerSecs < hs.bestTime) {
      hs.bestTime = STATE.timerSecs;
      isRecord = true;
    }

    saveHighScore(hs);
    updateHighScoreDisplay();
    return isRecord;
  }

  function updateHighScoreDisplay() {
    const hs = loadHighScore();
    document.getElementById('hsBestMoves').textContent   = hs.bestMoves  !== null ? hs.bestMoves         : '—';
    document.getElementById('hsBestTime').textContent    = hs.bestTime   !== null ? formatTime(hs.bestTime) : '—';
    document.getElementById('hsTotalGames').textContent  = hs.totalGames;
    document.getElementById('bestTimeDisplay').textContent = hs.bestTime !== null ? formatTime(hs.bestTime) : '—';
  }


  /* ============================================================
     MODE SWITCHER
  ============================================================ */
  function switchMode(mode) {
    if (STATE.mode === mode) return;
    STATE.mode = mode;

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');

    // Show/hide hint button & upload area
    const isImg = mode === 'images';
    document.getElementById('hintBtn').style.display    = isImg ? 'flex' : 'none';
    document.getElementById('uploadArea').classList.toggle('visible', isImg);

    initGame();
  }

  /* ============================================================
     DIFFICULTY SWITCHER
  ============================================================ */
  function switchDifficulty(size) {
    if (STATE.gridSize === size) return;
    STATE.gridSize = size;
    STATE._defaultImageURL = null; // أعد توليد الصورة الافتراضية للشبكة الجديدة

    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('diff' + size).classList.add('active');

    initGame();
  }

  /* ============================================================
     IMAGE UPLOAD HANDLER
  ============================================================ */
  document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      STATE.imageDataURL = ev.target.result;
      initGame(); // أعد اللعبة بالصورة الجديدة
    };
    reader.readAsDataURL(file);
  });

  // إغلاق hint عند الضغط
  document.getElementById('hintOverlay').addEventListener('click', function() {
    this.classList.remove('visible');
  });

  /* ============================================================
     HINT (Phase 2 — placeholder)
  ============================================================ */
  function showHint() {
    const src = STATE.imageDataURL || null;
    if (!src) {
      // لا توجد صورة — اعرض رسالة
      const overlay = document.getElementById('hintOverlay');
      document.getElementById('hintImg').style.display = 'none';
      overlay.classList.add('visible');
      setTimeout(() => overlay.classList.remove('visible'), 1500);
      return;
    }
    document.getElementById('hintImg').src = src;
    document.getElementById('hintImg').style.display = 'block';
    document.getElementById('hintOverlay').classList.add('visible');
    setTimeout(() => document.getElementById('hintOverlay').classList.remove('visible'), 2500);
  }


  /* ============================================================
     KEYBOARD NAVIGATION (Arrow Keys)
  ============================================================ */
  document.addEventListener('keydown', (e) => {
    const emptyIdx = STATE.emptyIndex;
    let targetIdx  = -1;

    // Arrow key moves the TILE into the empty space
    const sz = STATE.gridSize;
    if (e.key === 'ArrowLeft')  { if (emptyIdx % sz < sz-1) targetIdx = emptyIdx + 1; }
    if (e.key === 'ArrowRight') { if (emptyIdx % sz > 0)    targetIdx = emptyIdx - 1; }
    if (e.key === 'ArrowUp')    { if (emptyIdx < sz*(sz-1)) targetIdx = emptyIdx + sz; }
    if (e.key === 'ArrowDown')  { if (emptyIdx >= sz)       targetIdx = emptyIdx - sz; }

    if (targetIdx !== -1) {
      e.preventDefault();
      handleTileClick(targetIdx);
    }
  });


  /* ============================================================
     GHOST MODE
  ============================================================ */
  const GHOST = { active: false };

  function toggleGhostMode() {
    GHOST.active = !GHOST.active;
    const btn = document.getElementById('ghostBtn');
    btn.classList.toggle('active', GHOST.active);
    btn.textContent = GHOST.active ? '👻 الشبح ✓' : '👻 الشبح';
    renderBoard(); // re-render with / without ghost hints
  }
