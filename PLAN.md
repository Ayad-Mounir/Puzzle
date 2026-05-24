# 📋 خطة تطوير: ألعاب الزمن الجميل

**التاريخ:** 2026-05-24  
**الحالة:** ✅ v4.0 — بنية معيارية جاهزة للتوسع

---

## ✅ المرحلة 0–3 — Sliding Puzzle v2.0 (مكتمل)
- [x] أرقام + حروف + صور + AI Solver A* + Ghost Mode + Sound + Share

## ✅ المرحلة 4 — الداما المغربية v1.0 (مكتمل)
- [x] لوحة 8×8، قواعد كاملة، AI Minimax Alpha-Beta عمق 4

## ✅ المرحلة 5 — إعادة البناء المعيارية v4.0 (مكتمل — هذه المحادثة)
- [x] فصل index.html الواحد (3198 سطر) إلى هيكل معياري نظيف
- [x] `shared/design-system.css` — المتغيرات والقاعدة
- [x] `shared/layout.css` — الهيكل العام والتاب
- [x] `shared/overlays.css` — نوافذ الفوز والكونفيتي
- [x] `shared/utils.js` — Audio, Confetti, Share, PWA, SW
- [x] `shared/app.js` — Boot & Game Switcher
- [x] `games/sliding-puzzle/style.css`
- [x] `games/sliding-puzzle/game.js`
- [x] `games/sliding-puzzle/solver.js`
- [x] `games/dama/style.css`
- [x] `games/dama/game.js`
- [x] `sw.js` v6 — يخزّن جميع الملفات الجديدة

---

## ⏳ المرحلة 6 — ألعاب جديدة (الزمن الجميل)

لإضافة لعبة جديدة، فقط:
1. أنشئ مجلد `games/[اسم-اللعبة]/`
2. أضف `style.css` + `game.js`
3. أضف tab في `index.html` + `<link>` + `<script>`
4. أضف اللعبة في `shared/app.js` → `switchGame()`

### أفكار للألعاب القادمة:
- [ ] الضامة الدولية / Dame Internationale
- [ ] الطاولة (Backgammon)
- [ ] الشطرنج العربي (Chess)
- [ ] لعبة الذاكرة (Memory Cards)
- [ ] خمسة بالخمسة (Tic-Tac-Toe 5×5)
- [ ] الفيديو بوكر (Video Poker)

---

## 🗂️ هيكل المشروع

```
📁 Puzzle/
├── index.html                  ← Shell نظيف (291 سطر)
├── manifest.json               ← PWA
├── sw.js                       ← Service Worker v6
├── 📁 shared/
│   ├── design-system.css       ← متغيرات + reset + خلفية
│   ├── layout.css              ← wrapper, header, tabs, footer
│   ├── overlays.css            ← win overlay, confetti, share
│   ├── utils.js                ← Audio, Confetti, Share, PWA
│   └── app.js                  ← Boot & Game Switcher
├── 📁 games/
│   ├── 📁 sliding-puzzle/
│   │   ├── style.css
│   │   ├── game.js
│   │   └── solver.js           ← A* Solver
│   ├── 📁 dama/
│   │   ├── style.css
│   │   └── game.js             ← Logic + Minimax AI
│   └── 📁 [new-game]/          ← أضف هنا!
└── 📁 icons/
```

---

## 🔗 الرابط المباشر
https://ayad-mounir.github.io/Puzzle/

## 🔗 سجل المحادثات

| المحادثة | ما تم |
|----------|-------|
| #1–#6 — 2026-05-24 | Sliding Puzzle v2.0 كامل ✅ |
| #7 — 2026-05-24 | الداما المغربية + Game Selector ✅ |
| #8 — 2026-05-24 | إعادة بناء معيارية v4.0 ✅ |
