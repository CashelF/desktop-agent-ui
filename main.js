const { app, BrowserWindow, globalShortcut, ipcMain, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

const APP_TITLE = "Desktop Agent";
const AGENT_REPO = "/home/cashel/projects/desktop-agent";
const AGENT_SCRIPT = "run_local.py";
const CONDA_ENV = "agent-graph-env";
const PID_FILE = "/tmp/desktop_agent_ui.pid";
const STOP_TIMEOUT_MS = 2500;
const WSL_CONDA = "/home/cashel/miniforge3/bin/conda";
const WINDOWS_PYTHON_PATH = process.env.WINDOWS_PYTHON_PATH || "";

let mainWindow = null;
let agentProcess = null;
let lastExitCode = null;

if (process.platform === "linux") {
  app.disableHardwareAcceleration();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function toWslWindowsPath(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([a-zA-Z]):\\(.*)$/);
  if (!match) {
    return raw;
  }

  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, "/");
  return `/mnt/${drive}/${rest}`;
}

function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function buildWslCommand(prompt) {
  const parts = [
    `cd ${shellQuote(AGENT_REPO)}`,
    "export PYTHONUNBUFFERED=1",
    `echo $BASHPID > ${shellQuote(PID_FILE)}`,
    `exec ${shellQuote(WSL_CONDA)} run --no-capture-output -n ${shellQuote(CONDA_ENV)} python ${shellQuote(AGENT_SCRIPT)} --observation_type screenshot_a11y_tree --prompt ${shellQuote(prompt)}`
  ];

  if (WINDOWS_PYTHON_PATH) {
    parts.splice(2, 0, `export WINDOWS_PYTHON_PATH=${shellQuote(toWslWindowsPath(WINDOWS_PYTHON_PATH))}`);
  }

  return parts.join(" && ");
}

function appendLog(line) {
  sendToRenderer("agent:log", line);
}

function broadcastState(extra = {}) {
  sendToRenderer("agent:state", {
    running: Boolean(agentProcess),
    lastExitCode,
    ...extra
  });
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    title: APP_TITLE,
    width: 1100,
    height: 760,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: "#0f1411",
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function registerGlobalKillShortcut() {
  const ok = globalShortcut.register("CommandOrControl+=", () => {
    stopAgent("global hotkey");
  });

  appendLog(
    ok
      ? "Global Ctrl+= registered.\n"
      : "Global Ctrl+= registration failed.\n"
  );
}

function startAgent(prompt) {
  if (agentProcess) {
    return { ok: false, error: "Agent is already running." };
  }

  const trimmedPrompt = String(prompt || "").trim();
  if (!trimmedPrompt) {
    return { ok: false, error: "Enter a prompt before starting the agent." };
  }

  const command = buildWslCommand(trimmedPrompt);
  appendLog(`\n[start] ${trimmedPrompt}\n`);
  appendLog("[start] Launching WSL agent process...\n");

  const child = spawn("wsl.exe", ["bash", "-lc", command], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  agentProcess = child;
  lastExitCode = null;
  broadcastState({ status: "running" });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk) => appendLog(chunk));
  child.stderr.on("data", (chunk) => appendLog(chunk));

  child.on("error", (error) => {
    appendLog(`[error] ${error.message}\n`);
  });

  child.on("exit", (code, signal) => {
    lastExitCode = code === null ? signal || "terminated" : code;
    appendLog(`\n[exit] Process finished with ${lastExitCode}.\n`);
    agentProcess = null;
    broadcastState({ status: "idle" });
  });

  return { ok: true };
}

function killPidInsideWsl() {
  return spawn(
    "wsl.exe",
    [
      "bash",
      "-lc",
      `if [ -f ${shellQuote(PID_FILE)} ]; then kill -TERM $(cat ${shellQuote(PID_FILE)}) 2>/dev/null || true; fi`
    ],
    {
      stdio: "ignore",
      windowsHide: true
    }
  );
}

function forceKillWindowsProcess(pid) {
  return spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true
  });
}

function stopAgent(source = "button") {
  if (!agentProcess) {
    appendLog("No active agent run to stop.\n");
    return { ok: false, error: "No active agent run to stop." };
  }

  appendLog(`[stop] Stop requested via ${source}.\n`);
  broadcastState({ status: "stopping" });

  const pid = agentProcess.pid;

  try {
    killPidInsideWsl();
  } catch (_) {
  }

  try {
    agentProcess.kill("SIGTERM");
  } catch (_) {
  }

  setTimeout(() => {
    if (!agentProcess || agentProcess.pid !== pid) {
      return;
    }

    try {
      forceKillWindowsProcess(pid);
    } catch (_) {
    }
  }, STOP_TIMEOUT_MS);

  return { ok: true };
}

app.whenReady().then(() => {
  createWindow();
  registerGlobalKillShortcut();
  broadcastState({ status: "idle" });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopAgent("app close");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("agent:start", async (_event, prompt) => startAgent(prompt));
ipcMain.handle("agent:stop", async (_event, source) => stopAgent(source));
ipcMain.handle("agent:get-state", async () => ({
  running: Boolean(agentProcess),
  lastExitCode
}));
