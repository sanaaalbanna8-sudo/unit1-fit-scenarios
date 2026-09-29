var SHEET_ID = "1Gaw6S6Z-5FPoxeS5VJTHw1DJkALE4xrJH-4S1Mcj33s";

function doGet() {
  return ContentService.createTextOutput("OK");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var data = readPayload_(e);
    if (String(data.kind || "") !== "fit") {
      throw new Error("unknown kind");
    }
    var ss = SpreadsheetApp.openById(SHEET_ID);
    writeFit_(ss, data);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function writeFit_(ss, data) {
  var sum = ensure_(ss, "قرار البنية - ملخص", [
    "الاسم", "الشعبة", "وقت البدء", "وقت التسليم", "المدة",
    "الدرجة", "الكامل", "النسبة %", "التقدير",
    "أ1 %", "أ2 %", "أ3 %", "أ4 %", "أ5 %", "أ6 %", "أ7 %", "أ8 %", "أ9 %",
    "النواتج الضعيفة"
  ]);
  var det = ensure_(ss, "قرار البنية - تفاصيل", [
    "الاسم", "الشعبة", "وقت التسليم",
    "رقم", "الناتج", "الموضوع", "المؤسسة",
    "اختيار الطالب", "الأنسب", "الدرجة", "من", "النتيجة", "القاعدة"
  ]);
  var gaps = ensure_(ss, "قرار البنية - الفجوات", [
    "الاسم", "الشعبة", "وقت التسليم",
    "رقم", "الناتج", "الموضوع", "المؤسسة",
    "اختيار الطالب", "الأنسب", "الدرجة", "من", "القاعدة"
  ]);
  var aims = ensure_(ss, "قرار البنية - النواتج", [
    "الاسم", "الشعبة", "وقت التسليم",
    "الرمز", "العنوان", "الدرجة", "الكامل", "النسبة %"
  ]);

  var aimMap = {};
  var aimRows = data.aims || [];
  for (var a = 0; a < aimRows.length; a++) {
    aimMap[String(aimRows[a].id || "")] = aimRows[a];
  }
  function aimPct(id) {
    var row = aimMap[id];
    return row && row.percent != null ? row.percent : "";
  }

  sum.appendRow([
    data.name || "",
    data.klass || "",
    data.startedAt || "",
    data.finishedAt || "",
    data.durationText || "",
    data.earned || 0,
    data.max || 0,
    data.percent || 0,
    data.band || "",
    aimPct("A1"), aimPct("A2"), aimPct("A3"), aimPct("A4"), aimPct("A5"),
    aimPct("A6"), aimPct("A7"), aimPct("A8"), aimPct("A9"),
    data.weakAims || ""
  ]);

  var details = data.details || [];
  for (var i = 0; i < details.length; i++) {
    var r = details[i];
    det.appendRow([
      data.name || "",
      data.klass || "",
      data.finishedAt || "",
      r.num || (i + 1),
      r.aim || "",
      r.topic || "",
      r.org || "",
      r.chosen || "",
      r.correct || "",
      r.hit != null ? r.hit : 0,
      r.max || 3,
      r.result || "",
      r.rule || ""
    ]);
    if ((r.hit != null ? r.hit : 0) < 3) {
      gaps.appendRow([
        data.name || "",
        data.klass || "",
        data.finishedAt || "",
        r.num || (i + 1),
        r.aim || "",
        r.topic || "",
        r.org || "",
        r.chosen || "",
        r.correct || "",
        r.hit != null ? r.hit : 0,
        r.max || 3,
        r.rule || ""
      ]);
    }
  }

  for (var j = 0; j < aimRows.length; j++) {
    var aim = aimRows[j];
    aims.appendRow([
      data.name || "",
      data.klass || "",
      data.finishedAt || "",
      aim.id || "",
      aim.title || "",
      aim.earned || 0,
      aim.max || 0,
      aim.percent || 0
    ]);
  }
}

function ensure_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function firstText_(v) {
  if (v == null) return "";
  if (Object.prototype.toString.call(v) === "[object Array]") {
    v = v.length ? v[0] : "";
  }
  return String(v);
}

function tryParseJson_(text) {
  if (!text) return null;
  try {
    var obj = JSON.parse(text);
    if (obj && typeof obj === "object") return obj;
  } catch (err) {}
  return null;
}

function readPayload_(e) {
  e = e || {};
  var p = e.parameter || {};
  var ps = e.parameters || {};
  var raw = (e.postData && e.postData.contents) ? String(e.postData.contents) : "";
  var list = [p.payload, p.data, ps.payload, ps.data, raw];
  for (var i = 0; i < list.length; i++) {
    var text = firstText_(list[i]);
    if (!text) continue;
    var obj = tryParseJson_(text);
    if (obj) return obj;
    if (text.indexOf("payload=") >= 0 || text.indexOf("data=") >= 0) {
      var parts = text.split("&");
      for (var k = 0; k < parts.length; k++) {
        var eq = parts[k].indexOf("=");
        if (eq < 0) continue;
        var key = parts[k].substring(0, eq);
        var val = parts[k].substring(eq + 1);
        try { key = decodeURIComponent(key.replace(/\+/g, " ")); } catch (e1) {}
        if (key !== "payload" && key !== "data") continue;
        try { val = decodeURIComponent(val.replace(/\+/g, " ")); } catch (e2) {}
        obj = tryParseJson_(val);
        if (obj) return obj;
      }
    }
  }
  throw new Error("empty body");
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
