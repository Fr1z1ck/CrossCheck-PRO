const { app, BrowserWindow, dialog, ipcMain, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Объявляем переменную, чтобы предотвратить автоматическое закрытие
let mainWindow;

// Включаем отладочные логи
function log(...args) {
  console.log('[Main Process]', ...args);
}

// Создание окна приложения
function createWindow() {
  log('Создание главного окна');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'crosscheck sbis.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false
    }
  });

  // Настройка Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:"]
      }
    });
  });

  // Загружаем index.html
  mainWindow.loadFile('index.html');

  // Отключаем стандартное меню
  Menu.setApplicationMenu(null);

  // Событие закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Открываем DevTools только в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    log('Открываем DevTools (режим разработки)');
    mainWindow.webContents.openDevTools();
  }
}

// Создаем окно когда Electron будет готов
app.whenReady().then(() => {
  log('Electron готов, создаем окно');
  createWindow();

  // В macOS, если нет открытых окон, создаем новое при активации приложения
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выход из приложения, когда все окна закрыты (для Windows и Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработчик для открытия диалога выбора файлов
ipcMain.handle('open-file-dialog', async () => {
  log('Вызов диалога выбора файлов');
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
      ]
    });
    
    log('Диалог выбора файлов завершен', { canceled, filePaths });
    
    if (canceled) {
      log('Выбор файлов отменен');
      return [];
    }
    
    if (!filePaths || filePaths.length === 0) {
      log('Файлы не выбраны');
      return [];
    }
    
    log('Выбрано файлов:', filePaths.length);
    return filePaths;
  } catch (error) {
    log('Ошибка при выборе файлов:', error);
    return [];
  }
});

// Обработчик для чтения содержимого файла
ipcMain.handle('read-file', async (event, filePath) => {
  log('Чтение файла:', filePath);
  try {
    if (!filePath) {
      throw new Error('Путь к файлу не указан');
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Файл не найден: ${filePath}`);
    }
    
    const data = await fs.promises.readFile(filePath);
    log('Файл успешно прочитан, размер:', data.length);
    return data;
  } catch (error) {
    log('Ошибка чтения файла:', error);
    throw error;
  }
}); 