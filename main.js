const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let sdkPath = ''; // Variável para armazenar o caminho do SDK

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
  verificarAdb(win); // Verifica o ADB ao carregar a janela
}

// Verifica se o ADB está instalado
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

// Solicita ao usuário que selecione o diretório do SDK
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

// Salva o caminho do SDK em um arquivo de configuração
function salvarSdkPath(path) {
  fs.writeFileSync('sdk-config.json', JSON.stringify({ sdkPath: path }), 'utf8');
}

// Recupera o caminho do SDK de um arquivo de configuração
function recuperarSdkPath() {
  if (fs.existsSync('sdk-config.json')) {
    const config = JSON.parse(fs.readFileSync('sdk-config.json', 'utf8'));
    return config.sdkPath || '';
  }
  return '';
}

// Lida com os comandos ADB enviados do renderer
ipcMain.handle('execute-adb-command', async (event, command) => {
  const adbPath = path.join(sdkPath, 'adb.exe');
  return new Promise((resolve, reject) => {
    exec(`"${adbPath}" ${command}`, (error, stdout, stderr) => {
      if (error) reject(stderr.trim());
      else resolve(stdout.trim());
    });
  });
});

// Lida com a instalação do APK
ipcMain.handle('install-apk', async (event, apkPath) => {
  const adbPath = path.join(sdkPath, 'adb.exe');
  return new Promise((resolve, reject) => {
    exec(`"${adbPath}" install "${apkPath}"`, (error, stdout, stderr) => {
      if (error) reject(stderr.trim());
      else resolve('APK instalado com sucesso!');
    });
  });
});

// Lida com a injeção de configuração
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

// Lida com a seleção de arquivos
ipcMain.handle('dialog:open-file', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
