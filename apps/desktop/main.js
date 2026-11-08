// @ts-check
// Electron main process: runs the bundled Next.js server (server/, made by scripts/prepare-server.mjs)
// on 127.0.0.1 and shows it in a window. Data lives in the OS app-data folder, not the repo.
//
//   electron .          use the bundled server
//   electron . --dev    show the dev server on http://localhost:3000 instead (run `pnpm dev` first)
import { app, BrowserWindow, Menu, dialog, shell, utilityProcess } from "electron";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import updaterPkg from "electron-updater";
import { appCommandAction, swipeAction, withFeature } from "./lib/navigation.js";
import { DEFAULT_PORT, databaseUrl, importDatabase, isExternal, pickPort, waitForServer } from "./lib/setup.js";
import { CHECK_EVERY_MS, RELEASES_REPO, backupName, backupsToPrune, isNewer, needsBackup } from "./lib/updates.js";

const { autoUpdater } = updaterPkg;

const here = path.dirname(fileURLToPath(import.meta.url));
const devMode = process.argv.includes("--dev");
// For trying a build without touching your real data: HABIT_DATA_DIR=/some/folder
if (process.env.HABIT_DATA_DIR) app.setPath("userData", path.resolve(process.env.HABIT_DATA_DIR));

// Two-finger swipe on a touchpad = back/forward (Chrome has it; Electron needs the feature switched on).
app.commandLine.appendSwitch("enable-features", withFeature(app.commandLine.getSwitchValue("enable-features")));

/** @type {Electron.UtilityProcess | null} */
let server = null;
/** @type {BrowserWindow | null} */
let win = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(start).catch((err) => fail("HabitManager couldn't start", String(err?.stack ?? err)));
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  quitting = true;
  server?.kill();
});

function dataDir() {
  const dir = app.getPath("userData");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** @param {string} title @param {string} detail */
function fail(title, detail) {
  dialog.showErrorBox(title, detail);
  app.exit(1);
}

async function start() {
  buildMenu();
  if (devMode) return openWindow("http://localhost:3000");

  const dbFile = path.join(dataDir(), "habit.db");
  if (!existsSync(dbFile)) await firstRun(dbFile);
  backupIfVersionChanged(dbFile);

  const serverJs = path.join(app.isPackaged ? process.resourcesPath : here, "server", "apps", "web", "server.js");
  if (!existsSync(serverJs)) {
    return fail("Server not built", `Missing ${serverJs}\n\nRun \`pnpm --filter desktop prepare-server\` first.`);
  }

  const preferred = Number(process.env.HABIT_PORT) || DEFAULT_PORT;
  const { port, fallback } = await pickPort(preferred, portIsFree, anyFreePort);
  const origin = `http://127.0.0.1:${port}`;

  const logDir = path.join(dataDir(), "logs");
  mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, "server.log");
  const log = createWriteStream(logFile, { flags: "a" });
  log.write(`\n--- ${new Date().toISOString()} starting on ${origin}\n`);

  server = utilityProcess.fork(serverJs, [], {
    cwd: path.dirname(serverJs),
    stdio: "pipe",
    serviceName: "HabitManager server",
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      DATABASE_URL: databaseUrl(dbFile),
    },
  });
  server.stdout?.pipe(log);
  server.stderr?.pipe(log);
  let exited = false;
  server.on("exit", (code) => {
    exited = true;
    server = null;
    if (!quitting) fail("HabitManager stopped", `The app's server exited (code ${code}).\n\nLog: ${logFile}`);
  });

  const up = await waitForServer(() => ping(origin), { stopped: () => exited });
  if (!up) return fail("HabitManager couldn't start", `The server didn't respond in time.\n\nLog: ${logFile}`);

  openWindow(origin);
  setupUpdates();
  if (fallback) {
    dialog.showMessageBox({
      type: "info",
      message: `Port ${preferred} is busy, so HabitManager is running on port ${port}.`,
      detail:
        `Something else is using ${preferred} (maybe \`pnpm start\` or \`pnpm dev\`). ` +
        `If you use the browser extension, set its app URL to ${origin}, or close the other app and restart HabitManager.`,
    });
  }
}

