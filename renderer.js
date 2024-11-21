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

// Atualizar o status do ADB na interface
ipcRenderer.on('adb-status', (event, status) => {
  updateUIStatus(status);
});

// Atualizar o progresso do download de ADB
ipcRenderer.on('download-progress', (event, progress) => {
  updateUIProgress(progress);
});

// Função para atualizar o status na interface
const updateUIStatus = (status) => {
  document.getElementById('status').textContent = status;
};

// Função para atualizar a barra de progresso
const updateUIProgress = (progress) => {
  document.getElementById('progress-bar').style.width = `${progress}%`;
  document.getElementById('progress-text').innerText = `Progresso: ${progress}%`;
};
