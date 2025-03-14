const { ipcRenderer } = require('electron');
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();

ipcRenderer.on('update_available', () => {
  alert('Nova atualização disponível!');
});

ipcRenderer.on('update_downloaded', () => {
  const userResponse = confirm('Atualização concluída. Deseja reiniciar o aplicativo agora?');
  if (userResponse) {
    ipcRenderer.send('restart_app');
  }
});

window.onload = () => {
  const ipInput = document.getElementById('ip');
  ipInput.value = '';
  ipInput.disabled = false;
  updateUIStatus('Aplicativo iniciado.');
};

window.connect = () => {
  const ipInput = document.getElementById('ip');
  const ip = ipInput.value.trim();
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;

  if (!ip) {
    alert('Por favor, insira um IP válido.');
    updateUIStatus('Erro: Nenhum IP fornecido.');
    return;
  }

  if (!ipRegex.test(ip)) {
    alert('Formato de IP inválido.');
    updateUIStatus('Erro: IP inválido.');
    return;
  }

  showLoading(); // Mostrar overlay de loading
  ipcRenderer.invoke('execute-adb-command', `connect ${ip}:5555`)
    .then(() => {
      alert(`Conectado ao dispositivo ${ip}.`);
      updateUIStatus(`Conectado ao dispositivo ${ip}.`);
      ipInput.disabled = false;
    })
    .catch((error) => {
      alert(`Erro ao conectar: ${error}`);
      updateUIStatus(`Erro ao conectar: ${error}`);
      ipInput.disabled = false;
    })
    .finally(() => hideLoading()); // Ocultar overlay de loading
};

window.disconnect = () => {
  const ipInput = document.getElementById('ip');
  const ip = ipInput.value.trim();

  if (!ip) {
    alert('Por favor, insira um IP válido para desconectar.');
    updateUIStatus('Erro: Nenhum IP fornecido.');
    return;
  }

  showLoading(); // Mostrar overlay de loading
  ipcRenderer.invoke('execute-adb-command', `disconnect ${ip}:5555`)
    .then(() => {
      alert(`Desconectado do dispositivo ${ip}.`);
      updateUIStatus(`Desconectado do dispositivo ${ip}.`);
      ipInput.disabled = false;
    })
    .catch((error) => {
      alert(`Erro ao desconectar: ${error}`);
      updateUIStatus(`Erro ao desconectar: ${error}`);
      ipInput.disabled = false;
    })
    .finally(() => hideLoading()); // Ocultar overlay de loading
};

window.rebootDevice = () => {
  showLoading(); // Mostrar overlay de loading
  ipcRenderer.invoke('execute-adb-command', 'reboot')
    .then(() => {
      const successMessage = 'Reinicialização do dispositivo concluída com sucesso.';
      alert(successMessage);
      updateUIStatus(successMessage);
    })
    .catch((error) => {
      const errorMessage = `Erro ao reinicializar o dispositivo: ${error}`;
      alert(errorMessage);
      updateUIStatus(errorMessage);
    })
    .finally(() => hideLoading()); // Ocultar overlay de loading
};

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

  showLoading(); // Mostrar overlay de loading
  const promises = commands.map((command) =>
    ipcRenderer.invoke('execute-adb-command', command)
      .then((result) => {
        console.log(`Comando executado com sucesso: ${command}`);
        return { command, result, success: true };
      })
      .catch((error) => {
        console.error(`Erro ao executar o comando: ${command}`);
        return { command, error, success: false };
      })
  );

  Promise.all(promises)
    .then((results) => {
      const successfulCommands = results.filter(r => r.success);
      const failedCommands = results.filter(r => !r.success);

      let finalMessage = `Processo de desinstalação concluído.\n`;
      if (successfulCommands.length > 0) {
        finalMessage += `Comandos bem-sucedidos: ${successfulCommands.length}\n`;
      }
      if (failedCommands.length > 0) {
        finalMessage += `Comandos com falhas: ${failedCommands.length}`;
      }

      alert(finalMessage);
      updateUIStatus(finalMessage);
    })
    .catch((error) => {
      const errorMessage = 'Ocorreu um erro inesperado ao processar os comandos de desinstalação.';
      alert(errorMessage);
      updateUIStatus(errorMessage);
      console.error(error);
    })
    .finally(() => hideLoading()); // Ocultar overlay de loading
};

window.installApk = async () => {
  const apkPath = await selectFile('Selecione o aplicativo que deseja instalar', [
    { name: 'APK Files', extensions: ['apk'] },
  ]);

  if (apkPath) {
    showLoading(); // Mostrar overlay de loading
    ipcRenderer.invoke('install-apk', apkPath)
      .then((result) => {
        alert(`Aplicativo instalado com sucesso.`);
        updateUIStatus(`Aplicativo instalado com sucesso.`);
      })
      .catch((error) => {
        alert(`Erro ao instalar o aplicativo: ${error}`);
        updateUIStatus(`Erro ao instalar o aplicativo: ${error}`);
      })
      .finally(() => hideLoading()); // Ocultar overlay de loading
  }
};

window.injectConfig = async () => {
  const configPath = await selectFile('Selecione o arquivo de configuração JSON', [
    { name: 'JSON Files', extensions: ['json'] },
  ]);

  if (configPath) {
    showLoading(); // Mostrar overlay de loading
    ipcRenderer.invoke('inject-config', configPath)
      .then((result) => {
        alert(`Configuração importada com sucesso!`);
        updateUIStatus(`Configuração importada com sucesso.`);
      })
      .catch((error) => {
        alert(`Erro ao importar a configuração!`);
        updateUIStatus(`Erro ao importar a configuração: ${error}`);
      })
      .finally(() => hideLoading()); // Ocultar overlay de loading
  }
};

async function selectFile(title, filters) {
  const { canceled, filePaths } = await ipcRenderer.invoke('dialog:open-file', { title, filters });
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
}

ipcRenderer.on('adb-status', (event, status) => {
  updateUIStatus(status);
});

ipcRenderer.on('download-progress', (event, progress) => {
  updateUIProgress(progress);
});

const updateUIStatus = (status) => {
  document.getElementById('status').textContent = status;
};

const updateUIProgress = (progress) => {
  document.getElementById('progress-bar').style.width = `${progress}%`;
  document.getElementById('progress-text').innerText = `Progresso: ${progress}%`;
};

// Mostrar a tela de loading
function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.style.display = 'flex';
}

// Ocultar a tela de loading
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.style.display = 'none';
}
