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

  /* ── AUDIO: Mario Music System v4 — All-buffer, zero stutter ── */
  let audioCtx = null;
  let audioThemeTimer = null;
  let audioThemeInterval = null;
  let _sourceNode = null;

  function _getAudioCtx() {
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function _noteToFreq(note) {
    if (!note || note === 'R' || note === 'REST') return null;
    const map = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11 };
    const m = note.match(/^([A-G]#?b?)(\d+)$/); if (!m) return null;
    const semitone = map[m[1]]; if (semitone === undefined) return null;
    return 440 * Math.pow(2, (parseInt(m[2]) - 4 + (semitone - 9) / 12));
  }

  /* ── Generate square-wave buffer for a melody ── */
  function _buildMelodyBuffer(notes, durations, bpm, sampleRate) {
    sampleRate = sampleRate || (audioCtx ? audioCtx.sampleRate : 44100);
    const beat = 60 / bpm;
    let totalSamples = 0;
    const segments = [];
    for (let i = 0; i < notes.length; i++) {
      const durSec = durations[i] * beat;
      const ns = Math.max(1, Math.round(durSec * sampleRate));
      totalSamples += ns;
      segments.push({ note: notes[i], samples: ns, durSec });
    }
    const buf = audioCtx.createBuffer(1, totalSamples, sampleRate);
    const data = buf.getChannelData(0);
    let offset = 0;
    for (const seg of segments) {
      const freq = _noteToFreq(seg.note);
      for (let s = 0; s < seg.samples; s++) {
        const t = s / sampleRate;
        if (freq) {
          // Square wave: sign of sin
          data[offset + s] = Math.sin(2 * Math.PI * freq * t) >= 0 ? 0.4 : -0.4;
          // Apply fade-in/fade-out envelope (10% each end)
          const envPos = s / seg.samples;
          let env = 1;
          if (envPos < 0.05) env = envPos / 0.05;
          else if (envPos > 0.85) env = (1 - envPos) / 0.15;
          data[offset + s] *= env;
        } else {
          data[offset + s] = 0; // rest
        }
      }
      offset += seg.samples;
    }
    return buf;
  }

  function _playBuffer(buf) {
    if (!buf || !audioCtx) return;
    try {
      if (_sourceNode) { try { _sourceNode.stop(); } catch(e) {} }
      _sourceNode = audioCtx.createBufferSource();
      _sourceNode.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.25;
      _sourceNode.connect(gain);
      gain.connect(audioCtx.destination);
      _sourceNode.start();
    } catch(e) {}
  }

  function _stopSource() {
    if (_sourceNode) { try { _sourceNode.stop(); } catch(e) {} _sourceNode = null; }
  }

  /* ── Quick one-shot notes (for coins, chirps) ── */
  function _playChirp(note, durSec, vol) {
    const ctx = _getAudioCtx();
    const freq = _noteToFreq(note);
    if (!freq) return;
    const sr = ctx.sampleRate;
    const ns = Math.max(1, Math.round(durSec * sr));
    const buf = ctx.createBuffer(1, ns, sr);
    const d = buf.getChannelData(0);
    for (let s = 0; s < ns; s++) {
      const t = s / sr;
      const env = s < ns*0.02 ? s/(ns*0.02) : (s > ns*0.85 ? (ns-s)/(ns*0.15) : 1);
      d[s] = (Math.sin(2*Math.PI*freq*t) >= 0 ? 0.35 : -0.35) * env * (vol||0.8);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.2;
    src.connect(g); g.connect(ctx.destination);
    src.start();
  }

  /* ── Mario Main Theme ── */
  function playMainTheme() {
    stopTheme();
    const notes = [
      'E4','E4','R','E4','R','C4','E4','R','G4','R','R','R',
      'G4','R','R','R','C4','R','R','G4','R','R','E4','R',
      'R','A4','R','B4','R','Bb4','A4','R','G4','R','E4','R','G4','R',
      'A4','F4','G4','E4','R','C4','D4','B3','R','R','C4','R','R',
      'R','R','G4','R','R','F4','E4','D4','R','C4','R','R','R'
    ];
    const durs = [
      0.25,0.25,0.125,0.25,0.125,0.25,0.25,0.125,0.5,0.125,0.125,0.125,
      0.5,0.125,0.125,0.125,0.5,0.125,0.125,0.5,0.125,0.125,0.5,0.125,
      0.125,0.5,0.125,0.5,0.125,0.25,0.125,0.125,0.5,0.125,0.25,0.125,0.5,0.125,
      0.25,0.25,0.25,0.5,0.125,0.25,0.25,0.5,0.125,0.125,0.5,0.125,0.125,
      0.125,0.125,0.5,0.125,0.125,0.25,0.25,0.25,0.125,0.5,0.125,0.125,0.125
    ];
    const buf = _buildMelodyBuffer(notes, durs, 150);
    _playBuffer(buf);
    const totalMs = durs.reduce((s,d) => s + (d * (60/150) * 1000), 0);
    audioThemeTimer = setTimeout(() => { playMainTheme(); }, totalMs + 80);
  }

  function stopTheme() {
    if (audioThemeTimer) { clearTimeout(audioThemeTimer); audioThemeTimer = null; }
    _stopSource();
  }

  /* ── Power-up Sound ── */
  function playPowerup() {
    const buf = _buildMelodyBuffer(['E4','F4','G4','C5'], [0.1,0.1,0.1,0.15], 240);
    _playBuffer(buf);
  }

  /* ── Starman Theme ── */
  let starmanTimer = null;
  function playStarman() {
    stopStarman();
    const notes = []; const durs = [];
    const pattern = ['C4','C4','C4','E4','F4','F4','F4','G4'];
    const durPat = [0.25,0.25,0.25,0.5,0.25,0.25,0.25,0.5];
    for (let r = 0; r < 4; r++) { for (let i = 0; i < 8; i++) { notes.push(pattern[i]); durs.push(durPat[i]); } }
    const buf = _buildMelodyBuffer(notes, durs, 200);
    _playBuffer(buf);
    starmanTimer = setTimeout(() => { if (P && P.starTimer > 0) playStarman(); }, 4000);
  }
  function stopStarman() { if (starmanTimer) { clearTimeout(starmanTimer); starmanTimer = null; } }

  /* ── Coin Sound ── */
  function playCoin() {
    _playChirp('E5', 0.05);
    setTimeout(() => _playChirp('C4', 0.1), 60);
  }

  /* ── Death Sound ── */
  function playDeath() {
    const buf = _buildMelodyBuffer(['C4','C4','G3','E3'], [0.15,0.15,0.25,0.4], 180);
    _playBuffer(buf);
  }

  /* ── Flagpole ── */
  function playFlagpole() {
    const buf = _buildMelodyBuffer(['C4','E4','G4','C5','E5','C6'], [0.12,0.12,0.12,0.12,0.12,0.3], 200);
    _playBuffer(buf);
  }

  let _muted = false;
  function _setMuted(v) { _muted = v; if (v) { stopTheme(); stopStarman(); } }

  const AUDIO_MUSIC = {
    playMainTheme:   () => { if (!_muted) playMainTheme(); },
    stopTheme,
    playPowerup:     () => { if (!_muted) playPowerup(); },
    playStarman:     () => { if (!_muted) playStarman(); },
    stopStarman,
    playCoin:        () => { if (!_muted) playCoin(); },
    playDeath:       () => { if (!_muted) playDeath(); },
    playFlagpole:    () => { if (!_muted) playFlagpole(); },
    init() { _getAudioCtx(); },
    get muted() { return _muted; },
    setMuted: _setMuted,
  };

  /* ── State ── */
  let canvas, ctx, initialized = false;
  let raf = null, state = 'start';
  let countdownTimer = 0; // frames remaining in countdown
  let frameCount = 0, score = 0, lives = 3, coinCount = 0, level = 0;
  let invincible = 0;
  let particles = [];
  let screenShake = 0;
  let currentCoins = [], currentEnemies = [], powerUps = [];
  let fireballs = [];
  let hammers = [];   // for hammer bros
  let pipes = [];     // for piranha plants (and warp pipes)
  let currentBoss = null;
  let qblocks = [];   // ? blocks (question mark boxes)
  let warpPipes = []; // pipes with warp/enter behavior
  let bossFireballs = [];
  let levelData;
  let camX = 0, camY = 0;

  /* ── Player ── */
  const P = {
    x:0, y:0, vx:0, vy:0, w:24, h:30,
    onGround:false, facingRight:true,
    dead:false, deathTimer:0,
    big:false,    // power-up size state
    hasFire:false, // fire flower power
    starTimer:0,   // star invincibility timer
    animFrame:0, animTick:0,
  };

  /* ── Pipe/Warp State ── */
  let enteringPipe = false;
  let pipeTimer = 0;
  let pipeExitX = 0, pipeExitY = 0;
  let warpTransition = false;
  let warpTimer = 0;
  let warpTargetLevel = -1;
  let warpTargetPipe = 0;
  let bossDefeatTimer = 0; // celebration timer after boss death

  /* ── ? Block Coin Animations ── */
  let qblockAnims = []; // { x, y, vy, life } flying coins / items

  /* ── Keys ── */
  const K = { left:false, right:false, jump:false, jumpPressed:false, down:false, up:false };

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
        {x:20*T, type:'mushroom'},
        {x:55*T, type:'tea'},
        {x:90*T, type:'flower'},
      ],
      enemies:[
        {x:10*T,spd:1.3,type:'cat'},
        {x:22*T,spd:1.4,type:'cat'},
        {x:35*T,spd:1.6,type:'hammer'},    // hammer bro
        {x:45*T,spd:1.6,type:'cat'},
        {x:58*T,spd:1.9,type:'shoomp'},    // shoomp
        {x:62*T,spd:0,type:'piranha'},     // piranha plant in pipe
        {x:72*T,spd:2.0,type:'cat'},
        {x:85*T,spd:1.8,type:'spiny'},     // spiny
        {x:98*T,spd:2.3,type:'cat'},
        {x:108*T,spd:2.3,type:'lakitu'},   // lakitu
      ],
      pipes: [
        {x:62*T, w:T*2},
      ],
      qblocks: [
        {x:10*T, y:9*T, type:'coin', hit:false},
        {x:30*T, y:8*T, type:'mushroom', hit:false},
        {x:80*T, y:7*T, type:'flower', hit:false},
      ],
      warpPipes: [{ x:15*T, y:0, w:T*1.5, targetLevel:1, targetPipe:0 }],
      boss:{x:114, y:-1, hp:3, type:'dragon'},
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
        {x:30*T, type:'flower'},
        {x:65*T, type:'mushroom'},
        {x:100*T, type:'star'},
      ],
      enemies:[
        {x:8*T,spd:1.6,type:'dog'},{x:16*T,spd:1.7,type:'cat'},
        {x:25*T,spd:1.9,type:'crow'},{x:34*T,spd:1.9,type:'hammer'},
        {x:38*T,spd:0,type:'piranha'},{x:43*T,spd:2.1,type:'spiny'},{x:52*T,spd:2.2,type:'crow'},
        {x:60*T,spd:2.3,type:'dog'},{x:73*T,spd:2.4,type:'shoomp'},
        {x:82*T,spd:2.6,type:'lakitu'},{x:88*T,spd:0,type:'piranha'},{x:95*T,spd:2.6,type:'spiny'},
        {x:105*T,spd:2.9,type:'hammer'},{x:115*T,spd:3.0,type:'shoomp'},
      ],
      pipes: [
        {x:38*T, w:T*2},
        {x:88*T, w:T*2},
      ],
      qblocks: [
        {x:28*T, y:5*T, type:'star', hit:false},
        {x:55*T, y:9*T, type:'coin', hit:false},
        {x:116*T, y:5*T, type:'mushroom', hit:false},
      ],
      warpPipes: [{ x:20*T, y:0, w:T*1.5, targetLevel:2, targetPipe:0 }],
      boss:{x:124, y:-1, hp:5, type:'dragon'},
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
        {x:40*T,type:'star'},
        {x:80*T,type:'flower'},
        {x:120*T,type:'mushroom'},
      ],
      enemies:[
        {x:6*T,spd:2.1,type:'crow'},{x:14*T,spd:2.3,type:'hammer'},
        {x:20*T,spd:0,type:'piranha'},{x:23*T,spd:2.4,type:'spiny'},{x:31*T,spd:2.6,type:'crow'},
        {x:40*T,spd:2.7,type:'lakitu'},{x:48*T,spd:2.8,type:'shoomp'},
        {x:56*T,spd:3.0,type:'crow'},{x:65*T,spd:3.1,type:'hammer'},
        {x:73*T,spd:3.2,type:'spiny'},{x:76*T,spd:0,type:'piranha'},{x:82*T,spd:3.4,type:'crow'},
        {x:90*T,spd:3.5,type:'lakitu'},{x:98*T,spd:3.6,type:'shoomp'},
        {x:107*T,spd:3.8,type:'crow'},{x:116*T,spd:3.9,type:'hammer'},
        {x:125*T,spd:4.0,type:'spiny'},{x:128*T,spd:0,type:'piranha'},{x:133*T,spd:4.0,type:'shoomp'},
      ],
      pipes: [
        {x:20*T, w:T*2},
        {x:76*T, w:T*2},
        {x:128*T, w:T*2},
      ],
      qblocks: [
        {x:37*T, y:5*T, type:'coin', hit:false},
        {x:75*T, y:5*T, type:'star', hit:false},
        {x:113*T, y:5*T, type:'flower', hit:false},
      ],
      warpPipes: [{ x:8*T, y:0, w:T*1.5, targetLevel:0, targetPipe:0 }],
      boss:{x:134, y:-1, hp:7, type:'dragon'},
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
      if (['ArrowDown','s','S'].includes(e.key)) K.down = true;
      if (['ArrowUp','w','W'].includes(e.key) && !K.jump) { K.up = true; }
      if (e.key === 'Escape') _togglePause();
    });
    document.addEventListener('keyup', e => {
      if (['ArrowLeft','a','A'].includes(e.key))  K.left  = false;
      if (['ArrowRight','d','D'].includes(e.key)) K.right = false;
      if ([' ','ArrowUp','w','W'].includes(e.key)) { K.jump = false; K.jumpPressed = false; }
      if (['ArrowDown','s','S'].includes(e.key)) K.down = false;
      if (['ArrowUp','w','W'].includes(e.key)) K.up = false;
    });

    canvas.addEventListener('click', () => {
      if (state === 'start' || state === 'gameover' || state === 'win') _startGame();
    });

    _dpad('p-btn-left',  () => K.left  = true,  () => K.left  = false);
    _dpad('p-btn-right', () => K.right = true,   () => K.right = false);
    _dpad('p-btn-jump',  () => { _tryJump(); K.jump = true; }, () => K.jump = false);

    const pauseBtn = document.getElementById('p-btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', _togglePause);

    const muteBtn = document.getElementById('p-btn-mute');
    if (muteBtn) muteBtn.addEventListener('click', () => {
      AUDIO_MUSIC.setMuted(!AUDIO_MUSIC.muted);
      muteBtn.textContent = AUDIO_MUSIC.muted ? '🔇' : '🔊';
    });
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
    if (state === 'playing') { state = 'paused'; cancelAnimationFrame(raf); AUDIO_MUSIC.stopTheme(); _render(); }
    else if (state === 'paused') { state = 'playing'; _loop(); AUDIO_MUSIC.playMainTheme(); }
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
      // hammer bro: throw cooldown
      throwTimer: 0,
      // lakitu: spawn offset, spiny count
      spawnY: groundY - 80,
      spinyCount: 0,
      // piranha plant: pipe index, state timer, hidden state
      pipeIdx: -1,
      stateTimer: 0,
      hidden: true,
    }));
    powerUps = levelData.powerUps.map(p => ({
      x:p.x, y:groundY - T*3, type:p.type, collected:false,
      bobOff:Math.random()*Math.PI*2,
      groundWalker: p.type === 'mushroom' || p.type === 'bread',
      vx: (p.type === 'mushroom' || p.type === 'bread') ? 2 : 0,
      vy: 0,
    }));

    // Reset global arrays
    hammers = [];
    pipes = [];

    // Assign pipes from level data
    if (levelData.pipes) {
      pipes = levelData.pipes.map(p => ({ ...p }));
    }

    // Assign piranha plants to pipes
    let pipeIdx = 0;
    for (const e of currentEnemies) {
      if (e.type === 'piranha' && pipeIdx < pipes.length) {
        e.pipeIdx = pipeIdx;
        e.hidden = true;
        e.stateTimer = 0;
        e.x = pipes[pipeIdx].x + pipes[pipeIdx].w/2 - 14;
        e.y = groundY - T; // start hidden in pipe
        pipeIdx++;
      }
    }

    // ── ? Blocks ──
    qblocks = [];
    if (levelData.qblocks) {
      qblocks = levelData.qblocks.map(qb => ({
        x: qb.x,
        y: qb.y,
        type: qb.type,
        hit: qb.hit || false,
      }));
    }

    // ── Warp Pipes ──
    warpPipes = [];
    if (levelData.warpPipes) {
      warpPipes = levelData.warpPipes.map(wp => ({ ...wp }));
    }
    enteringPipe = false;
    pipeTimer = 0;
    warpTransition = false;
    warpTimer = 0;
    warpTargetLevel = -1;
    warpTargetPipe = 0;
    qblockAnims = [];

    P.x=52; P.y=groundY-P.h-T; P.vx=0; P.vy=0;
    P.onGround=false; P.facingRight=true;
    P.dead=false; P.deathTimer=0; P.animFrame=0; P.animTick=0;
    P.big = false; P.hasFire = false; P.starTimer = 0;
    camX=0; camY=0; invincible=0; frameCount=0; screenShake=0;
    fireballs = [];
    bossFireballs = [];

    // ── Boss ──
    if (levelData.boss) {
      const bd = levelData.boss;
      currentBoss = {
        x: bd.x * T,
        y: groundY - 50,
        vx: 0,
        vy: 0,
        w: 60,
        h: 50,
        dir: -1,
        spd: 1.2,
        hp: bd.hp,
        maxHp: bd.hp,
        alive: true,
        dead: false,
        deathTimer: 0,
        animTick: 0,
        fireTimer: 0,
        walkTimer: 0,
      };
    } else {
      currentBoss = null;
    }

    // Countdown before playing
    countdownTimer = 90; // ~1.5 seconds at 60fps (3 frames per number: 3-2-1-Go!)
    state = 'countdown';
    if (raf) cancelAnimationFrame(raf);
    _loop();
    // Start Mario main theme on level load
    setTimeout(() => { AUDIO_MUSIC.playMainTheme(); }, 200);
  }

  function _tryJump() {
    if (state==='start'||state==='gameover'||state==='win') { _startGame(); return; }
    if (state!=='playing') return;
    if (P.dead) return;
    // Shoot fireball if player has fire power
    if (P.hasFire && !P.onGround) {
      _shootFireball();
      return;
    }
    if (P.onGround) {
      P.vy = P.big ? JUMP_V * 1.05 : JUMP_V;
      P.onGround = false;
      AUDIO.playTick();
      _spawnParticles(P.x + P.w/2, P.y + P.h, '#aaddff', 6, 'dust');
    }
  }

  function _shootFireball() {
    if (fireballs.length >= 3) return; // max 3 fireballs at once
    const dir = P.facingRight ? 1 : -1;
    fireballs.push({
      x: P.x + (dir > 0 ? P.w : -8),
      y: P.y + 6,
      vx: dir * 6,
      vy: -2.5,
      w: 8,
      h: 8,
      life: 80,
      bounce: 0,
    });
    AUDIO.playTick();
    _playFireballSound();
  }

  function _playFireballSound() {
    const ctx = _getAudioCtx();
    const t = ctx.currentTime + 0.02;
    // Short bright swoosh — two quick high notes
    _playNote('F6', 0.06, t, 0.06, 'square');
    _playNote('E6', 0.05, t + 0.04, 0.04, 'square');
    _playNote('C#6', 0.08, t + 0.08, 0.03, 'square');
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

    // ── Countdown ──
    if (state === 'countdown') {
      countdownTimer--;
      if (countdownTimer <= 0) {
        state = 'playing';
      }
      // Still update particles during countdown
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.25;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      return;
    }

    if (invincible > 0) invincible--;
    if (P.starTimer > 0) { P.starTimer--; if (P.starTimer === 0) AUDIO_MUSIC.stopStarman(); }
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

      // ── Hammer Bro ──
      if (e.type==='hammer') {
        // Don't move horizontally
        e.x += e.dir * e.spd * 0.15;
        e.throwTimer++;
        if (e.throwTimer >= 40) {
          e.throwTimer = 0;
          // Throw toward player
          const dx = P.x - e.x;
          const hVx = dx > 0 ? 4 : -4;
          hammers.push({
            x: e.x + e.w/2 - 4,
            y: e.y - 4,
            vx: hVx + (Math.random()-0.5)*1.5,
            vy: -6 - Math.random()*2,
            w: 10,
            h: 10,
            active: true,
            life: 60,
          });
        }
      }

      // ── Lakitu ──
      if (e.type==='lakitu') {
        // Float above player
        const targetX = Math.max(20, Math.min(P.x - e.w/2, levelData.width*T - e.w - 20));
        e.x += (targetX - e.x) * 0.06;
        e.y = e.spawnY + Math.sin(frameCount*0.04) * 10;
        e.vy = 0;
        e.onGround = false;
        e.throwTimer++;
        if (e.throwTimer >= 50 && e.alive) {
          e.throwTimer = 0;
          // Spawn a spiny below Lakitu
          const newSpiny = {
            x: e.x + e.w/2 - 12,
            y: e.y + 20,
            vx: 0,
            vy: 4,
            w: 24,
            h: 22,
            dir: P.x > e.x ? 1 : -1,
            spd: 1.2,
            type: 'spiny',
            onGround: false,
            alive: true,
            stomped: false,
            stompTimer: 0,
            animTick: 0,
            throwTimer: 0,
            spawnY: 0,
            spinyCount: 0,
            pipeIdx: -1,
            stateTimer: 0,
            hidden: false,
          };
          currentEnemies.push(newSpiny);
        }
      }

      // ── Spiny ──
      if (e.type==='spiny') {
        // Normal walking behavior (same as cat/dog) but can't be stomped
        // Edge turning is handled by the generic code above
      }

      // ── Piranha Plant ──
      if (e.type==='piranha') {
        // Piranha stays in pipe, cycles rise/fall
        if (e.pipeIdx >= 0 && e.pipeIdx < pipes.length) {
          const pipe = pipes[e.pipeIdx];
          const pipeTop = groundY - T;
          const fullyUpY = pipeTop - 36;
          const fullyDownY = pipeTop + 2;

          // Check if player is close (within 3 tiles)
          const playerClose = Math.abs(P.x - (pipe.x + pipe.w/2)) < T * 3;

          e.stateTimer++;

          if (playerClose) {
            // Stay hidden when player is close
            e.hidden = true;
            e.y += (fullyDownY - e.y) * 0.15;
            e.stateTimer = 0;
          } else if (e.hidden) {
            // Hidden: wait then rise
            if (e.stateTimer > 60) {
              e.hidden = false;
              e.stateTimer = 0;
            }
            e.y += (fullyDownY - e.y) * 0.1;
          } else {
            // Visible cycle: up 20 frames, stay 40 frames, down 20 frames
            if (e.stateTimer < 20) {
              // Rising
              e.y += (fullyUpY - e.y) * 0.2;
            } else if (e.stateTimer < 60) {
              // Stay up
              e.y = fullyUpY;
            } else if (e.stateTimer < 80) {
              // Going down
              e.y += (fullyDownY - e.y) * 0.15;
            } else {
              // Back down
              e.hidden = true;
              e.stateTimer = 0;
              e.y = fullyDownY;
            }
          }
          e.vy = 0;
        }
      }

      // ── Shoomp ──
      if (e.type==='shoomp') {
        // Float in a circular pattern
        const baseY = groundY - e.h - 20 - (e.x % 60);
        e.x += e.dir * e.spd * 0.8;
        e.y = baseY + Math.sin(frameCount*0.05 + e.x*0.02) * 14;
        e.vy = 0;
        e.onGround = false;
      }

      // Player hit
      if (!P.dead && _overlap(P,e)) {
        const isStarActive = P.starTimer > 0;
        if (isStarActive) {
          // Star power kills enemies on touch
          e.stomped=true; e.stompTimer=0;
          screenShake = 4;
          AUDIO_MUSIC.playCoin();
          _spawnParticles(e.x+e.w/2, e.y, '#FFD700', 10, 'star');
          score += 150;
        } else if (P.vy>0.5 && P.y+P.h < e.y+e.h*0.5 && e.type!=='spiny' && e.type!=='lakitu') {
          e.stomped=true; e.stompTimer=0;
          P.vy = -9;
          score += 150;
          screenShake = 4;
          AUDIO_MUSIC.playCoin();
          _spawnParticles(e.x+e.w/2, e.y, '#FFD700', 10, 'star');
        } else if (invincible===0) {
          // Player takes damage
          if (P.hasFire) {
            // Lose fire but stay big
            P.hasFire = false;
            invincible = 110;
            screenShake = 8;
            AUDIO.playTick();
          } else if (P.big) {
            P.big = false;
            invincible = 110;
            screenShake = 8;
            AUDIO.playTick();
          } else {
            invincible = 110;
            screenShake = 8;
            lives--;
            AUDIO_MUSIC.playDeath();
            if (lives<=0) { _playerDie(); }
          }
        }
      }
    }

    // ── Coins ──
    for (const c of currentCoins) {
      if (c.collected) continue;
      if (_overlap(P, {x:c.x+T*0.2,y:c.y,w:T*0.55,h:T*0.55})) {
        c.collected=true; coinCount++; score+=10;
        AUDIO_MUSIC.playCoin();
        _spawnParticles(c.x+T*0.4, c.y, '#F5C842', 8, 'coin');
      }
    }

    // ── Power-ups ──
    const groundY2 = canvas.height - T;
    for (const pu of powerUps) {
      if (pu.collected) continue;

      // Ground-walking powerups (mushroom/bread from ? blocks)
      if (pu.groundWalker) {
        // Apply gravity to fall to ground
        pu.vy += GRAVITY * 0.5;
        pu.x += pu.vx;
        pu.y += pu.vy;
        // Ground collision
        if (pu.y + T*0.7 >= groundY2) {
          pu.y = groundY2 - T*0.72;
          pu.vy = 0;
        }
        // Platform collision
        for (const p of levelData.platforms) {
          const px=p.x*T, py=p.y*T, pw=p.w*T;
          if (pu.x+T*0.8>px+2 && pu.x<px+pw-2 && pu.y+T*0.7>=py-1 && pu.y+T*0.7<=py+T+4 && pu.vy>=0) {
            pu.y = py - T*0.72;
            pu.vy = 0;
          }
        }
        // Bounce off edges
        if (pu.x < 2) { pu.x = 2; pu.vx = -pu.vx; }
        if (pu.x + T*0.8 > levelData.width * T - 2) { pu.x = levelData.width * T - T*0.8 - 2; pu.vx = -pu.vx; }
        // Bounce off platforms
        for (const p of levelData.platforms) {
          const px=p.x*T, py=p.y*T, pw=p.w*T;
          if (Math.abs(pu.y+T*0.72 - py) < 4 && pu.x+T*0.8>px && pu.x<px+pw) {
            // Check edge
            if (pu.vx>0 && pu.x+T*0.8+5>=px+pw) { pu.vx = -pu.vx; break; }
            if (pu.vx<0 && pu.x-5<=px)           { pu.vx = -pu.vx; break; }
          }
        }
      }

      if (_overlap(P, {x:pu.x,y:pu.y,w:T*0.8,h:T*0.8})) {
        pu.collected=true;
        if (pu.type==='bread' || pu.type==='mushroom') { P.big=true; score+=200; }
        else if (pu.type==='tea') { lives=Math.min(lives+1,5); score+=300; }
        else if (pu.type==='flower') { P.big=true; P.hasFire=true; score+=250; }
        else if (pu.type==='star') { P.starTimer=600; invincible=600; score+=500; AUDIO_MUSIC.playStarman(); }
        AUDIO_MUSIC.playPowerup();
        _spawnParticles(pu.x+T*0.4, pu.y, pu.type==='bread'||pu.type==='mushroom'?'#D4A017':pu.type==='tea'?'#5DADE2':pu.type==='flower'?'#FF6B35':pu.type==='star'?'#FFD700':'#D4A017', 12, 'star');
      }
    }

    // ── Fireballs ──
    for (let i=fireballs.length-1; i>=0; i--) {
      const fb = fireballs[i];
      fb.life--;
      if (fb.life <= 0 || fb.x < -20 || fb.x > levelData.width*T + 20) {
        fireballs.splice(i,1);
        continue;
      }
      // Gravity & bounce
      fb.vy += 0.3;
      fb.x += fb.vx;
      fb.y += fb.vy;
      // Ground collision
      if (fb.y + fb.h >= groundY) {
        fb.y = groundY - fb.h;
        fb.vy = -3.5;
        fb.bounce++;
        if (fb.bounce > 3) { fireballs.splice(i,1); continue; }
      }
      // Platform collision
      for (const p of levelData.platforms) {
        const px=p.x*T, py=p.y*T, pw=p.w*T;
        if (fb.x+fb.w>px && fb.x<px+pw && fb.y+fb.h>py && fb.y<py+T) {
          // Hit from top
          if (fb.vy>0 && fb.y+fb.h<py+T*0.6) {
            fb.y = py - fb.h;
            fb.vy = -3.5;
            fb.bounce++;
          } else {
            fireballs.splice(i,1);
            break;
          }
        }
      }
      if (i >= fireballs.length) continue;
      // Hit enemies
      for (const e of currentEnemies) {
        if (!e.alive) continue;
        if (_overlap(fb, e)) {
          e.stomped=true; e.stompTimer=0;
          screenShake = 3;
          score += 150;
          AUDIO.playWin();
          _spawnParticles(e.x+e.w/2, e.y, '#FF6B35', 8, 'star');
          fireballs.splice(i,1);
          break;
        }
      }
    }

    // ── Hammers (Hammer Bro projectiles) ──
    for (let i=hammers.length-1; i>=0; i--) {
      const h = hammers[i];
      h.life--;
      if (h.life <= 0 || h.x < -30 || h.x > levelData.width*T + 30) {
        hammers.splice(i,1);
        continue;
      }
      h.vy += 0.35;  // gravity on hammer arc
      h.x += h.vx;
      h.y += h.vy;
      // Ground collision
      if (h.y + h.h >= groundY) {
        hammers.splice(i,1);
        continue;
      }
      // Platform collision
      for (const p of levelData.platforms) {
        const px=p.x*T, py=p.y*T, pw=p.w*T;
        if (h.x+h.w>px && h.x<px+pw && h.y+h.h>py && h.y<py+T) {
          hammers.splice(i,1);
          break;
        }
      }
      if (i >= hammers.length) continue;
      // Hit player
      if (!P.dead && invincible===0 && _overlap(P, {x:h.x,y:h.y,w:h.w,h:h.h})) {
        if (P.starTimer > 0) {
          // Star: destroy hammer
          hammers.splice(i,1);
          score += 10;
          continue;
        }
        if (P.hasFire) { P.hasFire = false; invincible = 110; screenShake = 8; AUDIO.playTick(); }
        else if (P.big) { P.big = false; invincible = 110; screenShake = 8; AUDIO.playTick(); }
        else { invincible = 110; screenShake = 8; lives--; AUDIO_MUSIC.playDeath(); if (lives<=0) _playerDie(); }
        hammers.splice(i,1);
      }
    }

    // ── Boss Update ──
    if (currentBoss && currentBoss.alive) {
      const b = currentBoss;
      b.animTick++;

      // Walking left/right
      b.walkTimer++;
      if (b.walkTimer > 120) {
        b.dir *= -1;
        b.walkTimer = 0;
      }
      b.x += b.dir * b.spd;

      // Keep within level bounds
      if (b.x < 20) { b.x = 20; b.dir = 1; b.walkTimer = 0; }
      if (b.x + b.w > levelData.width * T - 20) { b.x = levelData.width * T - b.w - 20; b.dir = -1; b.walkTimer = 0; }

      // Stay on ground
      b.y = groundY - b.h;

      // Throw boss fireballs every 60 frames
      b.fireTimer++;
      if (b.fireTimer >= 60) {
        b.fireTimer = 0;
        const dx = P.x - b.x;
        bossFireballs.push({
          x: b.x + (dx > 0 ? b.w : -8),
          y: b.y + 12,
          vx: (dx > 0 ? 3.5 : -3.5) + (Math.random() - 0.5) * 0.8,
          vy: -3 + Math.random() * -0.5,
          w: 12,
          h: 12,
          life: 120,
          bounce: 0,
        });
      }

      // Boss collision with player
      if (!P.dead && _overlap(P, b)) {
        const isStarActive = P.starTimer > 0;
        if (isStarActive) {
          // Star power damages boss
          b.hp--;
          screenShake = 6;
          AUDIO_MUSIC.playCoin();
          _spawnParticles(b.x + b.w / 2, b.y, '#FFD700', 12, 'star');
          score += 200;
          if (b.hp <= 0) {
            b.alive = false;
            b.dead = true;
            b.deathTimer = 0;
            screenShake = 14;
            AUDIO_MUSIC.playFlagpole();
            _spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#FF6B35', 30, 'star');
          }
        } else if (P.vy > 0.5 && P.y + P.h < b.y + b.h * 0.35) {
          // Player stomps boss head
          b.hp--;
          P.vy = -10;
          screenShake = 8;
          AUDIO_MUSIC.playCoin();
          _spawnParticles(b.x + b.w / 2, b.y, '#FFD700', 15, 'star');
          score += 300;
          if (b.hp <= 0) {
            b.alive = false;
            b.dead = true;
            b.deathTimer = 0;
            screenShake = 14;
            _spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#FF6B35', 30, 'star');
            _spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#FFD700', 20, 'star');
          }
        } else if (invincible === 0) {
          if (P.hasFire) { P.hasFire = false; invincible = 110; screenShake = 8; AUDIO.playTick(); }
          else if (P.big) { P.big = false; invincible = 110; screenShake = 8; AUDIO.playTick(); }
          else { invincible = 110; screenShake = 8; lives--; AUDIO_MUSIC.playDeath(); if (lives <= 0) _playerDie(); }
        }
      }
    }

    // ── Boss death animation ──
    if (currentBoss && currentBoss.dead) {
      currentBoss.deathTimer++;
      if (currentBoss.deathTimer % 5 === 0) {
        _spawnParticles(
          currentBoss.x + Math.random() * currentBoss.w,
          currentBoss.y + Math.random() * currentBoss.h,
          ['#FF4500', '#FFD700', '#FF6B35', '#00FF00', '#FF0000'][Math.floor(Math.random() * 5)],
          3,
          'star'
        );
      }
      if (currentBoss.deathTimer === 120) {
        // Boss fully dead — start celebration
        score += 1000; // Boss defeat bonus
        bossDefeatTimer = 90; // show celebration for ~1.5 seconds
        currentBoss.dead = false;
        currentBoss = { ...currentBoss, alive: false, hp: 0 };
      }
    }

    // ── Boss Fireballs Update ──
    for (let i = bossFireballs.length - 1; i >= 0; i--) {
      const fb = bossFireballs[i];
      fb.life--;
      if (fb.life <= 0 || fb.x < -30 || fb.x > levelData.width * T + 30) {
        bossFireballs.splice(i, 1);
        continue;
      }
      fb.vy += 0.25;
      fb.x += fb.vx;
      fb.y += fb.vy;
      // Ground collision
      if (fb.y + fb.h >= groundY) {
        fb.y = groundY - fb.h;
        fb.vy = -3;
        fb.bounce++;
        if (fb.bounce > 2) { bossFireballs.splice(i, 1); continue; }
      }
      // Platform collision
      for (const p of levelData.platforms) {
        const px = p.x * T, py = p.y * T, pw = p.w * T;
        if (fb.x + fb.w > px && fb.x < px + pw && fb.y + fb.h > py && fb.y < py + T) {
          if (fb.vy > 0 && fb.y + fb.h < py + T * 0.6) {
            fb.y = py - fb.h;
            fb.vy = -3;
            fb.bounce++;
          } else {
            bossFireballs.splice(i, 1);
            break;
          }
        }
      }
      if (i >= bossFireballs.length) continue;
      // Hit player
      if (!P.dead && invincible === 0 && _overlap(P, fb)) {
        if (P.starTimer > 0) {
          bossFireballs.splice(i, 1);
          continue;
        }
        if (P.hasFire) { P.hasFire = false; invincible = 110; screenShake = 8; AUDIO.playTick(); }
        else if (P.big) { P.big = false; invincible = 110; screenShake = 8; AUDIO.playTick(); }
        else { invincible = 110; screenShake = 8; lives--; AUDIO_MUSIC.playDeath(); if (lives <= 0) _playerDie(); }
        bossFireballs.splice(i, 1);
      }
    }

    // ── Fireball hit boss ──
    if (currentBoss && currentBoss.alive) {
      for (let i = fireballs.length - 1; i >= 0; i--) {
        const fb = fireballs[i];
        if (_overlap(fb, currentBoss)) {
          currentBoss.hp--;
          screenShake = 6;
          AUDIO_MUSIC.playCoin();
          _spawnParticles(currentBoss.x + currentBoss.w / 2, currentBoss.y, '#FF6B35', 10, 'star');
          score += 200;
          fireballs.splice(i, 1);
          if (currentBoss.hp <= 0) {
            currentBoss.alive = false;
            currentBoss.dead = true;
            currentBoss.deathTimer = 0;
            screenShake = 14;
            AUDIO_MUSIC.playFlagpole();
            _spawnParticles(currentBoss.x + currentBoss.w / 2, currentBoss.y + currentBoss.h / 2, '#FF6B35', 30, 'star');
            _spawnParticles(currentBoss.x + currentBoss.w / 2, currentBoss.y + currentBoss.h / 2, '#FFD700', 20, 'star');
          }
          break;
        }
      }
    }

    // ── ? Block Hit Logic ──
    if (!P.dead) {
      for (const qb of qblocks) {
        if (qb.hit) continue;
        // Player hitting from below (head bump)
        if (P.vy < 0 && P.y + 5 < qb.y + T && P.y + P.h > qb.y &&
            P.x + P.w > qb.x + 2 && P.x < qb.x + T - 2) {
          qb.hit = true;
          AUDIO_MUSIC.playCoin();
          if (qb.type === 'coin') {
            coinCount++;
            score += 50;
            qblockAnims.push({ x: qb.x + T/2, y: qb.y - 8, vy: -6, life: 20, type: 'coin' });
            _spawnParticles(qb.x + T/2, qb.y, '#F5C842', 6, 'coin');
          } else if (qb.type === 'mushroom' || qb.type === 'flower' || qb.type === 'star' || qb.type === 'bread' || qb.type === 'tea') {
            // Spawn a power-up from the ? block
            const isWalker = qb.type === 'mushroom' || qb.type === 'bread';
            const newPu = {
              x: qb.x, y: qb.y - T, type: qb.type, collected: false,
              bobOff: Math.random() * Math.PI * 2,
              groundWalker: isWalker,
              vx: isWalker ? 2 : 0, vy: isWalker ? 0 : 0,
            };
            powerUps.push(newPu);
            qblockAnims.push({ x: qb.x + T/2, y: qb.y - 8, vy: -4, life: 15, type: 'pop' });
            _spawnParticles(qb.x + T/2, qb.y, '#FFD700', 8, 'star');
          }
        }
      }
    }

    // ── ? Block Animations ──
    for (let i = qblockAnims.length - 1; i >= 0; i--) {
      const a = qblockAnims[i];
      a.y += a.vy;
      a.vy += 0.3;
      a.life--;
      if (a.life <= 0) qblockAnims.splice(i, 1);
    }

    // ── Pipe Entry / Warp Logic ──
    if (!P.dead && !warpTransition) {
      if (P.onGround && K.down && !enteringPipe) {
        for (const wp of warpPipes) {
          const pipeGroundY = H - T;
          const pipeH = T * 2;
          const pipeTop = pipeGroundY - pipeH;
          if (P.x + P.w > wp.x && P.x < wp.x + wp.w &&
              P.y + P.h >= pipeTop && P.y + P.h <= pipeGroundY) {
            enteringPipe = true;
            pipeTimer = 0;
            break;
          }
        }
      }
      if (enteringPipe) {
        // Move player downward into pipe
        P.y += 2;
        P.vx = 0;
        pipeTimer++;
        if (pipeTimer > 30) {
          // Find which warp pipe we entered
          for (const wp of warpPipes) {
            const pipeGroundY = H - T;
            const pipeH = T * 2;
            const pipeTop = pipeGroundY - pipeH;
            if (P.x + P.w > wp.x && P.x < wp.x + wp.w &&
                P.y + P.h >= pipeTop && P.y + P.h <= pipeGroundY + 10) {
              warpTargetLevel = wp.targetLevel;
              break;
            }
          }
          warpTransition = true;
          warpTimer = 0;
          enteringPipe = false;
        }
      }
    }

    // ── Warp Transition ──
    if (warpTransition) {
      warpTimer++;
      if (warpTimer > 30) {
        if (warpTargetLevel >= 0 && warpTargetLevel < LEVELS.length) {
          _loadLevel(warpTargetLevel);
        }
        warpTransition = false;
        warpTimer = 0;
        warpTargetLevel = -1;
      }
    }

    // ── Particles ──
    for (let i=particles.length-1; i>=0; i--) {
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.25;
      p.life--;
      if (p.life<=0) particles.splice(i,1);
    }

    // ── Starman Trail Particles ──
    if (!P.dead && P.starTimer > 0 && frameCount % 3 === 0) {
      const trailColors = ['#FFD700','#FFA500','#FF6B35','#FFE066','#FFF'];
      const ci = Math.floor(frameCount/6) % trailColors.length;
      particles.push({
        x: P.x + P.w/2 + (Math.random()-0.5)*6,
        y: P.y + P.h/2 + (Math.random()-0.5)*6,
        vx: (Math.random()-0.5)*2,
        vy: -1 - Math.random()*2,
        color: trailColors[ci],
        life: 20 + Math.floor(Math.random()*8),
        maxLife: 28,
        size: 3 + Math.floor(Math.random()*3),
        type: 'star',
      });
    }

    // ── Boss Defeat Celebration Timer ──
    if (bossDefeatTimer > 0) bossDefeatTimer--;

    // ── Goal ──
    const gx = levelData.goal * T;
    const bossAlive = currentBoss && currentBoss.alive;
    if (!P.dead && P.x+P.w>gx && P.x<gx+T*2.5 && !bossAlive) {
      score += 500 + coinCount*5;
      state  = 'levelcomplete';
      AUDIO_MUSIC.playFlagpole();
      setTimeout(() => {
        if (level+1 < LEVELS.length) _loadLevel(level+1);
        else { state='win'; _render(); }
      }, 2400);
    }
  }

  function _playerDie() { P.dead=true; P.vy=-11; P.deathTimer=0; screenShake=12; AUDIO_MUSIC.stopTheme(); AUDIO_MUSIC.stopStarman(); }

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
    for (const qb of qblocks) _drawQBlock(qb);
    for (const pu of powerUps)           { if (!pu.collected) _drawPowerUp(pu); }
    for (const c of currentCoins)        { if (!c.collected)  _drawCoin(c.x, c.y, c.bobOff); }
    _drawGoal(levelData.goal*T, H);
    // Draw pipes (for piranha plants)
    if (levelData.pipes) {
      for (const pipe of levelData.pipes) _drawPipe(pipe.x, H, pipe.w);
    }
    // Draw warp pipes
    for (const wp of warpPipes) _drawPipe(wp.x, H, wp.w);
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

    // Fireballs
    for (const fb of fireballs) {
      ctx.save();
      const pulse = Math.sin(frameCount*0.3)*2;
      const gd = ctx.createRadialGradient(fb.x+4, fb.y+4, 0, fb.x+4, fb.y+4, 8+pulse);
      gd.addColorStop(0, 'rgba(255,255,200,1)');
      gd.addColorStop(0.3, 'rgba(255,200,50,1)');
      gd.addColorStop(0.7, 'rgba(255,100,20,0.9)');
      gd.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = gd;
      ctx.beginPath();
      ctx.arc(fb.x+4, fb.y+4, 8+pulse, 0, Math.PI*2);
      ctx.fill();
      // Inner core
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(fb.x+4, fb.y+4, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Hammers (hammer bro projectiles)
    for (const h of hammers) {
      if (!h.active) continue;
      _drawHammer(h.x, h.y, h.w, h.h);
    }

    // ── Boss Fireballs ──
    for (const fb of bossFireballs) {
      _drawBossFireball(fb, frameCount);
    }

    // ── Boss ──
    if (currentBoss && (currentBoss.alive || currentBoss.dead)) {
      _drawBoss(currentBoss);
    }

    // Player
    const starActive = P.starTimer > 0;
    const blink = (invincible>0 && Math.floor(invincible/5)%2===1) || (starActive && Math.floor(frameCount/3)%2===1);
    if (!P.dead || P.deathTimer%8<5) {
      if (!blink) _drawPlayer();
    }

    ctx.restore();
    _drawHUD(W,H);

    if (state==='start')         _drawStartScreen(W,H);
    if (state==='paused')        _drawPauseOverlay(W,H);
    if (state==='gameover')      _drawEndScreen(W,H,false);
    if (state==='win')           _drawEndScreen(W,H,true);
    if (state==='levelcomplete') _drawLevelComplete(W,H);
    if (state==='countdown')     _drawCountdownOverlay(W,H);
    if (bossDefeatTimer > 0)     _drawBossDefeatOverlay(W,H);
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
    // Big glowing night star
    if (levelData && levelData.night) {
      _drawNightStar(W,H);
    }
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

  /* ── Big Night Star ── */
  function _drawNightStar(W,H) {
    const sx=W*0.1, sy=H*0.1;
    const pulse = Math.sin(frameCount*0.04)*1.5;
    const r = 12 + pulse;
    // Outer glow
    const g = ctx.createRadialGradient(sx,sy,0,sx,sy,r*4);
    g.addColorStop(0,'rgba(255,220,100,0.25)');
    g.addColorStop(0.5,'rgba(200,200,255,0.1)');
    g.addColorStop(1,'rgba(200,200,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,r*4,0,Math.PI*2); ctx.fill();
    // Star body
    ctx.fillStyle='#FFFDE7';
    ctx.beginPath();
    for (let i=0;i<4;i++){
      const a=i*Math.PI/4+Math.PI/8;
      if(i===0) ctx.moveTo(sx+Math.cos(a)*r*1.5,sy+Math.sin(a)*r*1.5);
      else ctx.lineTo(sx+Math.cos(a)*r*1.5,sy+Math.sin(a)*r*1.5);
      const ia=a+Math.PI/8;
      ctx.lineTo(sx+Math.cos(ia)*r*0.6,sy+Math.sin(ia)*r*0.6);
    }
    ctx.closePath(); ctx.fill();
    // Inner core
    ctx.fillStyle='#FFF9C4';
    ctx.beginPath(); ctx.arc(sx,sy,r*0.4,0,Math.PI*2); ctx.fill();
    // Sparkles
    ctx.fillStyle='rgba(255,255,255,0.6)';
    const sparkle = Math.sin(frameCount*0.1);
    if (sparkle>0.3) ctx.fillRect(sx+r*1.2,sy-r*0.5,2,2);
    if (sparkle<-0.3) ctx.fillRect(sx-r*1.3,sy+r*0.3,2,2);
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
    const bob = pu.groundWalker ? 0 : Math.sin(frameCount*0.08+pu.bobOff)*4;
    const x=pu.x, y=pu.y+bob;
    const s=T*0.72;
    // Glow
    let glowColor;
    if (pu.type==='bread')        glowColor='rgba(212,160,23,0.3)';
    else if (pu.type==='tea')     glowColor='rgba(93,173,226,0.3)';
    else if (pu.type==='mushroom') glowColor='rgba(220,60,60,0.3)';
    else if (pu.type==='flower')  glowColor='rgba(255,107,53,0.3)';
    else if (pu.type==='star')    glowColor='rgba(255,215,0,0.4)';
    else                          glowColor='rgba(212,160,23,0.3)';
    ctx.fillStyle=glowColor;
    ctx.beginPath(); ctx.arc(x+s/2,y+s/2,s*0.8,0,Math.PI*2); ctx.fill();

    if (pu.type==='bread') {
      // Bread loaf 🍞
      ctx.fillStyle='#D4A017';
      ctx.beginPath(); ctx.roundRect(x+2,y+8,s-4,s-8,6); ctx.fill();
      ctx.fillStyle='#E8B828';
      ctx.beginPath(); ctx.ellipse(x+s/2,y+8,s/2-2,10,0,Math.PI,0); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.fillRect(x+6,y+12,4,8);
    } else if (pu.type==='mushroom') {
      // Red mushroom 🍄
      const cx = x+s/2, cy = y+s/2-2;
      // Stem
      ctx.fillStyle='#F5E6D0';
      ctx.beginPath(); ctx.roundRect(cx-5,cy+2,10,s/2-2,3); ctx.fill();
      // Cap
      ctx.fillStyle='#E63946';
      ctx.beginPath(); ctx.ellipse(cx,cy-2,s/2,10,0,Math.PI,0); ctx.fill();
      // Cap top rounded
      ctx.beginPath(); ctx.ellipse(cx,cy-2,s/2-1,8,0,0,Math.PI); ctx.fill();
      // White spots
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(cx-6,cy-5,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+5,cy-3,2.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx-1,cy-8,2,0,Math.PI*2); ctx.fill();
    } else if (pu.type==='flower') {
      // Fire flower 🌺
      const cx = x+s/2, cy = y+s/2;
      // Stem
      ctx.fillStyle='#2ECC71';
      ctx.fillRect(cx-2,cy+2,4,s/2-2);
      // Leaf
      ctx.beginPath(); ctx.ellipse(cx-6,cy+s/4,5,3,0.5,0,Math.PI*2); ctx.fill();
      // Petals
      const colors = ['#FF6B35','#FF8C42','#FFA94D','#FF6B35','#FF8C42'];
      for (let i=0; i<5; i++) {
        const angle = (i/5)*Math.PI*2 - Math.PI/2;
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.ellipse(cx+Math.cos(angle)*7, cy-4+Math.sin(angle)*7, 5, 4, angle, 0, Math.PI*2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle='#FFD700';
      ctx.beginPath(); ctx.arc(cx,cy-4,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#C8980A';
      ctx.beginPath(); ctx.arc(cx,cy-4,2,0,Math.PI*2); ctx.fill();
    } else if (pu.type==='star') {
      // Star 🌟
      const cx = x+s/2, cy = y+s/2;
      const pulse = Math.sin(frameCount*0.1)*3;
      const r = s/2 + pulse;
      ctx.fillStyle='#FFD700';
      ctx.beginPath();
      for (let i=0; i<5; i++) {
        const a = (i*2*Math.PI/5) - Math.PI/2;
        const outer = i===0 ? ctx.moveTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r) : ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
        const innerA = a + Math.PI/5;
        ctx.lineTo(cx+Math.cos(innerA)*r*0.4, cy+Math.sin(innerA)*r*0.4);
      }
      ctx.closePath(); ctx.fill();
      // Glow ring
      ctx.strokeStyle='rgba(255,215,0,0.5)';
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,r+3,0,Math.PI*2); ctx.stroke();
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
    let label;
    if (pu.type==='bread' || pu.type==='mushroom') label='+💪';
    else if (pu.type==='tea') label='+❤️';
    else if (pu.type==='flower') label='🔥';
    else if (pu.type==='star') label='⭐';
    else label='+💪';
    ctx.fillText(label, x+s/2, y+s*1.2);
  }

  function _drawGoal(x, H) {
    const base=H-T;
    const bossAlive = currentBoss && currentBoss.alive;
    // If boss is alive, only show a faint locked marker
    if (bossAlive) {
      ctx.fillStyle='rgba(150,50,50,0.5)';
      ctx.font=`${Math.round(T*0.7)}px serif`;
      ctx.textAlign='center';
      ctx.fillText('🔒', x+T, base-T*3);
      return;
    }
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

  /* ── Boss (Dragon/Bowser style) ── */
  function _drawBoss(b) {
    const x = b.x, y = b.y, w = b.w, h = b.h, t = b.animTick;
    const pulse = Math.sin(t * 0.08) * 2;

    ctx.save();

    // Flip based on direction
    if (b.dir < 0) {
      ctx.translate(x + w, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
    }

    // Tail with spikes
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.moveTo(x - 12, y + h - 10);
    ctx.lineTo(x - 22, y + h - 14);
    ctx.lineTo(x - 10, y + h - 16);
    ctx.lineTo(x - 20, y + h - 22);
    ctx.lineTo(x - 8, y + h - 24);
    ctx.lineTo(x - 14, y + h - 30);
    ctx.lineTo(x - 2, y + h - 28);
    ctx.fill();
    // Tail tip spike
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(x - 14, y + h - 30);
    ctx.lineTo(x - 18, y + h - 38);
    ctx.lineTo(x - 8, y + h - 34);
    ctx.fill();

    // Shell (green turtle shell body)
    const shellGrad = ctx.createLinearGradient(x, y, x + w, y);
    shellGrad.addColorStop(0, '#388E3C');
    shellGrad.addColorStop(0.5, '#2E7D32');
    shellGrad.addColorStop(1, '#1B5E20');
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 12, w - 4, h - 14, 6);
    ctx.fill();

    // Shell pattern lines
    ctx.strokeStyle = 'rgba(0,80,0,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const lx = x + 8 + i * 10;
      ctx.beginPath();
      ctx.moveTo(lx, y + 14);
      ctx.lineTo(lx + 4, y + h - 6);
      ctx.stroke();
    }

    // Spikes on shell
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 4; i++) {
      const sx = x + 10 + i * 14;
      ctx.beginPath();
      ctx.moveTo(sx - 3, y + 12);
      ctx.lineTo(sx, y + 2);
      ctx.lineTo(sx + 3, y + 12);
      ctx.fill();
    }

    // Belly (lighter green)
    ctx.fillStyle = '#81C784';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 28, w - 20, h - 20, 4);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#2E7D32';
    // Back leg
    ctx.fillRect(x + 2, y + h - 8, 10, 8);
    ctx.fillRect(x + w - 12, y + h - 8, 10, 8);
    // Front feet with claws
    ctx.fillStyle = '#FFD700';
    const legAnim = Math.floor(t / 8) % 2;
    ctx.fillRect(x + 4 + legAnim * 2, y + h - 2, 6, 2);
    ctx.fillRect(x + w - 10 + legAnim * 2, y + h - 2, 6, 2);

    // Arms
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(x + 2, y + 28, 6, 14);
    ctx.fillRect(x + w - 8, y + 28, 6, 14);
    // Hands/claws
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 2, y + 40, 8, 4);
    ctx.fillRect(x + w - 10, y + 40, 8, 4);

    // Head (golden)
    const headGrad = ctx.createRadialGradient(x + 24, y + 6, 2, x + 24, y + 6, 16);
    headGrad.addColorStop(0, '#FFD700');
    headGrad.addColorStop(0.6, '#FFC107');
    headGrad.addColorStop(1, '#FFA000');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 10, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#FFB300';
    ctx.beginPath();
    ctx.ellipse(x + 36, y + 12, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x + 38, y + 10, 3, 2);
    ctx.fillRect(x + 42, y + 10, 3, 2);

    // Eyes (red)
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.arc(x + 20, y + 6, 4 + pulse * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, y + 6, 4 + pulse * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Pupils (yellow glow)
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(x + 19, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 31, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows (angry)
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 1);
    ctx.lineTo(x + 22, y + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 1);
    ctx.lineTo(x + 30, y + 3);
    ctx.stroke();

    // Mouth / Fire breath
    const mouthOpen = Math.sin(t * 0.1) > 0.3;
    if (mouthOpen) {
      // Fire breath glow
      const fireGrad = ctx.createRadialGradient(x + 44, y + 16, 0, x + 44, y + 16, 18);
      fireGrad.addColorStop(0, 'rgba(255,255,200,0.9)');
      fireGrad.addColorStop(0.3, 'rgba(255,150,50,0.8)');
      fireGrad.addColorStop(0.7, 'rgba(255,50,0,0.5)');
      fireGrad.addColorStop(1, 'rgba(200,0,0,0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.ellipse(x + 46, y + 18, 14 + Math.random() * 4, 8 + Math.random() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner fire
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(x + 48, y + 17, 5 + Math.random() * 2, 3 + Math.random() * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Closed mouth line
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 36, y + 16);
      ctx.lineTo(x + 46, y + 16);
      ctx.stroke();
    }

    // Horns
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 2);
    ctx.lineTo(x + 8, y - 8);
    ctx.lineTo(x + 18, y + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 2);
    ctx.lineTo(x + 26, y - 8);
    ctx.lineTo(x + 36, y + 2);
    ctx.fill();

    // HP bar above boss
    const hpW = w + 10;
    const hpH = 5;
    const hpX = x - 5;
    const hpY = y - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const hpRatio = b.hp / b.maxHp;
    const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpX + 1, hpY + 1, (hpW - 2) * hpRatio, hpH - 2);

    ctx.restore();
  }

  function _drawBossFireball(fb, t) {
    ctx.save();
    const pulse = Math.sin(t * 0.3) * 3;
    const gd = ctx.createRadialGradient(fb.x + 6, fb.y + 6, 0, fb.x + 6, fb.y + 6, 10 + pulse);
    gd.addColorStop(0, 'rgba(255,255,200,1)');
    gd.addColorStop(0.25, 'rgba(255,200,50,1)');
    gd.addColorStop(0.5, 'rgba(255,100,20,0.9)');
    gd.addColorStop(0.8, 'rgba(255,50,0,0.7)');
    gd.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = gd;
    ctx.beginPath();
    ctx.arc(fb.x + 6, fb.y + 6, 10 + pulse, 0, Math.PI * 2);
    ctx.fill();
    // Inner core
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(fb.x + 6, fb.y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    // Outer glow ring
    ctx.strokeStyle = 'rgba(255,100,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fb.x + 6, fb.y + 6, 14 + pulse * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
    } else if (e.type==='hammer') {
      _drawHammerBro(x,y,e.w,e.h,t);
    } else if (e.type==='lakitu') {
      _drawLakitu(x,y,e.w,e.h,t);
    } else if (e.type==='spiny') {
      _drawSpiny(x,y,e.w,e.h,t);
    } else if (e.type==='piranha') {
      _drawPiranha(x,y,e.w,e.h,t);
    } else if (e.type==='shoomp') {
      _drawShoomp(x,y,e.w,e.h,t);
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
     NEW ENEMY DRAWING
  ───────────────────────────────────────── */

  function _drawHammer(ox, oy, w, h) {
    // Hammer projectile: brown handle + gray head
    ctx.save();
    const rotation = Math.sin(frameCount*0.2 + ox*0.1) * 0.5;
    ctx.translate(ox + w/2, oy + h/2);
    ctx.rotate(rotation);
    // Handle
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-2, 0, 4, 8);
    // Head
    ctx.fillStyle = '#666';
    ctx.fillRect(-5, -6, 10, 7);
    ctx.fillStyle = '#888';
    ctx.fillRect(-4, -5, 8, 5);
    ctx.restore();
  }

  function _drawHammerBro(x, y, w, h, t) {
    // Hammer Bro — stands mostly in place, throws hammers
    // Body (blue/green shell)
    const bodyGrad = ctx.createLinearGradient(x, y, x+w, y);
    bodyGrad.addColorStop(0, '#2E7D32');
    bodyGrad.addColorStop(1, '#1B5E20');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.roundRect(x+3, y+10, w-6, h-12, 3); ctx.fill();
    // Shell pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
    for (let i=0; i<3; i++) {
      ctx.beginPath();
      ctx.moveTo(x+6+i*6, y+13); ctx.lineTo(x+6+i*6, y+h-4);
      ctx.stroke();
    }
    // Head (round)
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath(); ctx.arc(x+w/2, y+7, 8, 0, Math.PI*2); ctx.fill();
    // Hammer in hand
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x+w-6, y+8, 3, 10);
    ctx.fillStyle = '#666';
    ctx.fillRect(x+w-9, y+7, 8, 5);
    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x+w/2-3, y+6, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+3, y+6, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x+w/2-3, y+6, 1.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+3, y+6, 1.3, 0, Math.PI*2); ctx.fill();
    // Helmet
    ctx.fillStyle = '#8B4513';
    ctx.beginPath(); ctx.ellipse(x+w/2, y+3, 9, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#A0522D';
    ctx.beginPath(); ctx.ellipse(x+w/2, y+3, 7, 3, 0, Math.PI, 0); ctx.fill();
    // Feet
    const leg = Math.floor(t/6)%2;
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x+5, y+h-5, 7, leg?5:3);
    ctx.fillRect(x+w-12, y+h-5, 7, leg?3:5);
  }

  function _drawLakitu(x, y, w, h, t) {
    // Lakitu — cloud + turtle with sunglasses
    // Cloud
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x+w/2, y+h-8, 14, 0, Math.PI*2);
    ctx.arc(x+w/2-12, y+h-5, 10, 0, Math.PI*2);
    ctx.arc(x+w/2+12, y+h-5, 10, 0, Math.PI*2);
    ctx.arc(x+w/2-6, y+h-14, 9, 0, Math.PI*2);
    ctx.arc(x+w/2+6, y+h-14, 9, 0, Math.PI*2);
    ctx.fill();
    // Body (turtle shell)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath(); ctx.roundRect(x+6, y+4, w-12, 12, 3); ctx.fill();
    // Shell pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(x+10, y+8); ctx.lineTo(x+w-10, y+8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+10, y+13); ctx.lineTo(x+w-10, y+13); ctx.stroke();
    // Head
    ctx.fillStyle = '#FFCC80';
    ctx.beginPath(); ctx.arc(x+w/2, y+2, 5, 0, Math.PI*2); ctx.fill();
    // Sunglasses
    ctx.fillStyle = '#222';
    ctx.fillRect(x+w/2-6, y, 5, 3);
    ctx.fillRect(x+w/2+1, y, 5, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x+w/2-5, y+1, 3, 1);
    ctx.fillRect(x+w/2+2, y+1, 3, 1);
    // Eyes (behind glasses)
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x+w/2-3.5, y+1.5, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+3.5, y+1.5, 1, 0, Math.PI*2); ctx.fill();
    // Arms holding controller
    ctx.strokeStyle = '#FFCC80'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x+4, y+8); ctx.lineTo(x-2, y+12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w-4, y+8); ctx.lineTo(x+w+2, y+12); ctx.stroke();
    // Controller
    ctx.fillStyle = '#E63946';
    ctx.fillRect(x+w/2-4, y+12, 8, 4);
  }

  function _drawSpiny(x, y, w, h, t) {
    // Spiny — spiny shell, can't be stomped
    const leg = Math.floor(t/6)%2;
    // Spines on back
    for (let i=0; i<4; i++) {
      const sx = x + 4 + i*6;
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.moveTo(sx, y+4);
      ctx.lineTo(sx+3, y-2);
      ctx.lineTo(sx+6, y+4);
      ctx.fill();
    }
    // Body
    const bodyGrad = ctx.createRadialGradient(x+w/2, y+8, 2, x+w/2, y+8, w/2);
    bodyGrad.addColorStop(0, '#FF8888');
    bodyGrad.addColorStop(1, '#CC4444');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.roundRect(x+3, y+6, w-6, h-8, 5); ctx.fill();
    // Shell pattern
    ctx.strokeStyle = 'rgba(150,30,30,0.3)'; ctx.lineWidth=1;
    for (let i=0; i<3; i++) {
      ctx.beginPath();
      ctx.moveTo(x+5+i*7, y+8); ctx.lineTo(x+5+i*7, y+h-4);
      ctx.stroke();
    }
    // Head
    ctx.fillStyle = '#FFAA88';
    ctx.beginPath(); ctx.arc(x+w/2, y+5, 6, 0, Math.PI*2); ctx.fill();
    // Angry eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x+w/2-3, y+4, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+3, y+4, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#E63946';
    ctx.beginPath(); ctx.arc(x+w/2-3, y+4, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+3, y+4, 1.5, 0, Math.PI*2); ctx.fill();
    // Angry eyebrows
    ctx.strokeStyle = '#8B0000'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(x+w/2-6, y+1); ctx.lineTo(x+w/2-1, y+2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w/2+6, y+1); ctx.lineTo(x+w/2+1, y+2); ctx.stroke();
    // Feet
    ctx.fillStyle = '#DD6655';
    ctx.fillRect(x+5, y+h-5, 5, leg?5:3);
    ctx.fillRect(x+w-10, y+h-5, 5, leg?3:5);
  }

  function _drawPiranha(x, y, w, h, t) {
    // Piranha plant — green stem + red head with teeth
    // Only draw if not hidden (y above pipe)
    if (y > 1000) return; // off screen / hidden
    // Stem
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(x+w/2-3, y+12, 6, h-12);
    // Stem stripes
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(x+w/2-3, y+14, 6, 3);
    ctx.fillRect(x+w/2-3, y+20, 6, 3);
    // Head
    const headY = y;
    ctx.fillStyle = '#E63946';
    ctx.beginPath(); ctx.ellipse(x+w/2, headY+6, w/2-2, 10, 0, 0, Math.PI*2); ctx.fill();
    // White spots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(x+w/2-5, headY+3, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+5, headY+5, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2-3, headY+9, 2, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x+w/2-5, headY+3, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+5, headY+3, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x+w/2-5, headY+3, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2+5, headY+3, 1.5, 0, Math.PI*2); ctx.fill();
    // Mouth with teeth
    ctx.fillStyle = '#8B0000';
    ctx.beginPath(); ctx.ellipse(x+w/2, headY+10, 7, 4, 0, 0, Math.PI*2); ctx.fill();
    // Teeth
    ctx.fillStyle = '#FFF';
    for (let i=0; i<4; i++) {
      const tx = x+w/2 - 5 + i*3.5;
      ctx.fillRect(tx, headY+8, 2, 4);
    }
    // Lip
    ctx.fillStyle = '#C0392B';
    ctx.beginPath(); ctx.ellipse(x+w/2, headY+7, 8, 3, 0, Math.PI, 0); ctx.fill();
    // Leaf on top
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(x+w/2, headY-4, 4, 6, 0, Math.PI, 0);
    ctx.fill();
  }

  function _drawShoomp(x, y, w, h, t) {
    // Shoomp — tiny round flying enemy with wings
    const rotation = Math.sin(t*0.06) * 0.3;
    ctx.save();
    ctx.translate(x+w/2, y+h/2);
    ctx.rotate(rotation);
    ctx.translate(-w/2, -h/2);
    // Body (round)
    const bodyGrad = ctx.createRadialGradient(w/2, h/2-2, 2, w/2, h/2, w/2);
    bodyGrad.addColorStop(0, '#FF8A65');
    bodyGrad.addColorStop(0.7, '#D84315');
    bodyGrad.addColorStop(1, '#BF360C');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(w/2, h/2, w/2-2, 0, Math.PI*2); ctx.fill();
    // Dark bottom
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath(); ctx.ellipse(w/2, h-4, 8, 4, 0, 0, Math.PI*2); ctx.fill();
    // Wings (animated flutter)
    const wingFlap = Math.sin(t*0.3)*4;
    ctx.fillStyle = 'rgba(200,230,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(0, h/2-2, 6, 5+wingFlap, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w, h/2-2, 6, 5+wingFlap, 0.3, 0, Math.PI*2); ctx.fill();
    // Eyes (big)
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(w/2-4, h/2-4, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2+4, h/2-4, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(w/2-4, h/2-4, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2+4, h/2-4, 2.5, 0, Math.PI*2); ctx.fill();
    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(w/2-3, h/2-5, 1.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2+5, h/2-5, 1.2, 0, Math.PI*2); ctx.fill();
    // Smile
    ctx.strokeStyle = '#4E342E'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(w/2, h/2+2, 3, 0.2, Math.PI-0.2); ctx.stroke();
    // Little feet
    ctx.fillStyle = '#8D6E63';
    const leg = Math.floor(t/4)%2;
    ctx.fillRect(w/2-5, h-4, 4, leg?4:2);
    ctx.fillRect(w/2+1, h-4, 4, leg?2:4);
    ctx.restore();
  }

  function _drawPipe(px, H, pw) {
    // Green pipe with oval rim — supports both regular pipes and warp pipes
    const groundY = H - T;
    const pipeH = T * 2;
    const py = groundY - pipeH;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(px + 3, py + 3, pw, pipeH);
    // Pipe body
    const pipeGrad = ctx.createLinearGradient(px, py, px + pw, py);
    pipeGrad.addColorStop(0, '#4CAF50');
    pipeGrad.addColorStop(0.3, '#66BB6A');
    pipeGrad.addColorStop(0.7, '#43A047');
    pipeGrad.addColorStop(1, '#388E3C');
    ctx.fillStyle = pipeGrad;
    ctx.fillRect(px, py, pw, pipeH);
    // Highlight on left
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px + 2, py + 4, 4, pipeH - 8);
    // Shadow on right
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(px + pw - 5, py + 4, 4, pipeH - 8);
    // Oval rim (top edge with elliptical border)
    const rimY = py - 4;
    const rimH = 8;
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, rimY + rimH / 2, pw / 2 + 4, rimH / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    const rimGrad = ctx.createLinearGradient(px - 4, rimY, px - 4, rimY + rimH);
    rimGrad.addColorStop(0, '#66BB6A');
    rimGrad.addColorStop(1, '#388E3C');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, rimY + rimH / 2, pw / 2 + 4, rimH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner dark hole
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, rimY + rimH / 2 - 1, pw / 2 - 2, rimH / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(px + pw / 2 - pw * 0.15, rimY + rimH / 2 - 2, pw * 0.25, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ─────────────────────────────────────────
     ? BLOCK DRAWING
  ───────────────────────────────────────── */
  function _drawQBlock(qb) {
    const x = qb.x, y = qb.y, hit = qb.hit;
    if (hit) {
      // Hit / empty block — greyed out, no shine
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(x, y, T, T);
      ctx.strokeStyle = '#6B5335';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, T, T);
      // Inner dark
      ctx.fillStyle = '#6B5335';
      ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
      return;
    }
    // Glow animation
    const pulse = Math.sin(frameCount * 0.08) * 0.2 + 0.8;
    // Yellow box
    const qg = ctx.createLinearGradient(x, y, x, y + T);
    qg.addColorStop(0, '#F5C842');
    qg.addColorStop(0.5, '#FFE066');
    qg.addColorStop(1, '#C8980A');
    ctx.fillStyle = qg;
    ctx.beginPath();
    ctx.roundRect(x, y, T, T, 3);
    ctx.fill();
    // Border
    ctx.strokeStyle = '#A07008';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, T, T, 3);
    ctx.stroke();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 2, y + 2, T - 4, 4);
    // ? mark
    ctx.fillStyle = '#FFF';
    ctx.globalAlpha = pulse;
    ctx.font = `bold ${Math.round(T * 0.7)}px Cairo,Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + T / 2, y + T / 2 + 1);
    ctx.globalAlpha = 1;
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

    // Star mode color cycling overlay
    if (P.starTimer > 0) {
      const starColors = ['#FF6B35','#FFD700','#2ECC71','#3498DB','#E63946','#9B59B6'];
      const ci = Math.floor(frameCount/4) % starColors.length;
      ctx.fillStyle = starColors[ci];
      ctx.globalAlpha = 0.25;
      ctx.fillRect(px, py, P.w, P.h+2);
      ctx.globalAlpha = 1;
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

    // Power-up indicators
    ctx.textAlign='left';
    ctx.font='11px Cairo,Arial';
    let puIndicator = '';
    if (P.hasFire) puIndicator += '🔥';
    if (P.starTimer > 0) puIndicator += '⭐';
    if (puIndicator) {
      ctx.fillStyle='rgba(255,255,255,0.6)';
      ctx.fillText(puIndicator, 8, 34);
    }
  }

  /* ─────────────────────────────────────────
     SCREENS
  ───────────────────────────────────────── */
  function _drawCountdownOverlay(W,H) {
    // Semi-transparent overlay
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.textBaseline='middle';

    const remaining = Math.ceil(countdownTimer / 30); // 3, 2, 1
    const display = remaining > 3 ? '3' : remaining > 2 ? '2' : remaining > 1 ? '1' : 'ابدأ!';
    const fontSize = display === 'ابدأ!' ? Math.round(W*0.1) : Math.round(W*0.14);
    const col = display === 'ابدأ!' ? '#2ECC71' : '#F5C842';

    ctx.shadowColor=col; ctx.shadowBlur=30;
    ctx.fillStyle=col;
    ctx.font=`bold ${fontSize}px Cairo,Arial`;
    ctx.fillText(display, W/2, H/2);
    ctx.shadowBlur=0;
  }

  /* ── Boss Defeat Celebration ── */
  function _drawBossDefeatOverlay(W,H) {
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const pulse = Math.sin(frameCount*0.08)*2;
    // Emoji celebration
    ctx.font=`${Math.round(W*0.13)}px serif`;
    ctx.fillStyle='#FFD700';
    const emojis = ['🎉','🎊','🌟','✨','🎉'];
    const ei = Math.floor(frameCount/8)%emojis.length;
    ctx.fillText(emojis[ei]+' '+emojis[(ei+1)%emojis.length]+' '+emojis[(ei+2)%emojis.length], W/2, H*0.32+pulse);
    // Text
    ctx.shadowColor='#FFD700'; ctx.shadowBlur=20;
    ctx.font=`bold ${Math.round(W*0.07)}px Cairo,Arial`;
    ctx.fillStyle='#F5C842';
    ctx.fillText('🔥 هزمت التنين! 🔥', W/2, H*0.47);
    ctx.shadowBlur=0;
    // Score bonus
    ctx.font=`${Math.round(W*0.045)}px Cairo,Arial`;
    ctx.fillStyle='#FFF';
    ctx.fillText(`⭐ +1000 نقطة مكافأة`, W/2, H*0.57);
    // Hint
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.font=`${Math.round(W*0.03)}px Cairo,Arial`;
    ctx.fillText('اذهب إلى العلم لإكمال المستوى ➡️', W/2, H*0.67);
  }

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
    ctx.fillText('🍄 مشروم = قوة  |  🔥 زهرة نار = نار  |  ⭐ نجمة = منيعة  |  ☕ أتاي = حياة', W/2, H*0.49);

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
