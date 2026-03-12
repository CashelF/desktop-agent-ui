const promptInput = document.getElementById("promptInput");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const logOutput = document.getElementById("logOutput");
const statusText = document.getElementById("statusText");
const statusCard = document.getElementById("statusCard");
const statusDot = document.getElementById("statusDot");

function appendLog(text) {
  logOutput.textContent += text;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setStatus(state) {
  const running = Boolean(state.running);
  const status = state.status || (running ? "running" : "idle");

  statusText.textContent =
    status === "running"
      ? "Running"
      : status === "stopping"
        ? "Stopping"
        : state.lastExitCode !== null && state.lastExitCode !== undefined
          ? `Idle (${state.lastExitCode})`
          : "Idle";

  statusCard.dataset.state = status;
  statusDot.dataset.state = status;
  startButton.disabled = running || status === "stopping";
  stopButton.disabled = !running && status !== "stopping";
}

async function handleStart() {
  const result = await window.desktopAgent.start(promptInput.value);
  if (!result.ok && result.error) {
    appendLog(`[ui] ${result.error}\n`);
  }
}

async function handleStop(source = "button") {
  const result = await window.desktopAgent.stop(source);
  if (!result.ok && result.error) {
    appendLog(`[ui] ${result.error}\n`);
  }
}

startButton.addEventListener("click", handleStart);
stopButton.addEventListener("click", () => handleStop("button"));

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    handleStart();
  }
});

window.desktopAgent.onLog((message) => {
  appendLog(message);
});

window.desktopAgent.onState((state) => {
  setStatus(state);
});

window.desktopAgent.getState().then((state) => {
  setStatus({ ...state, status: state.running ? "running" : "idle" });
});
