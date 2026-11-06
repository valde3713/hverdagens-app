const { app, BrowserWindow, ipcMain, nativeImage, session } = require("electron");
const path = require("node:path");

const appUrl = "https://valde3713.github.io/hverdagens-app/";
const appOrigin = new URL(appUrl).origin;
const icon = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
const windows = new Set();
let splashWindow;
let loading = false;
let appWindow;

function isAppUrl(value) {
  try {
    return new URL(value).origin === appOrigin;
  } catch {
    return false;
  }
}

function showStartupStatus(state) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents.send("startup-state", state);
  splashWindow.show();
  splashWindow.focus();
}

function failAppLoad(window) {
  if (window.isDestroyed()) return;
  window.destroy();
  loading = false;
  showStartupStatus("error");
}

function openApp() {
  if (loading) return;
  loading = true;
  showStartupStatus("loading");

  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    show: false,
    backgroundColor: "#f5f7ef",
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!isAppUrl(url)) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("did-finish-load", () => {
    if (window.isDestroyed()) return;
    window.show();
    window.focus();
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  });
  window.webContents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && isAppUrl(url)) failAppLoad(window);
  });
  window.loadURL(appUrl).catch(() => failAppLoad(window));
  const loadTimeout = setTimeout(() => {
    if (!window.isDestroyed() && !window.isVisible()) {
      window.webContents.stop();
      failAppLoad(window);
    }
  }, 30000);
  window.once("closed", () => {
    clearTimeout(loadTimeout);
    if (appWindow === window) appWindow = null;
    windows.delete(window);
    loading = false;
  });
  appWindow = window;
  windows.add(window);
}

function createStartupWindow() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 360,
    resizable: false,
    maximizable: false,
    minimizable: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f7ef",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  splashWindow.setMenu(null);
  splashWindow.loadFile(path.join(__dirname, "loading.html"));
  splashWindow.webContents.on("did-finish-load", () => {
    splashWindow.webContents.send("startup-state", "loading");
    splashWindow.show();
    openApp();
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
    if (appWindow && !appWindow.isVisible()) appWindow.destroy();
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("dk.valde3713.hverdagensapp");
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  ipcMain.on("startup-retry", (event) => {
    if (splashWindow && event.sender === splashWindow.webContents) openApp();
  });
  createStartupWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createStartupWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
