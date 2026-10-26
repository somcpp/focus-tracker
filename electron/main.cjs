const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const windowWidth = 460;
  const windowHeight = 160;
  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = 0;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Keep pinned topmost over other fullscreen and desktop apps
  mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
  if (mainWindow.setVisibleOnAllWorkspaces) {
    mainWindow.setVisibleOnAllWorkspaces(true);
  }

  // Load the dedicated dynamic island route (localhost if running, otherwise live Vercel production)
  const prodUrl = "https://focus-tracker-lemon.vercel.app/island";
  const customUrl = process.env.DESKTOP_URL;

  if (customUrl) {
    mainWindow.loadURL(customUrl);
  } else if (app.isPackaged) {
    mainWindow.loadURL(prodUrl);
  } else {
    // In dev: check if localhost:3000 is running, otherwise fall back to production
    const http = require("http");
    const checkReq = http.get("http://localhost:3000/island", (res) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL("http://localhost:3000/island");
      }
    });
    checkReq.on("error", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(prodUrl);
      }
    });
    checkReq.setTimeout(600, () => {
      checkReq.destroy();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(prodUrl);
      }
    });
  }

  // Allow clicks to pass through transparent padding outside the pill
  ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, { forward: true, ...(options || {}) });
    }
  });

  ipcMain.on("window-close", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.on("window-minimize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on("window-resize", (event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth } = primaryDisplay.workAreaSize;
      const x = Math.round((screenWidth - width) / 2);
      win.setBounds({ x, y: 0, width, height });
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
