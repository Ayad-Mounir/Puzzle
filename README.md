<div align="center">

# 🧩 Sliding Puzzle

<img src="https://img.shields.io/badge/version-2.0-a855f7?style=for-the-badge&logoColor=white"/>
<img src="https://img.shields.io/badge/PWA-Ready-00d4ff?style=for-the-badge&logo=googlechrome&logoColor=white"/>
<img src="https://img.shields.io/badge/Offline-Supported-22c55e?style=for-the-badge&logoColor=white"/>
<img src="https://img.shields.io/badge/A*-Solver-f5c842?style=for-the-badge&logoColor=black"/>
<img src="https://img.shields.io/badge/Language-Arabic-ef4444?style=for-the-badge"/>

<br/><br/>

**لعبة اللغز المنزلق الكلاسيكية — مبنية بـ Vanilla JS كـ Progressive Web App**

> *لعبة كاملة بدون أي framework — HTML + CSS + JS خالص*

<br/>

[▶ العب الآن](https://ayad-mounir.github.io/Puzzle) · [📦 الكود المصدري](https://github.com/Ayad-Mounir/Puzzle)

<br/>

</div>

---

## ✨ نظرة عامة

**Sliding Puzzle v2.0** هي نسخة ويب حديثة من لعبة اللغز المنزلق الكلاسيكية. الهدف: رتّب القطع بالترتيب الصحيح بأقل عدد من الحركات وأسرع وقت ممكن.

مبنية بـ **Vanilla HTML/CSS/JavaScript** بدون أي frameworks — وتعمل كـ **PWA كاملة** تُثبَّت على أي جهاز وتعمل Offline.

---

## 🎮 أوضاع اللعب

| الوضع | الوصف |
|-------|-------|
| 🔢 **أرقام** | رتّب الأرقام من 1 للأمام بالترتيب الصحيح |
| 🔤 **حروف** | رتّب الحروف الإنجليزية بالترتيب الأبجدي |
| 🖼️ **صور** | ارفع صورة مخصصة وشاهدها تتقطع — رتّبها مجدداً |

---

## ⚙️ مستويات الصعوبة

| المستوى | الشبكة | عدد القطع |
|---------|--------|-----------|
| 🟢 سهل | 3 × 3 | 8 قطع |
| 🟡 متوسط | 4 × 4 | 15 قطعة |
| 🔴 صعب | 5 × 5 | 24 قطعة |

---

## 🤖 الحل التلقائي — A* Algorithm

عند الضغط على **🤖 حل**، تبدأ خوارزمية **A\*** في إيجاد أقصر مسار لحل اللغز:

- **Heuristic**: Manhattan Distance — تقدير المسافة الأمثل
- تحريك القطع تلقائياً بتأخير 420ms لرؤية كل خطوة
- شريط يُظهر عدد الخطوات المتبقية
- إمكانية إيقاف الحل في أي لحظة

---

## 👻 Ghost Mode — وضع الشبح

عند تفعيله، تظهر أرقام خفيفة في زاوية كل خلية تُرشدك إلى القيمة الصحيحة لتلك الموضع. القطع التي في مواضعها الصحيحة تحصل على توهج أخضر لطيف.

---

## 🔊 المؤثرات الصوتية

أصوات تفاعلية مولَّدة بـ **Web Audio API** — بدون ملفات خارجية:
- نقرة لطيفة عند تحريك أي قطعة
- لحن فوز بسيط عند حل اللغز
- زر كتم 🔇 يحفظ الإعداد تلقائياً

---

## 📤 مشاركة النتيجة

بعد الفوز، زر **📤 شارك نتيجتك** يولّد رسالة جاهزة للمشاركة (يدعم Web Share API على الجوال، وNسخ للحافظة على سطح المكتب).

---

## 📊 نظام الإحصاءات

- مؤقت يبدأ عند أول حركة
- عداد الحركات في الوقت الفعلي
- High Score منفصل لكل وضع وكل شبكة:
  - أقل عدد حركات
  - أسرع وقت
  - إجمالي الألعاب المكتملة
- شارة **⭐ رقم قياسي جديد** عند تحقيق أفضل نتيجة

---

## 📱 Progressive Web App

- **Service Worker v3** — Cache-First، حذف تلقائي للـ cache القديم
- **Web App Manifest** — دعم RTL وعربي كامل
- **Install Banner** — تثبيت مباشر من المتصفح
- يعمل بالكامل **Offline** بعد أول زيارة

---

## 🗂 هيكل المشروع

```
Puzzle/
├── index.html        # التطبيق كاملاً (HTML + CSS + JS)
├── manifest.json     # إعدادات PWA v2.0
├── sw.js             # Service Worker v3
├── PLAN.md           # خطة التطوير وسجل المراحل
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 🚀 تشغيل محلياً

```bash
git clone https://github.com/Ayad-Mounir/Puzzle.git
cd Puzzle
python3 -m http.server 8080
# افتح: http://localhost:8080
```

---

## ⌨️ اختصارات لوحة المفاتيح

| المفتاح | الوظيفة |
|---------|---------|
| `→` | تحريك القطعة اليسرى للفراغ |
| `←` | تحريك القطعة اليمنى للفراغ |
| `↑` | تحريك القطعة السفلية للفراغ |
| `↓` | تحريك القطعة العلوية للفراغ |

---

## 🛣️ مراحل التطوير

- [x] **Phase 1** — أرقام + حروف + مؤقت + High Score + Confetti + PWA
- [x] **Phase 2** — وضع الصور — رفع + تقطيع + تلميح
- [x] **Phase 3** — شبكات 3×3 / 4×4 / 5×5 ديناميكياً
- [x] **Phase 4** — حل تلقائي بـ A* Algorithm
- [x] **Phase 5** — صوت + Ghost Mode + Share Score
- [x] **Phase 6** — الصقل النهائي v2.0 ← *الآن*

---

## 🛠 التقنيات

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![Canvas API](https://img.shields.io/badge/Canvas_API-FF6B35?style=flat-square)
![Web Audio API](https://img.shields.io/badge/Web_Audio_API-22c55e?style=flat-square)

</div>

---

## 👤 المطوّر

<div align="center">

**Ayad Mounir**

[![GitHub](https://img.shields.io/badge/GitHub-Ayad--Mounir-181717?style=flat-square&logo=github)](https://github.com/Ayad-Mounir)
[![Email](https://img.shields.io/badge/Email-contact.ayad.mounir@gmail.com-EA4335?style=flat-square&logo=gmail)](mailto:contact.ayad.mounir@gmail.com)

</div>

---

<div align="center">

صُنع بـ ❤️ — Vanilla JS فقط، لا شيء آخر

</div>
