const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { isAppProxyEnabled, enableAppProxy, disableAppProxy } = require('./toggleProxy');

let pythonProcess = null;

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

function startPythonProxy() {
  if (pythonProcess) {
    console.log('Python proxy already running.');
    return;
  }

  const scriptPath = path.join(__dirname, 'client.py');
  console.log(`Attempting to start Python script: ${scriptPath}`);

  try {
    pythonProcess = spawn('python', [scriptPath]);

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python Proxy STDOUT]: ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Proxy STDERR]: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python proxy process exited with code ${code}`);
      pythonProcess = null;
      if (isAppProxyEnabled()) {
        console.log("Python script stopped unexpectedly, disabling system proxy.");
        disableAppProxy();
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python proxy process:', err);
      pythonProcess = null;
    });

    console.log('Python proxy process initiated.');
  } catch (error) {
      console.error('Error spawning Python process:', error);
      pythonProcess = null;
  }
}

function stopPythonProxy() {
  if (pythonProcess) {
    console.log('Attempting to stop Python proxy process...');
    pythonProcess.kill('SIGTERM');
    setTimeout(() => {
        if (pythonProcess) {
            console.log('Forcing Python proxy process kill...');
            pythonProcess.kill('SIGKILL');
            pythonProcess = null;
        }
    }, 2000);
  } else {
    console.log('Python proxy process not running.');
  }
}

ipcMain.handle('toggle-proxy', async () => {
  const currentState = isAppProxyEnabled();
  console.log(`Toggle requested. Current state (isAppProxyEnabled): ${currentState}`);

  if (currentState) {
    console.log("Turning proxy OFF...");
    stopPythonProxy();
    const success = disableAppProxy();
    return !success;
  } else {
    console.log("Turning proxy ON...");
    startPythonProxy();
    const success = enableAppProxy();
    if (!pythonProcess) {
        console.error("Failed to start Python process, rolling back proxy settings.");
        disableAppProxy();
        return false;
    }
    return success;
  }
});

ipcMain.handle('get-proxy-status', async () => {
  return isAppProxyEnabled();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  console.log('App quitting. Cleaning up...');
  stopPythonProxy();
  if (isAppProxyEnabled()) {
      console.log("Disabling system proxy on quit.");
      disableAppProxy();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
