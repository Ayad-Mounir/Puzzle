/* ============================================================
   SHARED UTILITIES — Audio, Confetti, Share, PWA, SW
   ============================================================ */


  /* ============================================================
     PWA — Install Prompt
  ============================================================ */
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('installBanner').classList.add('visible');
  });

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('installBanner').classList.remove('visible');
    }
    deferredInstallPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    document.getElementById('installBanner').classList.remove('visible');
    deferredInstallPrompt = null;
  });

  /* ============================================================
     SERVICE WORKER REGISTRATION
  ============================================================ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }


  /* ============================================================
     CONFETTI ENGINE
  ============================================================ */
  let confettiParticles = [];
  let confettiAnimId = null;
  const confettiCanvas  = document.getElementById('confetti-canvas');
  const confettiCtx     = confettiCanvas.getContext('2d');

  const CONFETTI_COLORS = [
    '#f5c842', '#00d4ff', '#a855f7', '#22c55e',
    '#f472b6', '#fb923c', '#60a5fa', '#f87171',
  ];

  function launchConfetti() {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    confettiParticles = Array.from({ length: 120 }, () => ({
      x:    Math.random() * confettiCanvas.width,
      y:    -20 - Math.random() * 100,
      vx:   (Math.random() - 0.5) * 4,
      vy:   2 + Math.random() * 3,
      rot:  Math.random() * 360,
      rotV: (Math.random() - 0.5) * 6,
      w:    6 + Math.random() * 8,
      h:    3 + Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      opacity: 1,
    }));

    animateConfetti();
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles = confettiParticles.filter(p => p.opacity > 0.05);

    confettiParticles.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.rotV;
      p.vy  += 0.06; // gravity

      if (p.y > confettiCanvas.height * 0.7) p.opacity -= 0.018;

      confettiCtx.save();
      confettiCtx.globalAlpha = p.opacity;
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rot * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.beginPath();
      confettiCtx.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2);
      confettiCtx.fill();
      confettiCtx.restore();
    });

    if (confettiParticles.length > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles = [];
  }


  /* ============================================================
     AUDIO ENGINE — Web Audio API
  ============================================================ */
  const AUDIO = {
    ctx: null,
    muted: false,

    _init() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { return false; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },

    playTick() {
      if (this.muted || !this._init()) return;
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      const t = this.ctx.currentTime;
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.07);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.start(t);
      osc.stop(t + 0.09);
    },

    playWin() {
      if (this.muted || !this._init()) return;
      // C-E-G-C arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        const t = this.ctx.currentTime + i * 0.14;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    },
  };

  /* Load mute preference */
  try {
    AUDIO.muted = localStorage.getItem('puzzle_muted') === 'true';
  } catch {}

  function toggleMute() {
    AUDIO.muted = !AUDIO.muted;
    try { localStorage.setItem('puzzle_muted', AUDIO.muted); } catch {}
    const btn = document.getElementById('muteBtn');
    if (AUDIO.muted) {
      btn.textContent = '🔇 الصوت';
      btn.classList.add('muted');
    } else {
      btn.textContent = '🔊 الصوت';
      btn.classList.remove('muted');
      AUDIO.playTick(); // short confirm sound
    }
  }


  /* ============================================================
     SHARE SCORE
  ============================================================ */
  function shareScore() {
    const time  = document.getElementById('winTime').textContent;
    const moves = document.getElementById('winMoves').textContent;
    const size  = STATE.gridSize;
    const diff  = size === 3 ? 'سهل' : size === 4 ? 'متوسط' : 'صعب';
    const text  =
      `🧩 Sliding Puzzle — ${size}×${size} (${diff})
` +
      `⏱️ الوقت: ${time}   👆 الحركات: ${moves}
` +
      `🎮 العب الآن: https://ayad-mounir.github.io/Puzzle/`;

    if (navigator.share) {
      navigator.share({ title: '🧩 Sliding Puzzle', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        showShareToast('✅ تم النسخ للحافظة!');
      }).catch(() => {
        showShareToast('⚠️ المتصفح لا يدعم النسخ التلقائي');
      });
    }
  }

  function showShareToast(msg) {
    const toast = document.getElementById('shareToast');
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  }
