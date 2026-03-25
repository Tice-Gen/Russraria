const { app, BrowserWindow, ipcMain, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const APP_NAME = "Russraria";
const APP_ID = "com.russraria.desktop";

if (typeof app.setName === "function") {
  app.setName(APP_NAME);
}
app.name = APP_NAME;
process.title = APP_NAME;

app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

if (process.platform === "win32" && typeof app.setAppUserModelId === "function") {
  app.setAppUserModelId(APP_ID);
}

const DEFAULT_BOUNDS = {
  width: 1600,
  height: 900,
};

let mainWindow = null;
let preferences = null;
let logFilePath = null;

function initLogFile() {
  try {
    const dir = app.getPath("userData");
    fs.mkdirSync(dir, { recursive: true });
    logFilePath = path.join(dir, "desktop-runtime.log");
    fs.writeFileSync(logFilePath, "", "utf8");
  } catch (error) {
    console.error("Failed to initialize desktop log file.", error);
  }
}

function logLine(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  if (!logFilePath) {
    return;
  }
  try {
    fs.appendFileSync(logFilePath, `${line}\n`, "utf8");
  } catch (error) {
    console.error("Failed to append desktop log.", error);
  }
}

function getPreferencesPath() {
  return path.join(app.getPath("userData"), "preferences.json");
}

function resolveAppAssetPath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, relativePath);
}

function getWindowIconPath() {
  const candidates = [
    resolveAppAssetPath(path.join("build", "icon.png")),
    resolveAppAssetPath(path.join("build", "icon.ico")),
    resolveAppAssetPath("RU_iconForExe.png"),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }
      const icon = nativeImage.createFromPath(candidate);
      if (!icon.isEmpty()) {
        return candidate;
      }
    } catch (error) {
      logLine(`Failed to load window icon from ${candidate}: ${error.message}`);
    }
  }

  logLine("Window icon asset was not found.");
  return null;
}

function loadPreferences() {
  const defaults = {
    fullscreen: true,
    bounds: { ...DEFAULT_BOUNDS },
  };

  try {
    const raw = fs.readFileSync(getPreferencesPath(), "utf8");
    const stored = JSON.parse(raw);
    return {
      ...defaults,
      ...stored,
      bounds: {
        ...DEFAULT_BOUNDS,
        ...(stored.bounds ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

function savePreferences() {
  if (!preferences) {
    return;
  }

  fs.mkdirSync(path.dirname(getPreferencesPath()), { recursive: true });
  fs.writeFileSync(getPreferencesPath(), JSON.stringify(preferences, null, 2), "utf8");
}

function getWindowMode() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return preferences?.fullscreen === false ? "windowed" : "fullscreen";
  }
  return mainWindow.isFullScreen() ? "fullscreen" : "windowed";
}

function sendWindowMode() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("window:mode-changed", getWindowMode());
}

function rememberBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isFullScreen()) {
    return;
  }

  const { x, y, width, height } = mainWindow.getBounds();
  preferences.bounds = { x, y, width, height };
  savePreferences();
}

async function setWindowMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return getWindowMode();
  }

  const wantsFullscreen = mode !== "windowed";
  if (!wantsFullscreen && preferences?.bounds) {
    const nextBounds = {
      x: preferences.bounds.x,
      y: preferences.bounds.y,
      width: preferences.bounds.width ?? DEFAULT_BOUNDS.width,
      height: preferences.bounds.height ?? DEFAULT_BOUNDS.height,
    };

    if (Number.isFinite(nextBounds.x) && Number.isFinite(nextBounds.y)) {
      mainWindow.setBounds(nextBounds);
    } else {
      mainWindow.setSize(nextBounds.width, nextBounds.height);
      mainWindow.center();
    }
  }

  mainWindow.setFullScreen(wantsFullscreen);
  preferences.fullscreen = wantsFullscreen;
  savePreferences();
  sendWindowMode();
  return getWindowMode();
}

function createWindow() {
  logLine("createWindow() called");
  preferences = loadPreferences();
  const { bounds } = preferences;
  const windowIconPath = getWindowIconPath();
  const windowOptions = {
    width: bounds.width ?? DEFAULT_BOUNDS.width,
    height: bounds.height ?? DEFAULT_BOUNDS.height,
    minWidth: 960,
    minHeight: 540,
    fullscreen: preferences.fullscreen !== false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: "#08101a",
    show: true,
    title: APP_NAME,
    icon: windowIconPath ?? undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  };

  if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    windowOptions.x = bounds.x;
    windowOptions.y = bounds.y;
  }

  mainWindow = new BrowserWindow(windowOptions);
  mainWindow.setTitle(APP_NAME);
  if (windowIconPath && typeof mainWindow.setIcon === "function") {
    const windowIcon = nativeImage.createFromPath(windowIconPath);
    if (!windowIcon.isEmpty()) {
      mainWindow.setIcon(windowIcon);
    }
  }
  logLine(`BrowserWindow created at ${JSON.stringify({ width: windowOptions.width, height: windowOptions.height, fullscreen: preferences.fullscreen !== false })}`);
  mainWindow.loadFile("index.html");
  logLine(`loadFile(index.html) from ${__dirname}`);
  mainWindow.webContents.on("did-start-loading", () => {
    logLine("webContents did-start-loading");
  });
  mainWindow.webContents.on("dom-ready", () => {
    logLine("webContents dom-ready");
  });
  mainWindow.webContents.on("did-finish-load", () => {
    logLine("webContents did-finish-load");
  });
  mainWindow.on("page-title-updated", (_event, title) => {
    logLine(`page-title-updated -> ${title}`);
  });
  mainWindow.webContents.on("did-frame-finish-load", (_event, isMainFrame) => {
    logLine(`webContents did-frame-finish-load mainFrame=${isMainFrame}`);
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logLine(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, validatedURL) => {
    logLine(`Renderer failed to load: ${description} (${code}) ${validatedURL}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logLine(`Renderer process gone: ${JSON.stringify(details)}`);
  });

  mainWindow.once("ready-to-show", () => {
    logLine("ready-to-show");
    sendWindowMode();
  });

  mainWindow.on("move", rememberBounds);
  mainWindow.on("resize", rememberBounds);
  mainWindow.on("enter-full-screen", () => {
    preferences.fullscreen = true;
    savePreferences();
    sendWindowMode();
  });
  mainWindow.on("leave-full-screen", () => {
    preferences.fullscreen = false;
    rememberBounds();
    savePreferences();
    sendWindowMode();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

if (ipcMain?.handle) {
  ipcMain.handle("window:get-mode", async () => getWindowMode());
  ipcMain.handle("window:set-mode", async (_event, mode) => setWindowMode(mode));
  ipcMain.handle("app:quit", async () => {
    app.quit();
    return true;
  });
}
if (ipcMain?.on) {
  ipcMain.on("debug:renderer-log", (_event, message) => {
    logLine(`[preload] ${message}`);
  });
}

app.whenReady().then(() => {
  initLogFile();
  logLine("app.whenReady()");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  logLine("window-all-closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});
