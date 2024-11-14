const { exec } = require('child_process');


const exec = require('child_process').exec;

function executeCommand(command) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro: ${error}`);
      return;
    }
    console.log(`Resultado: ${stdout}`);
  });
}


window.connect = () => {
    const ip = document.getElementById('ip').value;
    if (!ip) {
        alert('Por favor, insira um IP válido.');
        return;
    }
    exec(`adb connect ${ip}:5555`, (error, stdout, stderr) => {
        if (error) {
            alert(`Erro de Conexão: ${stderr}`);
            return;
        }
        alert(`Conectado ao dispositivo: ${stdout}`);
    });
};

window.disconnect = () => {
    const ip = document.getElementById('ip').value;
    exec(`adb disconnect ${ip}:5555`, (error, stdout, stderr) => {
        if (error) {
            alert(`Erro ao Desconectar: ${stderr}`);
            return;
        }
        alert(`Desconectado do dispositivo: ${stdout}`);
    });
};

window.uninstallApps = () => {
  const commands = [
      "adb shell pm uninstall --user 0 com.mediatek.wwtv.tvcenter",
      "adb shell pm uninstall --user 0 com.netflix.ninja",
      "adb shell pm uninstall --user 0 com.google.android.youtube.tv",
      "adb shell pm uninstall --user 0 com.google.android.play.games",
      "adb shell pm uninstall --user 0 com.google.android.youtube.tvkids",
      "adb shell pm uninstall --user 0 com.google.android.youtube.tvmusic",
      "adb shell pm uninstall --user 0 com.amazon.amazonvideo.livingroom",
      "adb shell pm uninstall --user 0 com.android.printspooler",
      "adb shell pm uninstall --user 0 com.android.wallpaperbackup",
      "adb shell pm uninstall --user 0 com.google.android.katniss",
      "adb shell pm uninstall --user 0 com.google.android.videos",
      "adb shell pm uninstall --user 0 com.android.dreams.basic"
  ];

  commands.forEach((command) => {
      exec(command, (error, stdout, stderr) => {
          if (error) {
              console.error(`Erro ao executar o comando: ${command}\n${stderr}`);
          } else {
              console.log(`Comando executado com sucesso: ${command}\n${stdout}`);
          }
      });
  });

  alert('Processo de desinstalação iniciado.');
};

window.executeCommand = (command) => {
    exec(`adb ${command}`, (error, stdout, stderr) => {
        if (error) {
            alert(`Erro ao Executar Comando: ${stderr}`);
            return;
        }
        alert(`Comando Executado: ${stdout}`);
    });
};