/**
 * No database yet: offer to bring over the one from the web app (data/habit.db in the repo).
 * @param {string} dbFile
 */
async function firstRun(dbFile) {
  const { response } = await dialog.showMessageBox({
    type: "question",
    buttons: ["Import habit.db…", "Start fresh"],
    defaultId: 0,
    cancelId: 1,
    message: "Welcome to HabitManager",
    detail:
      "Already used the web version? Import your data/habit.db file (it is copied, the original isn't changed). " +
      "Stop `pnpm start` / `pnpm dev` first so the copy has your latest changes.\n\n" +
      "You can also restore a JSON backup later in Profile → Settings.",
  });
  if (response !== 0) return;
  const picked = await dialog.showOpenDialog({
    title: "Choose your habit.db",
    properties: ["openFile"],
    filters: [{ name: "HabitManager database", extensions: ["db"] }],
  });
  const source = picked.filePaths[0];
  if (picked.canceled || !source) return;
  try {
    importDatabase(source, dbFile);
  } catch (err) {
    await dialog.showMessageBox({ type: "error", message: "Couldn't import that file", detail: String(err) });
  }
}

/** @param {string} url */
function openWindow(url) {
  const origin = new URL(url).origin;
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 420,
    minHeight: 500,
    title: "HabitManager",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once("ready-to-show", () => win?.show());

  // Back/forward: macOS three-finger swipe, Windows mouse side buttons and browser keys.
  win.on("swipe", (_event, direction) => navigate(swipeAction(direction)));
  win.on("app-command", (_event, command) => navigate(appCommandAction(command)));
  win.on("closed", () => (win = null));

  // Links to LeetCode, papers, Excalidraw… open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isExternal(target, origin)) shell.openExternal(target);
    return { action: isExternal(target, origin) ? "deny" : "allow" };
  });
  win.webContents.on("will-navigate", (event, target) => {
    if (!isExternal(target, origin)) return;
    event.preventDefault();
    shell.openExternal(target);
  });
  win.loadURL(url);
}

