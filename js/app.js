const COPYRIGHT = "جميع الحقوق محفوظة 2026 Sanaa albanna";
const STORE_KEY = "u1-fit-scenarios-v1";
const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

const $app = document.getElementById("app");
const $who = document.getElementById("who");

const state = {
  name: "",
  klass: "",
  index: 0,
  picks: {},
  order: {},
  startedAt: 0,
  finishedAt: 0,
  filter: "gaps",
  phase: "start",
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function aimOf(id) {
  return AIMS.find((a) => a.id === id);
}

function save() {
  const pack = {
    name: state.name,
    klass: state.klass,
    index: state.index,
    picks: state.picks,
    order: state.order,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    phase: state.phase,
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(pack));
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function clearSave() {
  localStorage.removeItem(STORE_KEY);
}

function qAt(i) {
  return SCENARIOS[i];
}

function optionOrder(q) {
  if (!state.order[q.id]) state.order[q.id] = shuffle(q.options.map((o) => o.id));
  return state.order[q.id].map((id) => q.options.find((o) => o.id === id));
}

function pickedIds(q) {
  return state.picks[q.id] ? state.picks[q.id].slice() : [];
}

function answeredCount() {
  return SCENARIOS.filter((q) => (state.picks[q.id] || []).length === 3).length;
}

function scoreQuestion(q) {
  const chosen = new Set(state.picks[q.id] || []);
  const correct = q.options.filter((o) => o.ok);
  const hit = correct.filter((o) => chosen.has(o.id)).length;
  return { hit, max: 3 };
}

function grade() {
  const rows = SCENARIOS.map((q, i) => {
    const s = scoreQuestion(q);
    return { q, i, hit: s.hit, max: s.max };
  });
  const earned = rows.reduce((n, r) => n + r.hit, 0);
  const max = rows.length * 3;
  const percent = max ? Math.round((earned / max) * 100) : 0;
  const byAim = AIMS.map((a) => {
    const part = rows.filter((r) => r.q.aim === a.id);
    const e = part.reduce((n, r) => n + r.hit, 0);
    const m = part.length * 3;
    return { ...a, earned: e, max: m, percent: m ? Math.round((e / m) * 100) : 0, count: part.length };
  });
  return { rows, earned, max, percent, byAim };
}

function verdict(percent, byAim) {
  const weak = byAim.filter((a) => a.percent < 70).map((a) => a.ar + " " + a.title);
  let title = "ما زال القرار يحتاج إعادة بناء";
  let text = "الأسماء معروفة أكثر من الملاءمة. ابدأ من النواتج الأضعف في الدفتر، واقرأ لماذا رُفض الخيار لا اسمه فقط.";
  if (percent >= 85) {
    title = "قرارك قريب من شغل الفريق";
    text = "تربط الأداة بقيد الشركة: النوع والميزانية والأولوية. هذا هو المطلوب قبل الواجب الرسمي.";
  } else if (percent >= 70) {
    title = "تميّز الغالب وتحتاج ضبط القيود";
    text = "أكثر القرارات في مكانها. الفجوات حيث تشابهت أداة جيدة مع موقف لا يناسبها.";
  } else if (percent >= 55) {
    title = "تعرف الأداة وتخطئ في وقت استخدامها";
    text = "المشكلة ليست الحفظ. المشكلة اختيار بنية صحيحة لشركة أخرى داخل هذا السيناريو.";
  }
  if (weak.length && percent < 85) {
    text += " راجع أولًا: " + weak.slice(0, 3).join("، ") + ".";
  }
  return { title, text };
}

function showWho() {
  if (!state.name) {
    $who.hidden = true;
    return;
  }
  $who.hidden = false;
  $who.innerHTML = "<b>" + esc(state.name) + "</b><span>" + esc(state.klass || "بلا شعبة") + "</span>";
}

function renderStart(saved) {
  state.phase = "start";
  showWho();
  const resume = saved && saved.name && saved.phase !== "start"
    ? `<div class="resume">
        <strong>في محاولة محفوظة باسم ${esc(saved.name)}</strong>
        <p>توقفت عند السؤال ${Math.min((saved.index || 0) + 1, SCENARIOS.length)} من ${SCENARIOS.length}.</p>
        <div class="row-btns">
          <button class="btn" type="button" id="resume">أكمل المحاولة</button>
          <button class="btn ghost" type="button" id="fresh">ابدأ من جديد</button>
        </div>
      </div>`
    : "";
  $app.innerHTML = `
    <p class="kicker">تمرين قرار قبل الواجب الرسمي · المعلمة سناء البنا</p>
    <h1>الأنسب هنا غير الأنسب هناك</h1>
    <p class="lead">ستون موقف عمل. في كل موقف ستة خيارات، والمطلوب ثلاثة فقط. الأداة الممتازة لشركة قد تكون خطأً لميزانية ثانية أو أولوية ثانية.</p>
    <div class="stats">
      <div class="stat"><b>60</b><span>سيناريو قرار</span></div>
      <div class="stat"><b>3 من 6</b><span>تختار الأنسب لهذا القيد</span></div>
      <div class="stat"><b>دفتر</b><span>يفسر كل خيار بعد التسليم</span></div>
    </div>
    <section class="panel">
      <h2>قبل ما تبدأ</h2>
      <ul>
        <li>اكتب اسمك. يظهر على الشاشة وفي ملف الإكسل.</li>
        <li>اقرأ نوع المؤسسة والميزانية والأولوية قبل الخيارات.</li>
        <li>لا تبحث عن «الجهاز الأقوى». ابحث عما يخدم هذه المهمة الآن.</li>
        <li>بعد التسليم سترى لماذا ناسب كل خيار ولماذا رُفض، حتى الذي أصبته.</li>
      </ul>
      <form class="form" id="start-form">
        <div class="form-row">
          <div>
            <label for="student-name">اسمك</label>
            <input id="student-name" name="student-name" type="text" autocomplete="name" required placeholder="الاسم الثلاثي" />
          </div>
          <div>
            <label for="student-class">الشعبة</label>
            <input id="student-class" name="student-class" type="text" placeholder="مثال: 12 ب" />
          </div>
        </div>
        <p class="err" id="start-err"></p>
        <button class="btn" type="submit">ابدأ التقييم</button>
      </form>
      ${resume}
    </section>
    <p class="copyline">${COPYRIGHT}</p>
  `;
  document.getElementById("start-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("student-name").value.trim();
    const klass = document.getElementById("student-class").value.trim();
    if (name.length < 3) {
      document.getElementById("start-err").textContent = "اكتب اسمك كاملًا قبل البدء.";
      return;
    }
    state.name = name;
    state.klass = klass;
    state.index = 0;
    state.picks = {};
    state.order = {};
    state.startedAt = Date.now();
    state.finishedAt = 0;
    state.phase = "exam";
    save();
    renderExam();
  });
  const resumeBtn = document.getElementById("resume");
  if (resumeBtn) {
    resumeBtn.addEventListener("click", () => {
      Object.assign(state, {
        name: saved.name,
        klass: saved.klass || "",
        index: saved.index || 0,
        picks: saved.picks || {},
        order: saved.order || {},
        startedAt: saved.startedAt || Date.now(),
        finishedAt: saved.finishedAt || 0,
        phase: saved.phase === "done" ? "done" : "exam",
      });
      if (state.phase === "done") renderResults();
      else renderExam();
    });
    document.getElementById("fresh").addEventListener("click", () => {
      clearSave();
      renderStart(null);
    });
  }
}

function renderExam() {
  state.phase = "exam";
  showWho();
  const q = qAt(state.index);
  const aim = aimOf(q.aim);
  const opts = optionOrder(q);
  const chosen = new Set(pickedIds(q));
  const pct = Math.round((state.index / SCENARIOS.length) * 100);
  $app.innerHTML = `
    <div class="progress-wrap">
      <div class="progress-meta">
        <span>سؤال ${state.index + 1} من ${SCENARIOS.length}</span>
        <span>أُجيب ${answeredCount()} · ${esc(state.name)}</span>
      </div>
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    </div>
    <article class="case">
      <div class="case-top">
        <span class="aim-pill">${esc(aim.ar)} · ${esc(aim.title)}</span>
        <span class="topic-pill">${esc(q.topic)}</span>
      </div>
      <h2>${esc(q.org)}</h2>
      <ul class="facts">
        ${q.facts.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join("")}
      </ul>
      <p class="scene">${esc(q.scene)}</p>
      <p class="ask">اختر أنسب 3 قرارات لهذه المؤسسة الآن. خيار جيد لشركة أخرى قد يكون خطأً هنا.</p>
      <div class="opts" id="opts">
        ${opts.map((o, i) => `
          <button type="button" class="opt${chosen.has(o.id) ? " on" : ""}" data-id="${esc(o.id)}" aria-pressed="${chosen.has(o.id)}">
            <span class="letter">${LETTERS[i]}</span>
            <span>${esc(o.text)}</span>
          </button>
        `).join("")}
      </div>
      <p class="pick-note" id="pick-note">اخترت ${chosen.size} من 3</p>
    </article>
    <div class="nav">
      <button class="btn ghost" type="button" id="prev" ${state.index === 0 ? "disabled" : ""}>السابق</button>
      <button class="btn navy" type="button" id="next">${state.index === SCENARIOS.length - 1 ? "تسليم ومراجعة الدفتر" : "التالي"}</button>
    </div>
    <div class="map" id="map" aria-label="خريطة الأسئلة"></div>
  `;
  const note = document.getElementById("pick-note");
  document.getElementById("opts").addEventListener("click", (e) => {
    const btn = e.target.closest(".opt");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const list = pickedIds(q);
    const at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1);
    else if (list.length >= 3) {
      note.textContent = "ثلاثة فقط. ألغِ خيارًا قبل أن تضيف غيره.";
      note.classList.add("warn");
      return;
    } else list.push(id);
    state.picks[q.id] = list;
    save();
    btn.classList.toggle("on", list.includes(id));
    btn.setAttribute("aria-pressed", list.includes(id) ? "true" : "false");
    note.classList.remove("warn");
    note.textContent = "اخترت " + list.length + " من 3";
    paintMap();
  });
  document.getElementById("prev").addEventListener("click", () => {
    if (state.index > 0) {
      state.index -= 1;
      save();
      renderExam();
    }
  });
  document.getElementById("next").addEventListener("click", () => {
    if ((state.picks[q.id] || []).length !== 3) {
      note.textContent = "ثبّت ثلاثة خيارات قبل المتابعة.";
      note.classList.add("warn");
      return;
    }
    if (state.index === SCENARIOS.length - 1) {
      openConfirm();
      return;
    }
    state.index += 1;
    save();
    renderExam();
  });
  paintMap();
  window.scrollTo(0, 0);
}

