const { ipcRenderer } = require('electron');

// Conectar ao dispositivo ADB
window.connect = () => {
  const ip = document.getElementById('ip').value;
  if (!ip) {
    alert('Por favor, insira um IP válido.');
    return;
  }

  ipcRenderer.invoke('execute-adb-command', `connect ${ip}:5555`)
    .then((result) => {
      alert(`Conectado ao dispositivo: ${result}`);
      updateUIStatus(`Conectado ao dispositivo: ${result}`);
    })
    .catch((error) => {
      alert(`Erro de Conexão: ${error}`);
      updateUIStatus(`Erro de Conexão: ${error}`);
    });
};

// Desconectar do dispositivo ADB
window.disconnect = () => {
  const ip = document.getElementById('ip').value;
  ipcRenderer.invoke('execute-adb-command', `disconnect ${ip}:5555`)
    .then((result) => {
      alert(`Desconectado do dispositivo: ${result}`);
      updateUIStatus(`Desconectado do dispositivo: ${result}`);
    })
    .catch((error) => {
      alert(`Erro ao Desconectar: ${error}`);
      updateUIStatus(`Erro ao Desconectar: ${error}`);
    });
};

// Desinstalar aplicativos pré-definidos
window.uninstallApps = () => {
  const commands = [
    "shell pm uninstall --user 0 com.mediatek.wwtv.tvcenter",
    "shell pm uninstall --user 0 com.netflix.ninja",
    "shell pm uninstall --user 0 com.google.android.youtube.tv",
    "shell pm uninstall --user 0 com.google.android.play.games",
    "shell pm uninstall --user 0 com.google.android.youtube.tvkids",
    "shell pm uninstall --user 0 com.google.android.youtube.tvmusic",
    "shell pm uninstall --user 0 com.amazon.amazonvideo.livingroom",
    "shell pm uninstall --user 0 com.android.printspooler",
    "shell pm uninstall --user 0 com.android.wallpaperbackup",
    "shell pm uninstall --user 0 com.google.android.katniss",
    "shell pm uninstall --user 0 com.google.android.videos",
    "shell pm uninstall --user 0 com.android.dreams.basic"
  ];

  commands.forEach((command) => {
    ipcRenderer.invoke('execute-adb-command', command)
      .then((result) => console.log(`Comando executado com sucesso: ${command}\n${result}`))
      .catch((error) => console.error(`Erro ao executar o comando: ${command}\n${error}`));
  });

  alert('Processo de desinstalação iniciado.');
};

// Executar um comando ADB genérico
window.executeCommand = (command) => {
  ipcRenderer.invoke('execute-adb-command', command)
    .then((result) => {
      alert(`Comando Executado: ${result}`);
      updateUIStatus(`Comando Executado: ${result}`);
    })
    .catch((error) => {
      alert(`Erro ao Executar Comando: ${error}`);
      updateUIStatus(`Erro ao Executar Comando: ${error}`);
    });
};

// Instalar APK do Fully Kiosk Browser
window.installApk = async () => {
  const apkPath = await selectFile('Selecione o APK do Fully Kiosk Browser', [
    { name: 'APK Files', extensions: ['apk'] },
  ]);

  if (apkPath) {
    ipcRenderer.invoke('install-apk', apkPath)
      .then((result) => {
        alert(`APK instalado com sucesso: ${result}`);
        updateUIStatus(`APK instalado: ${result}`);
      })
      .catch((error) => {
        alert(`Erro ao instalar o APK: ${error}`);
        updateUIStatus(`Erro ao instalar o APK: ${error}`);
      });
  }
};

// Injetar Configuração Fully Kiosk Browser
window.injectConfig = async () => {
  const configPath = await selectFile('Selecione o arquivo de configuração JSON', [
    { name: 'JSON Files', extensions: ['json'] },
  ]);

  if (configPath) {
    ipcRenderer.invoke('inject-config', configPath)
      .then((result) => {
        alert(`Configuração injetada com sucesso: ${result}`);
        updateUIStatus(`Configuração injetada: ${result}`);
      })
      .catch((error) => {
        alert(`Erro ao injetar a configuração: ${error}`);
        updateUIStatus(`Erro ao injetar a configuração: ${error}`);
      });
  }
};

// Selecionar arquivo com diálogo
async function selectFile(title, filters) {
  const { canceled, filePaths } = await ipcRenderer.invoke('dialog:open-file', { title, filters });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
}

// Atualizar o status do ADB na interface
ipcRenderer.on('adb-status', (event, status) => {
  updateUIStatus(status);
});

// Atualizar o progresso do download de ADB
ipcRenderer.on('download-progress', (event, progress) => {
  updateUIProgress(progress);
});

// Atualizar o status na interface
const updateUIStatus = (status) => {
  document.getElementById('status').textContent = status;
};

// Atualizar barra de progresso
const updateUIProgress = (progress) => {
  document.getElementById('progress-bar').style.width = `${progress}%`;
  document.getElementById('progress-text').innerText = `Progresso: ${progress}%`;
};
