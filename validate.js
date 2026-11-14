/* ============================================================
   validate.js — فحص محتوى المنهج داخل المتصفح (بلا Node)
   ============================================================ */
(function () {
  'use strict';

  var units = (window.CURRICULUM || []).slice().sort(function (a, b) { return a.unit - b.unit; });
  var errors = [];
  var warnings = [];

  function err(msg) { errors.push(msg); }
  function warn(msg) { warnings.push(msg); }

  function isStr(x) { return typeof x === 'string' && x.trim().length > 0; }

  if (!units.length) {
    err('لم يُحمَّل أي محتوى: window.CURRICULUM فارغ. تحقّق من مسارات ملفات content/*.js.');
  }

  var ids = Object.create(null);
  var questions = Object.create(null);

  var perUnit = [];
  var totals = { units: 0, lessons: 0, theory: 0, drills: 0, mcq: 0, input: 0, minutes: 0 };

  units.forEach(function (u, ui) {
    var row = { unit: u.unit, title: u.title, lessons: 0, drills: 0, mcq: 0, input: 0, problems: 0, warnings: 0 };

    if (typeof u.unit !== 'number') err('وحدة بلا رقم صحيح (index ' + ui + ').');
    if (!isStr(u.title)) err('الوحدة ' + u.unit + ': title فارغ.');
    if (!isStr(u.subtitle)) warn('الوحدة ' + u.unit + ': subtitle فارغ.');
    if (typeof u.hours !== 'number' || u.hours <= 0) warn('الوحدة ' + u.unit + ': hours غير صالح.');
    if (!Array.isArray(u.lessons) || !u.lessons.length) {
      err('الوحدة ' + u.unit + ': لا توجد دروس.');
      perUnit.push(row);
      return;
    }

    if (u.unit !== ui) {
      err('ترتيب الوحدات غير متسلسل: المتوقع ' + ui + ' لكن الموجود ' + u.unit + '.');
    }

    u.lessons.forEach(function (l, li) {
      row.lessons++;
      var tag = 'الدرس ' + (l && l.id ? l.id : '(' + u.unit + '#' + li + ')');

      if (!isStr(l.id)) { err(tag + ': id فارغ.'); }
      else {
        if (ids[l.id]) err('معرّف مكرّر: ' + l.id + ' (يظهر أكثر من مرة).');
        ids[l.id] = true;
        if (String(l.id).indexOf(u.unit + '.') !== 0) {
          warn('الدرس ' + l.id + ': المعرّف لا يبدأ برقم وحدته (' + u.unit + '.).');
        }
      }

      if (!isStr(l.title)) err(tag + ': title فارغ.');
      if (!isStr(l.goal)) err(tag + ': goal فارغ.');
      if (typeof l.minutes !== 'number' || l.minutes <= 0) warn(tag + ': minutes غير صالح.');
      else totals.minutes += l.minutes;

      if (!Array.isArray(l.theory) || l.theory.length < 3) {
        err(tag + ': theory يجب أن تحتوي 3 عناصر على الأقل.');
      } else {
        l.theory.forEach(function (t, i) {
          if (!isStr(t)) err(tag + ': عنصر theory رقم ' + (i + 1) + ' فارغ.');
          if (typeof t === 'string' && t.indexOf('\n') !== -1) {
            err(tag + ': theory رقم ' + (i + 1) + ' يحتوي سطرًا مكسورًا (\\n داخل السلسلة).');
          }
        });
        totals.theory += l.theory.length;
      }

      if (!l.example || typeof l.example !== 'object') {
        err(tag + ': لا يوجد example.');
      } else {
        if (!isStr(l.example.given)) err(tag + ': example.given فارغ.');
        if (!Array.isArray(l.example.steps) || l.example.steps.length < 1) err(tag + ': example.steps فارغة.');
        else l.example.steps.forEach(function (s, i) {
          if (!isStr(s)) err(tag + ': example.steps رقم ' + (i + 1) + ' فارغ.');
        });
        if (!isStr(l.example.answer)) err(tag + ': example.answer فارغ.');
      }

      if (!Array.isArray(l.drills) || l.drills.length < 3) {
        err(tag + ': drills يجب أن تحتوي 3 تمارين على الأقل.');
      } else {
        var uInput = 0, uMcq = 0;
        l.drills.forEach(function (d, di) {
          row.drills++;
          totals.drills++;
          var dtag = tag + ' · تمرين ' + (di + 1);

          if (!d || typeof d !== 'object') { err(dtag + ': غير صالح.'); return; }
          if (!isStr(d.q)) err(dtag + ': السؤال (q) فارغ.');
          if (d.type !== 'mcq' && d.type !== 'input') err(dtag + ': type يجب أن يكون mcq أو input (الموجود: ' + d.type + ').');
          if (!isStr(d.explain)) warn(dtag + ': لا يوجد explain.');

          if (d.q && typeof d.q === 'string') {
            var key = String(d.q).trim();
            if (questions[key]) warn('سؤال مكرّر نصًا: «' + key.slice(0, 60) + '…»');
            questions[key] = true;
          }

          if (d.type === 'mcq') {
            uMcq++; row.mcq++; totals.mcq++;
            if (!Array.isArray(d.options) || d.options.length < 2) {
              err(dtag + ': options يجب أن تحتوي خيارين على الأقل.');
            } else {
              d.options.forEach(function (o, oi) {
                if (!isStr(o)) err(dtag + ': الخيار ' + (oi + 1) + ' فارغ.');
              });
              if (typeof d.answer !== 'number' || d.answer < 0 || d.answer >= d.options.length) {
                err(dtag + ': answer (index) خارج نطاق الخيارات.');
              }
              if (new Set(d.options).size !== d.options.length) warn(dtag + ': خيارات مكرّرة.');
            }
          } else if (d.type === 'input') {
            uInput++; row.input++; totals.input++;
            if (!isStr(d.answer)) err(dtag + ': answer فارغ.');
            if (d.accept && !Array.isArray(d.accept)) err(dtag + ': accept يجب أن يكون مصفوفة.');
            if (Array.isArray(d.accept)) {
              d.accept.forEach(function (a, ai) {
                if (!isStr(a)) err(dtag + ': accept رقم ' + (ai + 1) + ' فارغ.');
              });
            }
            if (isStr(d.answer) && /\s{2,}/.test(d.answer)) warn(dtag + ': answer يحتوي فراغات متعددة.');
          }

          if (isStr(d.explain) && /\bundefined\b|\bNaN\b/.test(d.explain)) {
            warn(dtag + ': explain يحتوي undefined/NaN.');
          }
        });

        if (uInput === 0) warn(tag + ': كل تمارينه اختيار من متعدد (بلا input) — يضعف الاسترجاع النشط.');
        if (uMcq === 0) warn(tag + ': كل تمارينه كتابية (بلا mcq) — أضف تمرينًا مفاهيميًا.');
      }
    });

    totals.units++;
    totals.lessons += row.lessons;
    perUnit.push(row);
  });

  // فحص الوحدات المفقودة 0..9
  for (var n = 0; n <= 9; n++) {
    if (!units.some(function (u) { return u.unit === n; })) err('الوحدة ' + n + ' مفقودة.');
  }

  // حساب المشاكل لكل وحدة (تقريبي من الرسائل)
  perUnit.forEach(function (r) {
    errors.forEach(function (m) {
      if (m.indexOf('الوحدة ' + r.unit) !== -1 || m.indexOf('الدرس ' + r.unit + '.') !== -1) r.problems++;
    });
    warnings.forEach(function (m) {
      if (m.indexOf('الوحدة ' + r.unit) !== -1 || m.indexOf('الدرس ' + r.unit + '.') !== -1) r.warnings++;
    });
  });

  /* ---------------- العرض ---------------- */

  var verdict = document.getElementById('verdict');
  var okAll = errors.length === 0;
  verdict.className = 'verdict ' + (okAll ? 'pass' : 'fail');
  verdict.innerHTML = (okAll
    ? '✓ المحتوى سليم — ' + totals.lessons + ' درسًا · ' + totals.drills + ' تمرينًا'
    : '✕ وُجد ' + errors.length + ' خطأ يجب إصلاحه') +
    '<small>' + (warnings.length ? warnings.length + ' تحذير (لا يمنع التشغيل) · ' : '') +
    'آخر فحص: ' + new Date().toLocaleString('ar') + '</small>';

  document.getElementById('summary').innerHTML =
    '<div class="stat-grid" style="margin-bottom:20px">' +
    '<div class="stat"><div class="k">الوحدات</div><div class="v">' + totals.units + '</div></div>' +
    '<div class="stat"><div class="k">الدروس</div><div class="v">' + totals.lessons + '</div></div>' +
    '<div class="stat"><div class="k">التمارين</div><div class="v">' + totals.drills + '</div></div>' +
    '<div class="stat"><div class="k">اختيار / كتابة</div><div class="v">' + totals.mcq + ' / ' + totals.input + '</div></div>' +
    '<div class="stat"><div class="k">وقت المحتوى</div><div class="v">' + totals.minutes + '<small> د</small></div></div>' +
    '</div>';

  var rows = perUnit.map(function (r) {
    return '<tr>' +
      '<td class="num">' + r.unit + '</td>' +
      '<td>' + (r.title || '—') + '</td>' +
      '<td class="num">' + r.lessons + '</td>' +
      '<td class="num">' + r.drills + '</td>' +
      '<td class="num">' + r.mcq + '</td>' +
      '<td class="num">' + r.input + '</td>' +
      '<td class="num ' + (r.problems ? 'bad' : 'ok') + '">' + (r.problems ? r.problems : '✓') + '</td>' +
      '<td class="num ' + (r.warnings ? 'warn' : 'ok') + '">' + (r.warnings ? r.warnings : '✓') + '</td>' +
      '</tr>';
  }).join('');

  document.getElementById('table').innerHTML =
    '<div class="card" style="margin-bottom:18px">' +
    '<h2>التفصيل حسب الوحدة</h2>' +
    '<table><thead><tr>' +
    '<th class="num">#</th><th>العنوان</th><th class="num">دروس</th><th class="num">تمارين</th>' +
    '<th class="num">MCQ</th><th class="num">Input</th><th class="num">أخطاء</th><th class="num">تحذيرات</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</div>';

  var issuesHtml = '';
  if (errors.length) {
    issuesHtml += '<div class="card" style="border-color:var(--danger)"><h2 class="bad">أخطاء (' + errors.length + ')</h2>' +
      '<div class="issues">' + errors.map(function (m) { return '<div class="issue err">✕ ' + esc(m) + '</div>'; }).join('') + '</div></div>';
  }
  if (warnings.length) {
    issuesHtml += '<div class="card"><h2 class="warn">تحذيرات (' + warnings.length + ')</h2>' +
      '<div class="issues">' + warnings.slice(0, 80).map(function (m) { return '<div class="issue wrn">⚠ ' + esc(m) + '</div>'; }).join('') +
      (warnings.length > 80 ? '<div class="issue wrn">… و' + (warnings.length - 80) + ' تحذيرًا آخر.</div>' : '') +
      '</div></div>';
  }
  if (!errors.length && !warnings.length) {
    issuesHtml = '<div class="card"><h2 class="ok">لا مشاكل</h2><p class="muted" style="margin:0">كل الدروس تحتوي هدفًا وشرحًا ومثالًا و3 تمارين صالحة على الأقل، وكل التمارين فيها جواب وشرح.</p></div>';
  }
  document.getElementById('issues').innerHTML = issuesHtml;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
