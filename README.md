# Desktop Agent UI

An Electron desktop shell for running your local desktop agent with a calmer interface, live logs, and one very important panic button.

It is built for a Windows + WSL workflow:

- the UI runs as a Windows desktop app
- the agent runs inside WSL
- the bridge passes through the Windows Python path when UI automation needs it

## Why This Exists

The agent itself already does the hard part. This repo gives it a proper control surface:

- a focused prompt box for starting runs
- live output streamed into the app window
- clear run state: `Idle`, `Running`, `Stopping`
- a global `Ctrl+=` shortcut to stop the current run from anywhere

## How It Works

When you start a run, the Electron main process:

1. launches `wsl.exe`
2. changes into the agent repo at `/home/cashel/projects/desktop-agent`
3. runs `run_local.py` via `conda run -n agent-graph-env`
4. forwards logs back into the renderer in real time

If `WINDOWS_PYTHON_PATH` is set, the app converts the Windows path like `C:\...` into its WSL form like `/mnt/c/...` before passing it through.

Stopping a run tries the polite option first and the less-polite option second:

- send a termination signal inside WSL using the stored PID
- if that does not finish the job quickly enough, fall back to `taskkill`

## Project Structure

- [`main.js`](/home/cashel/projects/desktop-agent-ui/main.js): Electron main process, WSL launch logic, PID handling, global stop shortcut
- [`preload.js`](/home/cashel/projects/desktop-agent-ui/preload.js): safe IPC bridge exposed to the renderer
- [`renderer/index.html`](/home/cashel/projects/desktop-agent-ui/renderer/index.html): app markup
- [`renderer/styles.css`](/home/cashel/projects/desktop-agent-ui/renderer/styles.css): desktop UI styling
- [`renderer/renderer.js`](/home/cashel/projects/desktop-agent-ui/renderer/renderer.js): button wiring, log streaming, and status updates
- [`run_windows_ui.cmd`](/home/cashel/projects/desktop-agent-ui/run_windows_ui.cmd): Windows launcher for local development
- [`build_windows_app.cmd`](/home/cashel/projects/desktop-agent-ui/build_windows_app.cmd): quick Windows packaging script
- [`sync_and_dist_windows.sh`](/home/cashel/projects/desktop-agent-ui/sync_and_dist_windows.sh): WSL entrypoint for syncing and packaging on Windows
- [`sync_and_dist_windows.ps1`](/home/cashel/projects/desktop-agent-ui/sync_and_dist_windows.ps1): PowerShell sync + build flow

## Requirements

Before this app can do anything useful, make sure you have:

- Windows with `wsl.exe` available
- the agent repo at `/home/cashel/projects/desktop-agent`
- `run_local.py` in that repo
- the WSL conda env `agent-graph-env`
- a valid `KIMI_API_KEY` available to the agent runtime
- Windows Python at `C:\Users\cpfit\miniforge3\envs\desktop-agent\python.exe`

If your agent depends on Windows-side UI automation libraries, install them in that Windows environment too:

```bat
C:\Users\cpfit\miniforge3\envs\desktop-agent\python.exe -m pip install pyautogui pillow pywinauto
```

## Install

From this repo:

```bash
npm install
```

That gives you the Electron app and packaging tools defined in [`package.json`](/home/cashel/projects/desktop-agent-ui/package.json).

## Run In Development

### Preferred Windows launcher

From Windows, run:

```bat
run_windows_ui.cmd
```

This script:

- checks for `WINDOWS_PYTHON_EXE` in `.env` (prompts if missing)
- verifies Electron is installed
- starts the app with `npm start`

### Direct npm launch

You can also run:

```bash
npm start
```

## Build A Windows App

For a local packaged build:

```bat
build_windows_app.cmd
```

That will install dependencies if needed and run:

```bash
npm run pack:win
```

Output lands here:

```text
dist\Desktop Agent-win32-x64\Desktop Agent.exe
```

## Build From WSL And Package On Windows

If you are editing from WSL but want a proper Windows app bundle, use:

```bash
./sync_and_dist_windows.sh
```

That hands off to PowerShell and:

- prompts for `WINDOWS_REPO_PATH` if missing in `.env`
- mirrors the repo into your Windows path
- installs npm dependencies on the Windows side if needed
- runs the Windows packaging build

## Windows Copy Notes

Do not copy `node_modules` from WSL into Windows. That path leads to broken symlinks, sadness, and a particularly unhelpful `.bin/electron` 😅

If you want to sync manually between environments:

```bash
# Sync files while excluding heavy/sensitive directories
robocopy <source> <target> /E /XD node_modules __pycache__ .git dist
```

## Available Scripts

- `npm start`: launch Electron
- `npm run pack:win`: package a Windows app into `dist/`
- `npm run dist:win`: alias for `pack:win`

## Setup & Environment

The distribution scripts use a `.env` file for local configuration. The first time you run them, they will prompt you for necessary paths:

- `WINDOWS_PYTHON_EXE`: Path to your Windows Python executable.
- `WINDOWS_REPO_PATH`: Path where the repo should be mirrored on Windows.

These paths are saved to `.env` (which is git-ignored) to keep the scripts portable for other users.

## Notes For Future Tinkering

- The app menu is intentionally disabled.
- Hardware acceleration is disabled on Linux.
- The renderer stays sandbox-friendly by using a preload bridge instead of direct Node access. 🛡️
- The stop flow is intentionally defensive because hanging agent runs are not a personality trait we want in production. 🧯
