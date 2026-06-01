/* ============================================================
   XO GAME — TIC-TAC-TOE with AI Minimax
   ============================================================ */

const XO = (() => {

  /* ── State ── */
  let board       = Array(9).fill(null);   // null | 'X' | 'O'
  let currentPlayer = 'X';                  // Human = X, AI = O
  let difficulty    = 'easy';               // easy | medium | hard
  let gameOver      = false;
  let initialized   = false;
  let lockBoard     = false;               // lock during AI turn
  const scores      = { x: 0, o: 0, draw: 0 };

  /* ── Players ── */
  const HUMAN = 'X';
  const AI_P  = 'O';

  /* ── Win lines (8 possibilities) ── */
  const WIN_LINES = [
    [0,1,2], [3,4,5], [6,7,8],   // rows
    [0,3,6], [1,4,7], [2,5,8],   // cols
    [0,4,8], [2,4,6]             // diags
  ];

  /* ── DOM helpers ── */
  function el(id) { return document.getElementById(id); }

  /* ── Init ── */
  function init() {
    if (initialized) return;
    initialized = true;

    // Difficulty buttons
    const diffBtns = document.querySelectorAll('.xo-diff-btn');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const level = this.getAttribute('onclick')?.match(/'(easy|medium|hard)'/)?.[1];
        if (level) setDifficulty(level);
      });
    });

    // Build board
    buildBoard();
    renderScore();
    renderStatus();

    // Set initial difficulty active
    setDifficulty('easy');
  }

  /* ── Build Board ── */
  function buildBoard() {
    const boardEl = el('xoBoard');
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'xo-cell';
      cell.dataset.index = i;
      cell.addEventListener('click', () => handleClick(i));
      boardEl.appendChild(cell);
    }
  }

  /* ── Render ── */
  function render() {
    const cells = el('xoBoard').children;
    for (let i = 0; i < 9; i++) {
      const cell = cells[i];
      // Reset classes except base
      cell.className = 'xo-cell';
      if (board[i]) {
        cell.textContent = board[i];
        cell.classList.add(board[i] === 'X' ? 'x' : 'o');
        cell.classList.add('filled');
      } else {
        cell.textContent = '';
      }
    }
  }

  /* ── Handle Click (Human X) ── */
  function handleClick(idx) {
    if (gameOver || lockBoard) return;
    if (board[idx] !== null) return;
    if (currentPlayer !== HUMAN) return;

    // Place X
    board[idx] = HUMAN;
    render();

    // Check win/draw
    if (checkWin(board, HUMAN)) {
      endGame('win');
      return;
    }
    if (getAvailableMoves(board).length === 0) {
      endGame('draw');
      return;
    }

    // AI turn
    currentPlayer = AI_P;
    renderStatus();
    lockBoard = true;

    // Small delay so player sees their move before AI
    setTimeout(() => {
      aiMove();
      lockBoard = false;

      if (checkWin(board, AI_P)) {
        endGame('lose');
        return;
      }
      if (getAvailableMoves(board).length === 0) {
        endGame('draw');
        return;
      }

      currentPlayer = HUMAN;
      renderStatus();
    }, 300);
  }

  /* ── AI Move ── */
  function aiMove() {
    const moves = getAvailableMoves(board);
    if (moves.length === 0) return;

    let chosenIdx;

    if (difficulty === 'easy') {
      // Random
      chosenIdx = moves[Math.floor(Math.random() * moves.length)];
    } else if (difficulty === 'medium') {
      // Minimax depth 2
      let bestScore = -Infinity;
      let bestMoves = [];
      for (const idx of moves) {
        board[idx] = AI_P;
        const score = minimax(board, 2, false, -Infinity, Infinity);
        board[idx] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [idx];
        } else if (score === bestScore) {
          bestMoves.push(idx);
        }
      }
      chosenIdx = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    } else {
      // Hard: full Minimax depth 9
      let bestScore = -Infinity;
      let bestMoves = [];
      for (const idx of moves) {
        board[idx] = AI_P;
        const score = minimax(board, 9, false, -Infinity, Infinity);
        board[idx] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [idx];
        } else if (score === bestScore) {
          bestMoves.push(idx);
        }
      }
      chosenIdx = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    board[chosenIdx] = AI_P;
    render();
  }

  /* ── Minimax with Alpha-Beta Pruning ── */
  function minimax(brd, depth, isMaximizing, alpha, beta) {
    // Terminal conditions
    if (checkWin(brd, AI_P)) return 10 + depth;   // AI wins (prefer sooner)
    if (checkWin(brd, HUMAN)) return -10 - depth; // Human wins (prefer later)
    if (getAvailableMoves(brd).length === 0) return 0; // Draw
    if (depth === 0) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const idx of getAvailableMoves(brd)) {
        brd[idx] = AI_P;
        const evalScore = minimax(brd, depth - 1, false, alpha, beta);
        brd[idx] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const idx of getAvailableMoves(brd)) {
        brd[idx] = HUMAN;
        const evalScore = minimax(brd, depth - 1, true, alpha, beta);
        brd[idx] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /* ── Check Win ── */
  function checkWin(brd, player) {
    return WIN_LINES.some(line =>
      line.every(idx => brd[idx] === player)
    );
  }

  /* ── Get winning line indices (for highlighting) ── */
  function getWinningLine(brd, player) {
    for (const line of WIN_LINES) {
      if (line.every(idx => brd[idx] === player)) return line;
    }
    return null;
  }

  /* ── Get available moves ── */
  function getAvailableMoves(brd) {
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (brd[i] === null) moves.push(i);
    }
    return moves;
  }

  /* ── End Game ── */
  function endGame(result) {
    gameOver = true;
    lockBoard = false;

    if (result === 'win') {
      scores.x++;
      renderStatus('لقد فزت! 🎉');
      highlightWin(HUMAN);
    } else if (result === 'lose') {
      scores.o++;
      renderStatus('الكمبيوتر فاز! 🤖');
      highlightWin(AI_P);
    } else {
      scores.draw++;
      renderStatus('تعادل! 🤝');
    }

    renderScore();
    currentPlayer = HUMAN;
  }

  /* ── Highlight winning cells ── */
  function highlightWin(player) {
    const line = getWinningLine(board, player);
    if (!line) return;
    const cells = el('xoBoard').children;
    line.forEach(idx => {
      cells[idx].classList.add('win');
    });
  }

  /* ── Render Status ── */
  function renderStatus(msg) {
    const statusEl = el('xoStatus');
    if (msg) {
      statusEl.textContent = msg;
      return;
    }
    if (currentPlayer === HUMAN) {
      statusEl.textContent = 'دورك ❌';
    } else {
      statusEl.textContent = 'الكمبيوتر ⭕ يفكر...';
    }
  }

  /* ── Render Score ── */
  function renderScore() {
    el('xoScoreX').textContent    = scores.x;
    el('xoScoreO').textContent    = scores.o;
    el('xoScoreDraw').textContent = scores.draw;
  }

  /* ── Reset ── */
  function reset() {
    board = Array(9).fill(null);
    currentPlayer = HUMAN;
    gameOver = false;
    lockBoard = false;
    render();
    renderStatus();
    // If hard difficulty, AI can go first sometimes? No — X always starts as human
  }

  /* ── Set Difficulty ── */
  function setDifficulty(level) {
    difficulty = level;
    // Update buttons
    document.querySelectorAll('.xo-diff-btn').forEach(btn => {
      const btnLevel = btn.textContent.includes('سهل') ? 'easy' :
                       btn.textContent.includes('متوسط') ? 'medium' : 'hard';
      btn.classList.toggle('active', btnLevel === level);
    });
  }

  /* ── Public API ── */
  return { init, reset, setDifficulty, initialized };

})();
