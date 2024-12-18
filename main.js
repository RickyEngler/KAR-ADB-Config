const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let mainWindow;
let sdkPath = '';
let adbProcess;

// Função para criar a janela principal
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

  // Verificar atualizações
  autoUpdater.checkForUpdatesAndNotify();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  verificarAdb(mainWindow); // Verificar ADB na inicialização
}

// Verificar e inicializar ADB
function verificarAdb(win) {
  if (!sdkPath) {
    sdkPath = recuperarSdkPath();
  }

  const adbPath = path.join(sdkPath, 'adb.exe');

  if (fs.existsSync(adbPath)) {
    exec(`"${adbPath}" --version`, (error, stdout, stderr) => {
      if (error) {
        console.log('Erro ao verificar o ADB:', stderr);
        win.webContents.send('adb-status', 'Erro ao verificar o ADB.');
      } else {
        console.log('ADB encontrado:', stdout);
        win.webContents.send('adb-status', 'ADB encontrado: ' + stdout);
      }
    });
  } else {
    console.log('ADB não encontrado. Solicite ao usuário.');
    win.webContents.send('adb-status', 'ADB não encontrado. Por favor, selecione o diretório do SDK.');
    selecionarSdk(win);
  }
}

// Função para seleção do SDK
function selecionarSdk(win) {
  const selectedPath = dialog.showOpenDialogSync({
    title: 'Selecione o diretório do SDK (Platform Tools)',
    properties: ['openDirectory'],
  });

  if (selectedPath && selectedPath[0]) {
    sdkPath = selectedPath[0];
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

// Função para salvar o caminho do SDK
function salvarSdkPath(path) {
  fs.writeFileSync('sdk-config.json', JSON.stringify({ sdkPath: path }), 'utf8');
}

// Função para recuperar o caminho do SDK salvo
function recuperarSdkPath() {
  if (fs.existsSync('sdk-config.json')) {
    const config = JSON.parse(fs.readFileSync('sdk-config.json', 'utf8'));
    return config.sdkPath || '';
  }
  return '';
}

// Listeners IPC para comandos ADB e diálogos
ipcMain.handle('execute-adb-command', async (event, command) => {
  const adbPath = path.join(sdkPath, 'adb.exe');
  return new Promise((resolve, reject) => {
    exec(`"${adbPath}" ${command}`, (error, stdout, stderr) => {
      if (error) reject(stderr.trim());
      else resolve(stdout.trim());
    });
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

// Inicialização do aplicativo
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Evento para encerrar subprocessos e garantir saída limpa
app.on('will-quit', () => {
  if (adbProcess) {
    adbProcess.kill('SIGINT'); // Encerra o processo ADB
  }
  process.exit(0); // Força a saída do processo principal
});

// Fechar o aplicativo quando todas as janelas forem encerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// AutoUpdater eventos
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update_downloaded');
});

// Reiniciar o app após a atualização
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
