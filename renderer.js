const { ipcRenderer } = require('electron');

ipcRenderer.on('update_available', () => {
  alert('Nova atualização disponível. O download está sendo iniciado...');
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
    updateUIStatus('IP inválido.');
    return;
  }

  showLoading();
  ipcRenderer.invoke('execute-adb-command', `connect ${ip}:5555`)
    .then(() => {
      alert(`Conectado ao dispositivo ${ip}.`);
      updateUIStatus(`Conectado ao dispositivo.`);
    })
    .catch((error) => {
      alert(`Erro ao conectar-se: ${error}`);
      updateUIStatus(`Erro ao conectar-se: ${error}`);
    })
    .finally(() => {
      ipInput.disabled = false;
      hideLoading();
    });
};

window.disconnect = () => {
  const ipInput = document.getElementById('ip');
  const ip = ipInput.value.trim();

  if (!ip) {
    alert('Por favor, insira um IP válido para desconectar-se.');
    updateUIStatus('Nenhum IP fornecido.');
    return;
  }

  showLoading();
  ipcRenderer.invoke('execute-adb-command', `disconnect ${ip}:5555`)
    .then(() => {
      alert(`Desconectado do dispositivo com sucesso.`);
      updateUIStatus(`Desconectado do dispositivo com sucesso.`);
    })
    .catch((error) => {
      alert(`Erro ao desconectar-se: ${error}`);
      updateUIStatus(`Erro ao desconectar-se: ${error}`);
    })
    .finally(() => {
      ipInput.disabled = false;
      hideLoading();
    });
};

window.rebootDevice = () => {
  showLoading();
  ipcRenderer.invoke('reboot')
    .then(() => {
      const successMessage = 'Dispositivo reiniciado com sucesso!';
      alert(successMessage);
      updateUIStatus(successMessage);
    })
    .catch((error) => {
      console.error('Erro detalhado:', error);

      const userMessage = parseRebootError(error);

      alert(userMessage);
      updateUIStatus(userMessage);
    })
    .finally(() => hideLoading());
};

function parseRebootError(error) {
  const errorMsg = error?.message || error?.toString() || '';

  if (errorMsg.includes('no devices') || errorMsg.includes('no devices/emulators found')) {
    return 'Nenhum dispositivo foi detectado. Conecte o dispositivo e tente novamente.';
  }

  if (errorMsg.includes('ADB not found')) {
    return 'ADB não foi encontrado. Verifique a configuração do caminho.';
  }

  return 'Falha ao reiniciar o dispositivo.';
}

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

  showLoading();

  const promises = commands.map((command) =>
    ipcRenderer.invoke('execute-adb-command', command)
      .then((result) => {
        console.log(`Comando executado com sucesso: ${command}`);
        return { command, result, success: true };
      })
      .catch((error) => {
        console.error(`Erro ao executar o comando: ${command}`, error);
        return { command, error, success: false };
      })
  );

  Promise.all(promises)
    .then((results) => {
      const successfulCommands = results.filter(r => r.success);
      const failedCommands = results.filter(r => !r.success);

      let finalMessage = '';

      if (successfulCommands.length > 0) {
        finalMessage += `${successfulCommands.length} aplicativos desinstalados com sucesso.\n`;
      }

      if (failedCommands.length > 0) {
        finalMessage += `Falha ao desinstalar ${failedCommands.length} aplicativos.`;
      }

      alert(finalMessage);
      updateUIStatus(finalMessage);
    })
    .catch((error) => {
      const errorMessage = 'Ocorreu um erro ao processar os comandos de desinstalação.';
      alert(errorMessage);
      updateUIStatus(errorMessage);
      console.error(error);
    })
    .finally(() => hideLoading());
};

window.installApk = async () => {
  const apkPath = await selectFile('Selecione o aplicativo que deseja instalar', [
    { name: 'APK Files', extensions: ['apk'] },
  ]);

  if (apkPath) {
    showLoading();
    ipcRenderer.invoke('install-apk', apkPath)
      .then(() => {
        alert(`Aplicativo instalado com sucesso.`);
        updateUIStatus(`Aplicativo instalado com sucesso.`);
      })
      .catch((error) => {
        alert(`Erro ao instalar o aplicativo: ${error}`);
        updateUIStatus(`Erro ao instalar o aplicativo: ${error}`);
      })
      .finally(() => hideLoading());
  }
};

window.injectConfig = async () => {
  const configPath = await selectFile('Selecione o arquivo de configuração JSON', [
    { name: 'JSON Files', extensions: ['json'] },
  ]);

  if (configPath) {
    showLoading();
    ipcRenderer.invoke('inject-config', configPath)
      .then(() => {
        alert(`Arquivo de configuração enviado com sucesso!`);
        updateUIStatus(`Arquivo de configuração enviado com sucesso!`);
      })
      .catch((error) => {
        alert(`Erro ao importar a configuração: ${error}`);
        updateUIStatus(`Erro ao importar a configuração: ${error}`);
      })
      .finally(() => hideLoading());
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
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = status;
  }
};

const updateUIProgress = (progress) => {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  if (progressText) {
    progressText.innerText = `Progresso: ${progress}%`;
  }
};

function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
}
