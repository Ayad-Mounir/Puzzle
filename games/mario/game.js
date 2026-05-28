/* ============================================================
   ولد الحارة v2.0 — Platformer
   بروح ماريو، بقلب عربي 🎮
   ============================================================ */

const PLATFORMER = (() => {

  /* ── Constants ── */
  const T       = 36;
  const GRAVITY = 0.55;
  const JUMP_V  = -12.5;
  const RUN_SPD = 3.8;
  const FRICTION = 0.74;

  /* ── State ── */
  let canvas, ctx, initialized = false;
  let raf = null, state = 'start';
  let frameCount = 0, score = 0, lives = 3, coinCount = 0, level = 0;
  let invincible = 0;
  let particles = [];
  let screenShake = 0;
  let currentCoins = [], currentEnemies = [], powerUps = [];
  let levelData;
  let camX = 0, camY = 0;

  /* ── Player ── */
  const P = {
    x:0, y:0, vx:0, vy:0, w:24, h:30,
    onGround:false, facingRight:true,
    dead:false, deathTimer:0,
    big:false,    // power-up state
    animFrame:0, animTick:0,
  };

  /* ── Keys ── */
  const K = { left:false, right:false, jump:false, jumpPressed:false };

  /* ─────────────────────────────────────────
     LEVELS
  ───────────────────────────────────────── */
  const LEVELS = [
    {
      name:'الحارة القديمة', width:120,
      sky:['#87CEEB','#FED99B'],
      sun:true, night:false,
      platforms:[
        {x:6,y:9,w:4,type:'brick'},
        {x:12,y:7,w:3,type:'stone'},
        {x:18,y:9,w:4,type:'brick'},
        {x:25,y:7,w:3,type:'stone'},
        {x:31,y:8,w:5,type:'brick'},
        {x:40,y:6,w:4,type:'stone'},
        {x:47,y:9,w:4,type:'brick'},
        {x:54,y:6,w:3,type:'stone'},
        {x:61,y:8,w:4,type:'brick'},
        {x:69,y:6,w:3,type:'stone'},
        {x:76,y:8,w:5,type:'brick'},
        {x:85,y:7,w:4,type:'stone'},
        {x:93,y:9,w:5,type:'brick'},
        {x:102,y:7,w:4,type:'stone'},
        {x:110,y:5,w:3,type:'brick'},
      ],
      coins:[
        {x:6,y:8},{x:7,y:8},{x:8,y:8},
        {x:12,y:6},{x:13,y:6},{x:14,y:6},
        {x:18,y:8},{x:19,y:8},
        {x:25,y:6},{x:26,y:6},
        {x:31,y:7},{x:32,y:7},{x:33,y:7},
        {x:40,y:5},{x:41,y:5},{x:42,y:5},
        {x:54,y:5},{x:55,y:5},
        {x:69,y:5},{x:70,y:5},
        {x:85,y:6},{x:86,y:6},{x:87,y:6},
        {x:102,y:6},{x:103,y:6},
        {x:110,y:4},{x:111,y:4},{x:112,y:4},
      ],
      powerUps:[
        {x:20*T, type:'bread'},
        {x:55*T, type:'tea'},
        {x:90*T, type:'bread'},
      ],
      enemies:[
        {x:10*T,spd:1.3,type:'cat'},
        {x:22*T,spd:1.4,type:'cat'},
        {x:35*T,spd:1.6,type:'dog'},
        {x:45*T,spd:1.6,type:'cat'},
        {x:58*T,spd:1.9,type:'dog'},
        {x:72*T,spd:2.0,type:'cat'},
        {x:88*T,spd:2.1,type:'dog'},
        {x:98*T,spd:2.3,type:'cat'},
        {x:108*T,spd:2.3,type:'dog'},
      ],
      goal:116,
    },
    {
      name:'السوق القديم', width:130,
      sky:['#FF7043','#FFB347'],
      sun:false, night:false,
      platforms:[
        {x:5,y:8,w:3,type:'stone'},{x:10,y:6,w:2,type:'brick'},
        {x:14,y:8,w:3,type:'stone'},{x:19,y:6,w:2,type:'brick'},
        {x:23,y:8,w:3,type:'stone'},{x:28,y:5,w:2,type:'brick'},
        {x:32,y:7,w:3,type:'stone'},{x:37,y:9,w:2,type:'brick'},
        {x:41,y:7,w:3,type:'stone'},{x:46,y:5,w:2,type:'brick'},
        {x:50,y:7,w:3,type:'stone'},{x:55,y:9,w:4,type:'brick'},
        {x:62,y:6,w:3,type:'stone'},{x:67,y:8,w:2,type:'brick'},
        {x:71,y:6,w:3,type:'stone'},{x:76,y:8,w:4,type:'brick'},
        {x:83,y:6,w:3,type:'stone'},{x:88,y:8,w:3,type:'brick'},
        {x:93,y:5,w:2,type:'stone'},{x:97,y:7,w:3,type:'brick'},
        {x:102,y:9,w:4,type:'stone'},{x:109,y:7,w:3,type:'brick'},
        {x:116,y:5,w:3,type:'stone'},{x:122,y:7,w:3,type:'brick'},
      ],
      coins:[
        {x:5,y:7},{x:6,y:7},{x:10,y:5},{x:14,y:7},
        {x:19,y:5},{x:28,y:4},{x:29,y:4},{x:37,y:8},
        {x:41,y:6},{x:46,y:4},{x:55,y:8},{x:56,y:8},{x:57,y:8},
        {x:62,y:5},{x:71,y:5},{x:76,y:7},{x:77,y:7},{x:78,y:7},
        {x:83,y:5},{x:93,y:4},{x:102,y:8},{x:103,y:8},
        {x:109,y:6},{x:116,y:4},{x:122,y:6},{x:123,y:6},
      ],
      powerUps:[
        {x:30*T,type:'tea'},
        {x:65*T,type:'bread'},
        {x:100*T,type:'tea'},
      ],
      enemies:[
        {x:8*T,spd:1.6,type:'dog'},{x:16*T,spd:1.7,type:'cat'},
        {x:25*T,spd:1.9,type:'crow'},{x:34*T,spd:1.9,type:'dog'},
        {x:43*T,spd:2.1,type:'cat'},{x:52*T,spd:2.2,type:'crow'},
        {x:65*T,spd:2.3,type:'dog'},{x:73*T,spd:2.4,type:'cat'},
        {x:85*T,spd:2.6,type:'crow'},{x:95*T,spd:2.6,type:'dog'},
        {x:105*T,spd:2.9,type:'cat'},{x:115*T,spd:3.0,type:'crow'},
      ],
      goal:127,
    },
    {
      name:'القصبة المحصنة', width:140,
      sky:['#0d0d2b','#1a1a4a'],
      sun:false, night:true,
      platforms:[
        {x:4,y:8,w:2,type:'stone'},{x:8,y:6,w:2,type:'brick'},
        {x:12,y:8,w:2,type:'stone'},{x:16,y:5,w:2,type:'brick'},
        {x:21,y:7,w:2,type:'stone'},{x:25,y:9,w:2,type:'brick'},
        {x:29,y:6,w:2,type:'stone'},{x:33,y:8,w:2,type:'brick'},
        {x:37,y:5,w:3,type:'stone'},{x:42,y:7,w:2,type:'brick'},
        {x:46,y:9,w:2,type:'stone'},{x:50,y:6,w:2,type:'brick'},
        {x:54,y:4,w:2,type:'stone'},{x:58,y:7,w:2,type:'brick'},
        {x:62,y:9,w:3,type:'stone'},{x:67,y:6,w:2,type:'brick'},
        {x:71,y:8,w:2,type:'stone'},{x:75,y:5,w:3,type:'brick'},
        {x:80,y:7,w:2,type:'stone'},{x:84,y:9,w:2,type:'brick'},
        {x:88,y:6,w:2,type:'stone'},{x:92,y:4,w:2,type:'brick'},
        {x:96,y:7,w:2,type:'stone'},{x:100,y:9,w:3,type:'brick'},
        {x:105,y:6,w:2,type:'stone'},{x:109,y:8,w:2,type:'brick'},
        {x:113,y:5,w:3,type:'stone'},{x:118,y:7,w:3,type:'brick'},
        {x:124,y:4,w:3,type:'stone'},{x:130,y:7,w:3,type:'brick'},
        {x:135,y:9,w:3,type:'stone'},
      ],
      coins:[
        {x:4,y:7},{x:8,y:5},{x:12,y:7},{x:16,y:4},{x:21,y:6},
        {x:29,y:5},{x:37,y:4},{x:38,y:4},{x:46,y:8},{x:50,y:5},
        {x:54,y:3},{x:55,y:3},{x:62,y:8},{x:63,y:8},{x:67,y:5},
        {x:75,y:4},{x:76,y:4},{x:84,y:8},{x:88,y:5},{x:92,y:3},
        {x:93,y:3},{x:100,y:8},{x:105,y:5},{x:113,y:4},{x:114,y:4},
        {x:118,y:6},{x:119,y:6},{x:124,y:3},{x:125,y:3},
        {x:130,y:6},{x:131,y:6},{x:135,y:8},{x:136,y:8},
      ],
      powerUps:[
        {x:40*T,type:'bread'},
        {x:80*T,type:'tea'},
        {x:120*T,type:'bread'},
      ],
      enemies:[
        {x:6*T,spd:2.1,type:'crow'},{x:14*T,spd:2.3,type:'dog'},
        {x:23*T,spd:2.4,type:'cat'},{x:31*T,spd:2.6,type:'crow'},
        {x:40*T,spd:2.7,type:'dog'},{x:48*T,spd:2.8,type:'cat'},
        {x:56*T,spd:3.0,type:'crow'},{x:65*T,spd:3.1,type:'dog'},
        {x:73*T,spd:3.2,type:'cat'},{x:82*T,spd:3.4,type:'crow'},
        {x:90*T,spd:3.5,type:'dog'},{x:98*T,spd:3.6,type:'cat'},
        {x:107*T,spd:3.8,type:'crow'},{x:116*T,spd:3.9,type:'dog'},
        {x:125*T,spd:4.0,type:'cat'},{x:133*T,spd:4.0,type:'crow'},
      ],
      goal:137,
    },
  ];

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    if (initialized) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      state = 'start'; particles = [];
      _resizeCanvas();
      _render();
      return;
    }
    initialized = true;
    canvas = document.getElementById('platformerCanvas');
    ctx    = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    _resizeCanvas();
    window.addEventListener('resize', _resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(_resizeCanvas, 300));

    // Orientation prompt
    _setupOrientationPrompt();
    _setupControls();
    _render();
  }

  function _resizeCanvas() {
    if (!canvas) return;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight - 82;
    } else {
      const w = Math.min(window.innerWidth, 480);
      canvas.width  = w;
      canvas.height = Math.round(w * 0.60);
    }
    ctx.imageSmoothingEnabled = false;
    if (state === 'playing') { /* recalculate cam */ }
    else _render();
  }

  /* ─────────────────────────────────────────
     ORIENTATION PROMPT
  ───────────────────────────────────────── */
  function _setupOrientationPrompt() {
    const prompt = document.getElementById('marioRotatePrompt');
    const skipBtn = document.getElementById('marioRotateSkip');
    if (!prompt) return;

    function check() {
      const portrait = window.innerHeight > window.innerWidth;
      const inMario  = document.getElementById('marioSection').classList.contains('visible');
      if (portrait && inMario && state !== 'start') {
        prompt.classList.add('show');
      } else {
        prompt.classList.remove('show');
      }
    }

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 300));

    if (skipBtn) skipBtn.addEventListener('click', () => prompt.classList.remove('show'));

    // Try to lock landscape
    canvas.addEventListener('click', () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }, {once: true});
  }

  /* ─────────────────────────────────────────
     CONTROLS
  ───────────────────────────────────────── */
  function _setupControls() {
    document.addEventListener('keydown', e => {
      if (['ArrowLeft','a','A'].includes(e.key))  K.left = true;
      if (['ArrowRight','d','D'].includes(e.key)) K.right = true;
      if ([' ','ArrowUp','w','W'].includes(e.key)) {
        e.preventDefault();
        if (!K.jump) { K.jumpPressed = true; }
        K.jump = true;
        _tryJump();
      }
      if (e.key === 'Escape') _togglePause();
    });
    document.addEventListener('keyup', e => {
      if (['ArrowLeft','a','A'].includes(e.key))  K.left  = false;
      if (['ArrowRight','d','D'].includes(e.key)) K.right = false;
      if ([' ','ArrowUp','w','W'].includes(e.key)) { K.jump = false; K.jumpPressed = false; }
    });

    canvas.addEventListener('click', () => {
      if (state === 'start' || state === 'gameover' || state === 'win') _startGame();
    });

    _dpad('p-btn-left',  () => K.left  = true,  () => K.left  = false);
    _dpad('p-btn-right', () => K.right = true,   () => K.right = false);
    _dpad('p-btn-jump',  () => { _tryJump(); K.jump = true; }, () => K.jump = false);

    const pauseBtn = document.getElementById('p-btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', _togglePause);
  }

  function _dpad(id, down, up) {
    const btn = document.getElementById(id);
    if (!btn) return;
    ['touchstart','mousedown'].forEach(ev =>
      btn.addEventListener(ev, e => {
        e.preventDefault(); btn.classList.add('pressed'); down();
      }, {passive:false}));
    ['touchend','mouseup','touchcancel','mouseleave'].forEach(ev =>
      btn.addEventListener(ev, e => {
        e.preventDefault(); btn.classList.remove('pressed'); up();
      }, {passive:false}));
  }

  function _togglePause() {
    if (state === 'playing') { state = 'paused'; cancelAnimationFrame(raf); _render(); }
    else if (state === 'paused') { state = 'playing'; _loop(); }
  }

  /* ─────────────────────────────────────────
     GAME FLOW
  ───────────────────────────────────────── */
  function _startGame() {
    score = 0; lives = 3; coinCount = 0; level = 0; particles = [];
    _loadLevel(0);
  }

  function _loadLevel(lvl) {
    level = lvl; levelData = LEVELS[lvl];
    const H = canvas.height;
    const groundY = H - T;

    currentCoins   = levelData.coins.map(c => ({ x:c.x*T, y:c.y*T, collected:false, bobOff: Math.random()*Math.PI*2 }));
    currentEnemies = levelData.enemies.map(e => ({
      x:e.x, y:groundY - 28, vx:0, vy:0, w:28, h:26,
      dir: Math.random()>.5 ? 1 : -1,
      spd:e.spd, type:e.type,
      onGround:false, alive:true,
      stomped:false, stompTimer:0, animTick:0,
    }));
    powerUps = levelData.powerUps.map(p => ({ x:p.x, y:groundY - T*3, type:p.type, collected:false, bobOff:Math.random()*Math.PI*2 }));

    P.x=52; P.y=groundY-P.h-T; P.vx=0; P.vy=0;
    P.onGround=false; P.facingRight=true;
    P.dead=false; P.deathTimer=0; P.animFrame=0; P.animTick=0;
    P.big = false;
    camX=0; camY=0; invincible=0; frameCount=0; screenShake=0;
    state='playing';
    if (raf) cancelAnimationFrame(raf);
    _loop();
  }

  function _tryJump() {
    if (state==='start'||state==='gameover'||state==='win') { _startGame(); return; }
    if (state!=='playing') return;
    if (P.onGround && !P.dead) {
      P.vy = P.big ? JUMP_V * 1.05 : JUMP_V;
      P.onGround = false;
      AUDIO.playTick();
      _spawnParticles(P.x + P.w/2, P.y + P.h, '#aaddff', 6, 'dust');
    }
  }

  /* ─────────────────────────────────────────
     MAIN LOOP
  ───────────────────────────────────────── */
  function _loop() {
    _update();
    _render();
    if (state === 'playing') raf = requestAnimationFrame(_loop);
  }

  /* ─────────────────────────────────────────
     UPDATE
  ───────────────────────────────────────── */
  function _update() {
    frameCount++;
    if (invincible > 0) invincible--;
    if (screenShake > 0) screenShake -= 0.6;
    const H = canvas.height;
    const groundY = H - T;

    // ── Player movement ──
    if (!P.dead) {
      P.animTick++;
      if (K.left)  { P.vx = -RUN_SPD; P.facingRight = false; }
      else if (K.right) { P.vx = RUN_SPD; P.facingRight = true; }
      else P.vx *= FRICTION;

      // Variable jump height
      if (!K.jump && P.vy < -4) P.vy = -4;

      P.vy += GRAVITY;
      P.x += P.vx;
      P.x = Math.max(0, P.x);
      _collideX(P);

      P.y += P.vy;
      P.onGround = false;
      _collideY(P);

      if (P.y + P.h >= groundY) { P.y = groundY - P.h; P.vy = 0; P.onGround = true; }
      if (P.y > H + 80) _playerDie();

      // Camera (smooth)
      const targetCam = P.x - canvas.width * 0.32;
      camX += (Math.max(0, Math.min(targetCam, levelData.width*T - canvas.width)) - camX) * 0.12;

    } else {
      P.deathTimer++;
      if (P.deathTimer === 1) P.vy = -11;
      P.vy += GRAVITY * 0.7;
      P.y += P.vy;
      if (P.deathTimer > 90) {
        lives--;
        if (lives <= 0) { state = 'gameover'; return; }
        _loadLevel(level);
        return;
      }
    }

    // ── Enemies ──
    for (const e of currentEnemies) {
      if (!e.alive) continue;
      e.animTick++;

      if (e.stomped) {
        e.stompTimer++;
        if (e.stompTimer > 30) e.alive = false;
        continue;
      }

      e.vy += GRAVITY;
      e.y  += e.vy;
      if (e.y + e.h >= groundY) { e.y = groundY - e.h; e.vy = 0; e.onGround = true; }

      for (const p of levelData.platforms) {
        const px=p.x*T, py=p.y*T, pw=p.w*T;
        if (e.x+e.w>px+2 && e.x<px+pw-2) {
          if (e.y+e.h>py && e.y+e.h<py+T+8 && e.vy>=0) { e.y=py-e.h; e.vy=0; e.onGround=true; }
        }
      }

      e.x += e.dir * e.spd;
      // Edge turn
      let supported = false;
      for (const p of levelData.platforms) {
        const px=p.x*T, py=p.y*T, pw=p.w*T;
        if (Math.abs(e.y+e.h-py)<6 && e.x+e.w>px && e.x<px+pw) { supported=true; break; }
      }
      if (e.y+e.h>=groundY-2) supported=true;
      if (supported) {
        // Check edge
        for (const p of levelData.platforms) {
          const px=p.x*T, pw=p.w*T;
          if (Math.abs(e.y+e.h-(p.y*T))<6 && e.x+e.w>px && e.x<px+pw) {
            if (e.dir>0 && e.x+e.w+4>=px+pw) { e.dir=-1; break; }
            if (e.dir<0 && e.x-4<=px)         { e.dir= 1; break; }
          }
        }
      }
      if (e.x < 2)                          { e.x=2; e.dir=1; }
      if (e.x+e.w > levelData.width*T-2)    { e.x=levelData.width*T-e.w-2; e.dir=-1; }

      // Crow hovers
      if (e.type==='crow') {
        e.y = groundY - e.h - 30 - Math.sin(frameCount*0.03 + e.x*0.01)*18;
        e.vy = 0;
      }

      // Player hit
      if (!P.dead && invincible===0 && _overlap(P,e)) {
        if (P.vy>0.5 && P.y+P.h < e.y+e.h*0.5) {
          e.stomped=true; e.stompTimer=0;
          P.vy = -9;
          score += 150;
          screenShake = 4;
          AUDIO.playWin();
          _spawnParticles(e.x+e.w/2, e.y, '#FFD700', 10, 'star');
        } else {
          invincible = 110;
          screenShake = 8;
          lives--;
          AUDIO.playTick();
          if (lives<=0) { _playerDie(); }
        }
      }
    }

    // ── Coins ──
    for (const c of currentCoins) {
      if (c.collected) continue;
      if (_overlap(P, {x:c.x+T*0.2,y:c.y,w:T*0.55,h:T*0.55})) {
        c.collected=true; coinCount++; score+=10;
        AUDIO.playTick();
        _spawnParticles(c.x+T*0.4, c.y, '#F5C842', 8, 'coin');
      }
    }

    // ── Power-ups ──
    for (const pu of powerUps) {
      if (pu.collected) continue;
      if (_overlap(P, {x:pu.x,y:pu.y,w:T*0.8,h:T*0.8})) {
        pu.collected=true;
        if (pu.type==='bread') { P.big=true; score+=200; }
        else if (pu.type==='tea') { lives=Math.min(lives+1,5); score+=300; }
        AUDIO.playWin();
        _spawnParticles(pu.x+T*0.4, pu.y, pu.type==='bread'?'#D4A017':'#5DADE2', 12, 'star');
      }
    }

    // ── Particles ──
    for (let i=particles.length-1; i>=0; i--) {
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.25;
      p.life--;
      if (p.life<=0) particles.splice(i,1);
    }

    // ── Goal ──
    const gx = levelData.goal * T;
    if (!P.dead && P.x+P.w>gx && P.x<gx+T*2.5) {
      score += 500 + coinCount*5;
      state  = 'levelcomplete';
      AUDIO.playWin();
      setTimeout(() => {
        if (level+1 < LEVELS.length) _loadLevel(level+1);
        else { state='win'; _render(); }
      }, 2400);
    }
  }

  function _playerDie() { P.dead=true; P.vy=-11; P.deathTimer=0; screenShake=12; }

  /* ─────────────────────────────────────────
     COLLISION
  ───────────────────────────────────────── */
  function _collideX(obj) {
    for (const p of levelData.platforms) {
      const px=p.x*T,py=p.y*T,pw=p.w*T;
      if (obj.x+obj.w>px && obj.x<px+pw && obj.y+obj.h>py+5 && obj.y<py+T-5) {
        if (obj.vx>0) obj.x=px-obj.w; else obj.x=px+pw; obj.vx=0;
      }
    }
  }
  function _collideY(obj) {
    for (const p of levelData.platforms) {
      const px=p.x*T,py=p.y*T,pw=p.w*T;
      if (obj.x+obj.w>px+3 && obj.x<px+pw-3) {
        if (obj.y+obj.h>py && obj.y+obj.h<py+T*0.65 && obj.vy>=0) {
          obj.y=py-obj.h; obj.vy=0; obj.onGround=true;
        } else if (obj.y<py+T && obj.y>py+T*0.55 && obj.vy<0) {
          obj.y=py+T; obj.vy=0;
        }
      }
    }
  }
  function _overlap(a,b) {
    return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
  }

  /* ─────────────────────────────────────────
     PARTICLES
  ───────────────────────────────────────── */
  function _spawnParticles(x, y, color, n, type) {
    for (let i=0; i<n; i++) {
      const a = (Math.PI*2/n)*i + Math.random()*0.5;
      const spd = type==='dust' ? 1.5 : type==='coin' ? 3.5 : 4;
      particles.push({
        x, y,
        vx: Math.cos(a)*spd*(0.6+Math.random()*0.8),
        vy: Math.sin(a)*spd*(0.6+Math.random()*0.8) - (type==='coin'?2:0),
        color,
        life: type==='dust' ? 18 : 28,
        maxLife: type==='dust' ? 18 : 28,
        size: type==='dust' ? 3 : 4,
        type,
      });
    }
  }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  function _render() {
    if (!ctx||!canvas) return;
    const W=canvas.width, H=canvas.height;

    // Screen shake offset
    const shk = screenShake>0 ? (Math.random()-0.5)*screenShake : 0;
    ctx.clearRect(0,0,W,H);

    // Sky
    if (levelData) {
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0, levelData.sky[0]);
      bg.addColorStop(1, levelData.sky[1]);
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      if (levelData.night) _drawStars(W,H);
      if (levelData.sun)   _drawSun(W,H);
      _drawClouds(W,H);
      _drawBackgroundBuildings(W,H);
    } else {
      ctx.fillStyle='#87CEEB'; ctx.fillRect(0,0,W,H);
    }

    if (!levelData) { _drawStartScreen(W,H); return; }

    ctx.save();
    ctx.translate(-camX + shk, shk*0.5);

    _drawGround(H);
    for (const p of levelData.platforms) _drawPlatform(p.x*T, p.y*T, p.w*T, p.type, H);
    for (const pu of powerUps)           { if (!pu.collected) _drawPowerUp(pu); }
    for (const c of currentCoins)        { if (!c.collected)  _drawCoin(c.x, c.y, c.bobOff); }
    _drawGoal(levelData.goal*T, H);
    for (const e of currentEnemies)      { if (e.alive) _drawEnemy(e); }

    // Particles
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type==='star') {
        ctx.font=`${p.size+4}px serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('★', p.x, p.y);
      } else {
        ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
      }
      ctx.globalAlpha=1;
    }

    // Player
    if (!P.dead || P.deathTimer%8<5) {
      const blink = invincible>0 && Math.floor(invincible/5)%2===1;
      if (!blink) _drawPlayer();
    }

    ctx.restore();
    _drawHUD(W,H);

    if (state==='start')         _drawStartScreen(W,H);
    if (state==='paused')        _drawPauseOverlay(W,H);
    if (state==='gameover')      _drawEndScreen(W,H,false);
    if (state==='win')           _drawEndScreen(W,H,true);
    if (state==='levelcomplete') _drawLevelComplete(W,H);
  }

  /* ─────────────────────────────────────────
     DRAW HELPERS
  ───────────────────────────────────────── */
  function _drawStars(W,H) {
    ctx.fillStyle='rgba(255,255,255,0.85)';
    const stars=[[50,20],[120,35],[200,15],[280,40],[350,22],[420,38],
                 [80,55],[160,45],[240,60],[320,30],[390,52],[460,18],
                 [30,70],[110,65],[190,80],[270,50],[340,75],[410,62]];
    for (const [x,y] of stars) {
      const twinkle = 0.5 + 0.5*Math.sin(frameCount*0.05+x*0.1);
      ctx.globalAlpha = twinkle*0.9;
      ctx.fillRect(x,y,1+(twinkle>0.8?1:0),1+(twinkle>0.8?1:0));
    }
    ctx.globalAlpha=1;
  }

  function _drawSun(W,H) {
    const sx=W*0.82, sy=H*0.18, sr=28;
    // Glow
    const g = ctx.createRadialGradient(sx,sy,0,sx,sy,sr*2.5);
    g.addColorStop(0,'rgba(255,240,100,0.4)');
    g.addColorStop(1,'rgba(255,200,50,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,sr*2.5,0,Math.PI*2); ctx.fill();
    // Sun body
    ctx.fillStyle='#FDE047';
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FBBF24';
    ctx.beginPath(); ctx.arc(sx,sy,sr*0.7,0,Math.PI*2); ctx.fill();
  }

  function _drawClouds(W,H) {
    ctx.fillStyle='rgba(255,255,255,0.75)';
    const clouds=[[80,35,1],[210,25,0.8],[340,40,1.1],[480,28,0.9],[600,38,1]];
    const scroll = camX*0.18;
    for (const [cx,cy,scale] of clouds) {
      const x = ((cx - scroll*0.3) % (W+120)) - 60;
      ctx.save(); ctx.translate(x,cy); ctx.scale(scale,scale);
      ctx.beginPath();
      ctx.arc(0,0,18,0,Math.PI*2);
      ctx.arc(22,0,22,0,Math.PI*2);
      ctx.arc(44,0,18,0,Math.PI*2);
      ctx.arc(11,-12,14,0,Math.PI*2);
      ctx.arc(33,-12,14,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function _drawBackgroundBuildings(W,H) {
    const groundY = H - T;
    const scroll  = camX * 0.3;
    const totalW  = 900;
    const bldgs = [
      {x:0,   w:55, h:80,  dome:true,  windows:2},
      {x:90,  w:40, h:55,  dome:false, windows:2},
      {x:160, w:65, h:100, dome:true,  windows:3},
      {x:260, w:45, h:70,  dome:false, windows:2},
      {x:340, w:70, h:90,  dome:true,  windows:3},
      {x:450, w:50, h:65,  dome:false, windows:2},
      {x:540, w:60, h:105, dome:true,  windows:3},
      {x:650, w:55, h:80,  dome:false, windows:2},
      {x:740, w:75, h:95,  dome:true,  windows:3},
      {x:850, w:45, h:60,  dome:false, windows:2},
    ];

    for (const b of bldgs) {
      let bx = ((b.x - scroll%totalW + totalW*10) % totalW) - b.w;
      const by = groundY - b.h;

      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.12)';
      ctx.fillRect(bx+4, by+4, b.w, b.h);

      // Wall
      const wg = ctx.createLinearGradient(bx,by,bx+b.w,by);
      wg.addColorStop(0,'rgba(180,130,80,0.35)');
      wg.addColorStop(1,'rgba(150,100,55,0.25)');
      ctx.fillStyle=wg;
      ctx.fillRect(bx, by, b.w, b.h);

      // Dome
      if (b.dome) {
        ctx.fillStyle='rgba(100,160,180,0.4)';
        ctx.beginPath();
        ctx.arc(bx+b.w/2, by, b.w*0.38, Math.PI, 0);
        ctx.fill();
        // Dome tip
        ctx.fillStyle='rgba(245,200,66,0.6)';
        ctx.beginPath();
        ctx.moveTo(bx+b.w/2-3, by);
        ctx.lineTo(bx+b.w/2+3, by);
        ctx.lineTo(bx+b.w/2, by-14);
        ctx.fill();
      } else {
        // Battlements
        ctx.fillStyle='rgba(160,110,60,0.35)';
        for (let i=0; i<4; i++) ctx.fillRect(bx+i*(b.w/4), by-6, b.w/5, 6);
      }

      // Arched door
      ctx.fillStyle='rgba(60,30,10,0.5)';
      const ax=bx+b.w/2-7, ah=20;
      ctx.fillRect(ax, groundY-ah, 14, ah);
      ctx.beginPath(); ctx.arc(bx+b.w/2, groundY-ah, 7, Math.PI, 0); ctx.fill();

      // Windows
      for (let ww=0; ww<b.windows; ww++) {
        const wx = bx + (ww+1)*(b.w/(b.windows+1)) - 5;
        for (let row=0; row<2; row++) {
          const wy = by + 10 + row*22;
          ctx.fillStyle='rgba(255,240,150,0.3)';
          ctx.fillRect(wx, wy, 10, 12);
          ctx.beginPath();
          ctx.arc(wx+5, wy, 5, Math.PI, 0);
          ctx.fill();
          // Window glow
          ctx.fillStyle='rgba(255,220,80,0.15)';
          ctx.fillRect(wx-2,wy-2,14,16);
        }
      }
    }
  }

  function _drawGround(H) {
    const lw=levelData.width*T, groundY=H-T;
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.fillRect(0, groundY+T-4, lw, 4);
    // Main
    const gg = ctx.createLinearGradient(0,groundY,0,groundY+T);
    gg.addColorStop(0,'#C8A060'); gg.addColorStop(0.3,'#B8904A'); gg.addColorStop(1,'#9A7530');
    ctx.fillStyle=gg; ctx.fillRect(0,groundY,lw,T);
    // Top shine
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(0,groundY,lw,3);
    // Tile pattern
    ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1;
    for (let x=0; x<lw; x+=T) { ctx.beginPath(); ctx.moveTo(x,groundY); ctx.lineTo(x,groundY+T); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0,groundY+T/2); ctx.lineTo(lw,groundY+T/2); ctx.stroke();
    // Grass top
    ctx.fillStyle='#5A8C3C';
    for (let x=0; x<lw; x+=8) {
      const h2 = 3+Math.sin(x*0.3+frameCount*0.02)*1.5;
      ctx.fillRect(x, groundY-h2, 5, h2+2);
    }
  }

  function _drawPlatform(x, y, w, type, H) {
    if (type==='brick') {
      const pg=ctx.createLinearGradient(x,y,x,y+T);
      pg.addColorStop(0,'#D4794F'); pg.addColorStop(1,'#A8502A');
      ctx.fillStyle=pg; ctx.fillRect(x,y,w,T);
      // Mortar lines
      ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=2;
      for (let bx=x; bx<x+w; bx+=T) { ctx.beginPath(); ctx.moveTo(bx,y+5); ctx.lineTo(bx,y+T-4); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x,y+T/2); ctx.lineTo(x+w,y+T/2); ctx.stroke();
      // Shine
      ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(x,y,w,4);
      ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(x,y+T-3,w,3);
    } else {
      const sg=ctx.createLinearGradient(x,y,x,y+T);
      sg.addColorStop(0,'#8DB0C8'); sg.addColorStop(1,'#5A7890');
      ctx.fillStyle=sg; ctx.fillRect(x,y,w,T);
      ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1.5;
      ctx.strokeRect(x,y,w,T);
      // Cracks
      ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x+T*0.3,y+4); ctx.lineTo(x+T*0.5,y+T-4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+T*0.8,y+2); ctx.lineTo(x+T*0.65,y+T-2); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(x,y,w,3);
    }
    // Grass on top
    ctx.fillStyle='#4A7C30';
    for (let gx=x; gx<x+w; gx+=7) {
      const gh=2+Math.sin(gx*0.4)*1;
      ctx.fillRect(gx,y-gh,4,gh+1);
    }
  }

  function _drawCoin(cx, cy, off) {
    const bob=Math.sin(frameCount*0.1+off)*3;
    const x=cx+T*0.25, y=cy+T*0.1+bob;
    const r=T*0.22;
    // Glow
    const cg=ctx.createRadialGradient(x,y,0,x,y,r*2);
    cg.addColorStop(0,'rgba(245,200,66,0.3)'); cg.addColorStop(1,'rgba(245,200,66,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(x,y,r*2,0,Math.PI*2); ctx.fill();
    // Coin
    ctx.fillStyle='#F5C842';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFE066';
    ctx.beginPath(); ctx.arc(x-r*0.2,y-r*0.2,r*0.45,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#C8980A';
    ctx.font=`bold ${Math.round(r*1.05)}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('د',x,y+1);
  }

  function _drawPowerUp(pu) {
    const bob=Math.sin(frameCount*0.08+pu.bobOff)*4;
    const x=pu.x, y=pu.y+bob;
    const s=T*0.72;
    // Glow
    ctx.fillStyle=pu.type==='bread'?'rgba(212,160,23,0.3)':'rgba(93,173,226,0.3)';
    ctx.beginPath(); ctx.arc(x+s/2,y+s/2,s*0.8,0,Math.PI*2); ctx.fill();

    if (pu.type==='bread') {
      // Bread loaf 🍞
      ctx.fillStyle='#D4A017';
      ctx.beginPath(); ctx.roundRect(x+2,y+8,s-4,s-8,6); ctx.fill();
      ctx.fillStyle='#E8B828';
      ctx.beginPath(); ctx.ellipse(x+s/2,y+8,s/2-2,10,0,Math.PI,0); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.fillRect(x+6,y+12,4,8);
    } else {
      // Tea glass ☕
      ctx.fillStyle='#5DADE2';
      ctx.fillRect(x+4,y+4,s-8,s-4);
      ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.fillRect(x+4,y+4,s-8,4);
      ctx.fillStyle='#3A8FBF';
      ctx.fillRect(x+2,y+4,2,s-4);
      ctx.fillRect(x+s-4,y+4,2,s-4);
      ctx.fillStyle='#F5C842';
      ctx.fillRect(x+s-4,y+10,8,6);
    }
    // Label
    ctx.fillStyle='#FFF';
    ctx.font=`bold ${Math.round(s*0.38)}px Cairo,Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pu.type==='bread'?'+💪':'+❤️', x+s/2, y+s*1.2);
  }

  function _drawGoal(x, H) {
    const base=H-T;
    // Pole shadow
    ctx.fillStyle='rgba(0,0,0,0.2)';
    ctx.fillRect(x+T+2,base-T*6,4,T*6);
    // Pole
    const pg=ctx.createLinearGradient(x+T-2,0,x+T+4,0);
    pg.addColorStop(0,'#AAA'); pg.addColorStop(1,'#EEE');
    ctx.fillStyle=pg; ctx.fillRect(x+T-2,base-T*6,4,T*6);
    // Flag
    const fg=ctx.createLinearGradient(x+T+2,base-T*6,x+T*2.5,base-T*4.5);
    fg.addColorStop(0,'#E63946'); fg.addColorStop(1,'#C0392B');
    ctx.fillStyle=fg;
    ctx.beginPath();
    ctx.moveTo(x+T+2, base-T*6);
    ctx.lineTo(x+T*2.6,base-T*5.1);
    ctx.lineTo(x+T+2, base-T*4.2);
    ctx.fill();
    // Star on flag
    ctx.fillStyle='#FFF';
    ctx.font=`${Math.round(T*0.5)}px serif`;
    ctx.textAlign='center';
    ctx.fillText('⭐',x+T*1.75,base-T*5.1+5);
    // Base
    ctx.fillStyle='#8B7355';
    ctx.beginPath(); ctx.roundRect(x+T-12,base-T,24,T,4); ctx.fill();
    // Glow
    const gg=ctx.createRadialGradient(x+T,base-T*3,0,x+T,base-T*3,T*1.5);
    gg.addColorStop(0,'rgba(230,57,70,0.15)'); gg.addColorStop(1,'rgba(230,57,70,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(x+T,base-T*3,T*1.5,0,Math.PI*2); ctx.fill();
  }

  function _drawEnemy(e) {
    const x=e.x, y=e.y, t=e.animTick;
    ctx.save();
    if (e.stomped) {
      ctx.globalAlpha=Math.max(0,1-e.stompTimer/30);
      ctx.translate(x+e.w/2,y+e.h);
      ctx.scale(1+e.stompTimer*0.04, Math.max(0.05,0.35-e.stompTimer*0.01));
      ctx.translate(-e.w/2,-e.h);
    } else if (e.dir < 0) {
      ctx.translate(x+e.w,0); ctx.scale(-1,1); ctx.translate(-x,0);
    }

    if (e.type==='cat') {
      _drawCat(x,y,e.w,e.h,t);
    } else if (e.type==='dog') {
      _drawDog(x,y,e.w,e.h,t);
    } else if (e.type==='crow') {
      _drawCrow(x,y,e.w,e.h,t);
    }
    ctx.restore();
  }

  function _drawCat(x,y,w,h,t) {
    const leg = Math.floor(t/6)%2;
    // Tail
    ctx.strokeStyle='#F4A460'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x+3,y+h-3);
    ctx.bezierCurveTo(x-10,y+h-6,x-12,y+h-16,x-6,y+h-20);
    ctx.stroke();
    // Body
    ctx.fillStyle='#F4A460';
    ctx.beginPath(); ctx.roundRect(x+3,y+8,w-6,h-10,4); ctx.fill();
    // Head
    ctx.fillStyle='#F4A460';
    ctx.beginPath(); ctx.ellipse(x+w/2,y+5,w/2-2,7,0,0,Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle='#E8905A';
    ctx.beginPath(); ctx.moveTo(x+5,y+1); ctx.lineTo(x+3,y-6); ctx.lineTo(x+10,y+1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+w-5,y+1); ctx.lineTo(x+w-3,y-6); ctx.lineTo(x+w-10,y+1); ctx.fill();
    ctx.fillStyle='#FFB08A';
    ctx.beginPath(); ctx.moveTo(x+6,y+1); ctx.lineTo(x+5,y-3); ctx.lineTo(x+9,y+1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+w-6,y+1); ctx.lineTo(x+w-5,y-3); ctx.lineTo(x+w-9,y+1); ctx.fill();
    // Eyes
    ctx.fillStyle='#2ECC71';
    ctx.beginPath(); ctx.ellipse(x+7,y+4,2,2.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w-7,y+4,2,2.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111';
    ctx.fillRect(x+6,y+3,2,3); ctx.fillRect(x+w-8,y+3,2,3);
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.fillRect(x+7,y+3,1,1); ctx.fillRect(x+w-7,y+3,1,1);
    // Nose
    ctx.fillStyle='#FF8888'; ctx.fillRect(x+w/2-1,y+7,3,2);
    // Whiskers
    ctx.strokeStyle='rgba(150,150,150,0.6)'; ctx.lineWidth=0.8;
    [[x+5,y+8,x-6,y+7],[x+5,y+9,x-6,y+10],
     [x+w-5,y+8,x+w+6,y+7],[x+w-5,y+9,x+w+6,y+10]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    // Legs
    ctx.fillStyle='#E8905A';
    if (leg===0) { ctx.fillRect(x+4,y+h-6,5,6); ctx.fillRect(x+w-9,y+h-8,5,8); }
    else         { ctx.fillRect(x+4,y+h-8,5,8); ctx.fillRect(x+w-9,y+h-6,5,6); }
  }

  function _drawDog(x,y,w,h,t) {
    const leg = Math.floor(t/5)%2;
    // Tail (wagging)
    const tailAngle = Math.sin(t*0.2)*0.6;
    ctx.save();
    ctx.translate(x+4,y+h-8);
    ctx.rotate(tailAngle);
    ctx.fillStyle='#C8A060';
    ctx.beginPath(); ctx.ellipse(0,-8,3,9,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Body
    ctx.fillStyle='#D4A86A';
    ctx.beginPath(); ctx.roundRect(x+2,y+9,w-4,h-11,5); ctx.fill();
    // Snout
    ctx.fillStyle='#C89050';
    ctx.beginPath(); ctx.ellipse(x+w-3,y+8,6,5,0,0,Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle='#D4A86A';
    ctx.beginPath(); ctx.ellipse(x+w/2+2,y+5,w/2-1,7,0,0,Math.PI*2); ctx.fill();
    // Floppy ears
    ctx.fillStyle='#B8904A';
    ctx.beginPath(); ctx.ellipse(x+5,y+7,5,9,-0.4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w-3,y+7,5,9,0.4,0,Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle='#3D1C00';
    ctx.beginPath(); ctx.arc(x+w/2-1,y+4,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x+w/2,y+3,1,0,Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.ellipse(x+w-2,y+7,3,2,0,0,Math.PI*2); ctx.fill();
    // Collar
    ctx.fillStyle='#E63946'; ctx.fillRect(x+4,y+h-h*0.55,w-8,4);
    ctx.fillStyle='#FFD700'; ctx.fillRect(x+w/2-2,y+h-h*0.55,4,4);
    // Legs
    ctx.fillStyle='#C89050';
    if (leg===0) { ctx.fillRect(x+3,y+h-7,5,7); ctx.fillRect(x+w-8,y+h-9,5,9); }
    else         { ctx.fillRect(x+3,y+h-9,5,9); ctx.fillRect(x+w-8,y+h-7,5,7); }
  }

  function _drawCrow(x,y,w,h,t) {
    const flap = Math.sin(t*0.25)*6;
    // Wings
    ctx.fillStyle='#1A1A1A';
    ctx.beginPath();
    ctx.ellipse(x+w/2-8, y+h/2-3, 14, 5+Math.abs(flap*0.3), -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x+w/2+8, y+h/2-3, 14, 5+Math.abs(flap*0.3), 0.3, 0, Math.PI*2); ctx.fill();
    // Body
    ctx.fillStyle='#222';
    ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2+2,w/2-3,h/2-3,0,0,Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle='#1A1A1A';
    ctx.beginPath(); ctx.arc(x+w/2+4,y+h/2-5,7,0,Math.PI*2); ctx.fill();
    // Beak
    ctx.fillStyle='#888';
    ctx.beginPath();
    ctx.moveTo(x+w/2+11,y+h/2-5);
    ctx.lineTo(x+w/2+18,y+h/2-4);
    ctx.lineTo(x+w/2+11,y+h/2-2);
    ctx.fill();
    // Eye
    ctx.fillStyle='#E63946';
    ctx.beginPath(); ctx.arc(x+w/2+7,y+h/2-7,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(x+w/2+8,y+h/2-7,1,0,Math.PI*2); ctx.fill();
    // Shimmer
    ctx.fillStyle='rgba(100,100,200,0.2)';
    ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2,6,4,0.3,0,Math.PI*2); ctx.fill();
  }

  /* ─────────────────────────────────────────
     PLAYER DRAWING — ولد الحارة
  ───────────────────────────────────────── */
  function _drawPlayer() {
    const x=P.x, y=P.y;
    const t=P.animTick;
    const run=P.onGround && (Math.abs(P.vx)>0.5);
    const jump=!P.onGround;
    const leg=Math.floor(t/5)%2;
    const big=P.big;

    ctx.save();
    if (!P.facingRight) { ctx.translate(x+P.w,0); ctx.scale(-1,1); ctx.translate(-x,0); }

    const sy = big ? y-4 : y;
    const scale = big ? 1.15 : 1.0;
    ctx.translate(x+P.w/2, sy+P.h/2);
    ctx.scale(scale, scale);
    ctx.translate(-P.w/2, -P.h/2);
    const px=0, py=0;

    // === Shoes ===
    ctx.fillStyle='#1A0A00';
    const shoe1y = jump ? py+25 : (run&&leg?py+27:py+25);
    const shoe2y = jump ? py+25 : (run&&leg?py+25:py+27);
    ctx.beginPath(); ctx.roundRect(px,   shoe1y, 10, 4, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(px+P.w-10, shoe2y, 10, 4, 2); ctx.fill();

    // === Pants ===
    ctx.fillStyle='#1D3557';
    if (run) {
      ctx.fillRect(px+3, py+17, 7, leg?9:7);
      ctx.fillRect(px+P.w-10, py+17, 7, leg?7:9);
    } else if (jump) {
      ctx.fillRect(px+3, py+17, 7, 7);
      ctx.fillRect(px+P.w-10, py+17, 7, 7);
    } else {
      ctx.fillRect(px+3, py+17, 7, 8);
      ctx.fillRect(px+P.w-10, py+17, 7, 8);
    }

    // === Belt ===
    ctx.fillStyle='#2C1503'; ctx.fillRect(px+3,py+16,P.w-6,3);
    const bg2=ctx.createLinearGradient(px+P.w/2-4,py+15,px+P.w/2+4,py+19);
    bg2.addColorStop(0,'#F5C842'); bg2.addColorStop(1,'#C8980A');
    ctx.fillStyle=bg2; ctx.beginPath(); ctx.roundRect(px+P.w/2-3,py+15,6,5,1); ctx.fill();

    // === Shirt ===
    const sc=ctx.createLinearGradient(px+3,py+9,px+3+P.w-6,py+9);
    sc.addColorStop(0,'#E63946'); sc.addColorStop(0.5,'#FF6B6B'); sc.addColorStop(1,'#E63946');
    ctx.fillStyle=sc; ctx.beginPath(); ctx.roundRect(px+3,py+9,P.w-6,8,2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(px+3,py+9,P.w-6,2);
    // Buttons
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(px+P.w/2,py+11,1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+P.w/2,py+14,1,0,Math.PI*2); ctx.fill();

    // === Arms ===
    ctx.fillStyle='#E63946';
    if (jump) {
      ctx.fillRect(px-1,py+10,3,7); ctx.fillRect(px+P.w-2,py+10,3,7);
    } else if (run) {
      ctx.fillRect(px-1, py+(leg?8:10), 3, 7);
      ctx.fillRect(px+P.w-2, py+(leg?10:8), 3, 7);
    } else {
      ctx.fillRect(px-1,py+10,3,7); ctx.fillRect(px+P.w-2,py+10,3,7);
    }
    // Hands
    ctx.fillStyle='#FFCBA4';
    ctx.beginPath(); ctx.arc(px,    py+17,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+P.w,py+17,3,0,Math.PI*2); ctx.fill();

    // === Collar ===
    ctx.fillStyle='#FFF';
    ctx.fillRect(px+5,py+9,4,4); ctx.fillRect(px+P.w-9,py+9,4,4);

    // === Head ===
    const hg=ctx.createLinearGradient(px+3,py,px+3,py+11);
    hg.addColorStop(0,'#FFCBA4'); hg.addColorStop(1,'#FFB88A');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.roundRect(px+3,py+1,P.w-6,10,3); ctx.fill();
    ctx.fillStyle='#FFB88A'; ctx.beginPath(); ctx.roundRect(px+5,py+10,P.w-10,2,1); ctx.fill();

    // === Hair ===
    ctx.fillStyle='#2C1503'; ctx.beginPath(); ctx.roundRect(px+3,py-1,P.w-6,5,2); ctx.fill();
    ctx.fillStyle='#2C1503'; ctx.beginPath(); ctx.roundRect(px+2,py+1,3,3,1); ctx.fill();
    ctx.fillStyle='#2C1503'; ctx.beginPath(); ctx.roundRect(px+P.w-5,py+1,3,3,1); ctx.fill();
    // Hair tuft
    ctx.fillStyle='#4A2808';
    ctx.beginPath(); ctx.moveTo(px+P.w/2-2,py-1); ctx.lineTo(px+P.w/2,py-5); ctx.lineTo(px+P.w/2+2,py-1); ctx.fill();
    ctx.fillStyle='#5C3410'; ctx.fillRect(px+7,py-1,5,2);

    // === Eyes ===
    ctx.fillStyle='#FFF';
    ctx.beginPath(); ctx.ellipse(px+6, py+4, 2.5, 2.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px+P.w-6, py+4, 2.5, 2.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#2C0A00';
    ctx.beginPath(); ctx.arc(px+6, py+4.5, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+P.w-6, py+4.5, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(px+6.5, py+3.5, 0.7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+P.w-5.5, py+3.5, 0.7, 0, Math.PI*2); ctx.fill();
    // Eyebrows (expressive)
    ctx.strokeStyle='#2C1503'; ctx.lineWidth=1.5;
    if (jump) {
      ctx.beginPath(); ctx.moveTo(px+4,py+2); ctx.lineTo(px+8,py+1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px+P.w-4,py+2); ctx.lineTo(px+P.w-8,py+1); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(px+4,py+2); ctx.lineTo(px+8,py+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px+P.w-4,py+2); ctx.lineTo(px+P.w-8,py+2); ctx.stroke();
    }

    // === Nose ===
    ctx.fillStyle='#FFAB8A'; ctx.fillRect(px+P.w/2-1,py+7,3,2);

    // === Mouth (smile/serious) ===
    ctx.fillStyle='#C06040';
    if (jump) { ctx.beginPath(); ctx.arc(px+P.w/2,py+10,2,0,Math.PI); ctx.fill(); }
    else { ctx.fillRect(px+6,py+9,2,1); ctx.fillRect(px+P.w-8,py+9,2,1); ctx.fillRect(px+7,py+10,P.w-14,1); }

    // Big mode crown effect
    if (big) {
      ctx.fillStyle='#F5C842';
      ctx.font=`10px serif`;
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText('👑',px+P.w/2,py-2);
    }

    ctx.restore();
  }

  /* ─────────────────────────────────────────
     HUD
  ───────────────────────────────────────── */
  function _drawHUD(W,H) {
    // HUD background
    const hg=ctx.createLinearGradient(0,0,0,36);
    hg.addColorStop(0,'rgba(0,0,0,0.7)'); hg.addColorStop(1,'rgba(0,0,0,0.3)');
    ctx.fillStyle=hg; ctx.fillRect(0,0,W,36);

    ctx.font='bold 13px Cairo,Arial';
    ctx.textBaseline='middle';

    const hearts = '❤️'.repeat(Math.max(0,lives));
    ctx.fillStyle='#FFF'; ctx.textAlign='left';
    ctx.fillText(hearts, 8, 18);

    ctx.textAlign='center';
    ctx.fillStyle='#FFF';
    ctx.fillText(`⭐ ${score}`, W/2-28, 18);

    ctx.fillStyle='#F5C842';
    ctx.fillText(`🪙 ${coinCount}`, W/2+38, 18);

    ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.textAlign='right';
    ctx.font='11px Cairo,Arial';
    ctx.fillText(levelData?`${level+1}/${LEVELS.length} — ${levelData.name}`:'', W-8, 18);
  }

  /* ─────────────────────────────────────────
     SCREENS
  ───────────────────────────────────────── */
  function _drawStartScreen(W,H) {
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';

    // Title glow
    ctx.shadowColor='#F5C842'; ctx.shadowBlur=24;
    ctx.fillStyle='#F5C842';
    ctx.font=`bold ${Math.round(W*0.1)}px Cairo,Arial`;
    ctx.fillText('🧒 ولد الحارة', W/2, H*0.28);
    ctx.shadowBlur=0;

    ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.font=`${Math.round(W*0.038)}px Cairo,Arial`;
    ctx.fillText('اجمع الدراهم — دُس على الحيوانات — وصل للعلم', W/2, H*0.40);

    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.font=`${Math.round(W*0.032)}px Cairo,Arial`;
    ctx.fillText('🍞 خبز = قوة  |  ☕ أتاي = حياة إضافية', W/2, H*0.49);

    // Start button
    const bw=180,bh=44,bx=W/2-90,by=H*0.60;
    const bg=ctx.createLinearGradient(bx,by,bx,by+bh);
    bg.addColorStop(0,'#E63946'); bg.addColorStop(1,'#C0392B');
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,14); ctx.fill();
    ctx.fillStyle='#FFF';
    ctx.font=`bold ${Math.round(W*0.048)}px Cairo,Arial`;
    ctx.fillText('▶ ابدأ المغامرة',W/2,by+bh/2+1);

    // Level count
    ctx.fillStyle='rgba(255,255,255,0.35)';
    ctx.font=`${Math.round(W*0.028)}px Cairo,Arial`;
    ctx.fillText(`${LEVELS.length} مراحل — ${LEVELS.map(l=>l.name).join(' · ')}`,W/2,H*0.82);
  }

  function _drawPauseOverlay(W,H) {
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle='#F5C842'; ctx.font=`bold ${Math.round(W*0.09)}px Cairo,Arial`;
    ctx.fillText('⏸ متوقف',W/2,H*0.44);
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.font=`${Math.round(W*0.036)}px Cairo,Arial`;
    ctx.fillText('اضغط ⏸ للمتابعة',W/2,H*0.56);
  }

  function _drawEndScreen(W,H,win) {
    ctx.fillStyle='rgba(0,0,0,0.83)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.shadowColor=win?'#F5C842':'#E63946'; ctx.shadowBlur=20;
    ctx.fillStyle=win?'#F5C842':'#FF6B6B';
    ctx.font=`bold ${Math.round(W*0.09)}px Cairo,Arial`;
    ctx.fillText(win?'🏆 أنت البطل!':'💔 انتهت الحياة', W/2, H*0.30);
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.75)';
    ctx.font=`${Math.round(W*0.042)}px Cairo,Arial`;
    ctx.fillText(`النقاط: ${score}  |  🪙 ${coinCount}`, W/2, H*0.43);
    if (win) {
      ctx.fillStyle='rgba(255,255,255,0.45)';
      ctx.font=`${Math.round(W*0.032)}px Cairo,Arial`;
      ctx.fillText('أكملت كل المراحل — أنت ابن الحارة الحقيقي!', W/2, H*0.51);
    }
    const bw=170,bh=42,bx=W/2-85,by=H*0.60;
    const bg=ctx.createLinearGradient(bx,by,bx,by+bh);
    bg.addColorStop(0,win?'#27AE60':'#E63946'); bg.addColorStop(1,win?'#1E8449':'#C0392B');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,12); ctx.fill();
    ctx.fillStyle='#FFF'; ctx.font=`bold ${Math.round(W*0.044)}px Cairo,Arial`;
    ctx.fillText(win?'🔄 العب مجدداً':'🔄 حاول مجدداً', W/2, by+bh/2+1);
  }

  function _drawLevelComplete(W,H) {
    ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.shadowColor='#F5C842'; ctx.shadowBlur=16;
    ctx.fillStyle='#F5C842'; ctx.font=`bold ${Math.round(W*0.08)}px Cairo,Arial`;
    ctx.fillText(`✅ ${levelData.name}`, W/2, H*0.38);
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.font=`${Math.round(W*0.038)}px Cairo,Arial`;
    ctx.fillText('أحسنت! المرحلة التالية قادمة...', W/2, H*0.50);
    ctx.fillStyle='#F5C842'; ctx.font=`${Math.round(W*0.042)}px Cairo,Arial`;
    ctx.fillText(`🪙 ${coinCount}   ⭐ ${score}`, W/2, H*0.60);
    if (level+1 < LEVELS.length) {
      ctx.fillStyle='rgba(255,255,255,0.35)';
      ctx.font=`${Math.round(W*0.032)}px Cairo,Arial`;
      ctx.fillText(`المرحلة القادمة: ${LEVELS[level+1].name}`, W/2, H*0.70);
    }
  }

  return { init, initialized: false };
})();
