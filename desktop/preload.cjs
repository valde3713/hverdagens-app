const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("startup", {
  onState(callback) {
    ipcRenderer.on("startup-state", (_event, state) => callback(state));
  },
  retry() {
    ipcRenderer.send("startup-retry");
  }
});
