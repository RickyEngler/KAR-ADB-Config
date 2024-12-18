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

window.connect = () => {
  const ip = document.getElementById('ip').value;
  if (!ip) {
    alert('Por favor, insira um IP válido.');
    return;
  }

  ipcRenderer.invoke('execute-adb-command', `connect ${ip}:5555`)
    .then((result) => {
      alert(`Conectado ao dispositivo`);
      updateUIStatus(`Conectado ao dispositivo.`);
    })
    .catch((error) => {
      alert(`Erro de Conexão: ${error}`);
      updateUIStatus(`Erro de Conexão: ${error}`);
    });
};

window.disconnect = () => {
  const ip = document.getElementById('ip').value;
  ipcRenderer.invoke('execute-adb-command', `disconnect ${ip}:5555`)
    .then((result) => {
      alert(`Desconectado do dispositivo.`);
      updateUIStatus(`Desconectado do dispositivo.`);
    })
    .catch((error) => {
      alert(`Erro ao Desconectar: ${error}`);
      updateUIStatus(`Erro ao Desconectar: ${error}`);
    });
};

window.rebootDevice = () => {
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
    });
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
    });

  const startMessage = 'Processo de desinstalação iniciado.';
  alert(startMessage);
  updateUIStatus(startMessage);
};

window.installApk = async () => {
  const apkPath = await selectFile('Selecione o aplicativo que deseja instalar', [
    { name: 'APK Files', extensions: ['apk'] },
  ]);

  if (apkPath) {
    ipcRenderer.invoke('install-apk', apkPath)
      .then((result) => {
        alert(`Aplicativo instalado com sucesso.`);
        updateUIStatus(`Aplicativo instalado com sucesso.`);
      })
      .catch((error) => {
        alert(`Erro ao instalar o aplicativo: ${error}`);
        updateUIStatus(`Erro ao instalar o aplicativo: ${error}`);
      });
  }
};

window.injectConfig = async () => {
  const configPath = await selectFile('Selecione o arquivo de configuração JSON', [
    { name: 'JSON Files', extensions: ['json'] },
  ]);

  if (configPath) {
    ipcRenderer.invoke('inject-config', configPath)
      .then((result) => {
        alert(`Configuração importada com sucesso!`);
        updateUIStatus(`Configuração importada com sucesso.`);
      })
      .catch((error) => {
        alert(`Erro ao importar a configuração!`);
        updateUIStatus(`Erro ao importar a configuração: ${error}`);
      });
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
