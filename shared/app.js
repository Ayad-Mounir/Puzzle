/* ============================================================
   APP BOOT & GAME SWITCHER
   ============================================================ */

  /* ============================================================
     BOOT
  ============================================================ */
  window.addEventListener('DOMContentLoaded', () => {
    function hideLoader() {
      var el = document.getElementById('loadingScreen');
      if (el) { el.style.display = 'none'; }
    }
    setTimeout(hideLoader, 400);
    setTimeout(hideLoader, 3000);

    // Sync mute button state on load
    if (AUDIO.muted) {
      const btn = document.getElementById('muteBtn');
      if (btn) { btn.textContent = '🔇 الصوت'; btn.classList.add('muted'); }
    }

    // Show home screen — don't init any game yet
    document.getElementById('appWrapper').style.display = 'none';
  });

  /* ============================================================
     HOME → GAME
  ============================================================ */
  function enterGame(game) {
    const home = document.getElementById('homeScreen');
    home.classList.add('hide');
    setTimeout(() => {
      home.style.display = 'none';
      document.getElementById('appWrapper').style.display = '';
      switchGame(game);
    }, 420);
  }

  /* ============================================================
     BACK TO HOME
  ============================================================ */
  function goHome() {
    const home = document.getElementById('homeScreen');
    home.style.display = '';
    home.classList.remove('hide');
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
    const tabPuzzle = document.getElementById('tabPuzzle');
    const tabDama   = document.getElementById('tabDama');
    const tabSnake  = document.getElementById('tabSnake');
    const tabMemory = document.getElementById('tabMemory');
    const title     = document.getElementById('mainTitle');
    const subtitle  = document.getElementById('mainSubtitle');
    const footer    = document.getElementById('mainFooter');

    // Reset all
    puzzleEls.forEach(el => { if (el) el.style.display = 'none'; });
    damaSection.classList.remove('visible');
    snakeSection.classList.remove('visible');
    memorySection.classList.remove('visible');
    [tabPuzzle, tabDama, tabSnake, tabMemory].forEach(t => { if (t) t.classList.remove('active'); });

    if (game === 'puzzle') {
      puzzleEls.forEach(el => { if (el) el.style.display = ''; });
      tabPuzzle.classList.add('active');
      title.textContent    = '🧩 Sliding Puzzle';
      subtitle.textContent = 'اللغز المنزلق الكلاسيكي';
      footer.textContent   = 'v2.0 — Phase 5: Sound + Ghost + Share ✅';

    } else if (game === 'dama') {
      damaSection.classList.add('visible');
      tabDama.classList.add('active');
      title.textContent    = '♟️ الداما المغربية';
      subtitle.textContent = 'MOROCCAN CHECKERS';
      footer.textContent   = 'v2.0 — الداما المغربية 🏆';
      if (!DAMA.initialized) { damaInit(); }

    } else if (game === 'snake') {
      snakeSection.classList.add('visible');
      tabSnake.classList.add('active');
      title.textContent    = '🐍 لعبة التعبان';
      subtitle.textContent = 'CLASSIC SNAKE';
      footer.textContent   = 'v5.0 — التعبان الكلاسيكي 🐍';
      SNAKE.init();

    } else if (game === 'memory') {
      memorySection.classList.add('visible');
      tabMemory.classList.add('active');
      title.textContent    = '🎴 لعبة الذاكرة';
      subtitle.textContent = 'MEMORY CARDS';
      footer.textContent   = 'v6.0 — لعبة الذاكرة 🎴';
      MEMORY.init();
    }
  }
