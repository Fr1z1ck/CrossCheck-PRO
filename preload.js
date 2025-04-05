const { contextBridge, ipcRenderer } = require('electron');

// Экспортируем API для взаимодействия с Electron
contextBridge.exposeInMainWorld('electronAPI', {
  // Открытие диалога выбора файлов
  openFileDialog: async () => {
    try {
      console.log('Вызов openFileDialog через Electron API');
      const result = await ipcRenderer.invoke('open-file-dialog');
      console.log('Результат openFileDialog:', result);
      return result;
    } catch (error) {
      console.error('Error in openFileDialog:', error);
      alert('Ошибка при открытии диалога выбора файлов: ' + error.message);
      return [];
    }
  },
  
  // Чтение содержимого файла
  readFile: async (filePath) => {
    try {
      console.log('Чтение файла через Electron API:', filePath);
      const result = await ipcRenderer.invoke('read-file', filePath);
      console.log('Файл успешно прочитан, размер:', result.length);
      return result;
    } catch (error) {
      console.error('Error in readFile:', error);
      alert('Ошибка при чтении файла: ' + error.message);
      throw error;
    }
  },
  
  // Проверка работы Electron API
  isElectronAvailable: true
}); 