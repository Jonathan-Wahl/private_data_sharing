const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('secureShareDesktop', {
  cancelTorrent: (id) => ipcRenderer.invoke('torrent:cancel', id),
  onTorrentUpdate: (callback) => {
    const listener = (_event, update) => callback(update);

    ipcRenderer.on('torrent:update', listener);

    return () => ipcRenderer.removeListener('torrent:update', listener);
  },
  pauseTorrent: (id) => ipcRenderer.invoke('torrent:pause', id),
  resumeTorrent: (id) => ipcRenderer.invoke('torrent:resume', id),
  startTorrent: (job) => ipcRenderer.invoke('torrent:start', job),
});
