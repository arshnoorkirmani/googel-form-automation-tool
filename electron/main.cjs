const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

let serverProcess = null;

function resolveNextCli(appPath) {
  return path.join(appPath, "node_modules", "next", "dist", "bin", "next");
}

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200) {
          resolve();
        } else {
          retry();
        }
      });

      req.on("error", retry);

      function retry() {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Timed out waiting for server."));
          return;
        }
        setTimeout(tick, 500);
      }
    };

    tick();
  });
}

async function startServer() {
  const port = process.env.APP_PORT || "3020";
  const appPath = app.getAppPath();
  const nextCli = resolveNextCli(appPath);
  const isDev = !app.isPackaged;

  const env = {
    ...process.env,
    APP_PORT: port,
    APP_STORAGE_ROOT: app.getPath("userData"),
    PLAYWRIGHT_BROWSERS_PATH: app.isPackaged
      ? path.join(process.resourcesPath, "playwright-browsers")
      : process.env.PLAYWRIGHT_BROWSERS_PATH
  };

  const args = isDev ? ["dev", "-p", port] : ["start", "-p", port];

  serverProcess = spawn(process.execPath, [nextCli, ...args], {
    cwd: appPath,
    env,
    stdio: "inherit"
  });

  serverProcess.on("exit", () => {
    serverProcess = null;
  });

  await waitForServer(`http://127.0.0.1:${port}`);
  return port;
}

async function createWindow() {
  const port = await startServer();
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: "#0f172a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
