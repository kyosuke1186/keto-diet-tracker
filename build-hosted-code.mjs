import { readFileSync, writeFileSync } from "node:fs";

const hostedServerFunctions = `function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    const action = (e.parameter.action || "load").toLowerCase();
    const result = action === "load"
      ? { ok: true, data: loadData_(), updatedAt: new Date().toISOString() }
      : { ok: false, error: "Unknown action" };
    return jsonp_(e.parameter.callback || "", result);
  }
  const bootstrap = JSON.stringify(JSON.stringify(loadData_()));
  const html = APP_HTML.replace('"__SERVER_BOOTSTRAP__"', bootstrap);
  return HtmlService.createHtmlOutput(html)
    .setTitle("体重管理")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const payload = e.parameter.payload || (e.postData && e.postData.contents) || "{}";
    saveData_(JSON.parse(payload));
    return json_({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function loadDataForClient() {
  return loadData_();
}

function saveDataForClient(data) {
  saveData_(data || {});
  return { ok: true, updatedAt: new Date().toISOString() };
}`;

const hostedSyncFunctions = `    function syncUrl() {
      return "hosted";
    }

    function syncToken() {
      return "";
    }

    function queueAutoSync() {
      window.clearTimeout(queueAutoSync.timer);
      queueAutoSync.timer = window.setTimeout(() => pushSync(true), 900);
    }

    function jsonp() {
      return Promise.reject(new Error("この版では使いません"));
    }

    async function pullSync() {
      state.sync.pending = true;
      renderSyncStatus();
      try {
        const data = await new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .loadDataForClient();
        });
        applyAppData(data || {});
        state.sync.lastPulledAt = new Date().toISOString();
        state.sync.pending = false;
        saveLocalOnly();
        renderSyncStatus();
        showToast("Googleから読み込みました");
      } catch (error) {
        state.sync.pending = false;
        saveLocalOnly();
        renderSyncStatus();
        showToast(error && error.message ? error.message : "同期できませんでした");
      }
    }

    async function pushSync(silent = false) {
      state.sync.pending = true;
      renderSyncStatus();
      try {
        await new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .saveDataForClient(getAppData());
        });
        state.sync.lastPushedAt = new Date().toISOString();
        state.sync.pending = false;
        saveLocalOnly();
        renderSyncStatus();
        if (!silent) showToast("Googleへ同期しました");
        return true;
      } catch (error) {
        state.sync.pending = false;
        saveLocalOnly();
        renderSyncStatus();
        if (!silent) showToast(error && error.message ? error.message : "Googleへ同期できませんでした");
        return false;
      }
    }

`;

let server = readFileSync("Code.gs", "utf8");
server = server.replace(/const SYNC_TOKEN = ".*?";\n\n/, "");
server = server.replace(
  /function doGet\(e\) \{[\s\S]*?\n\}\n\nfunction doPost\(e\) \{[\s\S]*?\n\}\n\nfunction loadData_\(\)/,
  `${hostedServerFunctions}\n\nfunction loadData_()`
);
server = server.replace(/\n\nfunction isAuthorized_\(token\) \{[\s\S]*?\n\}\s*$/, "\n");

let html = readFileSync("index.html", "utf8");
const syncStart = html.indexOf("    function syncUrl()");
const syncEnd = html.indexOf("    function showToast(message)");
if (syncStart < 0 || syncEnd < 0 || syncEnd <= syncStart) {
  throw new Error("Could not locate sync function block in index.html");
}
html = `${html.slice(0, syncStart)}${hostedSyncFunctions}${html.slice(syncEnd)}`;
html = html.replace(
  /\n    if \("serviceWorker" in navigator\) \{[\s\S]*?    \}\n\n    load\(\);\n    render\(\);/,
  "\n    load();\n    render();"
);

writeFileSync("Code-hosted.gs", `${server}\nconst APP_HTML = ${JSON.stringify(html)};\n`);
