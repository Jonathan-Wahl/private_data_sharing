const { app, BrowserWindow, ipcMain, net, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const torrents = new Map();

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
    scheme: 'secure-share',
  },
]);

async function createWindow() {
  const win = new BrowserWindow({
    height: 900,
    minHeight: 640,
    minWidth: 380,
    title: 'Secure Share',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
    width: 420,
  });

  await win.loadURL('secure-share://app/index.html');
}

function desktopDownloadRoot() {
  const target = path.join(app.getPath('downloads'), 'SecureShare', 'Torrents');

  fs.mkdirSync(target, { recursive: true });

  return target;
}

function emitTorrentUpdate(sender, id, update) {
  if (!sender.isDestroyed()) {
    sender.send('torrent:update', { id, ...update });
  }
}

async function getWebTorrent() {
  const module = await import('webtorrent');

  return module.default;
}

function sourceFromJob(job) {
  if (job.sourceType === 'magnet') {
    return job.source;
  }

  return Buffer.from(job.source, 'base64');
}

async function registerTorrentHandlers() {
  const WebTorrent = await getWebTorrent();
  const client = new WebTorrent();

  ipcMain.handle('torrent:start', async (event, job) => {
    const existing = torrents.get(job.id);

    if (existing) {
      existing.torrent.resume();
      return;
    }

    const outputPath = desktopDownloadRoot();

    client.add(sourceFromJob(job), { path: outputPath }, (torrent) => {
      const state = { sender: event.sender, torrent };

      torrents.set(job.id, state);

      const update = () => {
        emitTorrentUpdate(event.sender, job.id, {
          downloadSpeed: Math.round(torrent.downloadSpeed),
          files: torrent.files.map((file) => ({
            length: file.length,
            name: file.path || file.name,
          })),
          name: torrent.name || 'Torrent download',
          peers: torrent.numPeers,
          progress: Math.round(torrent.progress * 100),
          status: 'running',
          uploadSpeed: Math.round(torrent.uploadSpeed),
        });
      };

      torrent.on('download', update);
      torrent.on('wire', update);
      torrent.on('warning', (warning) => {
        emitTorrentUpdate(event.sender, job.id, { error: warning.message });
      });
      torrent.on('error', (error) => {
        torrents.delete(job.id);
        emitTorrentUpdate(event.sender, job.id, {
          downloadSpeed: 0,
          error: error.message,
          status: 'error',
          uploadSpeed: 0,
        });
      });
      torrent.on('done', () => {
        torrents.delete(job.id);
        emitTorrentUpdate(event.sender, job.id, {
          completedFiles: torrent.files.map((file) => ({
            name: file.path || file.name,
            path: path.join(outputPath, file.path || file.name),
            size: file.length,
          })),
          downloadSpeed: 0,
          peers: torrent.numPeers,
          progress: 100,
          status: 'complete',
          uploadSpeed: 0,
        });
      });

      update();
    });
  });

  ipcMain.handle('torrent:pause', (_event, id) => {
    torrents.get(id)?.torrent.pause();
  });

  ipcMain.handle('torrent:resume', (_event, id) => {
    torrents.get(id)?.torrent.resume();
  });

  ipcMain.handle('torrent:cancel', (_event, id) => {
    const state = torrents.get(id);

    if (state) {
      state.torrent.destroy();
      torrents.delete(id);
    }
  });
}

app.whenReady().then(async () => {
  protocol.handle('secure-share', (request) => {
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
    const wwwPath = path.join(__dirname, '..', 'www');
    const resolvedPath = path.normalize(path.join(wwwPath, pathname));

    if (!resolvedPath.startsWith(wwwPath)) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(resolvedPath).toString());
  });

  await registerTorrentHandlers();
  await createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
