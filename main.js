const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
  verificarAdb(win); // Verificar o ADB ao carregar a janela
}

// Verifica se o ADB está instalado
function verificarAdb(win) {
  exec('adb --version', (error, stdout, stderr) => {
    if (error) {
      console.log('ADB não encontrado. Baixando...');
      win.webContents.send('adb-status', 'ADB não encontrado. Baixando...');
      baixarAdb(win);
    } else {
      console.log('ADB encontrado:', stdout);
      win.webContents.send('adb-status', 'ADB encontrado: ' + stdout);
    }
  });
}

// Faz o download do ADB com feedback de progresso
function baixarAdb(win) {
  const url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip';
  const destino = path.join(app.getPath('userData'), 'platform-tools-latest-windows.zip');

  const arquivo = fs.createWriteStream(destino);
  https.get(url, (response) => {
    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;

    response.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const progress = ((downloadedSize / totalSize) * 100).toFixed(2);
      win.webContents.send('download-progress', progress);
    });

    response.pipe(arquivo);
    arquivo.on('finish', () => {
      arquivo.close();
      console.log('Download concluído.');
      win.webContents.send('adb-status', 'Download concluído. Extraindo...');
      extrairZip(destino, win);
    });
  });
}

// Extrai o arquivo ZIP baixado
function extrairZip(destino, win) {
  const extracaoDestino = path.join(app.getPath('userData'), 'platform-tools');

  fs.createReadStream(destino)
    .pipe(unzipper.Extract({ path: extracaoDestino }))
    .on('close', () => {
      console.log('Arquivo ZIP extraído com sucesso.');
      win.webContents.send('adb-status', 'Arquivo ZIP extraído com sucesso.');
      configurarAdb(extracaoDestino, win);
    });
}

// Configura o ADB após a extração
function configurarAdb(caminhoAdb, win) {
  console.log(`ADB configurado no caminho: ${caminhoAdb}`);
  win.webContents.send('adb-status', `ADB configurado no caminho: ${caminhoAdb}`);
}

// Lida com os comandos ADB enviados do renderer
ipcMain.handle('execute-adb-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    exec(`adb ${command}`, (error, stdout, stderr) => {
      if (error) reject(stderr.trim());
      else resolve(stdout.trim());
    });
  });
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
