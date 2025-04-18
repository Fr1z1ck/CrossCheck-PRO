const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Глобальная ссылка на окно приложения
let mainWindow;

// Проверяем режим разработки более надежным способом
const isDev = !app.isPackaged;
console.log(`[Update System] Running in Development mode: ${isDev} (Based on !app.isPackaged)`);
if (isDev) {
  console.log('Запуск в режиме разработки');
}

function createWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'electron', 'crosscheck sbis.ico'),
    frame: true,
    autoHideMenuBar: true
  });

  // Загружаем index.html приложения
  mainWindow.loadFile('index.html');

  // Открываем DevTools в режиме разработки
  if (isDev) {
    mainWindow.webContents.openDevTools();
    console.log('DevTools открыты');
  }

  // Проверка наличия обновлений
  autoUpdater.checkForUpdatesAndNotify();

  // Установка заголовка окна
  mainWindow.setTitle('CrossCheck SBIS v' + app.getVersion());

  // Настройка панели "О программе" (для macOS)
  app.setAboutPanelOptions({
    applicationName: 'CrossCheck SBIS',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2023-2025 Fr1z1ck'
  });
}

// Этот метод будет вызван, когда Electron закончит инициализацию
app.whenReady().then(() => {
  createWindow();

  // --- НОВОЕ: Автопроверка обновлений при запуске --- 
  // Делаем небольшую задержку перед первой проверкой
  setTimeout(() => {
    if (!isDev) {
      console.log('[Update System] Performing initial update check...');
      autoUpdater.checkForUpdates().catch(err => {
        console.error('[Update System] Initial check failed:', err);
        // Можно отправить статус ошибки, если mainWindow уже доступно
        if (mainWindow && mainWindow.webContents) {
            sendUpdateStatus({ state: 'error', message: 'Initial check failed: ' + (err.message || 'Unknown error') });
        }
      });
    } else {
        console.log('[Update System] Skipping initial update check in dev mode.');
        // Оповещаем UI, что мы в режиме разработки
        if (mainWindow && mainWindow.webContents) {
            // Добавим небольшую задержку и для этого случая
            setTimeout(() => {
                sendUpdateStatus({ state: 'not-available-dev' });
            }, 500);
        }
    }
  }, 3000); // Задержка 3 секунды
  // -------------------------------------------------

  app.on('activate', function () {
    // На macOS обычно пересоздают окно в приложении, когда на иконку в доке нажимают
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Выйти, когда все окна будут закрыты
app.on('window-all-closed', function () {
  // На macOS приложения обычно продолжают работать, пока пользователь не завершит их явно
  if (process.platform !== 'darwin') app.quit();
});

// Обработка сообщений от рендерера
ipcMain.handle('openFileDialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
    ]
  });
  
  if (canceled) {
    return [];
  }
  
  return filePaths;
});

// Чтение файла
ipcMain.handle('readFile', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { buffer };
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

// Проверка доступности Electron API
ipcMain.handle('isElectronAvailable', () => {
  return true;
});

// --- Логика обновления --- 

// Функция для отправки статуса в рендерер
function sendUpdateStatus(status) {
  console.log('Update Status:', status); // Логирование статуса
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update_status_changed', status);
  } else {
    console.error('Cannot send update status: mainWindow or webContents is not available.');
  }
}

// Обработчик для запуска проверки обновлений
ipcMain.on('check_for_updates_trigger', () => {
  console.log(`[Update System] check_for_updates_trigger received. isDev: ${isDev}`);
  if (isDev) {
    console.log('[Update System] Sending not-available-dev status.');
    setTimeout(() => {
        sendUpdateStatus({ state: 'not-available-dev' });
    }, 100);
    return;
  }
  
  console.log('[Update System] Sending checking status and checking for updates.');
  sendUpdateStatus({ state: 'checking' });
  autoUpdater.checkForUpdates().catch(err => {
    console.error('[Update System] Error during checkForUpdates:', err);
    sendUpdateStatus({ state: 'error', message: err.message || 'Unknown error' });
  });
});

// Обработчик для запуска установки
ipcMain.on('install_update_trigger', () => {
  autoUpdater.quitAndInstall();
});

// --- Удаляем обработчик для тестовых статусов --- 
/*
ipcMain.on('test_update_status_trigger', (event, status) => {
    if (isDev) {
        console.log('[Update System] Received test status trigger:', status);
        sendUpdateStatus(status);
    } else {
        console.warn('[Update System] Test status trigger ignored in production mode.');
    }
});
*/
// ------------------------------------------------

// Настройка слушателей autoUpdater
autoUpdater.on('checking-for-update', () => {
  // Этот статус уже отправлен триггером
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus({ state: 'available', version: info.version });
  // Загрузка начнется автоматически
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatus({ state: 'not-available' });
});

autoUpdater.on('error', (err) => {
  console.error('Update Error:', err);
  sendUpdateStatus({ state: 'error', message: err.message || 'Unknown error' });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdateStatus({
    state: 'downloading',
    progress: progressObj.percent,
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus({ state: 'downloaded', version: info.version });
});

// --- Конец логики обновления ---

// Получение текущей версии приложения
ipcMain.handle('get_app_version', () => {
  return app.getVersion();
});

// Получение ченджлога
ipcMain.handle('get_changelog', () => {
  try {
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const changelog = fs.readFileSync(changelogPath, 'utf8');
      return { success: true, content: changelog };
    } else {
      return { success: false, message: 'Файл ченджлога не найден' };
    }
  } catch (error) {
    console.error('Ошибка при чтении ченджлога:', error);
    return { success: false, message: `Ошибка при чтении ченджлога: ${error.message}` };
  }
}); 