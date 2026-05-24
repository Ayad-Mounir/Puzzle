  /* ============================================================
     DAMA ENGINE — الداما المغربية
  ============================================================ */
  const DAMA = {
    initialized: false,
    board: [],          // 8×8 — null | {color:'red'|'blue', king:bool}
    turn: 'red',        // 'red' | 'blue'
    selected: null,     // {r,c} or null
    mustCapture: [],    // [{r,c}] pieces that MUST capture
    moves: 0,
    history: [],        // for undo
    aiEnabled: false,
    aiColor: 'blue',
    aiTimer: null,
    lastMove: [],       // [{r,c}] for highlighting
  };

  /* --- Board Setup --- */
  function damaInit() {
    DAMA.initialized = true;
    damaNewGame();
  }

  function damaNewGame() {
    clearTimeout(DAMA.aiTimer);
    DAMA.board = Array.from({length:8}, () => Array(8).fill(null));
    DAMA.turn = 'red';
    DAMA.selected = null;
    DAMA.moves = 0;
    DAMA.history = [];
    DAMA.lastMove = [];
    DAMA.mustCapture = [];

    // Place pieces: blue top (rows 0-2), red bottom (rows 5-7)
    // Dark squares only: (r+c) % 2 === 1
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r <= 2) DAMA.board[r][c] = {color:'blue', king:false};
          else if (r >= 5) DAMA.board[r][c] = {color:'red',  king:false};
        }
      }
    }

    damaRender();
    damaUpdateUI();
    closeDamaMsg();

    // If AI is on and it's AI's turn, schedule move
    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) {
      scheduleAI();
    }
  }

  /* --- Rendering --- */
  function damaRender() {
    const boardEl = document.getElementById('damaBoard');
    if (!boardEl) return;

    // Compute valid targets if something is selected
    let validTargets = [];
    if (DAMA.selected) {
      const moves = damaGetMoves(DAMA.selected.r, DAMA.selected.c, DAMA.board);
      validTargets = moves.map(m => ({r: m.toR, c: m.toC}));
    }

    // استخدام DocumentFragment لمنع reflow متعدد (يمنع اهتزاز الشاشة)
    const fragment = document.createDocumentFragment();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'dama-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

        // Highlight last move
        if (DAMA.lastMove.some(lm => lm.r === r && lm.c === c)) {
          cell.classList.add('last-move');
        }

        // Selected
        if (DAMA.selected && DAMA.selected.r === r && DAMA.selected.c === c) {
          cell.classList.add('selected');
        }

        // Possible target
        if (validTargets.some(t => t.r === r && t.c === c)) {
          cell.classList.add('possible-move');
        }

        // Piece
        const piece = DAMA.board[r][c];
        if (piece) {
          const p = document.createElement('div');
          p.className = 'dama-piece ' + piece.color + '-piece' + (piece.king ? ' king' : '');
          cell.appendChild(p);
        }

        cell.addEventListener('click', () => damaHandleClick(r, c));
        fragment.appendChild(cell);
      }
    }
    // إعادة رسم اللوحة دفعة واحدة — يمنع الاهتزاز
    boardEl.innerHTML = '';
    boardEl.appendChild(fragment);
  }

  function damaUpdateUI() {
    const redCount  = DAMA.board.flat().filter(p => p && p.color === 'red').length;
    const blueCount = DAMA.board.flat().filter(p => p && p.color === 'blue').length;
    document.getElementById('damaRedCount').textContent  = redCount;
    document.getElementById('damaBlueCount').textContent = blueCount;
    document.getElementById('damaMoveCount').textContent = DAMA.moves;

    const dot  = document.getElementById('turnDot');
    const text = document.getElementById('turnText');
    dot.className  = 'turn-dot ' + DAMA.turn;
    text.textContent = DAMA.turn === 'red' ? 'دور اللاعب الأحمر 🔴' : 'دور اللاعب الأزرق 🔵';

    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) {
      text.textContent = '🤖 الذكاء الاصطناعي يلعب...';
    }
  }

  /* --- Click Handler --- */
  function damaHandleClick(r, c) {
    // Don't allow human moves during AI turn
    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) return;

    const piece = DAMA.board[r][c];

    // Clicking own piece → select it (only if allowed)
    if (piece && piece.color === DAMA.turn) {
      // If must-capture list exists, only selectable pieces are in that list
      if (DAMA.mustCapture.length > 0 &&
          !DAMA.mustCapture.some(mc => mc.r === r && mc.c === c)) {
        return; // piece is not allowed to move
      }
      DAMA.selected = {r, c};
      damaRender();
      return;
    }

    // Clicking a destination
    if (DAMA.selected) {
      const moves = damaGetMoves(DAMA.selected.r, DAMA.selected.c, DAMA.board);
      const move  = moves.find(m => m.toR === r && m.toC === c);
      if (move) {
        damaExecuteMove(move, true);
        return;
      }
    }

    // Deselect
    DAMA.selected = null;
    damaRender();
  }

  /* --- Move Execution --- */
  function damaExecuteMove(move, checkMultiCapture) {
    // Save state for undo
    DAMA.history.push({
      board: JSON.parse(JSON.stringify(DAMA.board)),
      turn: DAMA.turn,
      moves: DAMA.moves,
      lastMove: [...DAMA.lastMove],
      mustCapture: [...DAMA.mustCapture],
    });

    const piece = DAMA.board[move.fromR][move.fromC];
    DAMA.board[move.fromR][move.fromC] = null;
    DAMA.board[move.toR][move.toC] = piece;
    DAMA.lastMove = [{r: move.fromR, c: move.fromC}, {r: move.toR, c: move.toC}];

    // Remove captured piece
    if (move.captureR !== undefined) {
      DAMA.board[move.captureR][move.captureC] = null;
    }

    // Promotion to king
    if (!piece.king) {
      if (piece.color === 'red'  && move.toR === 0) piece.king = true;
      if (piece.color === 'blue' && move.toR === 7) piece.king = true;
    }

    DAMA.moves++;
    DAMA.selected = null;
    DAMA.mustCapture = [];

    // Multi-capture: check if same piece can capture again
    if (checkMultiCapture && move.captureR !== undefined) {
      const furtherCaptures = damaGetMoves(move.toR, move.toC, DAMA.board)
        .filter(m => m.captureR !== undefined);

      if (furtherCaptures.length > 0) {
        // Same player must continue capturing with this piece
        DAMA.selected = {r: move.toR, c: move.toC};
        DAMA.mustCapture = [{r: move.toR, c: move.toC}];
        damaRender();
        damaUpdateUI();
        // If it's AI's piece doing multi-capture, continue
        if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) {
          scheduleAI(400);
        }
        return;
      }
    }

    // Switch turn
    DAMA.turn = DAMA.turn === 'red' ? 'blue' : 'red';

    // Check win condition
    const redPieces  = DAMA.board.flat().filter(p => p && p.color === 'red').length;
    const bluePieces = DAMA.board.flat().filter(p => p && p.color === 'blue').length;

    if (redPieces === 0) {
      damaRender(); damaUpdateUI();
      setTimeout(() => showDamaWin('blue'), 400);
      return;
    }
    if (bluePieces === 0) {
      damaRender(); damaUpdateUI();
      setTimeout(() => showDamaWin('red'), 400);
      return;
    }

    // Check if current player is stuck (no moves)
    const allMoves = damaGetAllMoves(DAMA.turn, DAMA.board);
    if (allMoves.length === 0) {
      damaRender(); damaUpdateUI();
      const winner = DAMA.turn === 'red' ? 'blue' : 'red';
      setTimeout(() => showDamaWin(winner), 400);
      return;
    }

    // Mandatory capture check for next turn
    const captures = allMoves.filter(m => m.captureR !== undefined);
    if (captures.length > 0) {
      // Only pieces that can capture are selectable
      const capturePieces = [...new Set(captures.map(m => m.fromR + ',' + m.fromC))]
        .map(s => ({r: parseInt(s), c: parseInt(s.split(',')[1])}));
      DAMA.mustCapture = capturePieces;
    }

    damaRender();
    damaUpdateUI();

    // AI move if enabled
    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) {
      scheduleAI(600);
    }
  }

  /* --- Move Generator --- */
  // Returns [{fromR, fromC, toR, toC, captureR?, captureC?}]
  function damaGetMoves(r, c, board) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];

    if (piece.king) {
      // King: slides diagonally any distance, can capture by jumping
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (!board[nr][nc]) {
            moves.push({fromR:r, fromC:c, toR:nr, toC:nc});
            nr += dr; nc += dc;
          } else if (board[nr][nc].color !== piece.color) {
            // Can capture if square after is empty
            const jr = nr + dr, jc = nc + dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[jr][jc]) {
              // King can land on any square beyond
              let lr = jr, lc = jc;
              while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && !board[lr][lc]) {
                moves.push({fromR:r, fromC:c, toR:lr, toC:lc,
                            captureR:nr, captureC:nc});
                lr += dr; lc += dc;
              }
            }
            break;
          } else {
            break; // own piece
          }
        }
      }
    } else {
      // Normal piece: move forward (and capture backward too in Moroccan rules)
      const forward = piece.color === 'red' ? -1 : 1;

      // الحركة العادية للأمام فقط (اتجاهان قطريان)
      // الأحمر يتحرك للأعلى (forward = -1)، الأزرق للأسفل (forward = +1)
      for (const dc of [-1, 1]) {
        const nr = r + forward, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
          moves.push({fromR:r, fromC:c, toR:nr, toC:nc});
        }
      }

      // الأكل في 4 اتجاهات قطرية (القواعد المغربية — الأكل للأمام والخلف)
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        const jr = r + 2*dr, jc = c + 2*dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 &&
            jr >= 0 && jr < 8 && jc >= 0 && jc < 8 &&
            board[nr][nc] && board[nr][nc].color !== piece.color &&
            !board[jr][jc]) {
          moves.push({fromR:r, fromC:c, toR:jr, toC:jc,
                      captureR:nr, captureC:nc});
        }
      }
    }

    return moves;
  }

  function damaGetAllMoves(color, board) {
    const all = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && board[r][c].color === color) {
          all.push(...damaGetMoves(r, c, board));
        }
      }
    }
    // Mandatory capture: if any capture exists, only return captures
    const captures = all.filter(m => m.captureR !== undefined);
    return captures.length > 0 ? captures : all;
  }

  /* --- Undo --- */
  function damaUndoMove() {
    if (DAMA.history.length === 0) return;
    clearTimeout(DAMA.aiTimer);
    const prev = DAMA.history.pop();
    DAMA.board       = prev.board;
    DAMA.turn        = prev.turn;
    DAMA.moves       = prev.moves;
    DAMA.lastMove    = prev.lastMove;
    DAMA.mustCapture = prev.mustCapture;
    DAMA.selected    = null;
    damaRender();
    damaUpdateUI();
  }

  /* --- Win --- */
  function showDamaWin(color) {
    const msg   = document.getElementById('damaMessage');
    const emoji = document.getElementById('damaWinEmoji');
    const title = document.getElementById('damaWinTitle');
    const sub   = document.getElementById('damaWinSub');
    emoji.textContent = color === 'red' ? '🔴' : '🔵';
    title.textContent = color === 'red' ? 'فاز الأحمر!' : 'فاز الأزرق!';
    const aiWon = DAMA.aiEnabled && color === DAMA.aiColor;
    sub.textContent = aiWon ? '🤖 الذكاء الاصطناعي فاز هذه المرة!' : 'أحسنت اللعب! 🎉';
    msg.classList.add('visible');
  }

  function closeDamaMsg() {
    document.getElementById('damaMessage').classList.remove('visible');
  }

  /* --- AI (Minimax + Alpha-Beta) --- */
  function toggleDamaAI() {
    DAMA.aiEnabled = !DAMA.aiEnabled;
    const btn = document.getElementById('damaAiToggle');
    const badge = document.getElementById('damaAiBadge');
    btn.textContent = DAMA.aiEnabled ? '⏹ إيقاف الآلي' : '🤖 لاعب آلي';
    btn.classList.toggle('btn-solver', !DAMA.aiEnabled);
    badge.classList.toggle('visible', DAMA.aiEnabled);

    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) {
      scheduleAI(500);
    }
    if (!DAMA.aiEnabled) {
      clearTimeout(DAMA.aiTimer);
      badge.classList.remove('visible');
    }
  }

  function scheduleAI(delay = 600) {
    clearTimeout(DAMA.aiTimer);
    // نستخدم requestAnimationFrame لمنع اهتزاز الشاشة
    requestAnimationFrame(() => {
      document.getElementById('damaAiBadge').classList.add('visible');
    });
    DAMA.aiTimer = setTimeout(() => {
      const move = damaPickAIMove();
      requestAnimationFrame(() => {
        document.getElementById('damaAiBadge').classList.remove('visible');
        if (move) damaExecuteMove(move, true);
      });
    }, delay);
  }

  function damaPickAIMove() {
    const allMoves = damaGetAllMoves(DAMA.aiColor, DAMA.board);
    if (allMoves.length === 0) return null;

    let bestMove = null, bestScore = -Infinity;
    const depth = 4; // 4-ply lookahead
    const oppColor = DAMA.aiColor === 'blue' ? 'red' : 'blue';

    for (const move of allMoves) {
      const newBoard = applyMoveToBoard(move, JSON.parse(JSON.stringify(DAMA.board)));
      // بعد حركة AI، يصبح دور الخصم (minimizing)
      const score = minimax(newBoard, oppColor, depth - 1, -Infinity, Infinity, false);
      if (score > bestScore) { bestScore = score; bestMove = move; }
    }
    return bestMove;
  }

  function minimax(board, currentTurn, depth, alpha, beta, maximizing) {
    const aiColor  = DAMA.aiColor;
    const oppColor = aiColor === 'blue' ? 'red' : 'blue';

    const redPieces  = board.flat().filter(p => p && p.color === 'red').length;
    const bluePieces = board.flat().filter(p => p && p.color === 'blue').length;

    if (redPieces === 0)  return aiColor === 'blue' ?  1000 : -1000;
    if (bluePieces === 0) return aiColor === 'red'  ?  1000 : -1000;
    if (depth === 0) return damaEval(board, aiColor);

    const moves = damaGetAllMoves(currentTurn, board);
    if (moves.length === 0) {
      return currentTurn === aiColor ? -900 : 900;
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const nb = applyMoveToBoard(m, JSON.parse(JSON.stringify(board)));
        const e  = minimax(nb, oppColor, depth-1, alpha, beta, false);
        maxEval  = Math.max(maxEval, e);
        alpha    = Math.max(alpha, e);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const nextTurn = currentTurn === 'red' ? 'blue' : 'red';
      for (const m of moves) {
        const nb = applyMoveToBoard(m, JSON.parse(JSON.stringify(board)));
        const e  = minimax(nb, nextTurn, depth-1, alpha, beta, true);
        minEval  = Math.min(minEval, e);
        beta     = Math.min(beta, e);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function damaEval(board, aiColor) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const val = p.king ? 3 : 1;
        // Advance bonus for non-kings
        const advBonus = !p.king
          ? (p.color === 'red' ? (7 - r) * 0.1 : r * 0.1)
          : 0;
        if (p.color === aiColor) score += val + advBonus;
        else score -= val + advBonus;
      }
    }
    return score;
  }

  function applyMoveToBoard(move, board) {
    const piece = board[move.fromR][move.fromC];
    board[move.fromR][move.fromC] = null;
    board[move.toR][move.toC] = piece;
    if (move.captureR !== undefined) {
      board[move.captureR][move.captureC] = null;
    }
    // Promotion
    if (piece && !piece.king) {
      if (piece.color === 'red'  && move.toR === 0) piece.king = true;
      if (piece.color === 'blue' && move.toR === 7) piece.king = true;
    }
    return board;
  }