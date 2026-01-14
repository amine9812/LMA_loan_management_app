import { app, BrowserWindow } from "electron";
import path from "path";
import { initDatabase } from "./database";
import { ensureStorage } from "./storage";
import { registerIpcHandlers } from "./ipc";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#F5F7FA",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl).catch(() => undefined);
  } else {
    const indexPath = path.join(__dirname, "../renderer/index.html");
    mainWindow.loadFile(indexPath).catch(() => undefined);
  }
}

app.whenReady().then(async () => {
  const storage = ensureStorage(app.getPath("userData"));
  const db = await initDatabase(storage.dbPath, storage);
  await registerIpcHandlers({ db, storage });

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
