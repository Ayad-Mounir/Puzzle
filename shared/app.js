/* ============================================================
   APP BOOT & GAME SWITCHER
   ============================================================ */

  /* ============================================================
     BOOT
  ============================================================ */
  function boot() {
    // Hide loader
    function hideLoader() {
      var el = document.getElementById('loadingScreen');
      if (el) { el.style.display = 'none'; }
    }
    setTimeout(hideLoader, 400);
    setTimeout(hideLoader, 3000);

    // Sync mute button
    if (typeof AUDIO !== 'undefined' && AUDIO.muted) {
      const btn = document.getElementById('muteBtn');
      if (btn) { btn.textContent = '🔇 الصوت'; btn.classList.add('muted'); }
    }

    // Start on Home Screen
    var wrapper = document.getElementById('appWrapper');
    if (wrapper) wrapper.style.display = 'none';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ============================================================
     HOME → GAME
  ============================================================ */
  function enterGame(game) {
    const home = document.getElementById('homeScreen');
    home.classList.add('hide');
    setTimeout(() => {
      home.style.display   = 'none';
      const wrap = document.getElementById('appWrapper');
      wrap.style.display   = '';
      // Wait one frame for DOM to paint before init
      requestAnimationFrame(() => requestAnimationFrame(() => switchGame(game)));
    }, 420);
  }

  /* ============================================================
     BACK TO HOME
  ============================================================ */
  function goHome() {
    const home = document.getElementById('homeScreen');
    home.style.display = '';
    // Reset hide class after a tick so transition replays next time
    setTimeout(() => home.classList.remove('hide'), 10);
    document.getElementById('appWrapper').style.display = 'none';
  }

  /* ============================================================
     GAME SWITCHER
  ============================================================ */
  function switchGame(game) {
    const puzzleEls = [
      document.querySelector('.install-banner'),
      document.getElementById('uploadArea'),
      document.querySelector('.mode-switcher'),
      document.querySelector('.difficulty-switcher'),
      document.querySelector('.stats-bar'),
      document.getElementById('boardContainer'),
      document.querySelector('.actions'),
      document.getElementById('solverInfo'),
      document.querySelector('.secondary-controls'),
      document.querySelector('.highscore-panel'),
    ];
    const damaSection   = document.getElementById('damaSection');
    const snakeSection  = document.getElementById('snakeSection');
    const memorySection = document.getElementById('memorySection');
    const marioSection  = document.getElementById('marioSection');
    const xoSection     = document.getElementById('xoSection');
    const titleEl    = document.getElementById('mainTitle');
    const subtitleEl = document.getElementById('mainSubtitle');
    const footerEl   = document.getElementById('mainFooter');

    // Reset all sections
    puzzleEls.forEach(e => { if (e) e.style.display = 'none'; });
    damaSection.classList.remove('visible');
    snakeSection.classList.remove('visible');
    memorySection.classList.remove('visible');
    marioSection.classList.remove('visible');
    xoSection.classList.remove('visible');

    if (game === 'puzzle') {
      puzzleEls.forEach(e => { if (e) e.style.display = ''; });
      titleEl.textContent    = '🧩 Sliding Puzzle';
      subtitleEl.textContent = 'اللغز المنزلق الكلاسيكي';
      footerEl.textContent   = 'v2.0 — اللغز المنزلق 🧩';
      if (typeof initGame === 'function') initGame();

    } else if (game === 'dama') {
      titleEl.textContent    = '♟️ الداما المغربية';
      subtitleEl.textContent = 'MOROCCAN CHECKERS';
      footerEl.textContent   = 'v2.0 — الداما المغربية ♟️';
      damaSection.classList.add('visible');
      // Init after section is visible so board has dimensions
      setTimeout(() => {
        if (!DAMA.initialized) { damaInit(); }
        else { damaRender(); }
      }, 60);

    } else if (game === 'snake') {
      titleEl.textContent    = '🐍 لعبة التعبان';
      subtitleEl.textContent = 'CLASSIC SNAKE';
      footerEl.textContent   = 'v5.0 — التعبان الكلاسيكي 🐍';
      snakeSection.classList.add('visible');
      setTimeout(() => SNAKE.init(), 60);

    } else if (game === 'memory') {
      titleEl.textContent    = '🎴 لعبة الذاكرة';
      subtitleEl.textContent = 'MEMORY CARDS';
      footerEl.textContent   = 'v6.0 — لعبة الذاكرة 🎴';
      memorySection.classList.add('visible');
      // Always start fresh — reset initialized so board rebuilds
      setTimeout(() => {
        MEMORY.initialized = false;
        MEMORY.init();
      }, 60);

    } else if (game === 'mario') {
      titleEl.textContent    = '🧒 ولد الحارة';
      subtitleEl.textContent = 'PLATFORMER';
      footerEl.textContent   = 'v1.0 — ولد الحارة 🧒';
      marioSection.classList.add('visible');
      setTimeout(() => {
        PLATFORMER.initialized = false;
        PLATFORMER.init();
      }, 80);
    } else if (game === 'xo') {
      titleEl.textContent    = '❌⭕ لعبة XO';
      subtitleEl.textContent = 'TIC-TAC-TOE';
      footerEl.textContent   = 'v1.0 — لعبة XO ❌⭕';
      xoSection.classList.add('visible');
      setTimeout(() => {
        if (!XO.initialized) { XO.init(); }
        else { XO.reset(); }
      }, 60);
    }
  }