function paintMap() {
  const map = document.getElementById("map");
  if (!map) return;
  map.innerHTML = SCENARIOS.map((q, i) => {
    const done = (state.picks[q.id] || []).length === 3;
    return `<button type="button" data-go="${i}" class="${done ? "done" : ""} ${i === state.index ? "here" : ""}">${i + 1}</button>`;
  }).join("");
  map.onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.index = Number(btn.getAttribute("data-go"));
    save();
    renderExam();
  };
}

function openConfirm() {
  const missing = SCENARIOS.filter((q) => (state.picks[q.id] || []).length !== 3).length;
  const box = document.createElement("div");
  box.className = "modal";
  box.innerHTML = `
    <div class="panel">
      <h2>تسليم الدفتر؟</h2>
      <p>${missing ? "ما زال " + missing + " سيناريو بلا ثلاثة خيارات. ارجع إليها من الخريطة." : "بعد التسليم تفتح المراجعة كاملة: كل خيار ولماذا ناسب أو لم يناسب."}</p>
      <div class="row-btns">
        <button class="btn" type="button" id="do-finish" ${missing ? "disabled" : ""}>سلّم وافتح الدفتر</button>
        <button class="btn ghost" type="button" id="do-back">رجوع</button>
      </div>
    </div>
  `;
  document.body.appendChild(box);
  box.querySelector("#do-back").onclick = () => box.remove();
  box.querySelector("#do-finish").onclick = () => {
    box.remove();
    finish();
  };
}

