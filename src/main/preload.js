const { contextBridge, ipcRenderer } = require('electron');

// Expose an toàn các API từ main process cho renderer
contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    detectEngine: (gamePath) => ipcRenderer.invoke('detect-engine', gamePath),
    loadGameInfo: (gamePath) => ipcRenderer.invoke('load-game-info', gamePath),
    checkHacked: (gamePath) => ipcRenderer.invoke('check-hacked', gamePath),
    hackGame: (gamePath) => ipcRenderer.invoke('hack-game', gamePath),
    unhackGame: (gamePath) => ipcRenderer.invoke('unhack-game', gamePath),
    launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath)
});