/** @param {"back" | "forward" | null} action */
function navigate(action) {
  const history = win?.webContents.navigationHistory;
  if (!history) return;
  if (action === "back" && history.canGoBack()) history.goBack();
  if (action === "forward" && history.canGoForward()) history.goForward();
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac ? [{ role: /** @type {const} */ ("appMenu") }] : []),
    {
      label: "File",
      submenu: [
        { label: "Open data folder", click: () => shell.openPath(dataDir()) },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "Go",
      submenu: [
        { label: "Back", accelerator: isMac ? "Cmd+[" : "Alt+Left", click: () => navigate("back") },
        { label: "Forward", accelerator: isMac ? "Cmd+]" : "Alt+Right", click: () => navigate("forward") },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Check for updates…", click: () => checkForUpdates(true) },
        { label: "Release notes", click: () => shell.openExternal(`https://github.com/${RELEASES_REPO}/releases`) },
        { type: "separator" },
        {
          label: "About HabitManager",
          click: () =>
            dialog.showMessageBox({
              type: "info",
              message: `HabitManager ${app.getVersion()}`,
              detail: `Electron ${process.versions.electron} · Node ${process.versions.node}
Data: ${dataDir()}`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** @param {string} origin */
async function ping(origin) {
  try {
    await fetch(origin, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Free = nothing answers on it (IPv4 or IPv6) and we can bind it. The connect check matters on
 * Windows, where binding 127.0.0.1 can succeed even while `pnpm start` listens on [::].
 * @param {number} port
 */
async function portIsFree(port) {
  const answers = await Promise.all(["127.0.0.1", "::1"].map((host) => accepts(host, port)));
  return !answers.includes(true) && (await canBind(port));
}

/** @param {string} host @param {number} port @returns {Promise<boolean>} */
function accepts(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(500);
    const done = (/** @type {boolean} */ ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

/** @param {number} port @returns {Promise<boolean>} */
function canBind(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

/** @returns {Promise<number>} */
function anyFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const addr = probe.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------- Updates

/**
 * When the app version changed since the last run, copy the database to backups/ before the new
 * version's migrations run. Keeps the newest few. Covers automatic updates and manual reinstalls.
 * @param {string} dbFile
 */
function backupIfVersionChanged(dbFile) {
  const marker = path.join(dataDir(), "last-version");
  const last = existsSync(marker) ? readFileSync(marker, "utf8").trim() : null;
  const current = app.getVersion();
  if (needsBackup(last, current) && existsSync(dbFile)) {
    const dir = path.join(dataDir(), "backups");
    mkdirSync(dir, { recursive: true });
    try {
      importDatabase(dbFile, path.join(dir, backupName(/** @type {string} */ (last), current, new Date())));
      for (const old of backupsToPrune(readdirSync(dir))) {
        for (const f of [old, old + "-wal", old + "-shm"]) rmSync(path.join(dir, f), { force: true });
      }
    } catch (err) {
      dialog.showErrorBox("Backup before update failed", `${err}

HabitManager will start anyway; your data is unchanged so far.`);
    }
  }
  writeFileSync(marker, current);
}

let updateReady = false;

/** Background checks: shortly after start, then every few hours. Installed builds only. */
function setupUpdates() {
  if (!app.isPackaged || process.env.HABIT_NO_UPDATES) return;
  const logFile = path.join(dataDir(), "logs", "updates.log");
  const log = (/** @type {unknown[]} */ ...m) => {
    try {
      mkdirSync(path.dirname(logFile), { recursive: true });
      writeFileSync(logFile, `${new Date().toISOString()} ${m.join(" ")}
`, { flag: "a" });
    } catch {}
  };
  autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-downloaded", async (info) => {
    updateReady = true;
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: `HabitManager ${info.version} is ready`,
      detail: "Restart to update. Your data is backed up first. Choosing Later installs it the next time you quit.",
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  setTimeout(() => checkForUpdates(false), 10_000);
  setInterval(() => checkForUpdates(false), CHECK_EVERY_MS);
}

/**
 * Windows and Linux (AppImage) download and install updates themselves. macOS needs a paid Developer ID
 * to install updates, so there we only say a new version exists and open the release page.
 * @param {boolean} manual show a result even when there's nothing new
 */
async function checkForUpdates(manual) {
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox({ type: "info", message: "Updates work in the installed app", detail: "This is a development build." });
    return;
  }
  if (updateReady) {
    if (manual) autoUpdater.quitAndInstall();
    return;
  }
  try {
    if (process.platform === "darwin") return await notifyMacRelease(manual);
    if (process.platform === "linux" && !process.env.APPIMAGE) {
      if (manual) dialog.showMessageBox({ type: "info", message: "Automatic updates need the AppImage build", detail: `Download new versions from github.com/${RELEASES_REPO}/releases.` });
      return;
    }
    const result = await autoUpdater.checkForUpdates();
    const latest = result?.updateInfo.version;
    if (!manual) return;
    if (latest && isNewer(latest, app.getVersion())) {
      dialog.showMessageBox({ type: "info", message: `Downloading HabitManager ${latest}…`, detail: "You'll be asked to restart when it's ready." });
    } else {
      dialog.showMessageBox({ type: "info", message: "You're up to date", detail: `HabitManager ${app.getVersion()} is the latest version.` });
    }
  } catch (err) {
    if (manual) dialog.showMessageBox({ type: "warning", message: "Couldn't check for updates", detail: String(err) });
  }
}

/** @param {boolean} manual */
async function notifyMacRelease(manual) {
  const res = await fetch(`https://api.github.com/repos/${RELEASES_REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "HabitManager-desktop" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const release = /** @type {{ tag_name: string, html_url: string }} */ (await res.json());
  if (isNewer(release.tag_name, app.getVersion())) {
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: `HabitManager ${release.tag_name.replace(/^v/, "")} is available`,
      detail: `You have ${app.getVersion()}. Download the new .dmg and drag it to Applications; your data stays where it is.`,
    });
    if (response === 0) shell.openExternal(release.html_url);
  } else if (manual) {
    dialog.showMessageBox({ type: "info", message: "You're up to date", detail: `HabitManager ${app.getVersion()} is the latest version.` });
  }
}
