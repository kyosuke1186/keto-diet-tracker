const SPREADSHEET_ID = "1b5LpA47wX5r5B9sIIaUxwFD9pEi9YUZxRVP90kbQ5V8";
const SYNC_TOKEN = "PASTE_YOUR_SYNC_KEY_HERE";

const SHEETS = {
  meta: "管理",
  settings: "設定",
  meals: "食事記録",
  weights: "体重記録",
  templates: "食品テンプレ"
};

const SETTING_KEYS = {
  height: "height",
  "身長cm": "height",
  carbGoal: "carbGoal",
  "糖質上限g": "carbGoal",
  startWeight: "startWeight",
  "開始体重kg": "startWeight",
  goalWeight: "goalWeight",
  "目標体重kg": "goalWeight"
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
    settings: readSettings_(ss.getSheetByName(SHEETS.settings)),
    meals: readMeals_(ss.getSheetByName(SHEETS.meals)),
    weights: readWeights_(ss.getSheetByName(SHEETS.weights)),
    templates: readTemplates_(ss.getSheetByName(SHEETS.templates))
  };
}

function saveData_(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  writeSettings_(ss.getSheetByName(SHEETS.settings), data.settings || {});
  writeMeals_(ss.getSheetByName(SHEETS.meals), data.meals || []);
  writeWeights_(ss.getSheetByName(SHEETS.weights), data.weights || []);
  writeTemplates_(ss.getSheetByName(SHEETS.templates), data.templates || {});
  writeRows_(ss.getSheetByName(SHEETS.meta), [
    ["項目", "値"],
    ["形式バージョン", "1"],
    ["最終更新", new Date().toISOString()]
  ]);
}

function readSettings_(sheet) {
  const rows = values_(sheet);
  const settings = { height: 174, startWeight: 85, goalWeight: 70, carbGoal: 30 };
  rows.slice(1).forEach(([key, value]) => {
    if (!key) return;
    const normalizedKey = SETTING_KEYS[key] || key;
    settings[normalizedKey] = Number(value);
  });
  return settings;
}

function writeSettings_(sheet, settings) {
  writeRows_(sheet, [
    ["項目", "値"],
    ["身長cm", Number(settings.height) || 174],
    ["糖質上限g", Number(settings.carbGoal) || 30],
    ["開始体重kg", Number(settings.startWeight) || 85],
    ["目標体重kg", Number(settings.goalWeight) || 70]
  ]);
}

function readMeals_(sheet) {
  const rows = values_(sheet).slice(1);
  const byId = {};
  rows.forEach((row) => {
    const [id, date, type, createdAt, text, itemId, name, quantity, carbs, protein, fat, calories, confidence, source, needsCheck] = row;
    if (!id) return;
    if (!byId[id]) {
      byId[id] = { id, date, type, text, createdAt, items: [] };
    }
    byId[id].items.push({
      id: itemId || `${id}-${byId[id].items.length}`,
      name,
      quantity: Number(quantity) || 1,
      carbs: Number(carbs) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      calories: Number(calories) || 0,
      confidence: confidence || "低",
      source: source || "sheet",
      needsCheck: String(needsCheck).toLowerCase() === "true"
    });
  });
  return Object.values(byId);
}

function writeMeals_(sheet, meals) {
  const rows = [["食事ID", "日付", "タイミング", "作成日時", "入力文", "食品ID", "食品名", "数量", "糖質g", "タンパク質g", "脂質g", "カロリーkcal", "推定精度", "推定元", "要確認"]];
  meals.forEach((meal) => {
    const items = Array.isArray(meal.items) ? meal.items : [];
    if (!items.length) {
      rows.push([meal.id, meal.date, meal.type, meal.createdAt, meal.text || "", "", "", "", "", "", "", "", "", "", ""]);
      return;
    }
    items.forEach((item, index) => {
      rows.push([
        meal.id,
        meal.date,
        meal.type,
        meal.createdAt,
        meal.text || "",
        item.id || `${meal.id}-${index}`,
        item.name || "",
        Number(item.quantity) || 1,
        Number(item.carbs) || 0,
        Number(item.protein) || 0,
        Number(item.fat) || 0,
        Number(item.calories) || 0,
        item.confidence || "低",
        item.source || "",
        Boolean(item.needsCheck)
      ]);
    });
  });
  writeRows_(sheet, rows);
}

function readWeights_(sheet) {
  return values_(sheet).slice(1).filter((row) => row[0]).map((row) => ({
    id: row[0],
    date: row[1],
    slot: row[2],
    weight: Number(row[3]) || 0,
    steps: Number(row[4]) || 0,
    note: row[5] || "",
    createdAt: row[6] || ""
  }));
}

function writeWeights_(sheet, weights) {
  const rows = [["記録ID", "日付", "タイミング", "体重kg", "歩数", "メモ", "作成日時"]];
  weights.forEach((entry) => rows.push([
    entry.id,
    entry.date,
    entry.slot,
    Number(entry.weight) || 0,
    Number(entry.steps) || 0,
    entry.note || "",
    entry.createdAt || ""
  ]));
  writeRows_(sheet, rows);
}

function readTemplates_(sheet) {
  const templates = {};
  values_(sheet).slice(1).forEach((row) => {
    const [key, name, quantity, carbs, protein, fat, calories] = row;
    if (!key) return;
    templates[key] = {
      name,
      quantity: Number(quantity) || 1,
      macros: {
        carbs: Number(carbs) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        calories: Number(calories) || 0
      }
    };
  });
  return templates;
}

function writeTemplates_(sheet, templates) {
  const rows = [["キー", "食品名", "数量", "糖質g", "タンパク質g", "脂質g", "カロリーkcal", "更新日時"]];
  Object.keys(templates).forEach((key) => {
    const template = templates[key] || {};
    const macros = template.macros || {};
    rows.push([
      key,
      template.name || "",
      Number(template.quantity) || 1,
      Number(macros.carbs) || 0,
      Number(macros.protein) || 0,
      Number(macros.fat) || 0,
      Number(macros.calories) || 0,
      new Date().toISOString()
    ]);
  });
  writeRows_(sheet, rows);
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
