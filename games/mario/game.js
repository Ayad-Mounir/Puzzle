/* ============================================================
   ولد الحارة — Platformer Game
   بروح ماريو، بقلب عربي 🎮
   ============================================================ */

const PLATFORMER = (() => {

  /* ── Constants ── */
  const T        = 32;          // tile size px
  const GRAVITY  = 0.52;
  const JUMP_V   = -11.5;
  const RUN_SPD  = 3.6;

  /* ── State ── */
  let canvas, ctx, initialized = false;
  let raf, state = 'start';
  let frameCount = 0, score = 0, lives = 3, coinCount = 0, level = 0;
  let invincible = 0, transTimer = 0;
  let currentCoins = [], currentEnemies = [];
  let levelData;
  let camX = 0;

  /* ── Player ── */
  const P = { x:0, y:0, vx:0, vy:0, w:22, h:28, onGround:false,
              facingRight:true, running:false, dead:false, deathTimer:0 };

  /* ── Keys ── */
  const K = { left:false, right:false, jump:false };

  /* ── Level Definitions ── */
  const LEVELS = [
    // ─── Level 1 — الحارة القديمة ───
    {
      name: 'الحارة القديمة', width: 110,
      sky1: '#87CEEB', sky2: '#FED99B',
      platforms: [
        {x:7,  y:9, w:4}, {x:13, y:7, w:3}, {x:19, y:9, w:4},
        {x:25, y:7, w:3}, {x:31, y:8, w:5}, {x:39, y:7, w:5},
        {x:47, y:9, w:4}, {x:54, y:6, w:3}, {x:60, y:8, w:4},
        {x:68, y:6, w:3}, {x:74, y:8, w:5}, {x:83, y:7, w:4},
        {x:91, y:9, w:5}, {x:100,y:7, w:4},
      ],
      coins: [
        {x:7,y:8},{x:8,y:8},{x:9,y:8},
        {x:13,y:6},{x:14,y:6},{x:15,y:6},
        {x:19,y:8},{x:20,y:8},{x:21,y:8},
        {x:31,y:7},{x:32,y:7},{x:33,y:7},
        {x:39,y:6},{x:40,y:6},{x:41,y:6},{x:42,y:6},
        {x:54,y:5},{x:55,y:5},
        {x:68,y:5},{x:69,y:5},
        {x:83,y:6},{x:84,y:6},{x:85,y:6},
        {x:100,y:6},{x:101,y:6},{x:102,y:6},
      ],
      enemies: [
        {x:11*T, spd:1.2}, {x:22*T, spd:1.3}, {x:35*T, spd:1.5},
        {x:44*T, spd:1.5}, {x:58*T, spd:1.8}, {x:72*T, spd:2.0},
        {x:88*T, spd:2.0}, {x:97*T, spd:2.2},
      ],
      goal: 107,
    },
    // ─── Level 2 — السوق القديم ───
    {
      name: 'السوق القديم', width: 120,
      sky1: '#FFB347', sky2: '#FF7043',
      platforms: [
        {x:5,  y:8, w:3}, {x:10, y:6, w:2}, {x:14, y:8, w:3},
        {x:19, y:6, w:2}, {x:23, y:8, w:3}, {x:28, y:5, w:2},
        {x:32, y:7, w:3}, {x:37, y:9, w:2}, {x:41, y:7, w:3},
        {x:46, y:5, w:2}, {x:50, y:7, w:3}, {x:55, y:9, w:4},
        {x:62, y:6, w:3}, {x:67, y:8, w:2}, {x:71, y:6, w:3},
        {x:76, y:8, w:4}, {x:83, y:6, w:3}, {x:88, y:8, w:3},
        {x:93, y:5, w:2}, {x:97, y:7, w:3}, {x:102,y:9, w:4},
        {x:109,y:7, w:3},
      ],
      coins: [
        {x:5,y:7},{x:6,y:7},
        {x:10,y:5},{x:11,y:5},
        {x:19,y:5},{x:20,y:5},
        {x:28,y:4},{x:29,y:4},
        {x:41,y:6},{x:42,y:6},
        {x:46,y:4},{x:47,y:4},
        {x:55,y:8},{x:56,y:8},{x:57,y:8},
        {x:62,y:5},{x:63,y:5},
        {x:76,y:7},{x:77,y:7},{x:78,y:7},
        {x:83,y:5},{x:84,y:5},
        {x:93,y:4},{x:94,y:4},
        {x:102,y:8},{x:103,y:8},{x:104,y:8},
        {x:109,y:6},{x:110,y:6},
      ],
      enemies: [
        {x:8*T,  spd:1.5}, {x:16*T, spd:1.6}, {x:25*T, spd:1.8},
        {x:34*T, spd:1.8}, {x:43*T, spd:2.0}, {x:52*T, spd:2.0},
        {x:65*T, spd:2.2}, {x:73*T, spd:2.2}, {x:85*T, spd:2.5},
        {x:95*T, spd:2.5}, {x:105*T,spd:2.8},
      ],
      goal: 117,
    },
    // ─── Level 3 — القصبة المحصنة ───
    {
      name: 'القصبة المحصنة', width: 130,
      sky1: '#1a1a2e', sky2: '#16213e',
      platforms: [
        {x:4,  y:8, w:2}, {x:8,  y:6, w:2}, {x:12, y:8, w:2},
        {x:16, y:5, w:2}, {x:21, y:7, w:2}, {x:25, y:9, w:2},
        {x:29, y:6, w:2}, {x:33, y:8, w:2}, {x:37, y:5, w:3},
        {x:42, y:7, w:2}, {x:46, y:9, w:2}, {x:50, y:6, w:2},
        {x:54, y:4, w:2}, {x:58, y:7, w:2}, {x:62, y:9, w:3},
        {x:67, y:6, w:2}, {x:71, y:8, w:2}, {x:75, y:5, w:3},
        {x:80, y:7, w:2}, {x:84, y:9, w:2}, {x:88, y:6, w:2},
        {x:92, y:4, w:2}, {x:96, y:7, w:2}, {x:100,y:9, w:3},
        {x:105,y:6, w:2}, {x:109,y:8, w:2}, {x:113,y:5, w:3},
        {x:118,y:7, w:3}, {x:123,y:9, w:3},
      ],
      coins: [
        {x:4,y:7},{x:8,y:5},{x:12,y:7},{x:16,y:4},
        {x:21,y:6},{x:29,y:5},{x:37,y:4},{x:38,y:4},
        {x:42,y:6},{x:50,y:5},{x:54,y:3},{x:55,y:3},
        {x:62,y:8},{x:63,y:8},{x:67,y:5},{x:75,y:4},{x:76,y:4},
        {x:80,y:6},{x:88,y:5},{x:92,y:3},{x:93,y:3},
        {x:100,y:8},{x:105,y:5},{x:113,y:4},{x:114,y:4},
        {x:118,y:6},{x:119,y:6},{x:123,y:8},{x:124,y:8},
      ],
      enemies: [
        {x:6*T,  spd:2.0}, {x:14*T, spd:2.2}, {x:23*T, spd:2.2},
        {x:31*T, spd:2.5}, {x:40*T, spd:2.5}, {x:48*T, spd:2.8},
        {x:56*T, spd:2.8}, {x:65*T, spd:3.0}, {x:73*T, spd:3.0},
        {x:82*T, spd:3.2}, {x:90*T, spd:3.2}, {x:98*T, spd:3.5},
        {x:107*T,spd:3.5}, {x:116*T,spd:3.8}, {x:121*T,spd:3.8},
      ],
      goal: 127,
    },
  ];

  /* ── DOM ── */
  function el(id) { return document.getElementById(id); }

  /* ── Init ── */
  function init() {
    if (initialized) {
      state = 'start';
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      _render();
      return;
    }
    initialized = true;

    canvas = el('platformerCanvas');
    ctx    = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    _resizeCanvas();
    window.addEventListener('resize', _resizeCanvas);
    _setupControls();
    _render();
  }

  function _resizeCanvas() {
    if (!canvas) return;
    const section = el('marioSection');
    const w = Math.min((section && section.clientWidth) || 360, 480);
    canvas.width  = w;
    canvas.height = Math.round(w * 0.65);
  }

  /* ── Controls ── */
  function _setupControls() {
    // Keyboard
    window.addEventListener('keydown', e => {
      if (['ArrowLeft','a','A'].includes(e.key))  K.left = true;
      if (['ArrowRight','d','D'].includes(e.key)) K.right = true;
      if ([' ','ArrowUp','w','W'].includes(e.key)) { e.preventDefault(); _tryJump(); K.jump = true; }
    });
    window.addEventListener('keyup', e => {
      if (['ArrowLeft','a','A'].includes(e.key))  K.left  = false;
      if (['ArrowRight','d','D'].includes(e.key)) K.right = false;
      if ([' ','ArrowUp','w','W'].includes(e.key)) K.jump  = false;
    });

    // Touch on canvas → start/retry
    canvas.addEventListener('click', () => {
      if (state === 'start' || state === 'gameover' || state === 'win') _startGame();
      else if (state === 'paused') _resumeGame();
    });

    // D-pad buttons
    _dpad('p-btn-left',
      () => K.left = true, () => K.left = false);
    _dpad('p-btn-right',
      () => K.right = true, () => K.right = false);
    _dpad('p-btn-jump',
      () => { _tryJump(); K.jump = true; }, () => K.jump = false);

    const startBtn = el('p-btn-start');
    if (startBtn) startBtn.addEventListener('click', () => {
      if (state === 'start' || state === 'gameover' || state === 'win') _startGame();
      else if (state === 'playing') _pauseGame();
      else if (state === 'paused')  _resumeGame();
    });
  }

  function _dpad(id, down, up) {
    const btn = el(id);
    if (!btn) return;
    ['touchstart','mousedown'].forEach(ev =>
      btn.addEventListener(ev, e => { e.preventDefault(); btn.classList.add('pressed'); down(); }, {passive:false}));
    ['touchend','mouseup','touchcancel','mouseleave'].forEach(ev =>
      btn.addEventListener(ev, e => { e.preventDefault(); btn.classList.remove('pressed'); up(); }, {passive:false}));
  }

  /* ── Game flow ── */
  function _startGame() {
    score = 0; lives = 3; coinCount = 0; level = 0;
    _loadLevel(0);
  }

  function _loadLevel(lvl) {
    level     = lvl;
    levelData = LEVELS[lvl];
    const H   = canvas.height;

    currentCoins   = levelData.coins.map(c => ({
      x: c.x * T, y: c.y * T, collected: false
    }));
    currentEnemies = levelData.enemies.map(e => ({
      x: e.x, y: 0, vx: 0, vy: 0, w: 26, h: 22,
      dir: Math.random() > 0.5 ? 1 : -1,
      spd: e.spd, onGround: false,
      alive: true, stomped: false, stompTimer: 0
    }));

    P.x = 48; P.y = H - T * 3;
    P.vx = 0; P.vy = 0;
    P.onGround = false; P.facingRight = true;
    P.dead = false; P.deathTimer = 0;
    camX = 0; invincible = 0; frameCount = 0;
    state = 'playing';

    if (raf) cancelAnimationFrame(raf);
    _loop();
  }

  function _tryJump() {
    if (state === 'start' || state === 'gameover' || state === 'win') { _startGame(); return; }
    if (state !== 'playing') return;
    if (P.onGround && !P.dead) {
      P.vy = JUMP_V;
      P.onGround = false;
      AUDIO.playTick();
    }
  }

  function _pauseGame()  { state = 'paused'; cancelAnimationFrame(raf); }
  function _resumeGame() { state = 'playing'; _loop(); }

  /* ── Main Loop ── */
  function _loop() {
    _update(); _render();
    if (state === 'playing' || state === 'levelcomplete') {
      raf = requestAnimationFrame(_loop);
    }
  }

  /* ── Update ── */
  function _update() {
    frameCount++;
    if (invincible > 0) invincible--;
    const H = canvas.height;
    const groundY = H - T;

    if (state === 'levelcomplete') {
      transTimer++;
      return;
    }

    // ── Player ──
    if (!P.dead) {
      P.running = K.left || K.right;
      if (K.left)  { P.vx = -RUN_SPD; P.facingRight = false; }
      else if (K.right) { P.vx = RUN_SPD; P.facingRight = true; }
      else P.vx *= 0.72;

      P.vy += GRAVITY;

      // Move X + collide
      P.x += P.vx;
      P.x = Math.max(0, P.x);
      _collideX(P);

      // Move Y + collide
      P.y += P.vy;
      P.onGround = false;
      _collideY(P);

      // Ground
      if (P.y + P.h >= groundY) {
        P.y = groundY - P.h;
        P.vy = 0; P.onGround = true;
      }

      // Fell
      if (P.y > H + 60) _playerDie();

      // Camera
      camX = P.x - canvas.width * 0.35;
      camX = Math.max(0, Math.min(camX, levelData.width * T - canvas.width));
    } else {
      // Death bounce
      P.deathTimer++;
      if (P.deathTimer === 1) P.vy = -10;
      P.vy += GRAVITY * 0.8;
      P.y += P.vy;
      if (P.deathTimer > 80) {
        lives--;
        if (lives <= 0) { state = 'gameover'; return; }
        _loadLevel(level);
        return;
      }
    }

    // ── Enemies ──
    for (const e of currentEnemies) {
      if (!e.alive) continue;
      if (e.stomped) {
        e.stompTimer++;
        if (e.stompTimer > 28) e.alive = false;
        continue;
      }

      e.vy += GRAVITY;
      e.y  += e.vy;

      // Ground
      if (e.y + e.h >= groundY) { e.y = groundY - e.h; e.vy = 0; e.onGround = true; }

      // Platform collide
      for (const p of levelData.platforms) {
        const px = p.x*T, py = p.y*T, pw = p.w*T;
        if (e.x + e.w > px+2 && e.x < px+pw-2) {
          if (e.y + e.h > py && e.y + e.h < py + T + 6 && e.vy >= 0) {
            e.y = py - e.h; e.vy = 0; e.onGround = true;
          }
        }
      }

      // Walk + turn at edges
      e.x += e.dir * e.spd;

      // Turn at platform edge
      let onPlat = e.y + e.h >= groundY - 2;
      if (!onPlat) {
        for (const p of levelData.platforms) {
          const px = p.x*T, py = p.y*T, pw = p.w*T;
          if (Math.abs(e.y + e.h - py) < 4 && e.x + e.w > px && e.x < px + pw) {
            onPlat = true;
            // Near edge?
            if (e.x + 2 <= px || e.x + e.w - 2 >= px + pw) e.dir *= -1;
            break;
          }
        }
      }

      // Wall bounce
      if (e.x < 2) { e.x = 2; e.dir = 1; }
      if (e.x + e.w > levelData.width * T - 2) { e.x = levelData.width * T - e.w - 2; e.dir = -1; }

      // Player collision
      if (!P.dead && invincible === 0 && _overlap(P, e)) {
        if (P.vy > 1 && P.y + P.h < e.y + e.h * 0.55) {
          // Stomp!
          e.stomped = true; e.stompTimer = 0;
          P.vy = -8; score += 100;
          AUDIO.playWin();
        } else {
          // Hurt
          invincible = 100; lives--;
          AUDIO.playTick();
          if (lives <= 0) { P.dead = true; P.deathTimer = 0; state = 'gameover'; }
        }
      }
    }

    // ── Coins ──
    for (const c of currentCoins) {
      if (c.collected) continue;
      const cR = { x: c.x + T*0.2, y: c.y, w: T*0.55, h: T*0.55 };
      if (_overlap(P, cR)) {
        c.collected = true; coinCount++; score += 10;
        AUDIO.playTick();
      }
    }

    // ── Goal ──
    const gx = levelData.goal * T;
    if (!P.dead && P.x + P.w > gx && P.x < gx + T * 2.5) {
      score += 500 + coinCount * 5;
      state = 'levelcomplete'; transTimer = 0;
      setTimeout(() => {
        if (level + 1 < LEVELS.length) _loadLevel(level + 1);
        else state = 'win';
      }, 2200);
    }
  }

  function _collideX(obj) {
    for (const p of levelData.platforms) {
      const px = p.x*T, py = p.y*T, pw = p.w*T;
      if (obj.x + obj.w > px && obj.x < px+pw && obj.y + obj.h > py+4 && obj.y < py+T-4) {
        if (obj.vx > 0) obj.x = px - obj.w;
        else obj.x = px + pw;
        obj.vx = 0;
      }
    }
  }

  function _collideY(obj) {
    for (const p of levelData.platforms) {
      const px = p.x*T, py = p.y*T, pw = p.w*T;
      if (obj.x + obj.w > px+3 && obj.x < px+pw-3) {
        // Land on top
        if (obj.y + obj.h > py && obj.y + obj.h < py + T*0.7 && obj.vy >= 0) {
          obj.y = py - obj.h; obj.vy = 0; obj.onGround = true;
        }
        // Hit from below
        else if (obj.y < py + T && obj.y > py + T*0.6 && obj.vy < 0) {
          obj.y = py + T; obj.vy = 0;
        }
      }
    }
  }

  function _overlap(a, b) {
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }

  function _playerDie() { P.dead = true; P.vy = -10; P.deathTimer = 0; }

  /* ── Render ── */
  function _render() {
    if (!ctx || !canvas) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    if (levelData) {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, levelData.sky1);
      bg.addColorStop(1, levelData.sky2);
      ctx.fillStyle = bg;
    } else {
      ctx.fillStyle = '#87CEEB';
    }
    ctx.fillRect(0, 0, W, H);

    if (!levelData) { _drawStartScreen(W, H); return; }

    // Background parallax buildings
    _drawBuildings(W, H, camX);

    ctx.save();
    ctx.translate(-camX, 0);

    // Ground
    _drawGround(H);
    // Platforms
    for (const p of levelData.platforms) _drawPlatform(p.x*T, p.y*T, p.w*T, H);
    // Coins
    for (const c of currentCoins) { if (!c.collected) _drawCoin(c.x, c.y); }
    // Goal
    _drawGoal(levelData.goal * T, H);
    // Enemies
    for (const e of currentEnemies) { if (e.alive) _drawEnemy(e); }
    // Player
    if (!P.dead || P.deathTimer % 8 < 5) {
      const blink = invincible > 0 && Math.floor(invincible / 5) % 2 === 1;
      if (!blink) _drawPlayer();
    }

    ctx.restore();

    // HUD
    _drawHUD(W, H);

    // Overlays
    if (state === 'start')         _drawStartScreen(W, H);
    if (state === 'paused')        _drawOverlay(W, H, '⏸ متوقف', '', '');
    if (state === 'gameover')      _drawEndScreen(W, H, '💔 انتهت اللعبة', `النقاط: ${score}`, false);
    if (state === 'win')           _drawEndScreen(W, H, '🏆 فزت!', `النقاط: ${score} | عملات: ${coinCount}`, true);
    if (state === 'levelcomplete') _drawLevelComplete(W, H);
  }

  /* ── Draw: Background ── */
  function _drawBuildings(W, H, camX) {
    const scroll = camX * 0.25;
    const totalW = 700;
    const buildings = [
      {x:30,  w:50, h:70,  arch:true},
      {x:110, w:40, h:55,  arch:false},
      {x:180, w:60, h:90,  arch:true},
      {x:270, w:45, h:65,  arch:false},
      {x:350, w:55, h:80,  arch:true},
      {x:440, w:40, h:60,  arch:false},
      {x:520, w:65, h:95,  arch:true},
      {x:620, w:50, h:75,  arch:false},
    ];
    ctx.fillStyle = 'rgba(150,90,40,0.18)';
    const groundY = H - T;
    for (const b of buildings) {
      let bx = ((b.x - scroll % totalW + totalW * 10) % totalW) - b.w;
      ctx.fillRect(bx, groundY - b.h, b.w, b.h);
      // Windows
      ctx.fillStyle = 'rgba(255,220,100,0.25)';
      for (let wy = groundY - b.h + 8; wy < groundY - 8; wy += 18) {
        for (let wx = bx + 6; wx < bx + b.w - 8; wx += 14) {
          ctx.fillRect(wx, wy, 7, 9);
        }
      }
      // Arch door
      if (b.arch) {
        ctx.fillStyle = 'rgba(100,50,20,0.3)';
        const ax = bx + b.w/2 - 8;
        ctx.fillRect(ax, groundY - 20, 16, 20);
        ctx.beginPath();
        ctx.arc(bx + b.w/2, groundY - 20, 8, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(150,90,40,0.18)';
    }
  }

  /* ── Draw: Ground ── */
  function _drawGround(H) {
    const lw = levelData.width * T;
    const groundY = H - T;
    // Base
    ctx.fillStyle = '#C8A060';
    ctx.fillRect(0, groundY, lw, T);
    // Top edge
    ctx.fillStyle = '#D4B070';
    ctx.fillRect(0, groundY, lw, 5);
    // Tile lines
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let x = 0; x < lw; x += T) ctx.fillRect(x, groundY, 2, T);
    ctx.fillRect(0, groundY + T/2, lw, 2);
  }

  /* ── Draw: Platform ── */
  function _drawPlatform(x, y, w, H) {
    ctx.fillStyle = '#C0623A';
    ctx.fillRect(x, y, w, T);
    ctx.fillStyle = '#D4794F';
    ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = '#8B3A1A';
    ctx.fillRect(x, y + T - 3, w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let bx = x; bx < x + w; bx += T) ctx.fillRect(bx + T - 2, y + 5, 2, T - 8);
    ctx.fillRect(x, y + T/2 - 1, w, 2);
  }

  /* ── Draw: Coin ── */
  function _drawCoin(cx, cy) {
    const bob = Math.sin(frameCount * 0.12 + cx * 0.008) * 3;
    const r = T * 0.22;
    const px = cx + T * 0.28, py = cy + T * 0.1 + bob;
    ctx.fillStyle = '#F5C842';
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFE066';
    ctx.beginPath(); ctx.arc(px - r*0.2, py - r*0.2, r*0.42, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#B8860B';
    ctx.font = `bold ${Math.round(r*1.1)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('د', px, py + 1);
  }

  /* ── Draw: Goal (flag) ── */
  function _drawGoal(x, H) {
    const base = H - T;
    ctx.fillStyle = '#999';
    ctx.fillRect(x + T - 3, base - T*5.5, 4, T*5.5);
    ctx.fillStyle = '#E63946';
    ctx.beginPath();
    ctx.moveTo(x + T + 1,   base - T*5.5);
    ctx.lineTo(x + T*2.2,   base - T*4.7);
    ctx.lineTo(x + T + 1,   base - T*3.9);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = `${Math.round(T*0.45)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('⭐', x + T*1.6, base - T*4.55);
    ctx.fillStyle = '#777';
    ctx.fillRect(x + T - 8, base - T, T*0.5, T);
  }

  /* ── Draw: Enemy (قطة الحارة) ── */
  function _drawEnemy(e) {
    if (!e.alive) return;
    const x = e.x, y = e.y;
    const legPh = Math.floor(frameCount / 6) % 2;

    ctx.save();
    if (e.stomped) {
      ctx.globalAlpha = Math.max(0, 1 - e.stompTimer / 28);
      ctx.translate(x + e.w/2, y + e.h);
      ctx.scale(1 + e.stompTimer * 0.03, Math.max(0.1, 0.4 - e.stompTimer * 0.012));
      ctx.translate(-e.w/2, -e.h);
    } else {
      // Flip based on direction
      if (e.dir < 0) {
        ctx.translate(x + e.w, 0);
        ctx.scale(-1, 1);
        ctx.translate(-x, 0);
      }
    }

    // Body
    ctx.fillStyle = '#F4A460';
    ctx.fillRect(x+3, y+8, e.w-6, e.h-10);
    // Head
    ctx.fillRect(x+3, y+1, e.w-6, 10);
    // Ears
    ctx.fillStyle = '#E8905A';
    ctx.beginPath(); ctx.moveTo(x+5,y+1); ctx.lineTo(x+4,y-5); ctx.lineTo(x+10,y+1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+e.w-5,y+1); ctx.lineTo(x+e.w-4,y-5); ctx.lineTo(x+e.w-10,y+1); ctx.fill();
    // Inner ear
    ctx.fillStyle = '#FFB08A';
    ctx.beginPath(); ctx.moveTo(x+5.5,y+1); ctx.lineTo(x+5,y-3); ctx.lineTo(x+9,y+1); ctx.fill();
    // Eyes
    ctx.fillStyle = '#2ECC71';
    ctx.fillRect(x+5, y+3, 3, 3);
    ctx.fillRect(x+e.w-8, y+3, 3, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(x+6, y+3, 1, 3); ctx.fillRect(x+e.w-7, y+3, 1, 3);
    // Nose
    ctx.fillStyle = '#FF8888';
    ctx.fillRect(x+e.w/2-1, y+7, 2, 2);
    // Whiskers
    ctx.strokeStyle = 'rgba(100,100,100,0.6)'; ctx.lineWidth = 0.7;
    [[x+4,y+7,x-5,y+6],[x+4,y+8,x-5,y+9],
     [x+e.w-4,y+7,x+e.w+5,y+6],[x+e.w-4,y+8,x+e.w+5,y+9]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    // Tail
    ctx.strokeStyle = '#F4A460'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x+3, y+e.h-3);
    ctx.bezierCurveTo(x-10, y+e.h-6, x-12, y+e.h-16, x-6, y+e.h-18);
    ctx.stroke();
    // Legs
    ctx.fillStyle = '#E8905A';
    if (legPh === 0) {
      ctx.fillRect(x+4, y+e.h-5, 4, 5); ctx.fillRect(x+e.w-8, y+e.h-7, 4, 7);
    } else {
      ctx.fillRect(x+4, y+e.h-7, 4, 7); ctx.fillRect(x+e.w-8, y+e.h-5, 4, 5);
    }
    ctx.restore();
  }

  /* ── Draw: Player (ولد الحارة) ── */
  function _drawPlayer() {
    const x = P.x, y = P.y;
    const fc = frameCount;
    const legPh = Math.floor(fc / 5) % 2;
    const run = P.running && P.onGround;
    const jump = !P.onGround;

    ctx.save();
    if (!P.facingRight) {
      ctx.translate(x + P.w, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
    }

    // === Shoes ===
    ctx.fillStyle = '#222';
    if (run) {
      if (legPh===0) { ctx.fillRect(x+1,y+25,10,3); ctx.fillRect(x+P.w-10,y+27,10,3); }
      else           { ctx.fillRect(x+1,y+27,10,3); ctx.fillRect(x+P.w-10,y+25,10,3); }
    } else if (jump) {
      ctx.fillRect(x+1,y+24,9,3); ctx.fillRect(x+P.w-10,y+24,9,3);
    } else {
      ctx.fillRect(x+1,y+25,9,3); ctx.fillRect(x+P.w-10,y+25,9,3);
    }

    // === Pants (blue jeans) ===
    ctx.fillStyle = '#1D3557';
    if (run) {
      if (legPh===0) { ctx.fillRect(x+3,y+18,7,7); ctx.fillRect(x+P.w-10,y+18,7,9); }
      else           { ctx.fillRect(x+3,y+18,7,9); ctx.fillRect(x+P.w-10,y+18,7,7); }
    } else if (jump) {
      ctx.fillRect(x+3,y+18,7,6); ctx.fillRect(x+P.w-10,y+18,7,6);
    } else {
      ctx.fillRect(x+3,y+18,7,7); ctx.fillRect(x+P.w-10,y+18,7,7);
    }

    // === Belt ===
    ctx.fillStyle = '#3D1C02';
    ctx.fillRect(x+3,y+17,P.w-6,2);
    ctx.fillStyle = '#F5C842';
    ctx.fillRect(x+P.w/2-3,y+16,6,4);

    // === Shirt (red) ===
    ctx.fillStyle = '#E63946';
    ctx.fillRect(x+3,y+9,P.w-6,9);
    // Shirt stripes
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x+3,y+9,P.w-6,2);

    // === Arms ===
    ctx.fillStyle = '#E63946';
    if (jump) {
      ctx.fillRect(x,y+10,3,6); ctx.fillRect(x+P.w-3,y+10,3,6);
    } else if (run) {
      if (legPh===0) { ctx.fillRect(x,y+9,3,7); ctx.fillRect(x+P.w-3,y+11,3,5); }
      else           { ctx.fillRect(x,y+11,3,5); ctx.fillRect(x+P.w-3,y+9,3,7); }
    } else {
      ctx.fillRect(x,y+10,3,6); ctx.fillRect(x+P.w-3,y+10,3,6);
    }
    // Hands
    ctx.fillStyle = '#FFCBA4';
    ctx.fillRect(x-1,y+15,4,4); ctx.fillRect(x+P.w-3,y+15,4,4);

    // === Collar ===
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x+5,y+9,4,3); ctx.fillRect(x+P.w-9,y+9,4,3);

    // === Head ===
    ctx.fillStyle = '#FFCBA4';
    ctx.fillRect(x+3,y+1,P.w-6,10);
    // Chin
    ctx.fillRect(x+5,y+10,P.w-10,2);

    // === Hair ===
    ctx.fillStyle = '#3D1C02';
    ctx.fillRect(x+3,y,P.w-6,5);
    ctx.fillRect(x+2,y+1,2,3);
    ctx.fillRect(x+P.w-4,y+1,2,3);
    // Hair highlight
    ctx.fillStyle = '#5C2D08';
    ctx.fillRect(x+5,y,4,2);

    // === Eyes ===
    ctx.fillStyle = '#1A0A00';
    ctx.fillRect(x+5,y+4,3,3);
    ctx.fillRect(x+P.w-8,y+4,3,3);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x+5,y+4,1,1);
    ctx.fillRect(x+P.w-8,y+4,1,1);

    // === Nose ===
    ctx.fillStyle = '#FFAB8A';
    ctx.fillRect(x+P.w/2-1,y+7,2,2);

    // === Smile ===
    ctx.fillStyle = '#C0704A';
    ctx.fillRect(x+6,y+9,2,1); ctx.fillRect(x+P.w-8,y+9,2,1);

    ctx.restore();
  }

  /* ── Draw: HUD ── */
  function _drawHUD(W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 34);
    ctx.font = 'bold 12px Cairo, Arial, sans-serif';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'left';
    ctx.fillText(`❤️ ${lives}`, 8, 17);

    ctx.textAlign = 'center';
    ctx.fillText(`⭐ ${score}`, W/2 - 30, 17);
    ctx.fillStyle = '#F5C842';
    ctx.fillText(`🪙 ${coinCount}`, W/2 + 36, 17);

    ctx.fillStyle = '#AAB';
    ctx.textAlign = 'right';
    ctx.fillText(levelData ? levelData.name : '', W - 8, 17);
  }

  /* ── Draw: Overlays ── */
  function _drawStartScreen(W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);

    // Logo
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C842';
    ctx.font = `bold ${Math.round(W*0.095)}px Cairo, Arial`;
    ctx.fillText('🧒 ولد الحارة', W/2, H*0.32);

    ctx.fillStyle = '#CCC';
    ctx.font = `${Math.round(W*0.042)}px Cairo, Arial`;
    ctx.fillText('اجمع العملات، تجنب القطط، وصل للعلم', W/2, H*0.46);

    // Controls hint
    ctx.fillStyle = '#888';
    ctx.font = `${Math.round(W*0.034)}px Cairo, Arial`;
    ctx.fillText('🎮 D-Pad للتحرك | زر القفز للقفز', W/2, H*0.57);

    // Start button
    const bw=170, bh=42, bx=W/2-bw/2, by=H*0.66;
    const grad = ctx.createLinearGradient(bx, by, bx, by+bh);
    grad.addColorStop(0, '#E63946'); grad.addColorStop(1, '#C0392B');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.round(W*0.048)}px Cairo, Arial`;
    ctx.fillText('▶ ابدأ المغامرة', W/2, by + bh/2 + 1);
  }

  function _drawEndScreen(W, H, title, sub, win) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    ctx.fillStyle = win ? '#F5C842' : '#E63946';
    ctx.font = `bold ${Math.round(W*0.085)}px Cairo, Arial`;
    ctx.fillText(title, W/2, H*0.35);

    ctx.fillStyle = '#DDD';
    ctx.font = `${Math.round(W*0.042)}px Cairo, Arial`;
    ctx.fillText(sub, W/2, H*0.48);

    const bw=160, bh=40, bx=W/2-80, by=H*0.58;
    ctx.fillStyle = win ? '#27AE60' : '#E63946';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.round(W*0.042)}px Cairo, Arial`;
    ctx.fillText(win ? '🔄 العب مجدداً' : '🔄 حاول مجدداً', W/2, by+bh/2+1);
  }

  function _drawLevelComplete(W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C842';
    ctx.font = `bold ${Math.round(W*0.08)}px Cairo, Arial`;
    ctx.fillText(`✅ مرحلة ${level + 1} مكتملة!`, W/2, H*0.42);
    ctx.fillStyle = '#CCC';
    ctx.font = `${Math.round(W*0.038)}px Cairo, Arial`;
    ctx.fillText('رائع! جاهز للمرحلة القادمة...', W/2, H*0.55);
    ctx.fillStyle = '#F5C842';
    ctx.font = `${Math.round(W*0.042)}px Cairo, Arial`;
    ctx.fillText(`🪙 ${coinCount}   ⭐ ${score}`, W/2, H*0.65);
  }

  function _drawOverlay(W, H, title) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C842';
    ctx.font = `bold ${Math.round(W*0.08)}px Cairo, Arial`;
    ctx.fillText(title, W/2, H/2);
  }

  return { init, initialized: false };
})();
