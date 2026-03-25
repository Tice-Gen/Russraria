const { contextBridge, ipcRenderer } = require("electron");

function log(message) {
  try {
    ipcRenderer.send("debug:renderer-log", message);
  } catch {
    // Ignore logging failures in preload.
  }
}

log(`preload start ${location.href}`);
window.addEventListener("DOMContentLoaded", () => {
  log(`DOMContentLoaded ${location.href}`);
});
window.addEventListener("error", (event) => {
  log(`window.error ${event.message}`);
});
window.addEventListener("unhandledrejection", (event) => {
  log(`unhandledrejection ${String(event.reason)}`);
});

contextBridge.exposeInMainWorld("desktopBridge", {
  isDesktop: true,
  getWindowMode: () => ipcRenderer.invoke("window:get-mode"),
  setWindowMode: (mode) => ipcRenderer.invoke("window:set-mode", mode),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  onWindowModeChanged: (callback) => {
    const handler = (_event, mode) => callback(mode);
    ipcRenderer.on("window:mode-changed", handler);
    return () => ipcRenderer.removeListener("window:mode-changed", handler);
  },
});
