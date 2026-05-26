/* ============================================================
   SNAKE RETRO — Ported from Snake-Game-Classic
   CRT Green Style — Classic Gameplay
   ============================================================ */

const SNAKE = (() => {

  const COLS = 20, ROWS = 20, CELL = 20;
  const SPEEDS = { slow: 200, medium: 140, fast: 75 };

  let canvas, ctx;
  let snake, dir, nextDir, food;
  let score, level, hiScore;
  let speed    = 'medium';
  let state    = 'idle'; // idle | playing | paused | over
  let loopId   = null;
  let animId   = null;
  let foodBeat = 0;
  let deathParts = [];
  let initialized = false;
  let tx = 0, ty = 0;

  const el = id => document.getElementById(id);

  /* ── Audio ── */
  let ac;
  function _ac() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    return ac;
  }
  function beep(freq, dur, type = 'square', vol = 0.12) {
    try {
      const a = _ac();
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.start(); o.stop(a.currentTime + dur);
    } catch(_) {}
  }
  const playEat   = () => { beep(660,.08); beep(880,.06); };
  const playDie   = () => { beep(200,.05); beep(150,.1); beep(100,.2); };
  const playLevel = () => { beep(523,.1); beep(659,.1); beep(784,.15); };
  const playPause = () => beep(440,.08,'sine');

  /* ── PUBLIC INIT ── */
  function init() {
    if (initialized) return;
    initialized = true;

    canvas = el('snakeCanvas');
    ctx    = canvas.getContext('2d');
    hiScore = +localStorage.getItem('snakeRetroHi') || 0;

    _sizeCanvas();
    window.addEventListener('resize', _sizeCanvas);

    // Keyboard
    document.addEventListener('keydown', _onKey);

    // Swipe
    document.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (state !== 'playing') return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) { _dpadMove(dx > 0 ? 1 : -1, 0); }
      else { _dpadMove(0, dy > 0 ? 1 : -1); }
    }, { passive: true });

    // D-pad buttons
    el('s-btn-up')   .addEventListener('touchstart', e => { e.preventDefault(); _dpadMove(0,-1); }, { passive: false });
    el('s-btn-down') .addEventListener('touchstart', e => { e.preventDefault(); _dpadMove(0,1);  }, { passive: false });
    el('s-btn-left') .addEventListener('touchstart', e => { e.preventDefault(); _dpadMove(-1,0); }, { passive: false });
    el('s-btn-right').addEventListener('touchstart', e => { e.preventDefault(); _dpadMove(1,0);  }, { passive: false });

    // Overlay buttons
    el('snakeOvStartBtn') .addEventListener('click', () => { _ac().resume(); newGame(); });
    el('snakeOvResumeBtn').addEventListener('click', () => { _resumeGame(); });
    el('snakeOvRetryBtn') .addEventListener('click', () => { _ac().resume(); newGame(); });

    // Start RAF loop
    animId = requestAnimationFrame(_render);

    _showOv('snakeOvStart');
  }

  /* ── NEW GAME ── */
  function newGame() {
    _clearLoop();
    snake      = [{ x:10, y:10 }, { x:9, y:10 }, { x:8, y:10 }];
    dir        = { x:1, y:0 };
    nextDir    = { x:1, y:0 };
    food       = _spawnFood();
    score      = 0;
    level      = 1;
    foodBeat   = 0;
    deathParts = [];
    state      = 'playing';

    _hideAllOv();
    _updateHud();
    loopId = setInterval(_tick, SPEEDS[speed]);
  }

  /* ── SPEED ── */
  function setSpeed(s) {
    speed = s;
    document.querySelectorAll('.speed-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.speed === s);
    });
    if (state === 'playing') { _clearLoop(); loopId = setInterval(_tick, SPEEDS[speed]); }
  }

  /* ── TICK ── */
  function _tick() {
    if (state !== 'playing') return;
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      return _endGame();
    }
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      return _endGame();
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += level * 10;
      if (score > hiScore) {
        hiScore = score;
        localStorage.setItem('snakeRetroHi', hiScore);
      }
      food = _spawnFood();
      playEat();

      if (snake.length % 5 === 0) {
        level++;
        _clearLoop();
        loopId = setInterval(_tick, Math.max(70, SPEEDS[speed] - (level-1)*8));
        playLevel();
        _showFlash('LEVEL ' + level);
      }
      _updateHud();
    } else {
      snake.pop();
    }
  }

  /* ── END GAME ── */
  function _endGame() {
    state = 'over';
    playDie();
    _clearLoop();

    // Particles
    const hx = snake[0].x * CELL + CELL / 2;
    const hy = snake[0].y * CELL + CELL / 2;
    for (let i = 0; i < 24; i++) {
      const ang = (Math.PI * 2 * i) / 24 + Math.random() * 0.4;
      const spd = 1.5 + Math.random() * 3;
      deathParts.push({
        x: hx, y: hy,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life: 1,
        col: i % 3 === 0 ? '#ff3b3b' : '#00ff41'
      });
    }

    setTimeout(() => {
      const sc = el('snakeOvScore');
      if (sc) sc.innerHTML = 'SCORE<br>' + score +
        (score >= hiScore && score > 0 ? '<br><br>★ NEW BEST ★' : '');
      _showOv('snakeOvOver');
    }, 600);
  }

  /* ── PAUSE / RESUME ── */
  function _pauseGame() {
    state = 'paused';
    _clearLoop();
    playPause();
    _showOv('snakeOvPause');
  }
  function _resumeGame() {
    state = 'playing';
    _hideAllOv();
    loopId = setInterval(_tick, Math.max(70, SPEEDS[speed] - (level-1)*8));
    playPause();
  }

  /* ── RENDER RAF ── */
  function _render() {
    animId = requestAnimationFrame(_render);
    foodBeat = (foodBeat + 0.06) % (Math.PI * 2);
    if (state === 'over') _updateParticles();
    _draw();
  }

  /* ── DRAW ── */
  function _draw() {
    if (!ctx || !canvas.width) return;
    const W = canvas.width, H = canvas.height;
    const cs = W / COLS;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#050f05';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,100,24,.18)';
    ctx.lineWidth = .5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x*cs, 0); ctx.lineTo(x*cs, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y*cs); ctx.lineTo(W, y*cs); ctx.stroke();
    }

    if (state === 'idle') return;

    // Food
    if (food && (state !== 'over' || deathParts.length > 0)) {
      const pulse = 1 + 0.18 * Math.sin(foodBeat);
      const fx = food.x * cs + cs / 2;
      const fy = food.y * cs + cs / 2;
      const r  = (cs / 2 - 3) * pulse;

      const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 1.8);
      grd.addColorStop(0, 'rgba(255,80,80,.35)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(fx, fy, r * 1.8, 0, Math.PI * 2); ctx.fill();

      ctx.shadowColor = '#ff3b3b';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = '#ff3b3b';
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 0;
    }

    // Snake
    if (snake && snake.length) {
      snake.forEach((seg, i) => {
        const t     = 1 - i / snake.length;
        const alpha = 0.4 + 0.6 * t;
        const pad   = i === 0 ? 1 : 2;
        const rx    = seg.x * cs + pad;
        const ry    = seg.y * cs + pad;
        const rs    = cs - pad * 2;

        if (i === 0) { ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 14; }
        ctx.fillStyle = i === 0
          ? `rgba(0,255,65,${alpha})`
          : `rgba(0,${Math.round(180*t+50)},${Math.round(30*t)},${alpha})`;
        _roundRect(rx, ry, rs, rs, 4);
        ctx.shadowBlur = 0;

        // Eyes
        if (i === 0) {
          ctx.fillStyle = '#050f05';
          const eSz = Math.max(2, Math.floor(cs * 0.18));
          let e1, e2;
          const p = cs / 20;
          if      (dir.x ===  1) { e1={x:cs*.5, y:cs*.2}; e2={x:cs*.5, y:cs*.6}; }
          else if (dir.x === -1) { e1={x:cs*.3, y:cs*.2}; e2={x:cs*.3, y:cs*.6}; }
          else if (dir.y === -1) { e1={x:cs*.2, y:cs*.3}; e2={x:cs*.6, y:cs*.3}; }
          else                   { e1={x:cs*.2, y:cs*.5}; e2={x:cs*.6, y:cs*.5}; }
          ctx.fillRect(seg.x*cs+e1.x, seg.y*cs+e1.y, eSz, eSz);
          ctx.fillRect(seg.x*cs+e2.x, seg.y*cs+e2.y, eSz, eSz);
        }
      });
    }

    // Particles
    deathParts.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.col;
      ctx.shadowColor = p.col;
      ctx.shadowBlur  = 6;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
  }

  function _roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.arcTo(x+w, y, x+w, y+r, r); ctx.lineTo(x+w, y+h-r);
    ctx.arcTo(x+w, y+h, x+w-r, y+h, r); ctx.lineTo(x+r, y+h);
    ctx.arcTo(x, y+h, x, y+h-r, r); ctx.lineTo(x, y+r);
    ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath(); ctx.fill();
  }

  function _updateParticles() {
    deathParts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.025;
    });
    deathParts = deathParts.filter(p => p.life > 0);
  }

  /* ── HELPERS ── */
  function _spawnFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
    } while (snake && snake.some(s => s.x===pos.x && s.y===pos.y));
    return pos;
  }

  function _clearLoop() {
    if (loopId) { clearInterval(loopId); loopId = null; }
  }

  function _updateHud() {
    const sc = el('snakeHudScore'); if (sc) sc.textContent = score;
    const lv = el('snakeHudLevel'); if (lv) lv.textContent = level;
    const hi = el('snakeHudBest');  if (hi) hi.textContent = hiScore;
  }

  function _showFlash(txt) {
    const f = el('snakeLevelFlash');
    if (!f) return;
    f.textContent = txt;
    f.classList.add('show');
    setTimeout(() => f.classList.remove('show'), 900);
  }

  function _showOv(id) {
    _hideAllOv();
    const o = el(id); if (o) o.classList.add('show');
  }
  function _hideAllOv() {
    ['snakeOvStart','snakeOvPause','snakeOvOver'].forEach(id => {
      const o = el(id); if (o) o.classList.remove('show');
    });
  }

  function _sizeCanvas() {
    if (!canvas) return;
    const wrap = document.querySelector('.snake-board-wrap');
    if (!wrap) return;
    const size = wrap.clientWidth || 360;
    canvas.width  = size;
    canvas.height = size;
  }

  /* ── DIRECTION ── */
  function _dpadMove(dx, dy) {
    if (state !== 'playing') return;
    if (dx !== 0 && dir.x === 0) nextDir = { x: dx, y: 0 };
    if (dy !== 0 && dir.y === 0) nextDir = { x: 0,  y: dy };
  }

  function _onKey(e) {
    if (e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      if      (state === 'playing') _pauseGame();
      else if (state === 'paused')  _resumeGame();
      return;
    }
    const map = {
      ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
      ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
      w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0},
      W:{x:0,y:-1}, S:{x:0,y:1}, A:{x:-1,y:0}, D:{x:1,y:0},
    };
    const nd = map[e.key];
    if (!nd) return;
    e.preventDefault();
    if (nd.x !== 0 && dir && dir.x === 0) nextDir = nd;
    if (nd.y !== 0 && dir && dir.y === 0) nextDir = nd;
  }

  return { init, newGame, setSpeed };
})();
