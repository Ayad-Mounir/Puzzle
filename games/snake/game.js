/* ============================================================
   SNAKE GAME — Classic Snake
   ============================================================ */

const SNAKE = (() => {
  /* --- Constants --- */
  const GRID   = 20;
  const SPEEDS = { slow: 200, medium: 130, fast: 75 };

  /* --- State --- */
  let canvas, ctx;
  let cellSize = 0;
  let snake = [];
  let dir, nextDir, food, special;
  let score, bestScore, level;
  let speed = 'medium';
  let loopTimer = null;
  let running   = false;
  let paused    = false;
  let waiting   = true;   // ← شاشة الانتظار قبل البدء
  let initialized = false;
  let touchStartX, touchStartY;

  const el = id => document.getElementById(id);

  /* ─────────────────────────────────
     PUBLIC INIT
  ───────────────────────────────── */
  function init() {
    if (initialized) {
      // العودة للعبة: إذا كانت منتظرة — أعد رسم شاشة البدء
      if (waiting) { requestAnimationFrame(_drawReady); }
      return;
    }
    initialized = true;

    canvas    = el('snakeCanvas');
    ctx       = canvas.getContext('2d');
    bestScore = +localStorage.getItem('snakeBest') || 0;

    requestAnimationFrame(() => {
      _sizeCanvas();
      window.addEventListener('resize', _sizeCanvas);
    });

    document.addEventListener('keydown', _onKey);

    canvas.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      // نقرة بدون سحب → ابدأ اللعبة إذا كانت في وضع الانتظار
      if (waiting) { e.preventDefault(); }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        // نقرة بسيطة على الـ canvas
        if (waiting) { _startFromWait(); return; }
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        _tryDir(dx > 0 ? 'R' : 'L');
      } else {
        _tryDir(dy > 0 ? 'D' : 'U');
      }
    }, { passive: true });

    newGame();
  }

  /* ─────────────────────────────────
     NEW GAME
  ───────────────────────────────── */
  function newGame() {
    _stopLoop();
    snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir     = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score   = 0;
    level   = 1;
    food    = null;
    special = null;
    running = false;
    paused  = false;
    waiting = true;    // ← وضع الانتظار

    _hideOverlay();
    _placeFood();
    _updateStats();

    const btn = el('snakePauseBtn');
    if (btn) btn.textContent = '⏸ إيقاف';

    requestAnimationFrame(() => {
      if (cellSize <= 0) _sizeCanvas();
      _drawReady();   // ← شاشة البدء
    });
  }

  /* ─────────────────────────────────
     START FROM WAIT
  ───────────────────────────────── */
  function _startFromWait() {
    if (!waiting) return;
    waiting = false;
    running = true;
    _draw();
    _startLoop();
  }

  /* ─────────────────────────────────
     SPEED
  ───────────────────────────────── */
  function setSpeed(s) {
    speed = s;
    document.querySelectorAll('.speed-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.speed === s);
    });
    if (running && !paused) { _stopLoop(); _startLoop(); }
  }

  /* ─────────────────────────────────
     PAUSE / RESUME
  ───────────────────────────────── */
  function togglePause() {
    if (!running || waiting) return;
    paused = !paused;
    const btn = el('snakePauseBtn');
    if (btn) btn.textContent = paused ? '▶ استئناف' : '⏸ إيقاف';
    if (paused) { _stopLoop(); _drawPaused(); }
    else        { _startLoop(); }
  }

  /* ─────────────────────────────────
     D-PAD
  ───────────────────────────────── */
  function dpad(d) {
    if (waiting) { _startFromWait(); }
    _tryDir(d);
  }

  /* ─────────────────────────────────
     GAME LOOP
  ───────────────────────────────── */
  function _startLoop() {
    _stopLoop();
    loopTimer = setInterval(_tick, SPEEDS[speed]);
  }
  function _stopLoop() {
    if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
  }

  function _tick() {
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      return _gameOver();
    }
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      return _gameOver();
    }

    snake.unshift(head);

    if (food && head.x === food.x && head.y === food.y) {
      score += level;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('snakeBest', bestScore);
        _updateBest();
      }
      level = Math.floor(score / 5) + 1;
      _placeFood();
      _updateStats();
    } else if (special && head.x === special.x && head.y === special.y) {
      score += level * 3;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('snakeBest', bestScore);
        _updateBest();
      }
      special = null;
      _updateStats();
    } else {
      snake.pop();
    }

    if (!special && Math.random() < 0.003) _placeSpecial();
    _draw();
  }

  /* ─────────────────────────────────
     DRAWING
  ───────────────────────────────── */
  function _draw() {
    if (!ctx || cellSize <= 0 || !snake.length) return;
    const cs = cellSize;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // نقاط الشبكة
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.beginPath();
        ctx.arc(x * cs + cs / 2, y * cs + cs / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // جسم التعبان
    snake.forEach((seg, i) => {
      const t  = i / snake.length;
      const r  = cs - 4;
      const ox = seg.x * cs + 2;
      const oy = seg.y * cs + 2;

      ctx.fillStyle = i === 0
        ? '#64ffda'
        : `rgba(50,${Math.floor(200 - t * 100)},${Math.floor(150 - t * 80)},${1 - t * 0.5})`;

      _roundRect(ox, oy, r, r, i === 0 ? 8 : 5);
      ctx.fill();

      if (i === 0) {
        ctx.fillStyle = '#0a0a1f';
        const ex1 = ox + (dir.x === 0 ? r * 0.3 : dir.x > 0 ? r * 0.65 : r * 0.15);
        const ey1 = oy + (dir.y === 0 ? r * 0.25 : dir.y > 0 ? r * 0.65 : r * 0.15);
        const ex2 = ox + (dir.x === 0 ? r * 0.65 : dir.x > 0 ? r * 0.65 : r * 0.15);
        const ey2 = oy + (dir.y === 0 ? r * 0.65 : dir.y > 0 ? r * 0.65 : r * 0.15);
        ctx.beginPath(); ctx.arc(ex1, ey1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    });

    // طعام (تفاحة)
    if (food) {
      const fx = food.x * cs + cs / 2;
      const fy = food.y * cs + cs / 2;
      const pulse = 1 + 0.1 * Math.sin(Date.now() / 200);
      const fr = (cs / 2 - 4) * pulse;
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(fx - fr * 0.25, fy - fr * 0.25, fr * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx, fy - fr); ctx.lineTo(fx + 4, fy - fr - 5); ctx.stroke();
    }

    // طعام مميز (نجمة)
    if (special) {
      const sx = special.x * cs + cs / 2;
      const sy = special.y * cs + cs / 2;
      ctx.font = `${Math.max(cs - 4, 12)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', sx, sy);
    }
  }

  /* ─────────────────────────────────
     READY SCREEN
  ───────────────────────────────── */
  function _drawReady() {
    if (!ctx || cellSize <= 0) return;
    _draw();  // ارسم اللعبة في الخلفية (ثابتة)

    // طبقة شفافة
    ctx.fillStyle = 'rgba(10,10,31,0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    // أيقونة التعبان
    ctx.font = `${Math.round(canvas.width * 0.18)}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐍', cx, cy - canvas.height * 0.13);

    // عنوان
    ctx.fillStyle = '#64ffda';
    ctx.font = `bold ${Math.round(canvas.width * 0.072)}px Syne, sans-serif`;
    ctx.fillText('التعبان الكلاسيكي', cx, cy + canvas.height * 0.04);

    // تعليمة
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.round(canvas.width * 0.054)}px Cairo, sans-serif`;
    ctx.fillText('اضغط أي زر أو المس الشاشة للبدء', cx, cy + canvas.height * 0.14);
  }

  function _drawPaused() {
    _draw();
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e8e8ff';
    ctx.font = 'bold 26px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏸  موقوف', canvas.width / 2, canvas.height / 2);
  }

  function _roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ─────────────────────────────────
     FOOD
  ───────────────────────────────── */
  function _placeFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function _placeSpecial() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (
      snake.some(s => s.x === pos.x && s.y === pos.y) ||
      (food && pos.x === food.x && pos.y === food.y)
    );
    special = pos;
    setTimeout(() => { special = null; }, 5000);
  }

  /* ─────────────────────────────────
     DIRECTION
  ───────────────────────────────── */
  function _tryDir(d) {
    if (!running || paused) return;
    const map = { U:{x:0,y:-1}, D:{x:0,y:1}, L:{x:-1,y:0}, R:{x:1,y:0} };
    const nd = map[d];
    if (!nd) return;
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
  }

  function _onKey(e) {
    const map = {
      ArrowUp:'U', ArrowDown:'D', ArrowLeft:'L', ArrowRight:'R',
      w:'U', s:'D', a:'L', d:'R', W:'U', S:'D', A:'L', D:'R',
    };
    if (map[e.key]) {
      e.preventDefault();
      if (waiting) { _startFromWait(); }
      _tryDir(map[e.key]);
    }
    if (e.key === ' ') { e.preventDefault(); togglePause(); }
  }

  /* ─────────────────────────────────
     CANVAS SIZING
  ───────────────────────────────── */
  function _sizeCanvas() {
    if (!canvas) return;
    const wrap = document.querySelector('.snake-board-wrap');
    if (!wrap) return;
    const available = wrap.clientWidth || wrap.offsetWidth || 360;
    const maxW = Math.min(available - 8, 420);
    const size = Math.max(Math.floor(maxW / GRID) * GRID, GRID * 10);
    cellSize = size / GRID;
    canvas.width  = size;
    canvas.height = size;
    if (waiting)         { _drawReady(); }
    else if (paused)     { _drawPaused(); }
    else if (running)    { _draw(); }
  }

  /* ─────────────────────────────────
     GAME OVER
  ───────────────────────────────── */
  function _gameOver() {
    running = false;
    _stopLoop();

    const isRecord = score > 0 && score >= bestScore;
    const sc = el('snakeOverlayScore');  if (sc) sc.textContent = `النقاط: ${score}`;
    const rc = el('snakeOverlayRecord'); if (rc) rc.textContent = isRecord ? '🏆 رقم قياسي جديد!' : '';
    const ov = el('snakeOverlay');       if (ov) ov.classList.add('visible');
  }

  function _hideOverlay() {
    const ov = el('snakeOverlay');
    if (ov) ov.classList.remove('visible');
  }

  /* ─────────────────────────────────
     STATS
  ───────────────────────────────── */
  function _updateStats() {
    const sc = el('snakeScore'); if (sc) sc.textContent = score;
    const lv = el('snakeLevel'); if (lv) lv.textContent = level;
    _updateBest();
  }
  function _updateBest() {
    const bs = el('snakeBest'); if (bs) bs.textContent = bestScore;
  }

  /* ─────────────────────────────────
     PUBLIC API
  ───────────────────────────────── */
  return { init, newGame, setSpeed, togglePause, dpad };
})();
