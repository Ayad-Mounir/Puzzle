<div align="center">

# 🧩 Sliding Puzzle

<img src="https://img.shields.io/badge/version-1.0-a855f7?style=for-the-badge&logo=puzzle&logoColor=white"/>
<img src="https://img.shields.io/badge/PWA-Ready-00d4ff?style=for-the-badge&logo=googlechrome&logoColor=white"/>
<img src="https://img.shields.io/badge/Offline-Supported-22c55e?style=for-the-badge&logo=serviceworker&logoColor=white"/>
<img src="https://img.shields.io/badge/Language-Arabic-f5c842?style=for-the-badge"/>

<br/><br/>

**لعبة اللغز المنزلق الكلاسيكية — مبنية بـ Vanilla JS كـ Progressive Web App**

> *"اللعبة التي أحببتها في طفولتي، أعيد بناؤها من الصفر بتقنيات الويب الحديثة"*

<br/>

[▶ العب الآن](https://ayad-mounir.github.io/Puzzle) · [📦 الكود المصدري](https://github.com/Ayad-Mounir/Puzzle)

<br/>

</div>

---

## ✨ نظرة عامة

**Sliding Puzzle** هي نسخة ويب حديثة من لعبة اللغز المنزلق الكلاسيكية (15-Puzzle) المعروفة للجميع. الهدف: رتّب القطع بالترتيب الصحيح بأقل عدد من الحركات وأسرع وقت ممكن.

مبنية بـ **Vanilla HTML/CSS/JavaScript** بدون أي frameworks، وتعمل كـ **PWA كاملة** — تُثبَّت على أي جهاز وتعمل بدون اتصال بالإنترنت.

---

## 🎮 أوضاع اللعب

| الوضع | الوصف |
|-------|-------|
| 🔢 **أرقام** | رتّب الأرقام من 1 إلى 8 بالترتيب الصحيح |
| 🔤 **حروف** | رتّب الحروف الإنجليزية من A إلى H |
| 🖼️ **صور** | *(قريباً — Phase 2)* رتّب قطع صورة مجزأة |

---

## ⚙️ الميزات التقنية

### 🧠 منطق اللعب
- **خوارزمية الـ Solvability** — تعتمد على عد الـ Inversions لضمان أن كل تأليفة عشوائية قابلة للحل دائماً
- **Reset ذكي** — يُعيد اللوحة إلى حالة الخلط الأصلية لا إلى الحل
- **تحقق فوري من الفوز** بعد كل حركة

### 🎨 واجهة المستخدم
- تصميم **Dark Mode** كامل بنظام ألوان CSS Variables
- **Neumorphic tiles** بتأثيرات ظل وعمق ثلاثي الأبعاد
- **Glow ring** ديناميكي حول اللوحة عند الفوز
- خلفية متحركة بـ Radial Gradients
- شاشة تحميل سلسة (Loader)
- تصميم **Responsive** يعمل على جميع الشاشات

### ⚡ الأداء والتفاعل
- **انيميشن Confetti** مبني بـ Canvas API (120 جسيم بفيزياء واقعية)
- **انيميشن sliding bump** على القطع المتحركة
- **تأثير win-glow** متتالي على القطع عند الفوز
- دعم كامل لـ **لوحة المفاتيح** (Arrow Keys)
- دعم **Touch** للأجهزة اللمسية
- `prefers-reduced-motion` لإمكانية الوصول

### 📊 نظام الإحصاءات
- **مؤقت** يبدأ عند أول حركة
- **عداد الحركات** في الوقت الفعلي
- **High Score** محفوظ بـ `localStorage` لكل وضع على حدة:
  - أقل عدد حركات
  - أسرع وقت
  - إجمالي الألعاب المكتملة
- شارة **"رقم قياسي جديد"** عند تحقيق أفضل نتيجة

### 📱 Progressive Web App
- **Service Worker** مع استراتيجية Cache-First للعمل Offline
- **Web App Manifest** بدعم RTL وعربي
- **Install Banner** لتثبيت التطبيق مباشرة من المتصفح
- أيقونات **192px و 512px** (Maskable)

---

## 🗂 هيكل المشروع

```
Puzzle/
├── index.html        # التطبيق كاملاً (HTML + CSS + JS)
├── manifest.json     # إعدادات PWA
├── sw.js             # Service Worker (cache + offline)
└── icons/
    ├── icon-192.png  # أيقونة PWA صغيرة
    └── icon-512.png  # أيقونة PWA كبيرة
```

---

## 🚀 تشغيل المشروع محلياً

```bash
# 1. استنسخ المستودع
git clone https://github.com/Ayad-Mounir/Puzzle.git
cd Puzzle

# 2. شغّل أي سيرفر محلي بسيط
python3 -m http.server 8080
# أو
npx serve .

# 3. افتح في المتصفح
# http://localhost:8080
```

> **ملاحظة:** لتفعيل Service Worker يجب تشغيل المشروع عبر سيرفر (localhost) وليس بفتح الملف مباشرةً.

---

## ⌨️ اختصارات لوحة المفاتيح

| المفتاح | الوظيفة |
|---------|---------|
| `→` | تحريك القطعة اليسرى نحو الفراغ |
| `←` | تحريك القطعة اليمنى نحو الفراغ |
| `↑` | تحريك القطعة السفلية نحو الفراغ |
| `↓` | تحريك القطعة العلوية نحو الفراغ |

---

## 🛣️ خارطة الطريق

- [x] **Phase 1** — وضع الأرقام والحروف، مؤقت، High Score، PWA، Confetti
- [ ] **Phase 2** — وضع الصور (تقطيع صورة حقيقية + تلميحات)
- [ ] **Phase 3** — شبكات 4×4 و 5×5 (مستوى الصعوبة)
- [ ] **Phase 4** — حل تلقائي بـ A* Algorithm

---

## 🛠 التقنيات المستخدمة

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![Canvas API](https://img.shields.io/badge/Canvas_API-FF6B35?style=flat-square)

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

صُنع بـ ❤️ وذكريات الطفولة

</div>
