const SPREADSHEET_ID = "1b5LpA47wX5r5B9sIIaUxwFD9pEi9YUZxRVP90kbQ5V8";
const SYNC_TOKEN = "PASTE_YOUR_SYNC_KEY_HERE";

const SHEETS = {
  meta: "管理",
  settings: "設定",
  weights: "体重記録"
};

const SETTING_KEYS = {
  height: "height",
  "身長cm": "height",
  startWeight: "startWeight",
  "開始体重kg": "startWeight",
  goalWeight: "goalWeight",
  "目標体重kg": "goalWeight",
  displaySlot: "displaySlot",
  "表示基準": "displaySlot"
};

function doGet(e) {
  if (!isAuthorized_(e.parameter.token)) {
    return jsonp_(e.parameter.callback || "", { ok: false, error: "Invalid sync token" });
  }
  const action = (e.parameter.action || "load").toLowerCase();
  const callback = e.parameter.callback || "";
  const result = action === "load"
    ? { ok: true, data: loadData_(), updatedAt: new Date().toISOString() }
    : { ok: false, error: "Unknown action" };

  return jsonp_(callback, result);
}

function doPost(e) {
  try {
    if (!isAuthorized_(e.parameter.token)) {
      return json_({ ok: false, error: "Invalid sync token" });
    }
    const payload = e.parameter.payload || (e.postData && e.postData.contents) || "{}";
    saveData_(JSON.parse(payload));
    return json_({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function loadData_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    settings: readSettings_(ensureSheet_(ss, SHEETS.settings)),
    weights: readWeights_(ensureSheet_(ss, SHEETS.weights))
  };
}

function saveData_(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  writeSettings_(ensureSheet_(ss, SHEETS.settings), data.settings || {});
  writeWeights_(ensureSheet_(ss, SHEETS.weights), data.weights || []);
  writeRows_(ensureSheet_(ss, SHEETS.meta), [
    ["項目", "値"],
    ["アプリ", "体重管理"],
    ["形式バージョン", "2"],
    ["最終更新", new Date().toISOString()]
  ]);
}

function readSettings_(sheet) {
  const rows = values_(sheet);
  const settings = { height: 174, startWeight: 85, goalWeight: 70, displaySlot: "morning" };
  rows.slice(1).forEach(([key, value]) => {
    if (!key) return;
    const normalizedKey = SETTING_KEYS[key] || key;
    settings[normalizedKey] = normalizedKey === "displaySlot" ? String(value || "morning") : Number(value);
  });
  return settings;
}

function writeSettings_(sheet, settings) {
  writeRows_(sheet, [
    ["項目", "値"],
    ["身長cm", Number(settings.height) || 174],
    ["開始体重kg", Number(settings.startWeight) || 85],
    ["目標体重kg", Number(settings.goalWeight) || 70],
    ["表示基準", settings.displaySlot || "morning"]
  ]);
}

function readWeights_(sheet) {
  return values_(sheet).slice(1).filter((row) => row[0]).map((row) => ({
    id: row[0],
    date: row[1],
    slot: row[2],
    weight: Number(row[3]) || 0,
    note: row[4] || "",
    createdAt: row[5] || "",
    updatedAt: row[6] || row[5] || ""
  }));
}

function writeWeights_(sheet, weights) {
  const rows = [["記録ID", "日付", "タイミング", "体重kg", "メモ", "作成日時", "更新日時"]];
  weights.forEach((entry) => rows.push([
    entry.id,
    entry.date,
    entry.slot,
    Number(entry.weight) || 0,
    entry.note || "",
    entry.createdAt || "",
    entry.updatedAt || entry.createdAt || ""
  ]));
  writeRows_(sheet, rows);
}

function ensureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function values_(sheet) {
  const range = sheet.getDataRange();
  return range.getNumRows() ? range.getValues() : [];
}

function writeRows_(sheet, rows) {
  sheet.clearContents();
  if (!rows.length) return;
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, payload) {
  const body = callback
    ? `${callback}(${JSON.stringify(payload)});`
    : JSON.stringify(payload);
  return ContentService
    .createTextOutput(body)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function isAuthorized_(token) {
  return String(token || "") === SYNC_TOKEN;
}
