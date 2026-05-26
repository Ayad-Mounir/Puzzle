/* ============================================================
   MEMORY GAME — لعبة الذاكرة
   ============================================================ */

const MEMORY = (() => {

  /* ── Emoji pools ── */
  const POOL_4 = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'];
  const POOL_6 = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
                  '🐨','🐯','🦁','🐮','🐷','🐸','🐙','🦋',
                  '🌸','🍎'];

  /* ── State ── */
  let gridSize    = 4;
  let cards       = [];       // { emoji, index, el }
  let flipped     = [];       // max 2
  let matched     = 0;
  let moves       = 0;
  let timer       = null;
  let seconds     = 0;
  let locked      = false;
  let started     = false;
  let initialized = false;

  /* ── DOM refs ── */
  function el(id) { return document.getElementById(id); }

  /* ── Init ── */
  function init() {
    if (initialized) return;
    initialized = true;

    el('memDiff4').addEventListener('click', () => setDifficulty(4));
    el('memDiff6').addEventListener('click', () => setDifficulty(6));
    el('memNewBtn').addEventListener('click', newGame);
    el('memWinClose').addEventListener('click', () => el('memWinOverlay').classList.remove('show'));
    el('memWinNew').addEventListener('click', () => { el('memWinOverlay').classList.remove('show'); newGame(); });

    newGame();
  }

  /* ── Difficulty ── */
  function setDifficulty(size) {
    gridSize = size;
    el('memDiff4').classList.toggle('active', size === 4);
    el('memDiff6').classList.toggle('active', size === 6);
    newGame();
  }

  /* ── New Game ── */
  function newGame() {
    clearInterval(timer);
    seconds = 0; moves = 0; matched = 0;
    flipped = []; locked = false; started = false;
    _updateStats();
    _buildBoard();
  }

  /* ── Build Board ── */
  function _buildBoard() {
    const board = el('memBoard');
    board.innerHTML = '';
    board.className = 'mem-board ' + (gridSize === 4 ? 'grid-4' : 'grid-6');

    const pool  = gridSize === 4 ? POOL_4 : POOL_6;
    const total = gridSize * gridSize;
    const pairs = total / 2;
    const emojis = _shuffle([...pool.slice(0, pairs), ...pool.slice(0, pairs)]);

    cards = emojis.map((emoji, i) => {
      const card = document.createElement('div');
      card.className = 'mem-card';
      card.innerHTML = `
        <div class="mem-card-inner">
          <div class="mem-card-front"></div>
          <div class="mem-card-back">${emoji}</div>
        </div>`;
      card.addEventListener('click', () => _onCardClick(i));
      board.appendChild(card);
      return { emoji, index: i, el: card };
    });
  }

  /* ── Card Click ── */
  function _onCardClick(i) {
    const card = cards[i];
    if (locked) return;
    if (card.el.classList.contains('flipped')) return;
    if (card.el.classList.contains('matched')) return;

    // Start timer on first click
    if (!started) {
      started = true;
      timer = setInterval(() => { seconds++; _updateTimer(); }, 1000);
    }

    card.el.classList.add('flipped');
    AUDIO.play('move');
    flipped.push(i);

    if (flipped.length === 2) {
      moves++;
      _updateMoves();
      locked = true;
      _checkMatch();
    }
  }

  /* ── Check Match ── */
  function _checkMatch() {
    const [a, b] = flipped;
    if (cards[a].emoji === cards[b].emoji) {
      // Match!
      setTimeout(() => {
        cards[a].el.classList.add('matched');
        cards[b].el.classList.add('matched');
        AUDIO.play('win');
        flipped = [];
        locked  = false;
        matched++;
        _updatePairs();
        if (matched === (gridSize * gridSize) / 2) _onWin();
      }, 400);
    } else {
      // No match — shake then flip back
      setTimeout(() => {
        cards[a].el.classList.add('wrong');
        cards[b].el.classList.add('wrong');
      }, 200);
      setTimeout(() => {
        cards[a].el.classList.remove('flipped', 'wrong');
        cards[b].el.classList.remove('flipped', 'wrong');
        flipped = [];
        locked  = false;
      }, 900);
    }
  }

  /* ── Win ── */
  function _onWin() {
    clearInterval(timer);
    const key   = `mem_best_${gridSize}`;
    const prev  = parseInt(localStorage.getItem(key) || '0');
    const score = moves;
    const isRecord = !prev || score < prev;
    if (isRecord) localStorage.setItem(key, score);

    setTimeout(() => {
      el('memWinTime').textContent   = _fmtTime(seconds);
      el('memWinMoves').textContent  = moves;
      el('memRecordBadge').classList.toggle('show', isRecord);
      el('memWinOverlay').classList.add('show');
      if (typeof triggerConfetti === 'function') triggerConfetti();
    }, 400);
  }

  /* ── Stats ── */
  function _updateStats()  { _updateTimer(); _updateMoves(); _updatePairs(); }
  function _updateTimer()  { el('memTimer').textContent  = _fmtTime(seconds); }
  function _updateMoves()  { el('memMoves').textContent  = moves; }
  function _updatePairs()  {
    const total = (gridSize * gridSize) / 2;
    el('memPairs').textContent = matched + ' / ' + total;
    const key  = `mem_best_${gridSize}`;
    const best = localStorage.getItem(key);
    el('memBest').textContent = best ? best + ' حركة' : '—';
  }

  /* ── Helpers ── */
  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function _fmtTime(s) {
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  return { init, newGame, initialized: false };
})();
