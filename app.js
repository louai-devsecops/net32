/* ============================================================
   أكاديمية IPv4
   app.js — التوجيه، المؤقّت الرملي، محرّك التمارين، التخزين
   يعمل محليًا على file:// بلا أي مكتبات خارجية.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- ثوابت ---------------- */

  const KEY = 'netacademy.v1';
  const MASTERY = 80; // نسبة النجاح في الدرس

  /* ---------------- البصمة (branding.js) ---------------- */

  const BRAND = (window.BRANDING && typeof window.BRANDING === 'object') ? window.BRANDING : {};
  const APP_NAME = {
    ar: (BRAND.app && BRAND.app.ar) || 'شبكة',
    en: (BRAND.app && BRAND.app.en) || ''
  };
  const SUBJECT = {
    ar: (BRAND.subject && BRAND.subject.ar) || 'البنية التحتية للشبكات',
    fr: (BRAND.subject && BRAND.subject.fr) || 'Infrastructure Réseau'
  };
  const APP_TITLE = APP_NAME.ar + ' — ' + SUBJECT.ar + (SUBJECT.fr ? ' · ' + SUBJECT.fr : '');

  function label(x) {
    if (!x) return '';
    if (typeof x === 'string') return x.trim();
    var parts = [];
    [x.ar, x.en, x.fr].forEach(function (v) {
      if (v && String(v).trim()) parts.push(String(v).trim());
    });
    return parts.join(' — ');
  }

  const UNITS = (window.CURRICULUM || []).slice().sort((a, b) => a.unit - b.unit);
  const ALL = [];
  UNITS.forEach(function (u) {
    u.lessons.forEach(function (l) { ALL.push({ unit: u, lesson: l }); });
  });
  const TOTAL = ALL.length;

  const DEFAULT_STATE = {
    version: 1,
    theme: 'dark',
    settings: { lessonMinutes: 15, pomodoroWork: 25, pomodoroBreak: 5, sound: true },
    progress: { lessons: {}, drillsTotal: 0, drillsCorrect: 0 },
    notebook: [],
    stats: { seconds: 0, days: {}, sessions: 0 },
    timer: null
  };

  /* ---------------- أدوات ---------------- */

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Markdown مصغّر: **عريض** · `كود` · *مائل* */
  function md(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return (h > 0 ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtDur(sec) {
    sec = Math.round(sec || 0);
    var h = Math.floor(sec / 3600);
    var m = Math.round((sec % 3600) / 60);
    if (h && m) return h + ' س ' + m + ' د';
    if (h) return h + ' س';
    if (m) return m + ' د';
    return sec + ' ث';
  }

  function dayKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  var AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  function norm(v) {
    var s = String(v == null ? '' : v);
    s = s.replace(/[٠-٩]/g, function (d) { return String(AR_DIGITS.indexOf(d)); });
    s = s.replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); });
    s = s.trim().toLowerCase();
    s = s.replace(/[،,؛;]+$/, '');
    s = s.replace(/\.$/, '');
    s = s.replace(/\s+/g, ' ');
    return s;
  }

  /* ---------------- الحالة ---------------- */

  function loadState() {
    var base = JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return base;
      var s = JSON.parse(raw) || {};
      return {
        version: 1,
        theme: s.theme === 'light' ? 'light' : 'dark',
        settings: Object.assign(base.settings, s.settings || {}),
        progress: {
          lessons: (s.progress && s.progress.lessons) || {},
          drillsTotal: (s.progress && s.progress.drillsTotal) || 0,
          drillsCorrect: (s.progress && s.progress.drillsCorrect) || 0
        },
        notebook: Array.isArray(s.notebook) ? s.notebook : [],
        stats: {
          seconds: (s.stats && s.stats.seconds) || 0,
          days: (s.stats && s.stats.days) || {},
          sessions: (s.stats && s.stats.sessions) || 0
        },
        timer: s.timer || null
      };
    } catch (e) {
      return base;
    }
  }

  var state = loadState();
  var saveWarned = false;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      if (!saveWarned) {
        saveWarned = true;
        toast('⚠️ تعذّر حفظ التقدّم في المتصفح — استعمل «تصدير» للاحتياط');
      }
    }
  }

  function isDone(id) {
    var p = state.progress.lessons[id];
    return !!(p && p.done);
  }

  function doneCount() {
    return ALL.filter(function (x) { return isDone(x.lesson.id); }).length;
  }

  function findLesson(id) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].lesson.id === id) return ALL[i];
    return null;
  }

  function nextIncompleteId() {
    for (var i = 0; i < ALL.length; i++) if (!isDone(ALL[i].lesson.id)) return ALL[i].lesson.id;
    return ALL.length ? ALL[0].lesson.id : null;
  }

  function nextLessonId(from) {
    var idx = -1;
    for (var i = 0; i < ALL.length; i++) if (ALL[i].lesson.id === from) { idx = i; break; }
    for (var j = idx + 1; j < ALL.length; j++) if (!isDone(ALL[j].lesson.id)) return ALL[j].lesson.id;
    for (var k = idx + 1; k < ALL.length; k++) return ALL[k].lesson.id;
    return null;
  }

  /* ---------------- التوست ---------------- */

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3600);
  }

  /* ---------------- الصوت ---------------- */

  var audioCtx = null;
  function beep() {
    if (!state.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      [0, 0.18, 0.36].forEach(function (off, i) {
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = i === 2 ? 880 : 660;
        g.gain.setValueAtTime(0.0001, t + off);
        g.gain.exponentialRampToValueAtTime(0.22, t + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t + off);
        o.stop(t + off + 0.22);
      });
    } catch (e) { /* الصوت اختياري */ }
  }

  /* ---------------- المؤقّت الرملي ---------------- */

  var Timer = {
    st: null,
    lastSave: 0,

    init: function () {
      if (state.timer && typeof state.timer.remaining === 'number' && typeof state.timer.total === 'number') {
        this.st = state.timer;
      } else {
        this.st = this.fresh('lesson');
      }
      state.timer = this.st;

      if (this.st.running && this.st.endAt) {
        var rem = Math.round((this.st.endAt - Date.now()) / 1000);
        if (rem <= 0) { this.st.remaining = 0; this.st.running = false; }
        else this.st.remaining = rem;
      }

      var self = this;
      setInterval(function () { self.tick(); }, 1000);
      this.paint();
    },

    fresh: function (mode) {
      var mins = mode === 'pomodoro' ? state.settings.pomodoroWork : state.settings.lessonMinutes;
      return { mode: mode, phase: 'work', total: mins * 60, remaining: mins * 60, endAt: 0, running: false };
    },

    toggle: function () {
      var st = this.st;
      if (st.running) { this.pause(); return; }
      if (st.remaining <= 0) st.remaining = st.total;
      st.endAt = Date.now() + st.remaining * 1000;
      st.running = true;
      save();
      this.paint();
    },

    pause: function () {
      var st = this.st;
      if (!st.running) return;
      st.remaining = Math.max(0, Math.round((st.endAt - Date.now()) / 1000));
      st.running = false;
      save();
      this.paint();
    },

    reset: function () {
      var st = this.st;
      st.running = false;
      st.remaining = st.total;
      st.endAt = 0;
      save();
      this.paint();
    },

    setMode: function (mode) {
      this.st = state.timer = this.fresh(mode);
      save();
      this.paint();
    },

    tick: function () {
      var st = this.st;
      if (st.running) {
        var rem = Math.max(0, Math.round((st.endAt - Date.now()) / 1000));
        if (rem < st.remaining) {
          this.addSeconds(st.remaining - rem);
          st.remaining = rem;
        }
        if (rem <= 0) this.complete();
        else if (Date.now() - this.lastSave > 10000) { this.lastSave = Date.now(); save(); }
      }
      this.paint();
    },

    addSeconds: function (n) {
      if (!n || n < 0) return;
      state.stats.seconds += n;
      var k = dayKey(new Date());
      state.stats.days[k] = (state.stats.days[k] || 0) + n;
    },

    complete: function () {
      var st = this.st;
      st.running = false;
      st.remaining = 0;
      state.stats.sessions = (state.stats.sessions || 0) + 1;
      save();
      beep();

      if (st.mode === 'pomodoro') {
        var nextPhase = st.phase === 'work' ? 'break' : 'work';
        toast(nextPhase === 'break'
          ? '✅ انتهت جلسة العمل — خذ راحة قصيرة'
          : '☕ انتهت الراحة — ابدأ جلسة عمل جديدة');
        st.phase = nextPhase;
        st.total = (nextPhase === 'work' ? state.settings.pomodoroWork : state.settings.pomodoroBreak) * 60;
        st.remaining = st.total;
        st.endAt = 0;
      } else {
        toast('⏳ انتهى وقت الدرس — انتقل إلى التمارين');
      }
      save();
      this.paint();
    },

    label: function () {
      var st = this.st;
      if (st.mode === 'pomodoro') {
        return st.phase === 'work'
          ? 'جلسة عمل — ' + state.settings.pomodoroWork + ' دقيقة'
          : 'راحة — ' + state.settings.pomodoroBreak + ' دقائق';
      }
      return 'مؤقّت الدرس — ' + state.settings.lessonMinutes + ' دقيقة';
    },

    paint: function () {
      var st = this.st;
      if (!st) return;

      $$('[data-t="time"]').forEach(function (e) { e.textContent = fmtTime(st.remaining); });
      $$('[data-t="phase"]').forEach(function (e) { e.textContent = Timer.label(); });
      $$('[data-t="start"]').forEach(function (b) { b.textContent = st.running ? 'إيقاف مؤقت' : 'تشغيل'; });
      $$('.timer-panel [data-mode]').forEach(function (b) {
        b.classList.toggle('on', b.dataset.mode === st.mode);
      });

      var frac = st.total > 0 ? clamp(st.remaining / st.total, 0, 1) : 0;
      var el = 1 - frac;
      $$('[data-t="sandTop"]').forEach(function (r) {
        r.setAttribute('y', String(10 + 86 * (1 - frac)));
        r.setAttribute('height', String(86 * frac));
      });
      $$('[data-t="sandBottom"]').forEach(function (r) {
        r.setAttribute('y', String(190 - 86 * el));
        r.setAttribute('height', String(86 * el));
      });
      $$('[data-t="stream"]').forEach(function (l) {
        l.style.opacity = st.running && st.remaining > 0 ? '1' : '0';
      });

      var chip = $('#timerChip');
      if (chip) {
        var active = st.running || st.remaining !== st.total || st.remaining === 0;
        chip.hidden = !active;
        chip.classList.toggle('running', st.running);
      }

      if (st.running) document.title = fmtTime(st.remaining) + ' · ' + APP_NAME.ar;
      else document.title = APP_TITLE;
    }
  };

  function hourglass() {
    return '' +
      '<svg class="hg" viewBox="0 0 120 200" aria-hidden="true">' +
      '<defs>' +
      '<clipPath id="hgTop"><polygon points="16,10 104,10 60,96"/></clipPath>' +
      '<clipPath id="hgBottom"><polygon points="60,104 104,190 16,190"/></clipPath>' +
      '</defs>' +
      '<line class="hg-cap" x1="8" y1="10" x2="112" y2="10"/>' +
      '<line class="hg-cap" x1="8" y1="190" x2="112" y2="190"/>' +
      '<polygon class="hg-outline" points="16,10 104,10 60,96"/>' +
      '<polygon class="hg-outline" points="60,104 104,190 16,190"/>' +
      '<rect class="hg-sand" data-t="sandTop" x="0" y="10" width="120" height="86" clip-path="url(#hgTop)"/>' +
      '<rect class="hg-sand" data-t="sandBottom" x="0" y="190" width="120" height="0" clip-path="url(#hgBottom)"/>' +
      '<line class="hg-stream" data-t="stream" x1="60" y1="96" x2="60" y2="104"/>' +
      '</svg>';
  }

  function timerPanel(small) {
    var st = Timer.st;
    return '' +
      '<div class="timer-panel' + (small ? ' small' : '') + '">' +
      hourglass() +
      '<div class="timer-body">' +
      '<div class="timer-mode">' +
      '<button type="button" data-mode="lesson" class="' + (st.mode === 'lesson' ? 'on' : '') + '">درس ' + state.settings.lessonMinutes + ' د</button>' +
      '<button type="button" data-mode="pomodoro" class="' + (st.mode === 'pomodoro' ? 'on' : '') + '">بومودورو ' + state.settings.pomodoroWork + '/' + state.settings.pomodoroBreak + '</button>' +
      '</div>' +
      '<div class="timer-time" data-t="time">' + fmtTime(st.remaining) + '</div>' +
      '<div class="timer-sub" data-t="phase">' + esc(Timer.label()) + '</div>' +
      '<div class="timer-btns">' +
      '<button type="button" class="btn btn-primary btn-sm" data-t="start" id="tStart">' + (st.running ? 'إيقاف مؤقت' : 'تشغيل') + '</button>' +
      '<button type="button" class="btn btn-sm" id="tReset">تصفير</button>' +
      (small ? '<a class="btn btn-sm btn-ghost" href="#/timer">المؤقّت الكامل</a>' : '') +
      '</div>' +
      '</div>' +
      '</div>';
  }

  /* ---------------- التنقل ---------------- */

  function parseRoute() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (!h) return { name: 'home', arg: '' };
    var parts = h.split('/');
    return { name: parts[0], arg: parts.slice(1).join('/') };
  }

  function setNav(name) {
    $$('#nav a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === name);
    });
  }

  function renderNavBadges() {
    var n = state.notebook.length;
    var b = $('#nbCount');
    if (!b) return;
    b.hidden = n === 0;
    b.textContent = n > 99 ? '99+' : String(n);
  }

  /* ---------------- الصفحة الرئيسية ---------------- */

  function unitCard(u) {
    var done = u.lessons.filter(function (l) { return isDone(l.id); }).length;
    var pct = u.lessons.length ? Math.round(done / u.lessons.length * 100) : 0;
    return '' +
      '<a class="unit-card' + (done === u.lessons.length ? ' is-done' : '') + '" href="#/unit/' + u.unit + '">' +
      '<span class="unit-num">' + u.unit + '</span>' +
      '<span class="unit-main">' +
      '<b>' + esc(u.title) + '</b>' +
      '<small>' + esc(u.subtitle) + ' · ' + u.hours + ' ساعات</small>' +
      '</span>' +
      '<span class="unit-side">' +
      '<span class="count"><b>' + done + '</b> / ' + u.lessons.length + ' دروس</span>' +
      '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
      '</span>' +
      '</a>';
  }

  function viewHome() {
    var done = doneCount();
    var pct = TOTAL ? Math.round(done / TOTAL * 100) : 0;
    var nid = nextIncompleteId();
    var nl = nid ? findLesson(nid) : null;
    return '' +
      '<section class="hero">' +
      '<div>' +
      '<div class="hero-kicker"><span>' + esc(SUBJECT.ar) + '</span><span class="sep">·</span><bdi dir="ltr">' + esc(SUBJECT.fr) + '</bdi></div>' +
      '<h1>أتقن <em>IPv4</em> خطوة بخطوة</h1>' +
      '<p>منهج كامل بالعربية: من البت والثنائي إلى حساب الشبكات والبث وVLSM — دروس قصيرة، مؤقّت 15 دقيقة، وتمارين تُصحّح لك فورًا.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary" href="#/lesson/' + (nid || '0.1') + '">' + (done > 0 ? 'متابعة التعلّم' : 'ابدأ من الدرس الأول') + '</a>' +
      '<a class="btn" href="#/generator">مولّد تمارين عشوائي</a>' +
      '</div>' +
      '</div>' +
      '<div class="hero-progress">' +
      '<div class="ring" style="--p:' + pct + '"><div><b>' + pct + '%</b><small>' + done + ' / ' + TOTAL + ' درسًا</small></div></div>' +
      '<span class="cap">' + (pct === 100 ? 'أكملت المنهج 🎉' : 'تقدّمك الكلي') + '</span>' +
      '</div>' +
      '</section>' +

      '<div class="quick">' +
      '<a href="#/lesson/' + (nid || '0.1') + '"><span class="q-ico">▶</span><span><b>الدرس التالي</b><small>' + (nl ? esc(nl.lesson.title) : '—') + '</small></span></a>' +
      '<a href="#/timer"><span class="q-ico">⏳</span><span><b>مؤقّت الدراسة</b><small>' + state.settings.lessonMinutes + ' دقيقة + بومودورو</small></span></a>' +
      '<a href="#/notebook"><span class="q-ico">📕</span><span><b>دفتر الأخطاء</b><small>' + state.notebook.length + ' عنصرًا للمراجعة</small></span></a>' +
      '</div>' +

      '<div class="section-title"><h2>الوحدات</h2><span>' + UNITS.length + ' وحدات · ' + TOTAL + ' درسًا</span></div>' +
      '<div class="units">' + UNITS.map(unitCard).join('') + '</div>';
  }

  /* ---------------- صفحة الوحدة ---------------- */

  function viewUnit(num) {
    var u = null;
    for (var i = 0; i < UNITS.length; i++) if (UNITS[i].unit === num) u = UNITS[i];
    if (!u) return notFound('الوحدة غير موجودة');

    var done = u.lessons.filter(function (l) { return isDone(l.id); }).length;
    var firstOpen = null;
    for (var j = 0; j < u.lessons.length; j++) if (!isDone(u.lessons[j].id)) { firstOpen = u.lessons[j].id; break; }

    return '' +
      '<div class="crumbs"><a href="#/">الرئيسية</a><span class="sep">/</span><span>الوحدة ' + u.unit + '</span></div>' +
      '<div class="unit-head">' +
      '<span class="unit-num">' + u.unit + '</span>' +
      '<div><h1>' + esc(u.title) + '</h1><p>' + esc(u.subtitle) + ' · ' + u.hours + ' ساعات · ' + u.lessons.length + ' دروس</p></div>' +
      '<div class="spacer"></div>' +
      '<a class="btn btn-primary btn-sm" href="#/lesson/' + (firstOpen || u.lessons[0].id) + '">' +
      (firstOpen ? 'ابدأ من الدرس ' + firstOpen : 'مراجعة من البداية') +
      '</a>' +
      '</div>' +

      '<div class="section-title"><h2>الدروس</h2><span>' + done + ' / ' + u.lessons.length + ' مكتمل</span></div>' +
      '<div class="lesson-list">' +
      u.lessons.map(function (l) {
        var p = state.progress.lessons[l.id] || {};
        var d = !!p.done;
        return '' +
          '<a class="lesson-row' + (d ? ' done' : '') + '" href="#/lesson/' + l.id + '">' +
          '<span class="st">' + (d ? '✓' : l.id) + '</span>' +
          '<span class="l-main"><b>' + esc(l.title) + '</b><small>' + esc(l.goal) + '</small></span>' +
          '<span class="l-meta">' +
          '<div>⏱ ' + l.minutes + ' د · ' + l.drills.length + ' تمارين</div>' +
          (p.best ? '<div class="score">أفضل نتيجة: ' + p.best + '%</div>' : '<div>لم يبدأ</div>') +
          '</span>' +
          '</a>';
      }).join('') +
      '</div>';
  }

  function notFound(msg) {
    return '<div class="empty"><span class="big">🔎</span>' + esc(msg || 'الصفحة غير موجودة') +
      '<div class="cta-row" style="justify-content:center"><a class="btn" href="#/">العودة للرئيسية</a></div></div>';
  }

  /* ---------------- الدرس ---------------- */

  var drillSession = null;

  function viewLesson(id) {
    var f = findLesson(id);
    if (!f) return notFound('الدرس غير موجود');
    var u = f.unit, l = f.lesson;
    var p = state.progress.lessons[id] || {};
    var drilling = drillSession && drillSession.lessonId === id;

    var head = '' +
      '<div class="crumbs"><a href="#/">الرئيسية</a><span class="sep">/</span>' +
      '<a href="#/unit/' + u.unit + '">الوحدة ' + u.unit + '</a><span class="sep">/</span>' +
      '<span>' + esc(l.title) + '</span></div>' +
      '<div class="lesson-head">' +
      '<h1>' + esc(l.title) + '</h1>' +
      '<div class="lesson-meta">' +
      '<span class="chip accent">' + esc(u.title) + '</span>' +
      '<span class="chip">⏱ ' + l.minutes + ' دقيقة</span>' +
      '<span class="chip">🎯 ' + l.drills.length + ' تمارين</span>' +
      (p.done ? '<span class="chip ok">✓ مكتمل</span>' : '') +
      (p.best ? '<span class="chip">أفضل نتيجة ' + p.best + '%</span>' : '') +
      '</div>' +
      '</div>' +
      '<div class="goal"><b>الهدف:</b> ' + esc(l.goal) + '</div>';

    if (drilling) return head + '<div id="drillBox"></div>';

    var theory = l.theory.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('');
    var steps = (l.example.steps || []).map(function (s) { return '<li>' + md(s) + '</li>'; }).join('');

    return head +
      timerPanel(true) +
      '<div class="card">' +
      '<h2><span class="ico">📘</span> الشرح</h2>' +
      '<ul class="theory">' + theory + '</ul>' +
      '</div>' +
      '<div class="card example">' +
      '<h2><span class="ico">🧮</span> مثال محلول</h2>' +
      '<div class="given">' + md(l.example.given) + '</div>' +
      '<ol>' + steps + '</ol>' +
      '<div class="answer">' + esc(l.example.answer) + '</div>' +
      '</div>' +
      '<div class="cta-row">' +
      '<button type="button" class="btn btn-primary" id="startDrills">ابدأ التمارين (' + l.drills.length + ')</button>' +
      (p.done ? '<button type="button" class="btn" id="redoDrills">أعد التمارين</button>' : '') +
      '<span class="cta-note">النجاح = ' + MASTERY + '% أو أكثر · الأخطاء تُحفظ في دفتر الأخطاء</span>' +
      '</div>';
  }

  /* ---------------- محرّك التمارين ---------------- */

  function startDrills(id) {
    var f = findLesson(id);
    if (!f) return;
    drillSession = {
      lessonId: id,
      drills: f.lesson.drills.slice(),
      i: 0,
      correct: 0,
      answers: [],
      locked: false,
      finished: false
    };
    render();
  }

  function checkInputAnswer(d, val) {
    var v = norm(val);
    if (!v) return false;
    var list = [d.answer].concat(d.accept || []);
    return list.some(function (a) { return norm(a) === v; });
  }

  function submitAnswer(raw) {
    var s = drillSession;
    if (!s || s.locked || s.finished) return;
    var d = s.drills[s.i];
    var ok = d.type === 'mcq' ? Number(raw) === Number(d.answer) : checkInputAnswer(d, raw);

    s.locked = true;
    s.answers[s.i] = { raw: raw, ok: ok };
    if (ok) s.correct++;
    else { recordMistake(s, d, raw); renderNavBadges(); }

    state.progress.drillsTotal++;
    if (ok) state.progress.drillsCorrect++;
    save();
    paintDrill();
  }

  function recordMistake(s, d, raw) {
    var entry = {
      lessonId: s.lessonId,
      q: d.q,
      type: d.type,
      your: d.type === 'mcq' ? (d.options[Number(raw)] || String(raw)) : String(raw),
      correct: d.type === 'mcq' ? d.options[Number(d.answer)] : d.answer,
      explain: d.explain || '',
      ts: Date.now(),
      count: 1
    };
    var arr = state.notebook;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].lessonId === entry.lessonId && arr[i].q === entry.q) {
        arr[i].ts = entry.ts;
        arr[i].your = entry.your;
        arr[i].count = (arr[i].count || 1) + 1;
        return;
      }
    }
    arr.unshift(entry);
    if (arr.length > 300) arr.length = 300;
  }

  function nextDrill() {
    var s = drillSession;
    if (!s) return;
    if (s.i + 1 >= s.drills.length) { finishLesson(); return; }
    s.i++;
    s.locked = false;
    paintDrill();
  }

  function finishLesson() {
    var s = drillSession;
    if (!s || s.finished) return;
    s.finished = true;

    var total = s.drills.length || 1;
    var score = Math.round(s.correct / total * 100);
    var p = state.progress.lessons[s.lessonId] || { attempts: 0, best: 0, done: false };
    p.attempts = (p.attempts || 0) + 1;
    p.best = Math.max(p.best || 0, score);
    p.done = !!(p.done || score >= MASTERY);
    p.last = Date.now();
    state.progress.lessons[s.lessonId] = p;
    save();
    paintDrill();
    renderNavBadges();
  }

  function drillFeedbackHtml(d, ans) {
    var ok = ans && ans.ok;
    var correctText = d.type === 'mcq' ? d.options[Number(d.answer)] : d.answer;
    return '' +
      '<div class="feedback ' + (ok ? 'ok' : 'bad') + '">' +
      '<div class="fb-head">' + (ok ? '✓ صحيح' : '✕ خطأ') + '</div>' +
      (!ok ? '<div class="fb-correct">الصحيح: <code>' + esc(correctText) + '</code></div>' : '') +
      '<div class="fb-explain">' + md(d.explain || '') + '</div>' +
      '</div>';
  }

  function paintDrill() {
    var box = $('#drillBox');
    var s = drillSession;
    if (!box || !s) return;

    if (s.finished) { box.innerHTML = resultHtml(s); bindResult(s); return; }

    var d = s.drills[s.i];
    var ans = s.answers[s.i];
    var pct = Math.round((s.i) / s.drills.length * 100);
    var total = s.drills.length;

    var body = '';
    if (d.type === 'mcq') {
      body = '<div class="options">' + d.options.map(function (opt, idx) {
        var cls = 'option';
        if (ans) {
          if (idx === Number(d.answer)) cls += ' correct';
          else if (Number(ans.raw) === idx) cls += ' wrong';
          else cls += ' dim';
        }
        return '<button type="button" class="' + cls + '" data-opt="' + idx + '"' + (ans ? ' disabled' : '') + '>' +
          '<span class="k">' + (idx + 1) + '</span>' +
          '<span>' + md(opt) + '</span>' +
          '</button>';
      }).join('') + '</div>';
    } else {
      var val = ans ? esc(ans.raw) : '';
      var cls2 = ans ? (ans.ok ? 'correct' : 'wrong') : '';
      body = '' +
        '<div class="input-row">' +
        '<input type="text" id="drillInput" class="' + cls2 + '" value="' + val + '" placeholder="اكتب الجواب…" autocomplete="off" spellcheck="false" dir="ltr"' + (ans ? ' disabled' : '') + '>' +
        (!ans ? '<button type="button" class="btn btn-primary" id="drillSubmit">تحقّق</button>' : '') +
        '</div>';
    }

    box.innerHTML = '' +
      '<div class="drill-wrap">' +
      '<div class="drill-top">' +
      '<span class="idx">' + (s.i + 1) + ' / ' + total + '</span>' +
      '<span class="bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="idx">' + s.correct + ' ✓</span>' +
      '</div>' +
      '<div class="drill-card">' +
      '<div class="drill-q">' + md(d.q) + '</div>' +
      body +
      (ans ? drillFeedbackHtml(d, ans) : '') +
      '<div class="drill-foot">' +
      '<span class="hint">' + (d.type === 'mcq' ? 'اختر جوابًا (أو اضغط 1–4)' : 'Enter للتحقق') + '</span>' +
      (ans ? '<button type="button" class="btn btn-primary" id="drillNext">' + (s.i + 1 === total ? 'النتيجة' : 'التالي') + '</button>' : '') +
      '</div>' +
      '</div>' +
      '</div>';

    if (d.type === 'mcq') {
      $$('#drillBox .option').forEach(function (b) {
        b.addEventListener('click', function () { submitAnswer(Number(b.dataset.opt)); });
      });
    } else if (!ans) {
      var inp = $('#drillInput');
      var btn = $('#drillSubmit');
      if (inp) inp.focus();
      if (btn && inp) btn.addEventListener('click', function () { submitAnswer(inp.value); });
    }

    var nb = $('#drillNext');
    if (nb) nb.addEventListener('click', nextDrill);
  }

  function resultHtml(s) {
    var total = s.drills.length || 1;
    var score = Math.round(s.correct / total * 100);
    var passed = score >= MASTERY;
    var wrong = [];
    s.answers.forEach(function (a, idx) {
      if (a && !a.ok) {
        var d = s.drills[idx];
        wrong.push('<div class="wrong-item"><b>' + md(d.q) + '</b><br>الصحيح: <code>' +
          esc(d.type === 'mcq' ? d.options[Number(d.answer)] : d.answer) + '</code></div>');
      }
    });

    return '' +
      '<div class="result">' +
      '<div class="ring" style="--p:' + score + '"><div><b>' + score + '%</b><small>' + s.correct + ' / ' + total + '</small></div></div>' +
      '<h2>' + (passed ? '🎉 أتقنت الدرس' : 'لم تصل بعد إلى ' + MASTERY + '%') + '</h2>' +
      '<p>' + (passed
        ? 'سُجّل الدرس كمكتمل. راجع الأخطاء إن وُجدت ثم انتقل للدرس التالي.'
        : 'أعد المحاولة — الهدف هو ' + MASTERY + '% على الأقل. الأخطاء محفوظة في دفتر الأخطاء.') + '</p>' +
      '<div class="cta-row">' +
      '<button type="button" class="btn btn-primary" id="resRetry">أعد التمارين</button>' +
      (passed && nextLessonId(s.lessonId) ? '<a class="btn" href="#/lesson/' + nextLessonId(s.lessonId) + '">الدرس التالي</a>' : '') +
      '<a class="btn btn-ghost" href="#/unit/' + findLesson(s.lessonId).unit.unit + '">رجوع للوحدة</a>' +
      '</div>' +
      (wrong.length ? '<div class="wrong-list">' + wrong.join('') + '</div>' : '') +
      '</div>';
  }

  function bindResult(s) {
    var b = $('#resRetry');
    if (b) b.addEventListener('click', function () { startDrills(s.lessonId); });
  }

  /* ---------------- مولّد التمارين ---------------- */

  var GEN_TYPES = [
    { id: 'random', label: 'عشوائي — كل الأنواع' },
    { id: 'network', label: 'عنوان الشبكة (Network)' },
    { id: 'broadcast', label: 'عنوان البث (Broadcast)' },
    { id: 'hosts', label: 'عدد الهوستس الصالحة' },
    { id: 'range', label: 'أول/آخر عنوان صالح' },
    { id: 'classify', label: 'تصنيف: شبكة / بث / هوست' },
    { id: 'maskHosts', label: 'الماسك من عدد الهوستس' },
    { id: 'block', label: 'Block Size' },
    { id: 'sameNet', label: 'نفس الشبكة أم لا؟' }
  ];

  var genState = { item: null, checked: false, ok: false, streak: 0, total: 0, correct: 0, type: 'random' };

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

  function randIp() {
    var kind = randInt(0, 3);
    if (kind === 0) return '10.' + randInt(0, 255) + '.' + randInt(0, 255) + '.' + randInt(1, 254);
    if (kind === 1) return '172.' + randInt(16, 31) + '.' + randInt(0, 255) + '.' + randInt(1, 254);
    if (kind === 2) return '192.168.' + randInt(0, 255) + '.' + randInt(1, 254);
    return randInt(1, 223) + '.' + randInt(0, 255) + '.' + randInt(0, 255) + '.' + randInt(1, 254);
  }

  function ip2int(ip) {
    return ip.split('.').reduce(function (a, o) { return ((a << 8) + (Number(o) & 255)) >>> 0; }, 0) >>> 0;
  }
  function int2ip(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  function prefix2mask(p) { return p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0); }

  function maskOctetAt(p) {
    var bits = p % 8;
    if (bits === 0) return 255;
    return (0xFF << (8 - bits)) & 0xFF;
  }

  function blockSize(p) {
    if (p % 8 === 0) return 256;
    return 256 - maskOctetAt(p);
  }

  /* رقم الأوكتيت (1-based) الذي يحتوي البلوك */
  function blockOctet(p) {
    return Math.floor(p / 8) + 1;
  }

  function usableHosts(p) {
    if (p >= 31) return Math.pow(2, 32 - p);
    return Math.pow(2, 32 - p) - 2;
  }

  function maskFromHosts(need) {
    for (var p = 30; p >= 8; p--) {
      if (usableHosts(p) >= need) return p;
    }
    return 8;
  }

  function makeGenItem(type) {
    if (type === 'random') type = pick(GEN_TYPES.filter(function (t) { return t.id !== 'random'; }).map(function (t) { return t.id; }));
    var p = pick([16, 17, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    var ip = randIp();
    var ipn = ip2int(ip);
    var mask = prefix2mask(p);
    var net = (ipn & mask) >>> 0;
    var bc = (net | (~mask >>> 0)) >>> 0;

    if (type === 'network') {
      return {
        kind: 'input', q: 'ما عنوان الشبكة (Network Address) للعنوان ' + ip + '/' + p + ' ؟',
        answer: int2ip(net), accept: [int2ip(net)],
        steps: [
          'الماسك = /' + p + ' → البلوك في الأوكتيت ' + blockOctet(p) + ' = ' + blockSize(p),
          'نطبّق IP AND Mask',
          'النتيجة = ' + int2ip(net)
        ],
        explain: 'Network = IP AND Mask = ' + int2ip(net)
      };
    }

    if (type === 'broadcast') {
      var totalAddrs = Math.pow(2, 32 - p);
      return {
        kind: 'input', q: 'ما عنوان البث (Broadcast) للشبكة ' + int2ip(net) + '/' + p + ' ؟',
        answer: int2ip(bc), accept: [int2ip(bc)],
        steps: [
          'عدد عناوين الشبكة = 2^' + (32 - p) + ' = ' + totalAddrs,
          'Broadcast = Network + ' + totalAddrs + ' − 1',
          int2ip(net) + ' + ' + totalAddrs + ' − 1 = ' + int2ip(bc)
        ],
        explain: 'آخر عنوان في الشبكة = ' + int2ip(bc)
      };
    }

    if (type === 'hosts') {
      return {
        kind: 'input', q: 'كم عدد الهوستس الصالحة في شبكة /' + p + ' ؟',
        answer: String(usableHosts(p)), accept: [String(usableHosts(p))],
        steps: ['عدد بتات الهوست = 32 − ' + p + ' = ' + (32 - p), '2^' + (32 - p) + ' − 2 = ' + usableHosts(p)],
        explain: '2^h − 2 = ' + usableHosts(p)
      };
    }

    if (type === 'range') {
      var askFirst = Math.random() < 0.5;
      var first = int2ip((net + 1) >>> 0);
      var last = int2ip((bc - 1) >>> 0);
      return {
        kind: 'input',
        q: askFirst
          ? 'ما أول عنوان صالح (First Usable) في ' + int2ip(net) + '/' + p + ' ؟'
          : 'ما آخر عنوان صالح (Last Usable) في ' + int2ip(net) + '/' + p + ' ؟',
        answer: askFirst ? first : last,
        accept: [askFirst ? first : last],
        steps: [
          'Network = ' + int2ip(net) + ' · Broadcast = ' + int2ip(bc),
          askFirst ? 'أول صالح = Network + 1 = ' + first : 'آخر صالح = Broadcast − 1 = ' + last
        ],
        explain: askFirst ? 'أول عنوان بعد الشبكة.' : 'آخر عنوان قبل البث.'
      };
    }

    if (type === 'classify') {
      var mode = randInt(0, 2);
      var target = mode === 0 ? net : (mode === 1 ? bc : (net + randInt(1, Math.max(1, (bc - net) - 1))) >>> 0);
      var opts = ['عنوان شبكة (Network)', 'عنوان بث (Broadcast)', 'هوست صالح (Host)'];
      return {
        kind: 'mcq',
        q: 'صنّف العنوان ' + int2ip(target) + '/' + p + ' :',
        options: opts,
        answerIndex: mode,
        answer: opts[mode],
        steps: [
          'Network = ' + int2ip(net),
          'Broadcast = ' + int2ip(bc),
          'العنوان ' + int2ip(target) + (mode === 0 ? ' = Network' : mode === 1 ? ' = Broadcast' : ' بينهما = Host')
        ],
        explain: 'المقارنة مع حدود الشبكة تحدد النوع.'
      };
    }

    if (type === 'maskHosts') {
      var need = pick([2, 6, 14, 25, 30, 50, 62, 100, 126, 200, 254, 500, 1000]);
      var np = maskFromHosts(need);
      return {
        kind: 'input', q: 'تحتاج ' + need + ' هوست صالح في شبكة فرعية. ما الماسك المناسب (/n) ؟',
        answer: '/' + np, accept: ['/' + np, String(np)],
        steps: [
          'نبحث عن أصغر 2^h − 2 ≥ ' + need,
          'h = ' + (32 - np) + ' → ' + usableHosts(np) + ' هوست',
          'الماسك = /' + np
        ],
        explain: 'أصغر ماسك يكفي: /' + np + ' (' + usableHosts(np) + ' هوست)'
      };
    }

    if (type === 'block') {
      var bp = pick([25, 26, 27, 28, 29, 30]);
      return {
        kind: 'input', q: 'ما Block Size للماسك /' + bp + ' ؟',
        answer: String(blockSize(bp)), accept: [String(blockSize(bp))],
        steps: [
          'قيمة الأوكتيت الأخير في الماسك = ' + maskOctetAt(bp),
          'block = 256 − ' + maskOctetAt(bp) + ' = ' + blockSize(bp)
        ],
        explain: 'Block Size = 256 − قيمة الأوكتيت في الماسك.'
      };
    }

    // sameNet
    var p2 = pick([16, 20, 22, 23, 24, 25, 26, 27, 28]);
    var a = randIp();
    var m2 = prefix2mask(p2);
    var an = (ip2int(a) & m2) >>> 0;
    var same = Math.random() < 0.5;
    var b;
    if (same) {
      var off = randInt(1, Math.max(1, Math.min(250, Math.pow(2, 32 - p2) - 2)));
      b = int2ip((an + off) >>> 0);
      if (ip2int(b) > (an | (~m2 >>> 0))) b = int2ip((an + 1) >>> 0);
    } else {
      b = randIp();
      if (((ip2int(b) & m2) >>> 0) === an) b = int2ip((an + (Math.pow(2, 32 - p2) | 0)) >>> 0);
    }
    var bn = (ip2int(b) & m2) >>> 0;
    var isSame = an === bn;
    return {
      kind: 'mcq',
      q: 'هل ' + a + '/' + p2 + ' و ' + b + '/' + p2 + ' في نفس الشبكة ؟',
      options: ['نعم — نفس الشبكة', 'لا — شبكتان مختلفتان'],
      answerIndex: isSame ? 0 : 1,
      answer: isSame ? 'نعم' : 'لا',
      steps: [
        a + ' → ' + int2ip(an) + '/' + p2,
        b + ' → ' + int2ip(bn) + '/' + p2,
        isSame ? 'متساويتان ✅' : 'مختلفتان ❌'
      ],
      explain: isSame ? 'نفس عنوان الشبكة.' : 'عنوانا الشبكة مختلفان.'
    };
  }

  function newGen() {
    genState.item = makeGenItem(genState.type);
    genState.checked = false;
    genState.ok = false;
    paintGen();
  }

  function genCheck(raw) {
    var it = genState.item;
    if (!it || genState.checked) return;
    var ok = it.kind === 'mcq' ? Number(raw) === Number(it.answerIndex) : checkInputAnswer(it, raw);
    genState.checked = true;
    genState.ok = ok;
    genState.total++;
    if (ok) { genState.correct++; genState.streak++; }
    else genState.streak = 0;
    paintGen();
  }

  function paintGen() {
    var box = $('#genBox');
    if (!box) return;
    var it = genState.item;
    if (!it) { newGen(); return; }

    var body = '';
    if (it.kind === 'mcq') {
      body = '<div class="options">' + it.options.map(function (opt, idx) {
        var cls = 'option';
        if (genState.checked) {
          if (idx === Number(it.answerIndex)) cls += ' correct';
          else if (idx === Number(genState.raw)) cls += ' wrong';
          else cls += ' dim';
        }
        return '<button type="button" class="' + cls + '" data-gopt="' + idx + '"' + (genState.checked ? ' disabled' : '') + '>' +
          '<span class="k">' + (idx + 1) + '</span><span>' + md(opt) + '</span></button>';
      }).join('') + '</div>';
    } else {
      body = '<div class="input-row">' +
        '<input type="text" id="genInput" placeholder="اكتب الجواب…" autocomplete="off" spellcheck="false" dir="ltr"' + (genState.checked ? ' disabled' : '') + '>' +
        (!genState.checked ? '<button type="button" class="btn btn-primary" id="genCheck">تحقّق</button>' : '') +
        '</div>';
    }

    var sol = '';
    if (genState.checked) {
      sol = '<div class="solution">' +
        '<b>' + (genState.ok ? '✓ صحيح' : '✕ خطأ') + '</b>' +
        (!genState.ok ? ' — الصحيح: <code>' + esc(it.answer) + '</code>' : '') +
        '<ol>' + it.steps.map(function (s) { return '<li>' + md(s) + '</li>'; }).join('') + '</ol>' +
        '<div class="res">' + esc(it.explain) + '</div>' +
        '</div>';
    }

    box.innerHTML = '' +
      '<div class="drill-card">' +
      '<div class="drill-q">' + md(it.q) + '</div>' +
      body + sol +
      '<div class="drill-foot">' +
      '<span class="hint">' + (it.kind === 'mcq' ? 'اختر جوابًا' : 'Enter للتحقق') + '</span>' +
      '<div style="display:flex;gap:8px">' +
      (genState.checked ? '<button type="button" class="btn btn-primary" id="genNew">تمرين جديد</button>' : '') +
      '<button type="button" class="btn btn-ghost" id="genSkip">تخطّي</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    if (it.kind === 'mcq') {
      $$('#genBox .option').forEach(function (b) {
        b.addEventListener('click', function () { genState.raw = Number(b.dataset.gopt); genCheck(Number(b.dataset.gopt)); });
      });
    } else if (!genState.checked) {
      var inp = $('#genInput');
      var btn = $('#genCheck');
      if (inp) inp.focus();
      if (inp && btn) btn.addEventListener('click', function () { genCheck(inp.value); });
    }

    var nb = $('#genNew');
    if (nb) nb.addEventListener('click', newGen);
    var sk = $('#genSkip');
    if (sk) sk.addEventListener('click', newGen);
  }

  function viewGenerator() {
    return '' +
      '<div class="page-head">' +
      '<h1>مولّد تمارين عشوائي</h1>' +
      '<p>تمارين لا نهائية على الحساب — كل جواب يُشرح خطوة بخطوة.</p>' +
      '</div>' +
      '<div class="gen-bar" style="margin-bottom:14px">' +
      '<select id="genType" aria-label="نوع التمرين">' +
      GEN_TYPES.map(function (t) { return '<option value="' + t.id + '"' + (genState.type === t.id ? ' selected' : '') + '>' + esc(t.label) + '</option>'; }).join('') +
      '</select>' +
      '<div class="gen-stats">' +
      '<span>السلسلة: <b id="genStreak">' + genState.streak + '</b></span>' +
      '<span>صحيح: <b id="genCorrect">' + genState.correct + '</b> / ' + genState.total + '</span>' +
      '</div>' +
      '</div>' +
      '<div id="genBox"></div>';
  }

  /* ---------------- دفتر الأخطاء ---------------- */

  function viewNotebook() {
    if (!state.notebook.length) {
      return '<div class="page-head"><h1>دفتر الأخطاء</h1><p>كل سؤال تخطئ فيه يُحفظ هنا للمراجعة.</p></div>' +
        '<div class="empty"><span class="big">📕</span>لا توجد أخطاء بعد — هذا خبر جيد.<br>' +
        '<div class="cta-row" style="justify-content:center"><a class="btn btn-primary" href="#/lesson/' + (nextIncompleteId() || '0.1') + '">ابدأ التعلّم</a></div></div>';
    }

    return '' +
      '<div class="page-head"><h1>دفتر الأخطاء</h1><p>' + state.notebook.length + ' سؤالًا بحاجة لمراجعة — أعد قراءة الشرح ثم جرّب تمرينًا مشابهًا.</p></div>' +
      '<div class="cta-row" style="margin-bottom:16px">' +
      '<a class="btn btn-primary btn-sm" href="#/generator">تمرين عشوائي</a>' +
      '<button type="button" class="btn btn-sm btn-danger" id="nbClear">مسح الدفتر</button>' +
      '</div>' +
      '<div class="nb-list">' +
      state.notebook.map(function (e, i) {
        var f = findLesson(e.lessonId);
        var title = f ? ('الوحدة ' + f.unit.unit + ' · ' + f.lesson.title) : e.lessonId;
        return '<div class="nb-item">' +
          '<div class="nb-top">' +
          '<span class="chip">' + esc(title) + '</span>' +
          (e.count > 1 ? '<span class="chip accent">تكرّر ' + e.count + '×</span>' : '') +
          '<span class="nb-actions">' +
          (f ? '<a class="btn btn-sm btn-ghost" href="#/lesson/' + e.lessonId + '">الدرس</a>' : '') +
          '<button type="button" class="btn btn-sm btn-ghost" data-nb-del="' + i + '">حذف</button>' +
          '</span>' +
          '</div>' +
          '<div class="nb-q">' + md(e.q) + '</div>' +
          '<div class="nb-a"><span class="yours">جوابك: ' + esc(e.your) + '</span>' +
          '<span class="right">الصحيح: ' + esc(e.correct) + '</span></div>' +
          (e.explain ? '<div class="nb-ex">' + md(e.explain) + '</div>' : '') +
          '</div>';
      }).join('') +
      '</div>';
  }

  /* ---------------- الإحصائيات ---------------- */

  function viewStats() {
    var done = doneCount();
    var pct = TOTAL ? Math.round(done / TOTAL * 100) : 0;
    var acc = state.progress.drillsTotal
      ? Math.round(state.progress.drillsCorrect / state.progress.drillsTotal * 100)
      : 0;

    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d), label: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'][d.getDay()], sec: state.stats.days[dayKey(d)] || 0 });
    }
    var maxSec = Math.max.apply(null, days.map(function (x) { return x.sec; }).concat([1]));

    var unitBars = UNITS.map(function (u) {
      var dn = u.lessons.filter(function (l) { return isDone(l.id); }).length;
      var p = u.lessons.length ? Math.round(dn / u.lessons.length * 100) : 0;
      return '<div class="unit-bar">' +
        '<span>الوحدة ' + u.unit + ' — ' + esc(u.title) + '</span>' +
        '<span class="bar"><i style="width:' + p + '%"></i></span>' +
        '<span class="n">' + dn + '/' + u.lessons.length + '</span>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="page-head"><h1>الإحصائيات</h1><p>قياس التقدّم يحافظ على الاستمرارية.</p></div>' +
      '<div class="stat-grid">' +
      '<div class="stat"><div class="k">التقدّم الكلي</div><div class="v">' + pct + '%<small> · ' + done + '/' + TOTAL + '</small></div></div>' +
      '<div class="stat"><div class="k">وقت الدراسة</div><div class="v">' + fmtDur(state.stats.seconds) + '</div></div>' +
      '<div class="stat"><div class="k">دقة التمارين</div><div class="v">' + acc + '%<small> · ' + state.progress.drillsCorrect + '/' + state.progress.drillsTotal + '</small></div></div>' +
      '<div class="stat"><div class="k">جلسات المؤقّت</div><div class="v">' + state.stats.sessions + '</div></div>' +
      '</div>' +

      '<div class="card">' +
      '<h2><span class="ico">📊</span> آخر 7 أيام (بالدقائق)</h2>' +
      '<div class="chart">' +
      days.map(function (x) {
        var h = Math.max(3, Math.round(x.sec / maxSec * 100));
        return '<div class="col">' +
          '<b>' + (x.sec ? Math.round(x.sec / 60) : '') + '</b>' +
          '<i style="height:' + h + '%"></i>' +
          '<span>' + x.label + '</span>' +
          '</div>';
      }).join('') +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h2><span class="ico">🗂️</span> التقدّم حسب الوحدة</h2>' +
      '<div class="unit-bars">' + unitBars + '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h2><span class="ico">📕</span> المراجعة</h2>' +
      '<p style="margin:0;color:var(--muted);font-size:14px">لديك <b style="color:var(--text)">' + state.notebook.length + '</b> سؤالًا في دفتر الأخطاء. ' +
      '<a href="#/notebook" style="color:var(--accent)">راجعها الآن ←</a></p>' +
      '</div>';
  }

  /* ---------------- الإعدادات ---------------- */

  function viewSettings() {
    return '' +
      '<div class="page-head"><h1>الإعدادات</h1><p>كل شيء محفوظ محليًا في متصفحك — لا حساب ولا إنترنت.</p></div>' +

      '<div class="card settings-grid">' +
      '<h2><span class="ico">⚙️</span> التعلّم والمؤقّت</h2>' +

      '<div class="field">' +
      '<span class="f-label"><b>مدة مؤقّت الدرس</b><small>المدة الافتراضية لجلسة الدرس (بالدقائق)</small></span>' +
      '<input type="number" id="setLessonMinutes" min="5" max="90" step="5" value="' + state.settings.lessonMinutes + '">' +
      '</div>' +

      '<div class="field">' +
      '<span class="f-label"><b>مدة جلسة بومودورو</b><small>جلسة العمل (بالدقائق)</small></span>' +
      '<input type="number" id="setPomoWork" min="5" max="60" step="5" value="' + state.settings.pomodoroWork + '">' +
      '</div>' +

      '<div class="field">' +
      '<span class="f-label"><b>مدة الراحة</b><small>راحة بومودورو (بالدقائق)</small></span>' +
      '<input type="number" id="setPomoBreak" min="1" max="30" step="1" value="' + state.settings.pomodoroBreak + '">' +
      '</div>' +

      '<div class="field">' +
      '<span class="f-label"><b>صوت نهاية المؤقّت</b><small>تنبيه صوتي عند انتهاء الوقت</small></span>' +
      '<input type="checkbox" id="setSound"' + (state.settings.sound ? ' checked' : '') + '>' +
      '</div>' +

      '<div class="field">' +
      '<span class="f-label"><b>المظهر</b><small>داكن أو فاتح</small></span>' +
      '<select id="setTheme">' +
      '<option value="dark"' + (state.theme === 'dark' ? ' selected' : '') + '>داكن</option>' +
      '<option value="light"' + (state.theme === 'light' ? ' selected' : '') + '>فاتح</option>' +
      '</select>' +
      '</div>' +
      '</div>' +

      '<div class="card settings-grid">' +
      '<h2><span class="ico">💾</span> البيانات</h2>' +
      '<div class="field">' +
      '<span class="f-label"><b>تصدير التقدّم</b><small>ملف JSON يحتوي كل شيء (احتياط أو نقل لجهاز آخر)</small></span>' +
      '<button type="button" class="btn btn-sm" id="btnExport">تصدير</button>' +
      '</div>' +
      '<div class="field">' +
      '<span class="f-label"><b>استيراد التقدّم</b><small>يستبدل البيانات الحالية بالملف المختار</small></span>' +
      '<span><input type="file" id="fileImport" accept=".json,application/json" hidden>' +
      '<button type="button" class="btn btn-sm" id="btnImport">اختيار ملف</button></span>' +
      '</div>' +
      '</div>' +

      '<div class="card settings-grid danger-zone">' +
      '<h2><span class="ico">⚠️</span> منطقة الخطر</h2>' +
      '<div class="field">' +
      '<span class="f-label"><b>تصفير كل التقدّم</b><small>يحذف الدروس المكتملة، الإحصائيات، ودفتر الأخطاء</small></span>' +
      '<button type="button" class="btn btn-sm btn-danger" id="btnReset">تصفير</button>' +
      '</div>' +
      '</div>' +

      '<div class="card">' +
      '<h2><span class="ico">ℹ️</span> عن التطبيق</h2>' +
      '<p style="margin:0;color:var(--muted);font-size:13.5px;line-height:1.9">' +
      esc(APP_NAME.ar) + ' — أكاديمية IPv4 · نسخة 1.0<br>' +
      UNITS.length + ' وحدات · ' + TOTAL + ' درسًا · يعمل بلا سيرفر وبلا إنترنت.<br>' +
      'المحتوى يغطي IPv4 فقط: OSI/TCP-IP، التقسيم، VLSM، العناوين الخاصة — بلا VLAN أو توجيه أو IPv6 (حاليًا).' +
      '</p>' +
      '<div class="about-brand">' +
      (BRAND.logo ? '<div class="about-logo"><img src="' + esc(BRAND.logo) + '" alt="' + esc(label(BRAND.institute) || 'شعار المعهد') + '" onerror="this.parentNode.remove()"></div>' : '') +
      '<div><span class="k">المادة</span><b>' + esc(SUBJECT.ar) + '</b> <span dir="ltr" class="fr">(' + esc(SUBJECT.fr) + ')</span></div>' +
      (BRAND.student ? '<div><span class="k">من إعداد</span><b>' + esc(label(BRAND.student)) + '</b></div>' : '') +
      (BRAND.institute ? '<div><span class="k">المعهد</span><b>' + esc(label(BRAND.institute)) + '</b></div>' : '') +
      (BRAND.year ? '<div><span class="k">السنة</span><b><bdi dir="ltr">' + esc(BRAND.year) + '</bdi></b></div>' : '') +
      '</div>' +
      '</div>';
  }

  function bindSettings() {
    var lm = $('#setLessonMinutes');
    if (lm) lm.addEventListener('change', function () {
      var v = clamp(Number(lm.value) || 15, 5, 90);
      lm.value = v;
      state.settings.lessonMinutes = v;
      if (Timer.st.mode === 'lesson' && !Timer.st.running) {
        Timer.st.total = v * 60;
        Timer.st.remaining = v * 60;
      }
      save(); Timer.paint(); toast('تم الحفظ');
    });

    var pw = $('#setPomoWork');
    if (pw) pw.addEventListener('change', function () {
      var v = clamp(Number(pw.value) || 25, 5, 60);
      pw.value = v; state.settings.pomodoroWork = v; save(); toast('تم الحفظ');
    });

    var pb = $('#setPomoBreak');
    if (pb) pb.addEventListener('change', function () {
      var v = clamp(Number(pb.value) || 5, 1, 30);
      pb.value = v; state.settings.pomodoroBreak = v; save(); toast('تم الحفظ');
    });

    var snd = $('#setSound');
    if (snd) snd.addEventListener('change', function () {
      state.settings.sound = snd.checked; save();
      if (snd.checked) beep();
    });

    var th = $('#setTheme');
    if (th) th.addEventListener('change', function () {
      state.theme = th.value === 'light' ? 'light' : 'dark';
      applyTheme(); save();
    });

    var ex = $('#btnExport');
    if (ex) ex.addEventListener('click', function () {
      try {
        var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'netacademy-progress.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        toast('تم تصدير الملف');
      } catch (e) { toast('تعذّر التصدير'); }
    });

    var imp = $('#btnImport');
    var file = $('#fileImport');
    if (imp && file) {
      imp.addEventListener('click', function () { file.click(); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var data = JSON.parse(String(fr.result));
            if (!data || typeof data !== 'object') throw new Error('bad');
            localStorage.setItem(KEY, JSON.stringify(data));
            toast('تم الاستيراد — إعادة تحميل…');
            setTimeout(function () { location.reload(); }, 600);
          } catch (e) { toast('ملف غير صالح'); }
        };
        fr.readAsText(f);
      });
    }

    var rs = $('#btnReset');
    if (rs) rs.addEventListener('click', function () {
      if (!confirm('هل تريد تصفير كل التقدّم؟ لا يمكن التراجع.')) return;
      if (!confirm('تأكيد أخير: سيُحذف كل شيء بما فيه دفتر الأخطاء والإحصائيات.')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      drillSession = null;
      genState = { item: null, checked: false, ok: false, streak: 0, total: 0, correct: 0, type: 'random' };
      Timer.st = state.timer = Timer.fresh('lesson');
      applyTheme();
      save();
      render();
      renderNavBadges();
      toast('تم التصفير');
    });
  }

  /* ---------------- المؤقّت (صفحة) ---------------- */

  function viewTimerPage() {
    var today = state.stats.days[dayKey(new Date())] || 0;
    return '' +
      '<div class="page-head"><h1>المؤقّت</h1><p>جلسة تركيز واحدة = 15 دقيقة. الهاتف بعيد، والهدف واحد.</p></div>' +
      '<div class="timer-page">' +
      timerPanel(false) +
      '<div class="stat-grid">' +
      '<div class="stat"><div class="k">جلسات اليوم</div><div class="v">' + Math.floor(today / 60) + '<small> دقيقة</small></div></div>' +
      '<div class="stat"><div class="k">وقت الدراسة الكلي</div><div class="v">' + fmtDur(state.stats.seconds) + '</div></div>' +
      '<div class="stat"><div class="k">جلسات مكتملة</div><div class="v">' + state.stats.sessions + '</div></div>' +
      '</div>' +
      '<div class="tips">' +
      '<div class="tip"><b>لماذا 15 دقيقة؟</b>مدة قصيرة تكسر مقاومة البدء، وطويلة بما يكفي لتعلّم فكرة كاملة.</div>' +
      '<div class="tip"><b>بومودورو</b>25 دقيقة عمل + 5 راحة. فعّلها من الأزرار أعلاه عند الحاجة لجلسات أطول.</div>' +
      '<div class="tip"><b>قاعدة واحدة</b>لا تفتح شيئًا آخر أثناء العدّ. إذا انتهى الوقت، انتقل للتمارين فورًا.</div>' +
      '</div>' +
      '</div>';
  }

  /* ---------------- الربط بعد العرض ---------------- */

  function afterRender(r) {
    if (r.name === 'lesson') {
      var id = r.arg;
      var b1 = $('#startDrills');
      var b2 = $('#redoDrills');
      if (b1) b1.addEventListener('click', function () { startDrills(id); });
      if (b2) b2.addEventListener('click', function () { startDrills(id); });
      if (drillSession && drillSession.lessonId === id) paintDrill();
    }
    if (r.name === 'generator') {
      var sel = $('#genType');
      if (sel) sel.addEventListener('change', function () {
        genState.type = sel.value;
        newGen();
      });
      if (!genState.item) newGen();
      else paintGen();
    }
    if (r.name === 'settings') bindSettings();
    if (r.name === 'notebook') {
      $$('[data-nb-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = Number(b.dataset.nbDel);
          state.notebook.splice(i, 1);
          save();
          render();
          renderNavBadges();
          toast('تم الحذف');
        });
      });
      var clr = $('#nbClear');
      if (clr) clr.addEventListener('click', function () {
        if (!confirm('مسح كل دفتر الأخطاء؟')) return;
        state.notebook = [];
        save();
        render();
        renderNavBadges();
        toast('تم مسح الدفتر');
      });
    }
  }

  function render() {
    var r = parseRoute();
    setNav(r.name === '' ? 'home' : r.name);
    var view = $('#view');
    if (!view) return;

    if (r.name === 'home' || r.name === '') view.innerHTML = viewHome();
    else if (r.name === 'unit') view.innerHTML = viewUnit(Number(r.arg));
    else if (r.name === 'lesson') view.innerHTML = viewLesson(r.arg);
    else if (r.name === 'timer') view.innerHTML = viewTimerPage();
    else if (r.name === 'generator') view.innerHTML = viewGenerator();
    else if (r.name === 'notebook') view.innerHTML = viewNotebook();
    else if (r.name === 'stats') view.innerHTML = viewStats();
    else if (r.name === 'settings') view.innerHTML = viewSettings();
    else view.innerHTML = viewHome();

    afterRender(r);
    window.scrollTo(0, 0);
  }

  /* ---------------- التذييل: بصمة الطالب والمعهد ---------------- */

  function renderCredits() {
    var el = $('#footCredits');
    if (!el) return;

    var bits = [];
    bits.push('<span>المادة: <b>' + esc(SUBJECT.ar) + '</b> <span class="fr" dir="ltr">(' + esc(SUBJECT.fr) + ')</span></span>');
    if (BRAND.student) bits.push('<span>من إعداد: <b>' + esc(label(BRAND.student)) + '</b></span>');
    if (BRAND.institute) bits.push('<span>المعهد: <b>' + esc(label(BRAND.institute)) + '</b></span>');
    if (BRAND.year) bits.push('<span>السنة: <b><bdi dir="ltr">' + esc(BRAND.year) + '</bdi></b></span>');

    var media = '';
    if (BRAND.logo) {
      media += '<img class="credit-img logo" src="' + esc(BRAND.logo) + '" alt="شعار ' + esc(label(BRAND.institute) || 'المعهد') + '" onerror="this.remove()">';
    }
    if (BRAND.signature) {
      media += '<img class="credit-img sig" src="' + esc(BRAND.signature) + '" alt="' + esc(label(BRAND.student) || 'التوقيع') + '" onerror="this.remove()">';
    }

    el.innerHTML = (media ? '<span class="credit-media">' + media + '</span>' : '') + bits.join('');

    var sub = $('#brandSub');
    if (sub && SUBJECT.fr) sub.textContent = SUBJECT.fr;

    var nm = $('#brandName');
    if (nm && APP_NAME.ar) nm.textContent = APP_NAME.ar;

    var fl = $('#footLine');
    if (fl) {
      fl.textContent = APP_NAME.ar + ' — تطبيق محلي· ' +
        UNITS.length + ' وحدات · IPv4 فقط';
    }
  }

  /* ---------------- الأحداث العامة ---------------- */

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark';
    var b = $('#themeBtn');
    if (b) b.textContent = state.theme === 'light' ? '☀️' : '🌙';
  }

  document.addEventListener('click', function (e) {
    var modeBtn = e.target.closest ? e.target.closest('[data-mode]') : null;
    if (modeBtn && modeBtn.closest('.timer-panel')) { Timer.setMode(modeBtn.dataset.mode); return; }

    if (e.target.closest && e.target.closest('#tStart')) { Timer.toggle(); return; }
    if (e.target.closest && e.target.closest('#tReset')) { Timer.reset(); return; }
  });

  document.addEventListener('keydown', function (e) {
    // مولّد التمارين
    if ($('#genBox')) {
      var it = genState.item;
      if (e.key === 'Enter') {
        var gi = $('#genInput');
        if (gi && it && !genState.checked) { genCheck(gi.value); e.preventDefault(); return; }
        if (genState.checked) { newGen(); e.preventDefault(); return; }
      }
      return;
    }

    // التمارين
    var s = drillSession;
    if (!s || !$('#drillBox') || s.finished) return;

    if (e.key === 'Enter') {
      if (!s.locked) {
        var inp = $('#drillInput');
        if (inp) { submitAnswer(inp.value); e.preventDefault(); }
      } else {
        var nb = $('#drillNext');
        if (nb) { nextDrill(); e.preventDefault(); }
      }
      return;
    }

    if (/^[1-9]$/.test(e.key) && !s.locked) {
      var d = s.drills[s.i];
      if (d && d.type === 'mcq') {
        var idx = Number(e.key) - 1;
        if (idx < d.options.length) { submitAnswer(idx); e.preventDefault(); }
      }
    }
  });

  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
  });

  window.addEventListener('hashchange', render);

  /* ---------------- التشغيل ---------------- */

  applyTheme();
  Timer.init();
  renderCredits();
  renderNavBadges();
  render();

  // فحص سريع: إن لم يوجد محتوى أصلًا
  if (!TOTAL) {
    var v = $('#view');
    if (v) v.innerHTML = '<div class="empty"><span class="big">⚠️</span>لم يُحمَّل أي محتوى. تأكد من وجود ملفات <code>content/unit0.js … unit9.js</code> بجانب index.html.</div>';
  }
})();
