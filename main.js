const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { toggleProxy, isProxyEnabled } = require('./toggleProxy');

function createWindow() {
    const win = new BrowserWindow({
      width: 300,
      height: 600,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'renderer.js'),
        contextIsolation: false,
        nodeIntegration: true,
      },
    });
  
    win.loadFile('index.html');
  }
  

ipcMain.handle('toggle-proxy', async () => {
  return await toggleProxy();
});

ipcMain.handle('get-proxy-status', async () => {
  return await isProxyEnabled();
});

app.whenReady().then(createWindow);
