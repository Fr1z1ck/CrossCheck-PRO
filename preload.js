const { contextBridge, ipcRenderer } = require('electron');

// Экспортируем API для доступа из рендерер-процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Методы для работы с файлами
  openFileDialog: () => ipcRenderer.invoke('openFileDialog'),
  readFile: (filePath) => ipcRenderer.invoke('readFile', filePath),
  
  // Проверка доступности Electron
  isElectronAvailable: true,
  
  // --- Обновление приложения --- 
  getAppVersion: () => ipcRenderer.invoke('get_app_version'),
  
  // Инициировать проверку обновлений
  checkUpdates: () => ipcRenderer.send('check_for_updates_trigger'),
  
  // Установить и перезапустить
  installUpdate: () => ipcRenderer.send('install_update_trigger'),
  
  // Подписки на события от autoUpdater в main процессе
  onUpdateStatus: (callback) => ipcRenderer.on('update_status_changed', (_event, status) => callback(status)),
  // Снимаем предыдущие обработчики, чтобы избежать дублирования
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update_status_changed');
  },
  // --- Удаляем метод для тестирования --- 
  /*
  sendTestUpdateStatus: (status) => ipcRenderer.send('test_update_status_trigger', status),
  */
  // ------------------------------------------------
  
  // Ченджлог (оставляем как есть, если работает)
  getChangelog: () => ipcRenderer.invoke('get_changelog')
}); 