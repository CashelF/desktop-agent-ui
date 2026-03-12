const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAgent", {
  start(prompt) {
    return ipcRenderer.invoke("agent:start", prompt);
  },
  stop(source = "button") {
    return ipcRenderer.invoke("agent:stop", source);
  },
  getState() {
    return ipcRenderer.invoke("agent:get-state");
  },
  onLog(callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("agent:log", handler);
    return () => ipcRenderer.removeListener("agent:log", handler);
  },
  onState(callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("agent:state", handler);
    return () => ipcRenderer.removeListener("agent:state", handler);
  }
});
