const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec, spawn } = require('child_process'); 
const fs = require('fs');
const path = require('path');

let mainWindow;
let sdkPath = '';
let adbProcess; 

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');


  verificarAdb(mainWindow);
}

const createMenu = () => {
  const menuTemplate = [
    {
      label: 'Help',
      submenu: [{
        label: 'Documentação SGHx',
        click: async () => {
          const { shell } = require('electron');
          await shell.openExternal('https://libertyti.atlassian.net/wiki/spaces/DSS/pages/261750921/POP+-+Configura+o+KAR+2.0+Fully');
        },
      },
      {
        label: 'Documentação SGHx CAPS',
        click: async () => {
          const { shell } = require('electron');
          await shell.openExternal('https://libertyti.atlassian.net/wiki/spaces/DSS/pages/314966088/POP+-+Configura+o+KAR+2.0+-+CAPS+Fully');
        },
      },],
    },
    {
      label: 'Update',
      submenu: [
        {
          label: 'Buscar Atualizações',
          click: () => {
            console.log('Buscando atualizações...');
          },
        },
        {
          label: 'Refresh Webview',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('refresh-webview');
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {

  if (adbProcess) {
    console.log('Encerrando o processo ADB...');
    adbProcess.kill('SIGINT'); 
  }
});

autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update_not_available');
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj.percent.toFixed(2));
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update_downloaded');
});

autoUpdater.on('error', (err) => {
  if (mainWindow) mainWindow.webContents.send('update_error', err.message);
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

function verificarAdb(win) {
  if (!sdkPath) {
    sdkPath = recuperarSdkPath();
  }

  const adbPath = path.join(sdkPath, 'adb.exe');

  if (fs.existsSync(adbPath)) {
    adbProcess = spawn(adbPath, ['--version']);

    adbProcess.stdout.on('data', (data) => {
      console.log(`ADB encontrado: ${data}`);
      win.webContents.send('adb-status', `ADB encontrado: ${data}`);
    });

    adbProcess.stderr.on('data', (data) => {
      console.error(`Erro ao verificar o ADB: ${data}`);
      win.webContents.send('adb-status', 'Erro ao verificar o ADB.');
    });

    adbProcess.on('close', (code) => {
      console.log(`Processo ADB encerrado com código: ${code}`);
    });
  } else {
    console.log('ADB não encontrado. Solicite ao usuário.');
    win.webContents.send('adb-status', 'ADB não encontrado. Por favor, selecione o diretório do SDK.');
    selecionarSdk(win);
  }
}

async function selecionarSdk(win) {
  const selectedPath = await dialog.showOpenDialog({
    title: 'Selecione o diretório do SDK (Platform Tools)',
    properties: ['openDirectory'],
  });

  if (selectedPath.filePaths && selectedPath.filePaths[0]) {
    sdkPath = selectedPath.filePaths[0];
    const adbPath = path.join(sdkPath, 'adb.exe');

    if (fs.existsSync(adbPath)) {
      salvarSdkPath(sdkPath);
      win.webContents.send('adb-status', 'SDK configurado com sucesso!');
      console.log(`SDK configurado em: ${sdkPath}`);
    } else {
      win.webContents.send('adb-status', 'O diretório selecionado não contém o ADB. Tente novamente.');
      console.error('Erro: ADB não encontrado no diretório selecionado.');
    }
  } else {
    win.webContents.send('adb-status', 'Nenhum diretório selecionado. Ação cancelada.');
    console.error('Nenhum caminho foi selecionado.');
  }
}

function salvarSdkPath(path) {
  fs.writeFileSync('sdk-config.json', JSON.stringify({ sdkPath: path }, null, 2), 'utf8');
}

function recuperarSdkPath() {
  if (fs.existsSync('sdk-config.json')) {
    const config = JSON.parse(fs.readFileSync('sdk-config.json', 'utf8'));
    return config.sdkPath || '';
  }
  return '';
}

ipcMain.handle('execute-adb-command', async (event, command) => {
  const adbPath = path.join(sdkPath, 'adb.exe');
  return new Promise((resolve, reject) => {
    const process = exec(`"${adbPath}" ${command}`);
    process.stdout.on('data', (data) => resolve(data.trim()));
    process.stderr.on('data', (data) => reject(data.trim()));
  });
});

ipcMain.handle('install-apk', async (event, apkPath) => {
  const adbPath = path.join(sdkPath, 'adb.exe');
  return new Promise((resolve, reject) => {
    exec(`"${adbPath}" install "${apkPath}"`, (error, stdout, stderr) => {
      if (error) reject(stderr.trim());
      else resolve('APK instalado com sucesso!');
    });
  });
});

ipcMain.handle('inject-config', async (event, configPath) => {
  const adbPath = path.join(sdkPath, 'adb.exe');
  return new Promise((resolve, reject) => {
    exec(
      `"${adbPath}" push "${configPath}" /sdcard/Download/fully-kiosk-config.json`,
      (error, stdout, stderr) => {
        if (error) reject(stderr.trim());
        else resolve('Configuração injetada com sucesso!');
      }
    );
  });
});

ipcMain.handle('dialog:open-file', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});
