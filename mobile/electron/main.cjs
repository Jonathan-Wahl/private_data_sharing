const { app, BrowserWindow, net, protocol } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

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
