  /* ============================================================
     DAMA ENGINE — الداما المغربية
  ============================================================ */
  const DAMA = {
    initialized: false,
    board: [],          // 8×8 — null | {color:'red'|'blue', king:bool}
    turn: 'red',
    selected: null,
    mustCapture: [],
    moves: 0,
    history: [],
    aiEnabled: false,
    aiColor: 'blue',
    aiTimer: null,
    lastMove: [],
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

    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) {
      scheduleAI();
    }
  }

  /* --- Board Copy (أسرع من JSON.parse/stringify) --- */
  function copyBoard(board) {
    return board.map(row => row.map(p => p ? {color:p.color, king:p.king} : null));
  }

  /* --- Rendering (مع حماية الـ scroll) --- */
  function damaRender() {
    const boardEl = document.getElementById('damaBoard');
    if (!boardEl) return;

    // ✅ احفظ موضع الـ scroll قبل الرسم ثم أعده بعده
    const savedScrollY = window.scrollY;

    let validTargets = [];
    if (DAMA.selected) {
      const moves = damaGetMoves(DAMA.selected.r, DAMA.selected.c, DAMA.board);
      validTargets = moves.map(m => ({r: m.toR, c: m.toC}));
    }

    const fragment = document.createDocumentFragment();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'dama-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

        if (DAMA.lastMove.some(lm => lm.r === r && lm.c === c))
          cell.classList.add('last-move');
        if (DAMA.selected && DAMA.selected.r === r && DAMA.selected.c === c)
          cell.classList.add('selected');
        if (validTargets.some(t => t.r === r && t.c === c))
          cell.classList.add('possible-move');

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

    boardEl.innerHTML = '';
    boardEl.appendChild(fragment);

    // ✅ استعادة موضع الـ scroll بعد الرسم
    if (window.scrollY !== savedScrollY) {
      window.scrollTo({top: savedScrollY, behavior: 'instant'});
    }
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
      text.textContent = '🤖 الذكاء الاصطناعي يفكر...';
    }
  }

  /* --- Click Handler --- */
  function damaHandleClick(r, c) {
    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) return;

    const piece = DAMA.board[r][c];

    if (piece && piece.color === DAMA.turn) {
      if (DAMA.mustCapture.length > 0 &&
          !DAMA.mustCapture.some(mc => mc.r === r && mc.c === c)) return;
      DAMA.selected = {r, c};
      damaRender();
      return;
    }

    if (DAMA.selected) {
      const moves = damaGetMoves(DAMA.selected.r, DAMA.selected.c, DAMA.board);
      const move  = moves.find(m => m.toR === r && m.toC === c);
      if (move) { damaExecuteMove(move, true); return; }
    }

    DAMA.selected = null;
    damaRender();
  }

  /* --- Move Execution --- */
  function damaExecuteMove(move, checkMultiCapture) {
    DAMA.history.push({
      board: copyBoard(DAMA.board),
      turn: DAMA.turn,
      moves: DAMA.moves,
      lastMove: [...DAMA.lastMove],
      mustCapture: [...DAMA.mustCapture],
    });

    const piece = DAMA.board[move.fromR][move.fromC];
    DAMA.board[move.fromR][move.fromC] = null;
    DAMA.board[move.toR][move.toC] = piece;
    DAMA.lastMove = [{r: move.fromR, c: move.fromC}, {r: move.toR, c: move.toC}];

    if (move.captureR !== undefined) {
      DAMA.board[move.captureR][move.captureC] = null;
    }

    if (!piece.king) {
      if (piece.color === 'red'  && move.toR === 0) piece.king = true;
      if (piece.color === 'blue' && move.toR === 7) piece.king = true;
    }

    DAMA.moves++;
    DAMA.selected = null;
    DAMA.mustCapture = [];

    if (checkMultiCapture && move.captureR !== undefined) {
      const furtherCaptures = damaGetMoves(move.toR, move.toC, DAMA.board)
        .filter(m => m.captureR !== undefined);

      if (furtherCaptures.length > 0) {
        DAMA.selected    = {r: move.toR, c: move.toC};
        DAMA.mustCapture = [{r: move.toR, c: move.toC}];
        damaRender();
        damaUpdateUI();
        if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) scheduleAI(400);
        return;
      }
    }

    DAMA.turn = DAMA.turn === 'red' ? 'blue' : 'red';

    const redPieces  = DAMA.board.flat().filter(p => p && p.color === 'red').length;
    const bluePieces = DAMA.board.flat().filter(p => p && p.color === 'blue').length;

    if (redPieces === 0)  { damaRender(); damaUpdateUI(); setTimeout(() => showDamaWin('blue'), 400); return; }
    if (bluePieces === 0) { damaRender(); damaUpdateUI(); setTimeout(() => showDamaWin('red'),  400); return; }

    const allMoves = damaGetAllMoves(DAMA.turn, DAMA.board);
    if (allMoves.length === 0) {
      damaRender(); damaUpdateUI();
      const winner = DAMA.turn === 'red' ? 'blue' : 'red';
      setTimeout(() => showDamaWin(winner), 400);
      return;
    }

    const captures = allMoves.filter(m => m.captureR !== undefined);
    if (captures.length > 0) {
      const capturePieces = [...new Set(captures.map(m => m.fromR + ',' + m.fromC))]
        .map(s => ({r: parseInt(s), c: parseInt(s.split(',')[1])}));
      DAMA.mustCapture = capturePieces;
    }

    damaRender();
    damaUpdateUI();

    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) scheduleAI(500);
  }

  /* ============================================================
     قواعد الحركة — الداما المغربية الصحيحة
     ✅ الجندي: يتحرك للأمام قطرياً فقط
     ✅ الجندي: يأكل للأمام فقط (لا يأكل للخلف)
     ✅ الملكة: تتحرك وتأكل في الاتجاهات الأربع
  ============================================================ */
  function damaGetMoves(r, c, board) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];

    if (piece.king) {
      // ✅ الملكة: تتحرك وتأكل في 4 اتجاهات قطرية
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (!board[nr][nc]) {
            moves.push({fromR:r, fromC:c, toR:nr, toC:nc});
            nr += dr; nc += dc;
          } else if (board[nr][nc].color !== piece.color) {
            const jr = nr + dr, jc = nc + dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[jr][jc]) {
              let lr = jr, lc = jc;
              while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && !board[lr][lc]) {
                moves.push({fromR:r, fromC:c, toR:lr, toC:lc, captureR:nr, captureC:nc});
                lr += dr; lc += dc;
              }
            }
            break;
          } else {
            break;
          }
        }
      }
    } else {
      // ✅ الجندي: الأحمر يتقدم للأعلى، الأزرق للأسفل
      const forward = piece.color === 'red' ? -1 : 1;

      // الحركة العادية للأمام فقط (اتجاهان قطريان)
      for (const dc of [-1, 1]) {
        const nr = r + forward, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
          moves.push({fromR:r, fromC:c, toR:nr, toC:nc});
        }
      }

      // ✅ الأكل للأمام فقط (إصلاح: لا يأكل للخلف)
      for (const dc of [-1, 1]) {
        const nr = r + forward,   nc = c + dc;
        const jr = r + 2*forward, jc = c + 2*dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 &&
            jr >= 0 && jr < 8 && jc >= 0 && jc < 8 &&
            board[nr][nc] && board[nr][nc].color !== piece.color &&
            !board[jr][jc]) {
          moves.push({fromR:r, fromC:c, toR:jr, toC:jc, captureR:nr, captureC:nc});
        }
      }
    }

    return moves;
  }

  function damaGetAllMoves(color, board) {
    const all = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c] && board[r][c].color === color)
          all.push(...damaGetMoves(r, c, board));
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

  /* ============================================================
     AI — Minimax + Alpha-Beta + Eval محسّن
  ============================================================ */
  function toggleDamaAI() {
    DAMA.aiEnabled = !DAMA.aiEnabled;
    const btn   = document.getElementById('damaAiToggle');
    const badge = document.getElementById('damaAiBadge');
    btn.textContent = DAMA.aiEnabled ? '⏹ إيقاف الآلي' : '🤖 لاعب آلي';
    btn.classList.toggle('btn-solver', !DAMA.aiEnabled);
    badge.classList.toggle('visible', DAMA.aiEnabled);

    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) scheduleAI(500);
    if (!DAMA.aiEnabled) { clearTimeout(DAMA.aiTimer); badge.classList.remove('visible'); }
  }

  function scheduleAI(delay = 500) {
    clearTimeout(DAMA.aiTimer);
    document.getElementById('damaAiBadge').classList.add('visible');
    DAMA.aiTimer = setTimeout(() => {
      // ✅ نشغّل الحساب خارج الـ main thread بشكل وهمي عبر setTimeout=0
      // لمنع تجميد الواجهة أثناء التفكير
      setTimeout(() => {
        const move = damaPickAIMove();
        document.getElementById('damaAiBadge').classList.remove('visible');
        if (move) damaExecuteMove(move, true);
      }, 0);
    }, delay);
  }

  function damaPickAIMove() {
    const allMoves = damaGetAllMoves(DAMA.aiColor, DAMA.board);
    if (allMoves.length === 0) return null;

    // ✅ ترتيب الحركات: الأكل أولاً لتحسين alpha-beta pruning
    allMoves.sort((a, b) =>
      (b.captureR !== undefined ? 1 : 0) - (a.captureR !== undefined ? 1 : 0)
    );

    let bestMove = null, bestScore = -Infinity;
    const depth = 6; // ✅ عمق أعمق من 4 → 6
    const oppColor = DAMA.aiColor === 'blue' ? 'red' : 'blue';

    for (const move of allMoves) {
      const newBoard = applyMoveToBoard(move, copyBoard(DAMA.board));
      const score = minimax(newBoard, oppColor, depth - 1, -Infinity, Infinity);
      if (score > bestScore) { bestScore = score; bestMove = move; }
    }
    return bestMove;
  }

  function minimax(board, currentTurn, depth, alpha, beta) {
    const aiColor  = DAMA.aiColor;
    const oppColor = aiColor === 'blue' ? 'red' : 'blue';
    const maximizing = currentTurn === aiColor;

    // شروط التوقف
    const redCount  = board.flat().filter(p => p && p.color === 'red').length;
    const blueCount = board.flat().filter(p => p && p.color === 'blue').length;
    if (redCount  === 0) return aiColor === 'blue' ?  2000 : -2000;
    if (blueCount === 0) return aiColor === 'red'  ?  2000 : -2000;
    if (depth === 0) return damaEval(board, aiColor);

    const moves = damaGetAllMoves(currentTurn, board);
    if (moves.length === 0) return maximizing ? -1800 : 1800;

    // ✅ ترتيب الحركات في كل مستوى (الأكل أولاً)
    moves.sort((a, b) =>
      (b.captureR !== undefined ? 1 : 0) - (a.captureR !== undefined ? 1 : 0)
    );

    const nextTurn = currentTurn === 'red' ? 'blue' : 'red';

    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        const nb = applyMoveToBoard(m, copyBoard(board));
        const e  = minimax(nb, nextTurn, depth - 1, alpha, beta);
        if (e > maxEval) maxEval = e;
        if (e > alpha)   alpha   = e;
        if (beta <= alpha) break; // ✂️ تقليم
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        const nb = applyMoveToBoard(m, copyBoard(board));
        const e  = minimax(nb, nextTurn, depth - 1, alpha, beta);
        if (e < minEval) minEval = e;
        if (e < beta)    beta    = e;
        if (beta <= alpha) break; // ✂️ تقليم
      }
      return minEval;
    }
  }

  /* ============================================================
     دالة التقييم المحسّنة
  ============================================================ */
  function damaEval(board, aiColor) {
    const oppColor = aiColor === 'blue' ? 'red' : 'blue';
    let score = 0;

    let aiPieces = 0, oppPieces = 0;
    let aiKings  = 0, oppKings  = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const isAI = p.color === aiColor;
        const sign = isAI ? 1 : -1;

        if (p.king) {
          // ✅ الملكة تساوي 4 جنود
          score += sign * 4;
          isAI ? aiKings++ : oppKings++;

          // ✅ الملكة في المركز أفضل
          const centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
          score += sign * (7 - centerDist) * 0.15;
        } else {
          score += sign * 1;
          isAI ? aiPieces++ : oppPieces++;

          // ✅ التقدم للأمام (الاقتراب من التتويج)
          const adv = p.color === 'red' ? (7 - r) : r;
          score += sign * adv * 0.07;

          // ✅ الدفاع: إبقاء قطع الصف الخلفي كدرع
          const backRow = p.color === 'red' ? 7 : 0;
          if (r === backRow) score += sign * 0.4;

          // ✅ الجانبان يحتاجان حماية أيضاً
          if (c === 0 || c === 7) score += sign * 0.2;
        }
      }
    }

    // ✅ مكافأة الحركية (كثرة الخيارات ميزة)
    const aiMobility  = damaGetAllMoves(aiColor,  board).length;
    const oppMobility = damaGetAllMoves(oppColor, board).length;
    score += (aiMobility - oppMobility) * 0.08;

    // ✅ مكافأة على وجود ملكات
    score += (aiKings - oppKings) * 0.5;

    return score;
  }

  function applyMoveToBoard(move, board) {
    const piece = board[move.fromR][move.fromC];
    board[move.fromR][move.fromC] = null;
    board[move.toR][move.toC] = piece;
    if (move.captureR !== undefined) board[move.captureR][move.captureC] = null;
    if (piece && !piece.king) {
      if (piece.color === 'red'  && move.toR === 0) piece.king = true;
      if (piece.color === 'blue' && move.toR === 7) piece.king = true;
    }
    return board;
  }
