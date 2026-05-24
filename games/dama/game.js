  /* ============================================================
     DAMA ENGINE v2.0 — الداما المغربية
     ✅ الجندي: يتحرك للأمام قطرياً فقط (2 اتجاه)
     ✅ الجندي: يأكل للأمام قطرياً فقط (2 اتجاه)
     ✅ الملكة: تطير وتأكل في الاتجاهات الأربع
     ✅ لا ترقية أثناء سلسلة الأكل
     ✅ Render: تحديث في المكان — بدون scroll jank
     ✅ AI: Web Worker حقيقي — لا يجمّد الواجهة
     ✅ AI: Minimax عمق 7 + Alpha-Beta + ترتيب ذكي
  ============================================================ */
  const DAMA = {
    initialized: false,
    board: [],
    turn: 'red',
    selected: null,
    mustCapture: [],
    moves: 0,
    history: [],
    aiEnabled: false,
    aiColor: 'blue',
    aiTimer: null,
    aiWorker: null,
    lastMove: [],
  };

  /* --- Cell Cache (تجنّب إعادة بناء DOM كل مرة) --- */
  let _damaCells = [];
  let _damaBoardEl = null;

  /* --- Board Setup --- */
  function damaInit() {
    DAMA.initialized = true;
    _damaCells = [];
    _damaBoardEl = null;
    damaNewGame();
  }

  function damaNewGame() {
    clearTimeout(DAMA.aiTimer);
    if (DAMA.aiWorker) { DAMA.aiWorker.terminate(); DAMA.aiWorker = null; }

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

  function copyBoard(board) {
    return board.map(row => row.map(p => p ? {color:p.color, king:p.king} : null));
  }

  /* ============================================================
     Render — تحديث تدريجي في مكان الخلايا
     ✅ لا innerHTML على كامل اللوحة → لا scroll jank أبداً
  ============================================================ */
  function damaRender() {
    const boardEl = document.getElementById('damaBoard');
    if (!boardEl) return;

    /* بناء الخلايا الـ 64 لأول مرة فقط */
    if (_damaCells.length !== 64 || _damaBoardEl !== boardEl) {
      _damaBoardEl = boardEl;
      boardEl.innerHTML = '';
      _damaCells = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = document.createElement('div');
          const row = r, col = c;
          cell.addEventListener('click', () => damaHandleClick(row, col));
          boardEl.appendChild(cell);
          _damaCells.push(cell);
        }
      }
    }

    /* حساب الخلايا المميزة */
    const validSet = new Set();
    if (DAMA.selected) {
      for (const m of damaGetMoves(DAMA.selected.r, DAMA.selected.c, DAMA.board))
        validSet.add(m.toR * 8 + m.toC);
    }
    const lastSet = new Set(DAMA.lastMove.map(lm => lm.r * 8 + lm.c));

    /* تحديث كل خلية في مكانها بدون إعادة إنشاء */
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx  = r * 8 + c;
        const cell = _damaCells[idx];

        let cls = 'dama-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        if (lastSet.has(idx))  cls += ' last-move';
        if (DAMA.selected?.r === r && DAMA.selected?.c === c) cls += ' selected';
        if (validSet.has(idx)) cls += ' possible-move';

        if (cell.className !== cls) cell.className = cls;

        const piece = DAMA.board[r][c];
        if (piece) {
          const pCls = 'dama-piece ' + piece.color + '-piece' + (piece.king ? ' king' : '');
          const existing = cell.firstElementChild;
          if (existing?.classList.contains('dama-piece')) {
            if (existing.className !== pCls) existing.className = pCls;
          } else {
            const p = document.createElement('div');
            p.className = pCls;
            cell.innerHTML = '';
            cell.appendChild(p);
          }
        } else {
          if (cell.firstChild) cell.innerHTML = '';
        }
      }
    }
  }

  function damaUpdateUI() {
    const redCount  = DAMA.board.flat().filter(p => p?.color === 'red').length;
    const blueCount = DAMA.board.flat().filter(p => p?.color === 'blue').length;
    document.getElementById('damaRedCount').textContent  = redCount;
    document.getElementById('damaBlueCount').textContent = blueCount;
    document.getElementById('damaMoveCount').textContent = DAMA.moves;

    const dot  = document.getElementById('turnDot');
    const text = document.getElementById('turnText');
    dot.className  = 'turn-dot ' + DAMA.turn;
    text.textContent = DAMA.turn === 'red' ? 'دور اللاعب الأحمر 🔴' : 'دور اللاعب الأزرق 🔵';
    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor)
      text.textContent = '🤖 الذكاء الاصطناعي يفكر...';
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
    DAMA.lastMove = [{r:move.fromR, c:move.fromC}, {r:move.toR, c:move.toC}];

    if (move.captureR !== undefined)
      DAMA.board[move.captureR][move.captureC] = null;

    DAMA.moves++;
    DAMA.selected    = null;
    DAMA.mustCapture = [];

    /* ✅ سلسلة الأكل قبل الترقية (القاعدة الصحيحة) */
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

    /* ✅ الترقية فقط بعد انتهاء الحركة كاملاً */
    if (!piece.king) {
      if (piece.color === 'red'  && move.toR === 0) piece.king = true;
      if (piece.color === 'blue' && move.toR === 7) piece.king = true;
    }

    DAMA.turn = DAMA.turn === 'red' ? 'blue' : 'red';

    const redPieces  = DAMA.board.flat().filter(p => p?.color === 'red').length;
    const bluePieces = DAMA.board.flat().filter(p => p?.color === 'blue').length;

    if (redPieces  === 0) { damaRender(); damaUpdateUI(); setTimeout(() => showDamaWin('blue'), 400); return; }
    if (bluePieces === 0) { damaRender(); damaUpdateUI(); setTimeout(() => showDamaWin('red'),  400); return; }

    const allMoves = damaGetAllMoves(DAMA.turn, DAMA.board);
    if (allMoves.length === 0) {
      damaRender(); damaUpdateUI();
      setTimeout(() => showDamaWin(DAMA.turn === 'red' ? 'blue' : 'red'), 400);
      return;
    }

    /* تحديد القطع التي يجب عليها الأكل */
    const captures = allMoves.filter(m => m.captureR !== undefined);
    if (captures.length > 0) {
      const seen = new Set();
      DAMA.mustCapture = captures
        .map(m => ({r:m.fromR, c:m.fromC}))
        .filter(p => { const k = p.r+','+p.c; if (seen.has(k)) return false; seen.add(k); return true; });
    }

    damaRender();
    damaUpdateUI();

    if (DAMA.aiEnabled && DAMA.turn === DAMA.aiColor) scheduleAI(600);
  }

  /* ============================================================
     قواعد الحركة — الداما المغربية الصحيحة
     ✅ الجندي: يتحرك للأمام قطرياً فقط (اتجاهان)
     ✅ الجندي: يأكل للأمام قطرياً فقط (اتجاهان)
     ✅ الملكة: تطير + تأكل في الاتجاهات الأربع
  ============================================================ */
  function damaGetMoves(r, c, board) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];

    if (piece.king) {
      /* الملكة الطائرة: 4 اتجاهات قطرية */
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        let nr = r+dr, nc = c+dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (!board[nr][nc]) {
            moves.push({fromR:r, fromC:c, toR:nr, toC:nc});
            nr += dr; nc += dc;
          } else if (board[nr][nc].color !== piece.color) {
            const jr = nr+dr, jc = nc+dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[jr][jc]) {
              let lr = jr, lc = jc;
              while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && !board[lr][lc]) {
                moves.push({fromR:r, fromC:c, toR:lr, toC:lc, captureR:nr, captureC:nc});
                lr += dr; lc += dc;
              }
            }
            break;
          } else { break; }
        }
      }
    } else {
      /* ✅ الجندي: للأمام فقط — الأحمر يصعد (-1)، الأزرق ينزل (+1) */
      const fwd = piece.color === 'red' ? -1 : 1;

      /* حركة عادية للأمام: اتجاهان فقط */
      for (const dc of [-1, 1]) {
        const nr = r + fwd, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc])
          moves.push({fromR:r, fromC:c, toR:nr, toC:nc});
      }

      /* ✅ الأكل للأمام فقط (القاعدة المغربية الصحيحة) */
      for (const dc of [-1, 1]) {
        const er = r + fwd,    ec = c + dc;     /* موقع القطعة المأكولة */
        const lr = r + 2*fwd,  lc = c + 2*dc;   /* موقع الهبوط */
        if (er >= 0 && er < 8 && ec >= 0 && ec < 8 &&
            lr >= 0 && lr < 8 && lc >= 0 && lc < 8 &&
            board[er][ec] && board[er][ec].color !== piece.color &&
            !board[lr][lc])
          moves.push({fromR:r, fromC:c, toR:lr, toC:lc, captureR:er, captureC:ec});
      }
    }

    return moves;
  }

  function damaGetAllMoves(color, board) {
    const all = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c]?.color === color)
          all.push(...damaGetMoves(r, c, board));
    const captures = all.filter(m => m.captureR !== undefined);
    return captures.length > 0 ? captures : all;
  }

  /* --- Undo --- */
  function damaUndoMove() {
    if (DAMA.history.length === 0) return;
    clearTimeout(DAMA.aiTimer);
    if (DAMA.aiWorker) { DAMA.aiWorker.terminate(); DAMA.aiWorker = null; }
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
     AI — Web Worker حقيقي (لا يجمّد الواجهة أبداً)
     Minimax + Alpha-Beta + عمق 7 + ترتيب ذكي للحركات
  ============================================================ */

  /* كود الـ Worker كاملاً — يُحقن كـ Blob */
  const _WORKER_CODE = `
    'use strict';

    function copyBoard(b) {
      return b.map(row => row.map(p => p ? {color:p.color, king:p.king} : null));
    }

    function getMoves(r, c, board) {
      const piece = board[r][c];
      if (!piece) return [];
      const moves = [];
      if (piece.king) {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
          let nr = r+dr, nc = c+dc;
          while (nr>=0&&nr<8&&nc>=0&&nc<8) {
            if (!board[nr][nc]) {
              moves.push({fromR:r,fromC:c,toR:nr,toC:nc});
              nr+=dr; nc+=dc;
            } else if (board[nr][nc].color !== piece.color) {
              const jr=nr+dr, jc=nc+dc;
              if (jr>=0&&jr<8&&jc>=0&&jc<8&&!board[jr][jc]) {
                let lr=jr, lc=jc;
                while (lr>=0&&lr<8&&lc>=0&&lc<8&&!board[lr][lc]) {
                  moves.push({fromR:r,fromC:c,toR:lr,toC:lc,captureR:nr,captureC:nc});
                  lr+=dr; lc+=dc;
                }
              }
              break;
            } else { break; }
          }
        }
      } else {
        const fwd = piece.color==='red' ? -1 : 1;
        for (const dc of [-1,1]) {
          const nr=r+fwd, nc=c+dc;
          if (nr>=0&&nr<8&&nc>=0&&nc<8&&!board[nr][nc])
            moves.push({fromR:r,fromC:c,toR:nr,toC:nc});
        }
        for (const dc of [-1,1]) {
          const er=r+fwd, ec=c+dc, lr=r+2*fwd, lc=c+2*dc;
          if (er>=0&&er<8&&ec>=0&&ec<8&&lr>=0&&lr<8&&lc>=0&&lc<8&&
              board[er][ec]&&board[er][ec].color!==piece.color&&!board[lr][lc])
            moves.push({fromR:r,fromC:c,toR:lr,toC:lc,captureR:er,captureC:ec});
        }
      }
      return moves;
    }

    function getAllMoves(color, board) {
      const all = [];
      for (let r=0;r<8;r++)
        for (let c=0;c<8;c++)
          if (board[r][c]?.color===color) all.push(...getMoves(r,c,board));
      const caps = all.filter(m=>m.captureR!==undefined);
      return caps.length>0 ? caps : all;
    }

    function applyMove(move, board) {
      const piece = board[move.fromR][move.fromC];
      board[move.fromR][move.fromC] = null;
      board[move.toR][move.toC] = piece;
      if (move.captureR!==undefined) board[move.captureR][move.captureC]=null;
      if (piece&&!piece.king) {
        if (piece.color==='red'  && move.toR===0) piece.king=true;
        if (piece.color==='blue' && move.toR===7) piece.king=true;
      }
      return board;
    }

    /* --- تقييم محسّن --- */
    function evalBoard(board, aiColor) {
      const opp = aiColor==='blue'?'red':'blue';
      let score=0, aiK=0, oppK=0;

      /* جداول موضعية للجندي (كلما اقترب من الترقية كان أفضل) */
      const advTable = {red: [0,1,2,3,4,5,6,7], blue:[7,6,5,4,3,2,1,0]};

      for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
        const p=board[r][c]; if(!p) continue;
        const isAI=p.color===aiColor, s=isAI?1:-1;
        if (p.king) {
          score += s*5;
          isAI?aiK++:oppK++;
          const cd = Math.abs(r-3.5)+Math.abs(c-3.5);
          score += s*(7-cd)*0.25;
        } else {
          score += s*1;
          score += s * advTable[p.color][r] * 0.12;
          const back = p.color==='red'?7:0;
          if (r===back) score+=s*0.5;
          if (c===0||c===7) score+=s*0.25;
          if (c>=2&&c<=5) score+=s*0.15;
          /* قطع محمية (بجانبها قطعة من نفس اللون) */
          for (const [dr,dc] of [[1,-1],[1,1],[-1,-1],[-1,1]]) {
            const nr=r+dr,nc=c+dc;
            if (nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]?.color===p.color)
              score+=s*0.1;
          }
        }
      }

      /* الحركية + فارق الملكات */
      score += (getAllMoves(aiColor,board).length - getAllMoves(opp,board).length)*0.1;
      score += (aiK-oppK)*0.6;

      return score;
    }

    /* --- Minimax Alpha-Beta --- */
    function minimax(board, turn, depth, alpha, beta, aiColor) {
      const flat=board.flat();
      const rN=flat.filter(p=>p?.color==='red').length;
      const bN=flat.filter(p=>p?.color==='blue').length;
      if (rN===0) return aiColor==='blue'? 5000:-5000;
      if (bN===0) return aiColor==='red' ? 5000:-5000;
      if (depth===0) return evalBoard(board, aiColor);

      const moves=getAllMoves(turn, board);
      if (moves.length===0) return turn===aiColor?-4000:4000;

      /* الأكل أولاً + خلط الحركات المتساوية لتنويع الأسلوب */
      moves.sort((a,b)=>{
        const ac=a.captureR!==undefined?1:0, bc=b.captureR!==undefined?1:0;
        return bc-ac || Math.random()-0.5;
      });

      const next=turn==='red'?'blue':'red';
      const isMax=turn===aiColor;

      if (isMax) {
        let best=-Infinity;
        for (const m of moves) {
          const e=minimax(applyMove(m,copyBoard(board)),next,depth-1,alpha,beta,aiColor);
          if(e>best) best=e;
          if(e>alpha) alpha=e;
          if(beta<=alpha) break;
        }
        return best;
      } else {
        let best=Infinity;
        for (const m of moves) {
          const e=minimax(applyMove(m,copyBoard(board)),next,depth-1,alpha,beta,aiColor);
          if(e<best) best=e;
          if(e<beta) beta=e;
          if(beta<=alpha) break;
        }
        return best;
      }
    }

    self.onmessage = function(e) {
      const {board, aiColor, depth} = e.data;
      const moves = getAllMoves(aiColor, board);
      if (!moves.length) { self.postMessage(null); return; }

      /* ترتيب أولي: أكل أولاً */
      moves.sort((a,b)=>(b.captureR!==undefined?1:0)-(a.captureR!==undefined?1:0));

      const opp = aiColor==='blue'?'red':'blue';
      let bestMove=null, bestScore=-Infinity;

      for (const move of moves) {
        const nb=applyMove(move, copyBoard(board));
        const score=minimax(nb, opp, depth-1, -Infinity, Infinity, aiColor);
        if (score>bestScore) { bestScore=score; bestMove=move; }
      }

      self.postMessage(bestMove);
    };
  `;

  /* --- Toggle AI --- */
  function toggleDamaAI() {
    DAMA.aiEnabled = !DAMA.aiEnabled;
    const btn   = document.getElementById('damaAiToggle');
    const badge = document.getElementById('damaAiBadge');
    btn.textContent = DAMA.aiEnabled ? '⏹ إيقاف الآلي' : '🤖 لاعب آلي';
    btn.classList.toggle('btn-solver', !DAMA.aiEnabled);
    badge.classList.toggle('visible', DAMA.aiEnabled);

    if (!DAMA.aiEnabled) {
      clearTimeout(DAMA.aiTimer);
      if (DAMA.aiWorker) { DAMA.aiWorker.terminate(); DAMA.aiWorker = null; }
      badge.classList.remove('visible');
    } else if (DAMA.turn === DAMA.aiColor) {
      scheduleAI(500);
    }
  }

  /* --- Schedule + Run AI (في Web Worker منفصل) --- */
  function scheduleAI(delay = 600) {
    clearTimeout(DAMA.aiTimer);
    document.getElementById('damaAiBadge').classList.add('visible');
    DAMA.aiTimer = setTimeout(() => _runAIWorker(), delay);
  }

  function _runAIWorker() {
    if (!DAMA.aiEnabled || DAMA.turn !== DAMA.aiColor) return;

    /* إنهاء worker قديم */
    if (DAMA.aiWorker) { DAMA.aiWorker.terminate(); DAMA.aiWorker = null; }

    /* إنشاء Worker من Blob (لا يحتاج ملف خارجي) */
    const blob = new Blob([_WORKER_CODE], {type:'application/javascript'});
    const url  = URL.createObjectURL(blob);
    DAMA.aiWorker = new Worker(url);
    URL.revokeObjectURL(url);

    /* عمق أعمق كلما قلّت القطع */
    const pieces = DAMA.board.flat().filter(p=>p).length;
    const depth  = pieces > 18 ? 6 : pieces > 10 ? 7 : 8;

    DAMA.aiWorker.onmessage = function(ev) {
      DAMA.aiWorker = null;
      document.getElementById('damaAiBadge').classList.remove('visible');
      if (!DAMA.aiEnabled) return;
      const move = ev.data;
      if (move) damaExecuteMove(move, true);
    };

    DAMA.aiWorker.onerror = function(err) {
      console.error('AI Worker error:', err);
      DAMA.aiWorker = null;
      document.getElementById('damaAiBadge').classList.remove('visible');
    };

    DAMA.aiWorker.postMessage({
      board: copyBoard(DAMA.board),
      aiColor: DAMA.aiColor,
      depth
    });
  }
