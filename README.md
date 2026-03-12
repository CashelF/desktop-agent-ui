# Desktop Agent UI

Minimal Electron desktop UI for launching the local desktop agent with a cleaner modern shell.

## What it does

- Runs as a Windows desktop app via Electron
- Launches `/home/cashel/projects/desktop-agent/run_local.py` through WSL
- Uses `conda run -n agent-graph-env` so the agent stays in the requested conda environment
- Registers a global `Ctrl+Backspace` shortcut to stop the active run
- Shows live logs in the window

## Files

- [`main.js`](/home/cashel/projects/desktop-agent-ui/main.js): Electron main process, agent launch, global kill shortcut
- [`preload.js`](/home/cashel/projects/desktop-agent-ui/preload.js): safe renderer bridge
- [`renderer/index.html`](/home/cashel/projects/desktop-agent-ui/renderer/index.html): window markup
- [`renderer/styles.css`](/home/cashel/projects/desktop-agent-ui/renderer/styles.css): UI styling
- [`renderer/renderer.js`](/home/cashel/projects/desktop-agent-ui/renderer/renderer.js): button and log behavior

## Run it

1. Install dependencies:

```bash
npm install
```

2. Start the app from Windows:

```bat
run_windows_ui.cmd
```

The launcher sets:

```bat
WINDOWS_PYTHON_PATH=C:\Users\cpfit\miniforge3\envs\desktop-agent\python.exe
```

and the Electron app converts that to a WSL-compatible `/mnt/c/...` path before handing it to the WSL agent process.

You can also run:

```bash
npm start
```

## Requirements

- Windows with `wsl.exe` available
- `/home/cashel/projects/desktop-agent` available inside WSL
- `agent-graph-env` present in WSL
- `KIMI_API_KEY` available to the desktop-agent run
- `C:\Users\cpfit\miniforge3\envs\desktop-agent\python.exe` should exist on Windows
- Windows-side Python still needs the packages required by `run_local.py` for forwarded UI automation, for example:

```bat
C:\Users\cpfit\miniforge3\envs\desktop-agent\python.exe -m pip install pyautogui pillow pywinauto
```

## Copy to Windows

Do not copy `node_modules` from WSL to Windows. Install it fresh on the Windows side.

Use this from PowerShell:

```powershell
mkdir C:\Users\cpfit\Projects\desktop-agent-ui -Force
robocopy \\wsl.localhost\Ubuntu\home\cashel\projects\desktop-agent-ui C:\Users\cpfit\Projects\desktop-agent-ui /E /XD node_modules __pycache__ .git
cd C:\Users\cpfit\Projects\desktop-agent-ui
npm install
npm start
```

That avoids the broken WSL symlink under `node_modules\.bin\electron`, which is what `robocopy` is getting stuck on.