function finish() {
  state.finishedAt = Date.now();
  state.phase = "done";
  save();
  const report = grade();
  sendCloud(report);
  renderResults();
}

function durationText() {
  const end = state.finishedAt || Date.now();
  const sec = Math.max(0, Math.round((end - state.startedAt) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + " د و " + s + " ث";
}

function renderResults() {
  state.phase = "done";
  showWho();
  const report = grade();
  const v = verdict(report.percent, report.byAim);
  const gaps = report.rows.filter((r) => r.hit < 3).length;
  $app.innerHTML = `
    <p class="kicker">دفتر القرار · ${esc(state.name)}</p>
    <div class="score-hero panel">
      <div class="ring" style="--p:${report.percent}"><span>${report.percent}%</span></div>
      <div>
        <p class="verdict">${esc(v.title)}</p>
        <p>${esc(v.text)}</p>
        <p>الدرجة ${report.earned} من ${report.max} · الوقت ${durationText()} · فجوات ${gaps} من 60</p>
        <div class="row-btns">
          <button class="btn" type="button" id="excel">تنزيل Excel</button>
          <button class="btn ghost" type="button" id="again">محاولة جديدة</button>
        </div>
      </div>
    </div>
    <section class="panel">
      <h2>النواتج</h2>
      <div class="aims">
        ${report.byAim.map((a) => `
          <div class="aim-row${a.percent < 70 ? " weak" : ""}">
            <span>${esc(a.ar)} ${esc(a.title)}</span>
            <div class="track"><i style="width:${a.percent}%"></i></div>
            <b>${a.percent}%</b>
          </div>
        `).join("")}
      </div>
      <p>هذا تمرين قرار قبل الواجب الرسمي، لا علامة الواجب نفسه. اقرأ القاعدة ثم سبب كل خيار، بما فيه الذي اخترته صح.</p>
    </section>
    <div class="filters">
      <button class="btn ghost${state.filter === "gaps" ? " on" : ""}" type="button" data-filter="gaps">الفجوات أولًا</button>
      <button class="btn ghost${state.filter === "all" ? " on" : ""}" type="button" data-filter="all">الستون كلهم</button>
      ${AIMS.map((a) => `<button class="btn ghost${state.filter === a.id ? " on" : ""}" type="button" data-filter="${a.id}">${a.ar}</button>`).join("")}
    </div>
    <div id="lessons"></div>
    <p class="copyline">${COPYRIGHT}</p>
  `;
  paintLessons(report);
  document.getElementById("excel").onclick = () => downloadExcel(report);
  document.getElementById("again").onclick = () => {
    clearSave();
    state.name = "";
    state.klass = "";
    state.picks = {};
    state.order = {};
    state.index = 0;
    state.finishedAt = 0;
    renderStart(null);
  };
  $app.querySelector(".filters").onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    state.filter = btn.getAttribute("data-filter");
    renderResults();
  };
}

function paintLessons(report) {
  const host = document.getElementById("lessons");
  let rows = report.rows;
  if (state.filter === "gaps") rows = rows.filter((r) => r.hit < 3);
  else if (state.filter !== "all") rows = rows.filter((r) => r.q.aim === state.filter);
  if (!rows.length) {
    host.innerHTML = `<section class="panel"><p>لا فجوات في هذا العرض. افتح «الستون كلهم» واقرأ القواعد حتى يثبت السبب لا الجواب فقط.</p></section>`;
    return;
  }
  host.innerHTML = rows.map((r) => lessonHtml(r)).join("");
}

function lessonHtml(r) {
  const q = r.q;
  const aim = aimOf(q.aim);
  const chosen = new Set(state.picks[q.id] || []);
  const open = r.hit < 3 ? " open" : "";
  return `
    <details class="lesson${r.hit < 3 ? " miss" : ""}"${open}>
      <summary>
        <span>${r.i + 1}. ${esc(q.org)}</span>
        <span class="tag ${r.hit === 3 ? "ok" : "no"}">${r.hit}/3</span>
      </summary>
      <div class="body">
        <p><span class="aim-pill">${esc(aim.ar)} · ${esc(q.topic)}</span></p>
        <p>${esc(q.scene)}</p>
        <p class="rule">${esc(q.rule)}</p>
        ${q.options.map((o) => {
          const mine = chosen.has(o.id);
          const label = o.ok ? "يناسب هذا القيد" : "لا يناسب هذا القيد";
          const mineTxt = mine ? " · اخترته" : "";
          return `<div class="choice">
            <span class="tag ${o.ok ? "ok" : "no"}">${label}${mineTxt}</span>
            <p><strong>${esc(o.text)}</strong><br />${esc(o.why)}</p>
          </div>`;
        }).join("")}
      </div>
    </details>
  `;
}

function xml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sheet(name, rows) {
  const body = rows.map((r) => "<Row>" + r.map((c) => {
    const num = typeof c === "number";
    return `<Cell><Data ss:Type="${num ? "Number" : "String"}">${num ? c : xml(c)}</Data></Cell>`;
  }).join("") + "</Row>").join("");
  return `<Worksheet ss:Name="${xml(name)}" ss:RightToLeft="1"><Table>${body}</Table></Worksheet>`;
}

function downloadExcel(report) {
  const v = verdict(report.percent, report.byAim);
  const summary = [
    ["الاسم", state.name],
    ["الشعبة", state.klass || ""],
    ["التاريخ", new Date(state.finishedAt).toLocaleString("ar-JO")],
    ["المدة", durationText()],
    ["الدرجة", report.earned],
    ["من", report.max],
    ["النسبة", report.percent],
    ["التقدير", v.title],
    ["المعلمة", "سناء البنا"],
    ["الحقوق", COPYRIGHT],
  ];
  report.byAim.forEach((a) => summary.push([a.ar + " " + a.title, a.percent]));
  const details = [[
    "رقم", "الناتج", "الموضوع", "المؤسسة", "اختيار الطالب", "الأنسب", "الدرجة", "من", "القاعدة",
  ]];
  report.rows.forEach((r) => {
    const chosen = r.q.options.filter((o) => (state.picks[r.q.id] || []).includes(o.id)).map((o) => o.text).join(" | ");
    const right = r.q.options.filter((o) => o.ok).map((o) => o.text).join(" | ");
    details.push([
      r.i + 1, aimOf(r.q.aim).ar, r.q.topic, r.q.org, chosen, right, r.hit, 3, r.q.rule,
    ]);
  });
  const gaps = [details[0]].concat(details.slice(1).filter((_, i) => report.rows[i].hit < 3));
  const xmlDoc = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheet("ملخص", summary)}
${sheet("التفاصيل", details)}
${sheet("الفجوات", gaps)}
</Workbook>`;
  const blob = new Blob(["\uFEFF" + xmlDoc], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  const safe = state.name.replace(/[\\/:*?"<>|]/g, "").trim() || "student";
  a.href = URL.createObjectURL(blob);
  a.download = "قرار-البنية-" + safe + ".xls";
  a.click();
  URL.revokeObjectURL(a.href);
}

function sheetsUrl() {
  return String((window.FIT_CLOUD || {}).sheetsUrl || "").trim();
}

function sendCloud(report) {
  const url = sheetsUrl();
  if (!url) return;
  const body = JSON.stringify({
    name: state.name,
    klass: state.klass,
    percent: report.percent,
    earned: report.earned,
    max: report.max,
    finishedAt: new Date(state.finishedAt).toISOString(),
    aims: report.byAim.map((a) => ({ id: a.id, percent: a.percent })),
    answers: report.rows.map((r) => ({
      id: r.q.id,
      hit: r.hit,
      picked: state.picks[r.q.id] || [],
    })),
  });
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.target = "fitSink";
  form.acceptCharset = "UTF-8";
  form.style.display = "none";
  ["payload", "data"].forEach((name) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = body;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function boot() {
  const saved = load();
  if (saved && saved.phase === "done" && saved.name) {
    Object.assign(state, saved);
    renderResults();
    return;
  }
  renderStart(saved);
}

boot();
