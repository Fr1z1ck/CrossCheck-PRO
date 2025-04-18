// Глобальные переменные для хранения данных
let orderData = null;  // Данные заказа МС
let scanData = null;   // Данные сканирования СБИС
let comparisonResults = null;  // Результаты сравнения
let orderFile = null;  // Файл заказа
let scanFile = null;   // Файл сканирования
let currentTheme = 'classic';  // Текущая тема
let currentSort = { field: 'code', direction: 'asc' }; // Текущая сортировка
let currentFontSize = 100;  // Текущий размер шрифта в процентах
let currentUIScale = 100;   // Текущий масштаб интерфейса в процентах
let hideUnmarkedItems = false; // Флаг для скрытия/показа немаркированных товаров
let currentOrderHash = null; // Хеш текущего заказа

// Глобальный объект для хранения состояния проверки товаров
let checkedItems = new Map();

// DOM элементы
const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');
const statsContainer = document.getElementById('statsContainer');
const filterInput = document.getElementById('filterInput');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const themeOptions = document.querySelectorAll('.theme-option');
const guideBtn = document.getElementById('guideBtn');
const guideModal = document.getElementById('guideModal');

// Элементы настроек
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.querySelector('.close-modal');

// Функция загрузки сохраненных настроек
function loadSettings() {
    console.log('Приложение инициализировано');
    
    // Проверяем наличие сохраненной темы
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme('classic');
    }
    
    // Проверяем наличие сохраненного размера шрифта
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        setFontSize(parseInt(savedFontSize));
    } else {
        setFontSize(100); // Устанавливаем 100% при первом запуске
    }

    // Проверяем наличие сохраненного масштаба интерфейса
    const savedUIScale = localStorage.getItem('uiScale');
    if (savedUIScale) {
        setUIScale(parseInt(savedUIScale));
    } else {
        setUIScale(100); // Устанавливаем 100% при первом запуске
    }
}

// Функция инициализации обработчиков событий
function setupEventListeners() {
    // Привязываем обработчики событий
    fileInput.addEventListener('change', handleFileInput);
    analyzeBtn.addEventListener('click', analyzeFiles);
    resetBtn.addEventListener('click', resetFiles);
    filterInput.addEventListener('input', applyFilterAndSort);
    guideBtn.addEventListener('click', openGuide);
    
    // Обработчики для модального окна настроек
    settingsBtn.addEventListener('click', openSettingsModal);
    closeModalBtn.addEventListener('click', closeSettingsModal);
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // Обработчик для тем оформления
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const themeName = this.getAttribute('data-theme');
            setTheme(themeName);
        });
    });
    
    // Обработчик для изменения размера шрифта
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', function() {
            const fontSize = parseInt(this.value);
            setFontSize(fontSize);
        });
    }

    // Обработчик для изменения масштаба интерфейса
    const uiScaleSlider = document.getElementById('uiScaleSlider');
    if (uiScaleSlider) {
        uiScaleSlider.addEventListener('input', function() {
            const uiScale = parseInt(this.value);
            setUIScale(uiScale);
        });
    }

    // Обработчик для кнопки "Отметить все без марки"
    const checkUnmarkedBtn = document.getElementById('checkUnmarkedBtn');
    if (checkUnmarkedBtn) {
        checkUnmarkedBtn.addEventListener('click', toggleAllUnmarkedItems);
    }

    // Настраиваем работу вкладок
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Снимаем активный класс со всех кнопок
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            // Добавляем активный класс на нажатую кнопку
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            
            // Скрываем все вкладки
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Показываем выбранную вкладку
            const activeTab = document.getElementById(tabName + 'Tab');
            activeTab.classList.add('active');
            
            // Добавляем обработчики сортировки для таблицы, если это вкладка Отмеченные
            if (tabName === 'checked') {
                addTableHeaderSorting();
            }
            
            // Сохраняем последнюю активную вкладку в localStorage
            localStorage.setItem('activeTab', tabName);
        });
    });
    
    // Добавляем поддержку drag-and-drop для загрузки файлов
    setupDragAndDrop();
    
    // Добавляем обработчик для кнопки Esc, чтобы закрыть модальное окно
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
            closeSettingsModal();
        }
    });
    
    // Обработчик для кнопки выбора файлов
    const selectFilesBtn = document.querySelector('.select-files-btn');
    if (selectFilesBtn && !window.electronAPI) { // Добавляем проверку на отсутствие Electron API
        selectFilesBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }
    
    // Добавляем обработчик для кнопки сброса проверок
    const resetCheckedBtn = document.getElementById('resetCheckedBtn');
    if (resetCheckedBtn) {
        resetCheckedBtn.addEventListener('click', function() {
            resetAllChecks();
        });
    }

    // Обработчик для кнопки скрытия товаров без маркировки
    const toggleUnmarkedBtn = document.getElementById('toggleUnmarkedBtn');
    if (toggleUnmarkedBtn) {
        toggleUnmarkedBtn.addEventListener('click', toggleUnmarkedItems);
    }
    
    // Обработчик для кнопки экспорта в Excel
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }

    // Снова делаем функцию доступной глобально для Electron
    if (typeof window !== 'undefined') {
        window.handleFileInput = handleFileInput;
        console.log('Функция handleFileInput доступна глобально:', !!window.handleFileInput);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем сохраненные настройки
    loadSettings();
    
    // Проверяем первое посещение для отображения руководства
    checkFirstTimeVisit();
    
    // Инициализируем обработчики событий
    setupEventListeners();
    
    // Инициализируем пасхалку
    setupEasterEgg();
    
    // Настраиваем модальные окна
    setupModals();
    
    // Настраиваем руководство пользователя
    setupGuide();
    
    // Добавляем сортировку для заголовков таблицы
    addTableHeaderSorting();
    
    // Загружаем отмеченные элементы
    loadCheckedItems();
});

// Настройка пасхалки
function setupEasterEgg() {
    const versionNumber = document.getElementById('versionNumber');
    const easterEgg = document.getElementById('easterEgg');
    const closeEasterEgg = document.getElementById('closeEasterEgg');
    const easterEggAudio = document.getElementById('easterEggAudio');
    const easterEggMessage = document.getElementById('easterEggMessage');
    const generateMessageBtn = document.getElementById('generateMessageBtn');
    
    if (!versionNumber || !easterEgg || !closeEasterEgg) return;
    
    let clickCount = 0;
    let clickTimer;
    
    // Список милых сообщений
    const sweetMessages = [
        "У меня жена самая лучшая",
        "Ты делаешь мой мир ярче",
        "Ты — моя любимая звездочка",
        "Твоя улыбка — мое счастье",
        "Наша любовь бесконечна",
        "Ты моя вторая половинка",
        "С тобой я чувствую себя счастливым",
        "Наша любовь — мое сокровище",
        "Ты делаешь каждый день особенным",
        "Жизнь с тобой — настоящее приключение"
    ];
    
    // Функция получения случайного сообщения
    function getRandomMessage() {
        const randomIndex = Math.floor(Math.random() * sweetMessages.length);
        return sweetMessages[randomIndex];
    }
    
    // Функция добавления анимации к сообщению
    function animateMessage() {
        easterEggMessage.style.animation = 'none';
        easterEggMessage.offsetHeight; // Триггер перерисовки
        easterEggMessage.style.animation = 'pulsate 2s infinite';
        
        // Добавляем эффект смены цвета
        const colors = ['#ff4081', '#9c27b0', '#e91e63', '#f44336', '#673ab7'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        easterEggMessage.style.color = randomColor;
    }
    
    versionNumber.addEventListener('click', () => {
        clickCount++;
        
        // Сбрасываем счетчик кликов через 2 секунды бездействия
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 2000);
        
        // После 5 кликов показываем пасхалку (сделали доступнее)
        if (clickCount >= 5) {
            // Показываем пасхалку
            easterEgg.classList.add('active');
            
            // Устанавливаем случайное сообщение
            easterEggMessage.textContent = getRandomMessage();
            animateMessage();
            
            // Запускаем музыку
            if (easterEggAudio) {
                easterEggAudio.volume = 0.5;
                easterEggAudio.play().catch(error => {
                    console.log('Ошибка воспроизведения аудио:', error);
                });
            }
            
            // Добавляем анимацию для цветочков
            const flowers = document.querySelectorAll('.flower');
            flowers.forEach((flower, index) => {
                flower.style.animationDuration = `${8 + Math.random() * 4}s`;
            });
            
            // Сбрасываем счетчик
            clickCount = 0;
        }
    });
    
    // Кнопка генерации сообщения
    if (generateMessageBtn) {
        generateMessageBtn.addEventListener('click', () => {
            easterEggMessage.textContent = getRandomMessage();
            animateMessage();
        });
    }
    
    // Закрытие пасхалки
    closeEasterEgg.addEventListener('click', () => {
        easterEgg.classList.remove('active');
        
        // Останавливаем музыку
        if (easterEggAudio) {
            easterEggAudio.pause();
            easterEggAudio.currentTime = 0;
        }
    });
    
    // Закрытие пасхалки по Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && easterEgg.classList.contains('active')) {
            easterEgg.classList.remove('active');
            
            // Останавливаем музыку
            if (easterEggAudio) {
                easterEggAudio.pause();
                easterEggAudio.currentTime = 0;
            }
        }
    });
}

// Обработчики drag and drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('drop-zone-highlight');
    }
    
    function unhighlight() {
        dropZone.classList.remove('drop-zone-highlight');
    }
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    }
}

// Функция установки темы
function setTheme(themeName) {
    // Удаляем все классы тем с body
    document.body.classList.remove('classic-theme', 'dark-theme', 'night-theme', 'light-theme', 'custom-theme');
    
    // Добавляем новый класс темы
    document.body.classList.add(themeName + '-theme');
    
    // Обновляем индикатор активной темы
    themeOptions.forEach(option => {
        option.classList.remove('active');
        option.setAttribute('aria-pressed', 'false');
        
        if (option.getAttribute('data-theme') === themeName) {
            option.classList.add('active');
            option.setAttribute('aria-pressed', 'true');
        }
    });
    
    // Сохраняем тему в localStorage
    localStorage.setItem('theme', themeName);
    currentTheme = themeName;
    
    console.log(`Установлена тема: ${themeName}`);
}

// Функция установки размера шрифта
function setFontSize(fontSize) {
    // Обновляем переменную размера шрифта
    document.documentElement.style.setProperty('--font-size-multiplier', `${fontSize / 100}`);
    
    // Обновляем значение на слайдере
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
        fontSizeSlider.value = fontSize;
    }
    
    // Обновляем отображение текущего размера шрифта
    const fontSizeValue = document.getElementById('fontSizeValue');
    if (fontSizeValue) {
        fontSizeValue.textContent = `${fontSize}%`;
    }
    
    // Сохраняем размер шрифта в localStorage
    localStorage.setItem('fontSize', fontSize);
    currentFontSize = fontSize;
    
    console.log(`Установлен размер шрифта: ${fontSize}%`);
}

// Функция установки масштаба интерфейса
function setUIScale(scale) {
    // Обновляем переменную масштаба интерфейса
    document.documentElement.style.setProperty('--ui-scale', `${scale / 100}`);
    
    // Добавляем или удаляем класс для масштабирования
    if (scale !== 100) {
        document.body.classList.add('scaled-ui');
    } else {
        document.body.classList.remove('scaled-ui');
    }
    
    // Обновляем значение на слайдере
    const uiScaleSlider = document.getElementById('uiScaleSlider');
    if (uiScaleSlider) {
        uiScaleSlider.value = scale;
    }
    
    // Обновляем отображение текущего масштаба
    const uiScaleValue = document.getElementById('uiScaleValue');
    if (uiScaleValue) {
        uiScaleValue.textContent = `${scale}%`;
    }
    
    // Сохраняем масштаб интерфейса в localStorage
    localStorage.setItem('uiScale', scale);
    currentUIScale = scale;
    
    console.log(`Установлен масштаб интерфейса: ${scale}%`);
}

// Функции для модального окна настроек
function openSettingsModal() {
    settingsModal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Функция для вычисления хеша файла
async function calculateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Обновленная функция обработки файлов
async function handleFileInput(event) {
    console.log("handleFileInput вызван", event);
    const files = event.target.files;
    if (files.length === 0) return;

    // Очищаем предыдущие данные
    orderData = null;
    scanData = null;
    comparisonResults = null;
    orderFile = null;
    scanFile = null;
    currentOrderHash = null;
    
    // Очищаем все отмеченные позиции при загрузке новых файлов
    checkedItems.clear();
    
    // Сбрасываем состояние фильтра "Без марки"
    hideUnmarkedItems = false;
    const toggleUnmarkedBtn = document.getElementById('toggleUnmarkedBtn');
    if (toggleUnmarkedBtn) {
        toggleUnmarkedBtn.classList.remove('active');
        const btnText = toggleUnmarkedBtn.querySelector('span');
        if (btnText) {
            btnText.textContent = 'Без марки';
        }
    }
    
    // Отображаем выбранные файлы в интерфейсе
    updateSelectedFilesDisplay(files);
    
    // Ищем файлы заказа и сканирования
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Проверяем тип файла
        if (file.name.toLowerCase().includes('мс') || file.name.toLowerCase().includes('ms') || file.name.toLowerCase().endsWith('.xls')) {
            orderFile = file;
        } else if (file.name.toLowerCase().includes('сбис') || file.name.toLowerCase().includes('sbis') || file.name.toLowerCase().endsWith('.xlsx')) {
            scanFile = file;
        }
    }
    
    // Если не удалось определить файлы по имени, берем по порядку
    if (files.length >= 2 && (!orderFile || !scanFile)) {
        orderFile = orderFile || files[0];
        scanFile = scanFile || files[1];
    } else if (files.length === 1 && !orderFile && !scanFile) {
        // Если загружен только один файл, пробуем определить какой это файл
        const file = files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (ext === 'xls') {
            orderFile = file;
        } else if (ext === 'xlsx') {
            scanFile = file;
        }
    }
    
    // Разблокируем кнопку, если загружены оба файла
    analyzeBtn.disabled = !(orderFile && scanFile);
    
    // Добавляем подсветку кнопки, если она активна
    if (!analyzeBtn.disabled) {
        analyzeBtn.classList.add('active-btn');
    } else {
        analyzeBtn.classList.remove('active-btn');
    }
}

// Функция обновления отображения выбранных файлов
function updateSelectedFilesDisplay(files) {
    const selectedFilesContainer = document.getElementById('selectedFiles');
    if (!selectedFilesContainer) return;
    
    // Очищаем контейнер
    selectedFilesContainer.innerHTML = '';
    
    if (files.length === 0) return;
    
    // Добавляем каждый выбранный файл
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileElement = document.createElement('div');
        fileElement.className = 'selected-file';
        
        // Определяем иконку в зависимости от типа файла
        let iconClass = 'fa-file';
        if (file.name.toLowerCase().endsWith('.xls')) {
            iconClass = 'fa-file-excel';
        } else if (file.name.toLowerCase().endsWith('.xlsx')) {
            iconClass = 'fa-file-excel';
        }
        
        // Определяем, какой это файл (заказ или сканирование)
        let fileType = '';
        if (file.name.toLowerCase().includes('мс') || file.name.toLowerCase().includes('ms') || file.name.toLowerCase().endsWith('.xls')) {
            fileType = 'Заказ';
        } else if (file.name.toLowerCase().includes('сбис') || file.name.toLowerCase().includes('sbis') || file.name.toLowerCase().endsWith('.xlsx')) {
            fileType = 'СБИС';
        }
        
        fileElement.innerHTML = `
            <i class="far ${iconClass}"></i>
            <span class="file-name" title="${file.name}">${fileType ? fileType + ': ' : ''}${file.name}</span>
        `;
        
        selectedFilesContainer.appendChild(fileElement);
    }
}

// Функция отображения уведомлений
function showNotification(title, message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    
    // Иконка в зависимости от типа уведомления
    let icon = 'info-circle';
    if (type === 'error') icon = 'exclamation-circle';
    else if (type === 'success') icon = 'check-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Добавляем на страницу
    if (!document.querySelector('.notifications-container')) {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    
    const container = document.querySelector('.notifications-container');
    container.appendChild(notification);
    
    // Обработчик для закрытия уведомления
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('notification-hiding');
        setTimeout(() => {
            notification.remove();
            
            // Если это последнее уведомление, удаляем контейнер
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    });
    
    // Автоматически скрываем через 2 секунды (изменено с 5 секунд)
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('notification-hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                    
                    // Если это последнее уведомление, удаляем контейнер
                    if (container.children.length === 0) {
                        container.remove();
                    }
                }
            }, 300);
        }
    }, 2000);
}

// Функция анализа файлов
async function analyzeFiles() {
    // Блокируем кнопку анализа на время обработки
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Анализ...';
    
    try {
        console.log('Начинаем анализ файлов...');
        console.log(`Файл заказа: ${orderFile.name}, Файл СБИС: ${scanFile.name}`);
        
        // Показываем уведомление о начале анализа
        showNotification('Анализ', 'Начинаем сравнение файлов...', 'info');
        
        // Чтение данных из файлов
        orderData = await readExcelFile(orderFile);
        scanData = await readExcelFile(scanFile);
        
        // Извлечение товаров из данных файлов
        console.log('Извлечение товаров из файла МС...');
        const orderItems = extractProductsFromMS(orderData);
        console.log(`Извлечено ${orderItems.length} товаров из файла МС`);
        
        console.log('Извлечение товаров из файла СБИС...');
        const scanItems = extractProductsFromSBIS(scanData);
        console.log(`Извлечено ${scanItems.length} товаров из файла СБИС`);
        
        // Сравнение товаров
        console.log('Сравнение товаров...');
        comparisonResults = compareProducts(orderItems, scanItems);
        
        // Отображение результатов
        displayResults(comparisonResults);
        
        // Отображение статистики
        displayStats(comparisonResults);
        
        // Показываем блок статистики
        statsContainer.style.display = 'block';
        
        // Плавно прокручиваем к результатам
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
        
        // Применяем текущие параметры фильтрации и сортировки
        applyFilterAndSort();
        
        console.log('Анализ файлов завершен успешно');
        
        // Показываем уведомление об успешном завершении
        showNotification('Готово', 'Анализ файлов успешно завершен', 'success');
    } catch (error) {
        console.error('Ошибка при анализе файлов:', error);
        showNotification('Ошибка', 'Произошла ошибка при анализе файлов: ' + error.message, 'error');
    } finally {
        // Разблокируем кнопку анализа
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Сравнить файлы';
    }
}

// Функция чтения Excel файла
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        // Проверяем доступность библиотеки XLSX
        if (typeof XLSX === 'undefined') {
            console.error('Ошибка: Библиотека XLSX не загружена');
            showNotification('Ошибка', 'Библиотека XLSX для работы с Excel не загружена. Попробуйте обновить страницу.', 'error');
            reject(new Error('Библиотека XLSX не определена. Проверьте подключение к интернету и обновите страницу.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                console.log(`Чтение файла ${file.name} (${file.size} байт, тип: ${file.type})`);
                
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Берем первый лист
                const firstSheetName = workbook.SheetNames[0];
                console.log(`Имя первого листа: ${firstSheetName}`);
                
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Определяем максимальное количество строк и столбцов в файле
                    const range = XLSX.utils.decode_range(worksheet['!ref']);
                    console.log('Обнаружено строк:', range.e.r + 1, 'столбцов:', range.e.c + 1);
                    
                // Увеличиваем диапазон до максимально возможного значения для обоих типов файлов
                    const extendedRange = {
                        s: { r: 0, c: 0 },  // Начало с первой строки и столбца
                    e: { 
                        r: Math.max(range.e.r + 100, 10000), // Гарантированно берем все строки
                        c: Math.max(range.e.c, 2)  // Убеждаемся, что захватываем все 3 столбца
                    }
                };
                
                console.log('Расширенный диапазон для чтения:', 
                    `с строки 0 до ${extendedRange.e.r}, столбцы 0-${extendedRange.e.c}`);
                
                let jsonData;
                // Для обоих форматов файлов используем одинаковый подход чтения
                    jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,      // Нумерованные столбцы (без заголовков)
                    defval: '',     // Значение по умолчанию для пустых ячеек
                    raw: true,      // Получаем сырые значения
                        range: extendedRange // Используем расширенный диапазон
                    });
                    
                // Фильтруем строки, которые полностью пусты (все ячейки пустые)
                    jsonData = jsonData.filter(row => 
                    row && Array.isArray(row) && row.some(cell => cell !== '')
                );
                
                console.log(`Прочитано строк из ${file.name}: ${jsonData.length}`);
                console.log('Пример первых 5 строк:', jsonData.slice(0, 5));
                
                resolve(jsonData);
            } catch (error) {
                console.error(`Ошибка при чтении файла ${file.name}:`, error);
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            console.error(`Ошибка доступа к файлу ${file.name}:`, error);
            reject(error);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Функция извлечения товаров из файла МС
function extractProductsFromMS(data) {
    // Начинаем чтение со второй строки
    // Первая строка (индекс 0) - это заголовок таблицы
    if (data.length < 2) {
        throw new Error('Файл МС не содержит достаточно строк');
    }
    
    console.log('Первая строка (заголовок):', data[0]);
    
    // Определяем индексы колонок из первой строки (заголовка)
    const headerRow = data[0];
    let codeIndex = -1;
    let nameIndex = -1;
    let quantityIndex = -1;
    
    // Ищем индексы нужных колонок в заголовке
    for (let i = 0; i < headerRow.length; i++) {
        if (!headerRow[i]) continue;
        
        const cell = String(headerRow[i]).toLowerCase();
        if (cell.includes('код')) {
            codeIndex = i;
        } else if (cell.includes('наименование')) {
            nameIndex = i;
        } else if (cell.includes('кол-во') || cell.includes('кол-')) {
            quantityIndex = i;
        }
    }
    
    // Если какие-то колонки не найдены, используем стандартные индексы
    if (codeIndex === -1 || nameIndex === -1 || quantityIndex === -1) {
        console.warn('Не удалось определить все колонки в файле МС, используем стандартные позиции.');
        codeIndex = codeIndex === -1 ? 0 : codeIndex;
        nameIndex = nameIndex === -1 ? 1 : nameIndex;
        quantityIndex = quantityIndex === -1 ? 2 : quantityIndex;
    }
    
    console.log(`Определены индексы колонок: Код=${codeIndex}, Наименование=${nameIndex}, Количество=${quantityIndex}`);
    
    // Извлекаем товары, начиная со второй строки (индекс 1)
    const products = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Пропускаем пустые строки
        if (!row || !Array.isArray(row)) {
            continue;
        }
        
        // Получаем код товара, если он есть
        const code = row[codeIndex] !== undefined ? String(row[codeIndex]).trim() : '';
        
        // Пропускаем строки без кода товара
        if (!code) {
            continue;
        }
        
        // Извлекаем имя и количество
        const name = row[nameIndex] !== undefined ? String(row[nameIndex]).trim() : '';
        let quantity = 0;
        
        // Преобразуем количество
        if (row[quantityIndex] !== undefined) {
            if (typeof row[quantityIndex] === 'number') {
                quantity = row[quantityIndex];
            } else {
                const parsedQuantity = parseInt(String(row[quantityIndex]).trim(), 10);
                quantity = isNaN(parsedQuantity) ? 0 : parsedQuantity;
            }
        }
        
        // Добавляем товар в список
                products.push({
                    code,
                    name,
                    quantity
                });
        
        // Для отладки выводим первые несколько товаров
        if (products.length <= 5) {
            console.log(`Обработан товар МС #${products.length} (строка ${i}):`, {code, name, quantity});
        }
    }
    
    console.log(`Всего обработано товаров из МС: ${products.length} из ${data.length - 1} строк данных`);
    return products;
}

// Функция извлечения товаров из файла СБИС
function extractProductsFromSBIS(data) {
    console.log('Всего строк в файле СБИС:', data.length);
    
    // Данные в СБИС начинаются с первой строки, без заголовков
    const codeIndex = 0;
    const nameIndex = 1;
    const quantityIndex = 2;
    
    console.log(`Используем индексы для СБИС: Код=${codeIndex}, Наименование=${nameIndex}, Количество=${quantityIndex}`);
    
    // Извлекаем товары
    const products = [];
    let skippedRows = 0;
    let incompleteRows = 0;
    let emptyCodeCounter = 1; // Счетчик для генерации уникальных ID для товаров без кода
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Проверка на валидность строки
        if (!row || !Array.isArray(row)) {
            skippedRows++;
            continue;
        }
        
        // Получаем данные из строки
        let code = row[codeIndex] !== undefined ? String(row[codeIndex]).trim() : '';
        const name = row[nameIndex] !== undefined ? String(row[nameIndex]).trim() : '';
        let quantity = 0;
        
        // Если в строке отсутствует наименование товара, пропускаем её
        if (!name) {
            skippedRows++;
            continue;
        }
        
        // Преобразование количества с обработкой возможных ошибок
        if (row[quantityIndex] !== undefined) {
            const quantityValue = row[quantityIndex];
            if (typeof quantityValue === 'number') {
                quantity = quantityValue;
            } else {
                const parsed = parseInt(String(quantityValue).trim(), 10);
                quantity = isNaN(parsed) ? 0 : parsed;
            }
        }
        
        // Если код пустой, генерируем уникальный ID
        if (!code) {
            code = 'EMPTY_CODE_' + emptyCodeCounter++;
        }
        
        // Помечаем, что это некорректная строка (пустой код или нулевое количество)
        const isIncompleteRow = code.startsWith('EMPTY_CODE_') || quantity === 0;
        if (isIncompleteRow) {
            incompleteRows++;
        }
        
        // Добавляем товар в список даже если он некорректный
        products.push({ code, name, quantity });
            
        // Отладочный вывод для первых 5 товаров
        if (products.length <= 5) {
            console.log(`Обработан товар СБИС #${products.length}:`, { code, name, quantity, isIncomplete: isIncompleteRow });
        }
    }
    
    console.log(`Всего обработано товаров из СБИС: ${products.length} (пропущено некорректных строк: ${skippedRows}, некорректных позиций: ${incompleteRows})`);
    
    return products;
}

// Функция для сравнения продуктов из заказа и скана
function compareProducts(orderProducts, scanProducts) {
    console.log('Сравниваем продукты...');
    const results = {
        missing: [],    // Товары, которые есть в МС, но отсутствуют в СБИС
        extra: [],      // Товары, которые есть в СБИС, но отсутствуют в МС
        mismatch: [],   // Товары с несовпадающим количеством
        matched: [],    // Товары, которые совпадают
        all: [],        // Все товары для отображения
        scan: [],       // Все товары из СБИС для отдельной вкладки
        errors: [],     // Все проблемные товары
        incomplete: []  // Товары без штрих-кода или без количества
    };

    // Создаем карты для быстрого поиска товаров по коду
    const orderMap = new Map();
    orderProducts.forEach(item => {
        orderMap.set(item.code, item);
    });

    const scanMap = new Map();
    scanProducts.forEach(item => {
        scanMap.set(item.code, item);
    });

    // Находим товары, которые есть только в заказе или только в скане
    const orderOnly = orderProducts.filter(item => !scanMap.has(item.code));
    const scanOnly = scanProducts.filter(item => !orderMap.has(item.code));
    const commonCodes = orderProducts
        .filter(item => scanMap.has(item.code))
        .map(item => item.code);

    console.log(`Товаров только в заказе: ${orderOnly.length}`);
    console.log(`Товаров только в скане: ${scanOnly.length}`);
    console.log(`Общих товаров: ${commonCodes.length}`);

    // Обрабатываем товары из заказа, которых нет в скане
    orderOnly.forEach(orderItem => {
        let item = {
            code: orderItem.code,
            name: orderItem.name,
            orderQuantity: orderItem.quantity,
            scanQuantity: 0,
            status: 'missing'
        };
        
            results.missing.push(item);
            results.errors.push(item); // Добавляем в общий список ошибок
        results.all.push(item);
    });

    // Проверяем наличие некорректных товаров в СБИС (без штрих-кода или количества)
    scanProducts.forEach(scanItem => {
        // Проверяем является ли товар некорректным (пустой штрих-код или нулевое количество)
        const isEmptyCode = scanItem.code.startsWith('EMPTY_CODE_');
        const isZeroQuantity = scanItem.quantity === 0 || scanItem.quantity === null || scanItem.quantity === undefined;
        
        if (isEmptyCode || isZeroQuantity) {
            const issue = isEmptyCode ? 'Отсутствует штрих-код' : 'Отсутствует количество';
            
            let item = {
                code: scanItem.code, // Используем сгенерированный уникальный ID
                displayCode: isEmptyCode ? 'Н/Д' : scanItem.code, // Для отображения
                name: scanItem.name,
                orderQuantity: 0,
                scanQuantity: scanItem.quantity,
                status: 'incomplete',
                issue: issue
            };
            
            results.incomplete.push(item);
            results.errors.push(item); // Также добавляем в общий список ошибок
        results.all.push(item);
            
            // Добавляем все некорректные товары из СБИС в отдельную категорию
            results.scan.push({
                code: scanItem.code,
                displayCode: isEmptyCode ? 'Н/Д' : scanItem.code,
                name: scanItem.name,
                scanQuantity: scanItem.quantity,
                status: 'incomplete',
                issue: issue
            });
        }
    });

    // Обрабатываем товары из скана, которых нет в заказе
    scanOnly.forEach(scanItem => {
        // Пропускаем уже обработанные некорректные товары
        const isEmptyCode = scanItem.code.startsWith('EMPTY_CODE_');
        const isZeroQuantity = scanItem.quantity === 0 || scanItem.quantity === null || scanItem.quantity === undefined;
        
        if (isEmptyCode || isZeroQuantity) {
            return; // Уже обработан в предыдущем блоке
        }
        
        let item = {
            code: scanItem.code,
            name: scanItem.name,
            orderQuantity: 0,
            scanQuantity: scanItem.quantity,
            status: 'extra'
        };
        
            results.extra.push(item);
            results.errors.push(item); // Добавляем в общий список ошибок
        results.all.push(item);

        // Добавляем все товары из СБИС в отдельную категорию
        results.scan.push({
            code: scanItem.code,
            name: scanItem.name,
            scanQuantity: scanItem.quantity,
            status: 'extra'
        });
    });

    // Обрабатываем товары, которые есть и в заказе, и в скане
    commonCodes.forEach(code => {
        const orderItem = orderMap.get(code);
        const scanItem = scanMap.get(code);
        
        let status = 'ok';
        if (orderItem.quantity !== scanItem.quantity) {
            status = 'mismatch';
        }
        
        let item = {
            code: code,
            name: orderItem.name,
            orderQuantity: orderItem.quantity,
            scanQuantity: scanItem.quantity,
            status: status
        };
        
        if (status === 'mismatch') {
            item.difference = scanItem.quantity - orderItem.quantity;
            results.mismatch.push(item);
            results.errors.push(item); // Добавляем в общий список ошибок
        } else {
            results.matched.push(item);
        }
        
        results.all.push(item);

        // Добавляем товар в список СБИС с соответствующим статусом
        results.scan.push({
            code: scanItem.code,
            name: scanItem.name,
            orderQuantity: orderItem.quantity,
            scanQuantity: scanItem.quantity,
            status: status
        });
    });

    // Сортируем все массивы результатов по коду товара для удобства
    const sortByCode = (a, b) => a.code.localeCompare(b.code);
    results.missing.sort(sortByCode);
    results.extra.sort(sortByCode);
    results.mismatch.sort(sortByCode);
    results.matched.sort(sortByCode);
    results.all.sort(sortByCode);
    results.scan.sort(sortByCode);
    results.errors.sort(sortByCode);
    results.incomplete.sort(sortByCode);

    console.log(`Результаты сравнения:
        Всего товаров: ${results.all.length}
        Отсутствуют в скане: ${results.missing.length}
        Лишние в скане: ${results.extra.length}
        Несоответствие количества: ${results.mismatch.length}
        Некорректные позиции: ${results.incomplete.length}
        Совпадающие товары: ${results.matched.length}
        Всего ошибок: ${results.errors.length}`);

    return results;
}

// Отображение результатов сравнения
function displayResults(results) {
    // Добавляем класс к таблице ошибок для управления видимостью немаркированных товаров
    const errorsTab = document.getElementById('errorsTab');
    if (errorsTab) {
        errorsTab.classList.toggle('hide-unmarked', hideUnmarkedItems);
    }
    
    // Заполняем таблицу всех товаров
    fillTable('allTable', results.all, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    // Заполняем таблицу товаров из СБИС
    fillTable('scanTable', results.scan, ['code', 'name', 'scanQuantity', 'status']);
    
    // Заполняем таблицу ошибок (общую), исключая отмеченные товары
    const errors = (results.errors || []).filter(item => !checkedItems.has(item.code));
    fillTable('errorsTable', errors, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    // Заполняем таблицу отмеченных товаров
    const checkedProductsList = results.all.filter(item => 
        checkedItems.has(item.code) && 
        (item.status === 'missing' || item.status === 'extra' || 
         item.status === 'mismatch' || item.status === 'incomplete')
    );
    fillTable('checkedTable', checkedProductsList, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    // Заполняем таблицу отсутствующих товаров
    fillTable('missingTable', results.missing, ['code', 'name', 'orderQuantity'], 'missing-row');
    
    // Заполняем таблицу лишних товаров
    fillTable('extraTable', results.extra, ['code', 'name', 'scanQuantity'], 'extra-row');
    
    // Заполняем таблицу с расхождениями
    const mismatchColumns = ['code', 'name', 'orderQuantity', 'scanQuantity', 'difference'];
    fillTable('mismatchTable', results.mismatch, mismatchColumns, 'mismatch-row');
    
    // Заполняем таблицу некорректных позиций
    fillTable('incompleteTable', results.incomplete, ['code', 'name', 'scanQuantity', 'issue'], 'incomplete-row');
    
    // Отображаем статистику
    displayStats(results);
    
    // Показываем блок результатов
    document.querySelector('.results-section').style.display = 'block';
    
    // Обновляем счетчики в заголовках вкладок
    updateTabCounters(results);
    
    // Добавляем сортировку для заголовков таблиц
    addTableHeaderSorting();

    // Восстанавливаем последнюю активную вкладку
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
        const tabButton = document.querySelector(`.tab-btn[data-tab="${savedTab}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }
}

// Обновленная функция заполнения таблицы
function fillTable(tableId, items, columns, rowClass = '') {
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';
    
    if (items.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = columns.length + 1; // +1 для колонки с чекбоксом
        cell.textContent = 'Нет данных';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    
    // Создаем заголовок таблицы, если его нет
    const table = tbody.closest('table');
    const thead = table.querySelector('thead');
    
    if (!thead.querySelector('.sortable')) {
        const headerRow = thead.querySelector('tr');
        const headers = headerRow.querySelectorAll('th');
        
        // Делаем первую колонку с чекбоксами также сортируемой
        if (headers[0]) {
            headers[0].classList.add('sortable', 'check-column');
            headers[0].setAttribute('data-field', 'checked');
            headers[0].innerHTML = `${headers[0].textContent} <i class="fas fa-sort"></i>`;
        }
        
        // Добавляем классы для сортировки для остальных колонок
        headers.forEach((header, index) => {
            if (index > 0 && index <= columns.length) {
                header.classList.add('sortable');
                header.setAttribute('data-field', columns[index - 1]);
                header.innerHTML = `${header.textContent} <i class="fas fa-sort"></i>`;
            }
        });
    }
    
    items.forEach(item => {
        const row = document.createElement('tr');
        
        // Проверяем, отмечен ли товар
        const isChecked = checkedItems.has(item.code);
        if (isChecked) {
            row.classList.add('checked-row');
        }
        
        if (rowClass) {
            row.classList.add(rowClass);
        } else if (item.status) {
            row.classList.add(item.status + '-row');
        }
        
        // Проверяем, не является ли товар немаркированным
        const isUnmarked = isProductUnmarked(item);
        if (isUnmarked) {
            row.classList.add('unmarked-item');
        }
        
        // Добавляем ячейку с чекбоксом
        const checkboxCell = document.createElement('td');
        
        const checkbox = document.createElement('div');
        checkbox.className = `item-checkbox${isChecked ? ' checked' : ''}`;
        checkbox.setAttribute('data-code', item.code);
        checkbox.setAttribute('title', isChecked ? 'Отменить проверку' : 'Отметить как проверенное');
        
        checkboxCell.appendChild(checkbox);
        
        row.appendChild(checkboxCell);
        
        // Добавляем остальные ячейки
        columns.forEach(column => {
            const cell = document.createElement('td');
            
            if (column === 'status') {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'status-indicator status-' + item.status;
                
                // Добавляем иконку в зависимости от статуса
                let icon = '';
                if (item.status === 'ok') icon = 'fa-check-circle';
                else if (item.status === 'missing') icon = 'fa-times-circle';
                else if (item.status === 'extra') icon = 'fa-plus-circle';
                else if (item.status === 'mismatch') icon = 'fa-exclamation-circle';
                else if (item.status === 'incomplete') icon = 'fa-exclamation-circle';
                
                if (icon) {
                    statusSpan.innerHTML = `<i class="fas ${icon}"></i>${getStatusText(item.status)}`;
                } else {
                    statusSpan.textContent = getStatusText(item.status);
                }
                
                cell.appendChild(statusSpan);
            } else if (column === 'code') {
                // Используем displayCode, если он есть, иначе используем code
                const displayValue = item.displayCode !== undefined ? item.displayCode : item[column];
                cell.textContent = displayValue || '';
            } else if (column === 'name') {
                // Добавляем значок немаркированного товара в начало названия
                const nameContainer = document.createElement('div');
                nameContainer.style.display = 'flex';
                nameContainer.style.alignItems = 'center';
                
                if (isUnmarked) {
                    const markingSpan = document.createElement('span');
                    markingSpan.className = 'marking-indicator';
                    markingSpan.title = 'Товар без маркировки';
                    markingSpan.innerHTML = '<i class="fas fa-tag" style="color: #ff9800; margin-right: 5px;"></i>';
                    nameContainer.appendChild(markingSpan);
                }
                
                const nameText = document.createElement('span');
                nameText.textContent = item[column] || '';
                nameContainer.appendChild(nameText);
                
                cell.appendChild(nameContainer);
            } else if (column === 'difference') {
                const diff = item.difference || 0;
                cell.textContent = diff > 0 ? '+' + diff : diff;
                cell.classList.add('quantity-diff');
                cell.classList.add(diff > 0 ? 'positive' : 'negative');
            } else if (column === 'issue') {
                // Добавляем информацию о проблеме с товаром
                const issueSpan = document.createElement('span');
                issueSpan.className = 'status-indicator status-incomplete';
                issueSpan.innerHTML = `<i class="fas fa-exclamation-circle"></i>${item.issue || 'Неизвестная проблема'}`;
                cell.appendChild(issueSpan);
            } else {
                cell.textContent = item[column] || '';
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
        
        // Добавляем обработчик событий для чекбокса
        const checkboxElement = row.querySelector('.item-checkbox');
        if (checkboxElement) {
            checkboxElement.addEventListener('click', toggleItemChecked);
        }
    });
}

// Функция для обработки клика по чекбоксу
function toggleItemChecked(event) {
    const checkbox = event.currentTarget;
    const code = checkbox.getAttribute('data-code');
    const row = checkbox.closest('tr');
    
    // Переключаем состояние
    if (checkedItems.has(code)) {
        checkbox.classList.remove('checked');
        row.classList.remove('checked-row');
        checkedItems.delete(code);
    } else {
        checkbox.classList.add('checked');
        row.classList.add('checked-row');
        checkedItems.set(code, true);
    }
    
    // Обновляем все представления одной и той же позиции в разных таблицах
    updateCheckedStatusAcrossTables(code);
    
    // Если мы находимся во вкладке ошибок и отметили товар, скрываем его из этой вкладки
    const currentTabName = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    if (currentTabName === 'errors' && checkedItems.has(code)) {
        // Скрываем строку в текущей вкладке после анимации
        row.style.transition = 'opacity 0.3s ease-out';
        row.style.opacity = '0';
        setTimeout(() => {
            // После завершения анимации, обновляем таблицы с сохранением текущей сортировки
            applyFilterAndSort();
        }, 300);
    } else if (currentTabName === 'checked' && !checkedItems.has(code)) {
        // Если мы находимся во вкладке отмеченных и сняли отметку с товара
        row.style.transition = 'opacity 0.3s ease-out';
        row.style.opacity = '0';
        setTimeout(() => {
            // После завершения анимации, обновляем таблицы с сохранением текущей сортировки
            applyFilterAndSort();
        }, 300);
    } else {
        // Для других вкладок просто обновляем счетчики
        if (comparisonResults) {
            updateTabCounters(comparisonResults);
        }
    }
    
    // Сохраняем состояние проверки в localStorage
    saveCheckedItems();
}

// Обновляем статус проверки позиции во всех таблицах
function updateCheckedStatusAcrossTables(code) {
    const allCheckboxes = document.querySelectorAll(`.item-checkbox[data-code="${code}"]`);
    const isChecked = checkedItems.has(code);
    
    allCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        
        if (isChecked) {
            checkbox.classList.add('checked');
            row.classList.add('checked-row');
                    } else {
            checkbox.classList.remove('checked');
            row.classList.remove('checked-row');
        }
    });
}

// Функция для сброса всех проверок
function resetAllChecks() {
    // Очищаем Map с отмеченными позициями
    checkedItems.clear();
    
    // Сбрасываем все чекбоксы и строки
    const allCheckboxes = document.querySelectorAll('.item-checkbox');
    allCheckboxes.forEach(checkbox => {
        checkbox.classList.remove('checked');
        const row = checkbox.closest('tr');
        if (row) {
            row.classList.remove('checked-row');
        }
    });
    
    // Обновляем отображение таблиц с сохранением текущей сортировки
    if (comparisonResults) {
        applyFilterAndSort();
    }
    
    // Сохраняем состояние проверки в localStorage
    saveCheckedItems();
    
    // Показываем уведомление
    showNotification('Сброс проверок', 'Все отметки о проверке сброшены', 'info');
}

// Переопределяем функции сохранения и загрузки, делая их пустыми
function saveCheckedItems() {
    // Функция пуста - не сохраняем отметки
    return;
}

function loadCheckedItems() {
    // Функция пуста - не загружаем отметки
    checkedItems = new Map();
    return;
}

// Функция фильтрации и сортировки результатов
function applyFilterAndSort() {
    if (!comparisonResults) return;
    
    const filterText = filterInput.value.toLowerCase();
    
    // Фильтрация
    const filterResults = (items, tabName = '') => {
        if (!items) return [];
        
        // Сначала фильтруем по тексту поиска
        let filtered = items;
        if (filterText) {
            filtered = items.filter(item => 
                item.code.toLowerCase().includes(filterText) || 
                item.name.toLowerCase().includes(filterText)
            );
        }
        
        // Затем применяем фильтр по маркировке, если он активен
        // Не применяем фильтр к вкладке "Отмеченные" - там всегда должны быть видны все отмеченные товары
        if (hideUnmarkedItems && tabName !== 'checked') {
            filtered = filtered.filter(item => !isProductUnmarked(item));
        }
        
        return filtered;
    };
    
    // Сортировка
    const sortResults = (items, tabName) => {
        if (!items || items.length === 0) return [];
        
        // Копируем массив для сортировки
        let sortedItems = [...items];
        
        // Если это вкладка ошибок, то немаркированные товары всегда в конце
        if (tabName === 'errors') {
            // Разделяем товары на маркированные и немаркированные
            const unmarked = sortedItems.filter(item => isProductUnmarked(item));
            const marked = sortedItems.filter(item => !isProductUnmarked(item));
            
            // Сортируем маркированные товары по выбранному полю
        const { field, direction } = currentSort;
        const multiplier = direction === 'asc' ? 1 : -1;
        
            marked.sort((a, b) => {
                return compareItems(a, b, field, multiplier);
            });
            
            // Сортируем немаркированные товары по выбранному полю (кроме первичной сортировки)
            unmarked.sort((a, b) => {
                return compareItems(a, b, field, multiplier);
            });
            
            // Соединяем массивы: сначала маркированные, затем немаркированные
            return [...marked, ...unmarked];
        } else {
            // Для остальных вкладок используем обычную сортировку
            const { field, direction } = currentSort;
            const multiplier = direction === 'asc' ? 1 : -1;
            
            return sortedItems.sort((a, b) => {
                return compareItems(a, b, field, multiplier);
            });
        }
    };
    
    // Функция сравнения двух элементов для сортировки
    const compareItems = (a, b, field, multiplier) => {
            let valueA, valueB;
            
        if (field === 'checked') {
            // Сортировка по статусу проверки (чекбоксы)
            valueA = checkedItems.has(a.code) ? 1 : 0;
            valueB = checkedItems.has(b.code) ? 1 : 0;
            return (valueA - valueB) * multiplier;
        } else if (field === 'code') {
                valueA = a.code;
                valueB = b.code;
            } else if (field === 'name') {
                valueA = a.name;
                valueB = b.name;
            } else if (field === 'orderQuantity') {
            valueA = a.orderQuantity || 0;
            valueB = b.orderQuantity || 0;
                return (valueA - valueB) * multiplier;
            } else if (field === 'scanQuantity') {
            valueA = a.scanQuantity || 0;
            valueB = b.scanQuantity || 0;
                return (valueA - valueB) * multiplier;
            } else if (field === 'difference') {
                valueA = a.difference || 0;
                valueB = b.difference || 0;
                return (valueA - valueB) * multiplier;
            } else if (field === 'status') {
                valueA = getStatusText(a.status);
                valueB = getStatusText(b.status);
        } else if (field === 'issue') {
            valueA = a.issue || '';
            valueB = b.issue || '';
            } else {
                return 0;
            }
            
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return (valueA - valueB) * multiplier;
            }
            
            return String(valueA).localeCompare(String(valueB)) * multiplier;
    };
    
    // Применяем фильтрацию и сортировку к каждой категории
    const filteredAll = filterResults(comparisonResults.all, 'all');
    const sortedAll = sortResults(filteredAll, 'all');
    fillTable('allTable', sortedAll, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    const filteredScan = filterResults(comparisonResults.scan, 'scan');
    const sortedScan = sortResults(filteredScan, 'scan');
    fillTable('scanTable', sortedScan, ['code', 'name', 'scanQuantity', 'status']);
    
    // Проверяем наличие свойства errors
    const errors = comparisonResults.errors || [];
    const filteredErrors = filterResults(errors.filter(item => !checkedItems.has(item.code)), 'errors');
    const sortedErrors = sortResults(filteredErrors, 'errors');
    fillTable('errorsTable', sortedErrors, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    // Отмеченные позиции с ошибками - всегда показываем вне зависимости от фильтра маркировки
    const checkedProducts = comparisonResults.all.filter(item => 
        checkedItems.has(item.code) && 
        (item.status === 'missing' || item.status === 'extra' || 
         item.status === 'mismatch' || item.status === 'incomplete')
    );
    const filteredChecked = filterResults(checkedProducts, 'checked');
    const sortedChecked = sortResults(filteredChecked, 'checked');
    fillTable('checkedTable', sortedChecked, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    const filteredMissing = filterResults(comparisonResults.missing, 'missing');
    const sortedMissing = sortResults(filteredMissing, 'missing');
    fillTable('missingTable', sortedMissing, ['code', 'name', 'orderQuantity'], 'missing-row');
    
    const filteredExtra = filterResults(comparisonResults.extra, 'extra');
    const sortedExtra = sortResults(filteredExtra, 'extra');
    fillTable('extraTable', sortedExtra, ['code', 'name', 'scanQuantity'], 'extra-row');
    
    const filteredMismatch = filterResults(comparisonResults.mismatch, 'mismatch');
    const sortedMismatch = sortResults(filteredMismatch, 'mismatch');
    fillTable('mismatchTable', sortedMismatch, ['code', 'name', 'orderQuantity', 'scanQuantity', 'difference'], 'mismatch-row');
    
    // Добавляем фильтрацию и сортировку для некорректных товаров
    const filteredIncomplete = filterResults(comparisonResults.incomplete, 'incomplete');
    const sortedIncomplete = sortResults(filteredIncomplete, 'incomplete');
    fillTable('incompleteTable', sortedIncomplete, ['code', 'name', 'scanQuantity', 'issue'], 'incomplete-row');
    
    // Восстанавливаем иконки сортировки
    document.querySelectorAll('.sortable').forEach(header => {
        const field = header.getAttribute('data-field');
        const icon = header.querySelector('i');
        
        if (field === currentSort.field) {
            icon.className = currentSort.direction === 'asc' ? 
                'fas fa-sort-up' : 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
    
    // Обновляем счетчики во вкладках после фильтрации
    updateTabCounters(comparisonResults);
}

// Отображение сводной статистики
function displayStats(results) {
    document.getElementById('orderItems').textContent = results.all.filter(item => item.orderQuantity > 0).length;
    document.getElementById('scanItems').textContent = results.all.filter(item => item.scanQuantity > 0).length;
    document.getElementById('missingItems').textContent = results.missing.length;
    document.getElementById('extraItems').textContent = results.extra.length;
    document.getElementById('quantityMismatches').textContent = results.mismatch.length;
    document.getElementById('incompleteItems').textContent = results.incomplete.length;
    
    // Анимируем числа в статистике
    animateCounters();
}

// Анимация счетчиков в статистике
function animateCounters() {
    const counters = document.querySelectorAll('.stat-value');
    
    counters.forEach(counter => {
        const finalValue = parseInt(counter.textContent);
        const duration = 1000; // Длительность анимации в мс
        const stepTime = 10; // Интервал между шагами анимации
        
        let currentValue = 0;
        const steps = duration / stepTime;
        const increment = finalValue / steps;
        
        const timer = setInterval(() => {
            currentValue += increment;
            
            if (currentValue >= finalValue) {
                counter.textContent = finalValue;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(currentValue);
            }
        }, stepTime);
    });
}

// Получение текстового представления статуса
function getStatusText(status) {
    switch (status) {
        case 'ok': return 'Соответствует';
        case 'missing': return 'Отсутствует';
        case 'extra': return 'Избыточный';
        case 'mismatch': return 'Не соответствует';
        case 'incomplete': return 'Некорректный';
        default: return status;
    }
}

// Добавляем счетчики в заголовки вкладок
function updateTabCounters(results) {
    // Получаем все вкладки
    const allTab = document.querySelector('.tab-btn[data-tab="all"]');
    const scanTab = document.querySelector('.tab-btn[data-tab="scan"]');
    const errorsTab = document.querySelector('.tab-btn[data-tab="errors"]');
    const missingTab = document.querySelector('.tab-btn[data-tab="missing"]');
    const extraTab = document.querySelector('.tab-btn[data-tab="extra"]');
    const mismatchTab = document.querySelector('.tab-btn[data-tab="mismatch"]');
    const incompleteTab = document.querySelector('.tab-btn[data-tab="incomplete"]');
    const checkedTab = document.querySelector('.tab-btn[data-tab="checked"]');
    
    // Проверяем наличие свойства errors перед использованием
    const errorsCount = results.errors ? results.errors.filter(item => !checkedItems.has(item.code)).length : 0;
    const incompleteCount = results.incomplete ? results.incomplete.length : 0;
    
    // Считаем количество всех отмеченных товаров с ошибками 
    // независимо от фильтра маркировки - проверяем только статус и наличие в Map checkedItems
    const checkedErrorsCount = results.all ? results.all.filter(item => 
        checkedItems.has(item.code) && 
        (item.status === 'missing' || item.status === 'extra' || 
         item.status === 'mismatch' || item.status === 'incomplete')
    ).length : 0;
    
    // Обновляем текст вкладок с учетом количества элементов
    allTab.innerHTML = `<i class="fas fa-list"></i> Все товары <span class="tab-counter">${results.all.length}</span>`;
    scanTab.innerHTML = `<i class="fas fa-barcode"></i> Товары в СБИС <span class="tab-counter">${results.scan.length}</span>`;
    errorsTab.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Ошибки <span class="tab-counter">${errorsCount}</span>`;
    missingTab.innerHTML = `<i class="fas fa-times-circle"></i> Отсутствующие <span class="tab-counter">${results.missing.length}</span>`;
    extraTab.innerHTML = `<i class="fas fa-plus-circle"></i> Избыточные <span class="tab-counter">${results.extra.length}</span>`;
    mismatchTab.innerHTML = `<i class="fas fa-exchange-alt"></i> Несоответствия <span class="tab-counter">${results.mismatch.length}</span>`;
    incompleteTab.innerHTML = `<i class="fas fa-exclamation-circle"></i> Некорректные <span class="tab-counter">${incompleteCount}</span>`;
    checkedTab.innerHTML = `<i class="fas fa-check-square"></i> Отмеченные <span class="tab-counter">${checkedErrorsCount}</span>`;
}

// Функция для проверки, содержит ли строка маркировку
function hasMarking(name) {
    if (!name) return false; // Если имя пустое, считаем товар немаркированным
    
    // Проверяем, содержит ли товар информацию об объеме более 200 мл
    const volumeRegex = /(\d+)\s*(?:мл|ml)/i;
    const volumeMatch = name.match(volumeRegex);
    
    if (volumeMatch) {
        const volume = parseInt(volumeMatch[1], 10);
        // Если объем больше 200 мл, считаем его немаркированным, 
        // даже если у него есть обозначение (м)
        if (volume > 200) {
            return false; // Возвращаем false, то есть товар будет считаться немаркированным
        }
    }
    
    // Проверяем наличие (М) в различных вариантах регистра и с пробелами
    const markingRegex = /\(\s*[мМmM]\s*\)/i;
    
    if (markingRegex.test(name)) {
        return true;
    }
    
    // Также проверяем окончания: "м" на конце строки
    const nameLower = name.toLowerCase();
    if (nameLower.endsWith(" м") || 
        nameLower.endsWith(" м.") || 
        nameLower.endsWith(" m") || 
        nameLower.endsWith(" m.")) {
        return true;
    }
    
    return false;
}

// Функция для проверки, является ли товар немаркированным
function isProductUnmarked(product) {
    return !hasMarking(product.name);
}

// Функция сброса загруженных файлов
function resetFiles() {
    // Очищаем глобальные переменные
    orderData = null;
    scanData = null;
    comparisonResults = null;
    orderFile = null;
    scanFile = null;
    
    // Очищаем поле ввода файлов
    fileInput.value = '';
    
    // Очищаем отображение выбранных файлов
    const selectedFilesContainer = document.getElementById('selectedFiles');
    if (selectedFilesContainer) {
        selectedFilesContainer.innerHTML = '';
    }
    
    // Блокируем кнопку анализа
    analyzeBtn.disabled = true;
    analyzeBtn.classList.remove('active-btn');
    
    // Очищаем результаты
    const resultTables = ['allTable', 'scanTable', 'errorsTable', 'missingTable', 'extraTable', 'mismatchTable', 'incompleteTable'];
    resultTables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) table.innerHTML = '';
    });
    
    // Скрываем блок статистики
    statsContainer.style.display = 'none';
    
    // Очищаем счетчики в заголовках вкладок
    const tabsList = ['all', 'scan', 'errors', 'missing', 'extra', 'mismatch', 'incomplete'];
    tabsList.forEach(tabName => {
        const tab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (tab) {
            // Сохраняем иконку
            const icon = tab.querySelector('i').className;
            tab.innerHTML = `<i class="${icon}"></i> ${getTabTitle(tabName)}`;
        }
    });
    
    // Показываем уведомление
    showNotification('Сброс', 'Загруженные файлы сброшены', 'info');
    
    console.log('Загруженные файлы сброшены');
}

// Функция получения текстового заголовка вкладки
function getTabTitle(tabName) {
    switch(tabName) {
        case 'all': return 'Все товары';
        case 'scan': return 'Товары в СБИС';
        case 'errors': return 'Ошибки';
        case 'missing': return 'Отсутствующие';
        case 'extra': return 'Избыточные';
        case 'mismatch': return 'Несоответствия';
        case 'incomplete': return 'Некорректные';
        default: return tabName;
    }
}

// Функция настройки модальных окон
function setupModals() {
    // Настройка модального окна настроек
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = settingsModal.querySelector('.close-modal');
    
    // Настройка модального окна ченджлога
    const changelogBtn = document.getElementById('changelogBtn');
    const changelogModal = document.getElementById('changelogModal');
    
    if (changelogModal && changelogBtn) {
        const closeChangelogBtn = changelogModal.querySelector('.close-modal');
        const closeChangelogMainBtn = document.getElementById('closeChangelog');
        
        // Открытие модального окна ченджлога
        changelogBtn.addEventListener('click', () => {
            changelogModal.style.display = 'flex';
            requestAnimationFrame(() => {
                changelogModal.classList.add('open');
                document.body.classList.add('modal-open');
            });
        });
        
        // Закрытие модального окна ченджлога по кнопке X
        if (closeChangelogBtn) {
            closeChangelogBtn.addEventListener('click', () => {
                changelogModal.classList.remove('open');
                document.body.classList.remove('modal-open');
                setTimeout(() => {
                    changelogModal.style.display = 'none';
                }, 150);
            });
        }
        
        // Закрытие модального окна ченджлога по основной кнопке
        if (closeChangelogMainBtn) {
            closeChangelogMainBtn.addEventListener('click', () => {
                changelogModal.classList.remove('open');
                document.body.classList.remove('modal-open');
                setTimeout(() => {
                    changelogModal.style.display = 'none';
                }, 150);
            });
        }
        
        // Закрытие модального окна ченджлога по клику вне его
        window.addEventListener('click', (e) => {
            if (e.target === changelogModal) {
                changelogModal.classList.remove('open');
                document.body.classList.remove('modal-open');
                setTimeout(() => {
                    changelogModal.style.display = 'none';
                }, 150);
            }
        });
    }
    
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        requestAnimationFrame(() => {
            settingsModal.classList.add('open');
            document.body.classList.add('modal-open');
        });
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('open');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
            settingsModal.style.display = 'none';
        }, 150);
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('open');
            document.body.classList.remove('modal-open');
            setTimeout(() => {
                settingsModal.style.display = 'none';
            }, 150);
        }
    });
}

// Функция настройки руководства пользователя
function setupGuide() {
    // Получаем элементы руководства
    const closeBtn = document.querySelector('#closeGuide');
    const dontShowBtn = document.querySelector('#showNextTimeGuide');
    const guideTabs = document.querySelectorAll('.guide-tab');
    const guideSections = document.querySelectorAll('.guide-section');
    const faqItems = document.querySelectorAll('.faq-item');
    const closeModalBtn = guideModal.querySelector('.close-modal');
    
    // Закрытие руководства
    closeBtn.addEventListener('click', closeGuide);
    closeModalBtn.addEventListener('click', closeGuide);
    
    // Кнопка "Больше не показывать"
    dontShowBtn.addEventListener('click', () => {
        localStorage.setItem('dontShowGuide', 'true');
        closeGuide();
    });
    
    // Переключение вкладок руководства
    guideTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = tab.getAttribute('data-guide-section');
            
            // Убираем активный класс у всех вкладок
            guideTabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');
            
            // Скрываем все секции
            guideSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Показываем выбранную секцию
            const activeSection = document.getElementById(`guide-${sectionId}`);
            if (activeSection) {
                activeSection.classList.add('active');
            }
        });
    });
    
    // Настройка FAQ (раскрывающиеся вопросы)
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
    
    // Закрытие руководства при клике вне его
    window.addEventListener('click', (e) => {
        if (e.target === guideModal) {
            closeGuide();
        }
    });
}

// Функция открытия руководства
function openGuide() {
    guideModal.style.display = 'flex';
    setTimeout(() => {
        guideModal.classList.add('open');
        document.body.classList.add('modal-open');
    }, 10);
    
    // Сбрасываем на первую вкладку
    document.querySelector('.guide-tab').click();
}

// Функция закрытия руководства
function closeGuide() {
    guideModal.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
        guideModal.style.display = 'none';
    }, 150); // Уменьшаем время до 150мс
}

// Функция проверки первого посещения
function checkFirstTimeVisit() {
    const isFirstVisit = localStorage.getItem('firstVisit') !== 'false';
    const dontShowGuide = localStorage.getItem('dontShowGuide') === 'true';
    
    if (isFirstVisit && !dontShowGuide) {
        // Устанавливаем флаг первого посещения
        localStorage.setItem('firstVisit', 'false');
        
        // Показываем руководство с небольшой задержкой
        setTimeout(openGuide, 1000);
    }
}

// Добавляем обработчики сортировки для заголовков таблиц
function addTableHeaderSorting() {
    const headers = document.querySelectorAll('.sortable');
    
    headers.forEach(header => {
        // Удаляем старые обработчики
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        // Добавляем новый обработчик
        newHeader.addEventListener('click', () => {
            const field = newHeader.getAttribute('data-field');
            
            // Меняем направление сортировки, если поле уже выбрано
            if (currentSort.field === field) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.field = field;
                currentSort.direction = 'asc';
            }
            
            // Обновляем иконки сортировки
            headers.forEach(h => {
                const icon = h.querySelector('i');
                
                // Сбрасываем все иконки и атрибуты
                h.removeAttribute('aria-sort');
                
                if (h.getAttribute('data-field') === currentSort.field) {
                    if (currentSort.direction === 'asc') {
                        icon.className = 'fas fa-sort-up';
                        h.setAttribute('aria-sort', 'ascending');
                    } else {
                        icon.className = 'fas fa-sort-down';
                        h.setAttribute('aria-sort', 'descending');
                    }
                } else {
                    icon.className = 'fas fa-sort';
                }
            });
            
            // Применяем сортировку
            applyFilterAndSort();
        });
    });
}

// Функция для отметки/снятия отметки всех видимых немаркированных товаров в активной таблице
function toggleAllUnmarkedItems() {
    if (!comparisonResults) return;

    // Находим все немаркированные товары в результатах
    const allUnmarkedItems = comparisonResults.all.filter(item => isProductUnmarked(item));

    if (allUnmarkedItems.length === 0) {
        showNotification('Отметка товаров', 'В результатах нет товаров без маркировки.', 'info');
        return;
    }

    // Проверяем, все ли из них отмечены
    const allCodes = allUnmarkedItems.map(item => item.code);
    const allAreChecked = allCodes.every(code => checkedItems.has(code));

    let changedCount = 0;
    let notificationMessage = '';
    let notificationType = 'info';

    // Переключаем состояние отметок
    if (allAreChecked) {
        // Если все отмечены - снимаем отметки
        allCodes.forEach(code => {
            if (checkedItems.has(code)) {
                checkedItems.delete(code);
                changedCount++;
            }
        });
        
        if (changedCount > 0) {
            notificationMessage = `Сняты отметки со всех ${changedCount} товаров без маркировки.`;
        }
    } else {
        // Если не все отмечены - отмечаем все
        allCodes.forEach(code => {
            if (!checkedItems.has(code)) {
                checkedItems.set(code, true);
                changedCount++;
            }
        });
        
        if (changedCount > 0) {
            notificationMessage = `Отмечены все ${changedCount} товаров без маркировки.`;
            notificationType = 'success';
        }
    }

    // Обновляем интерфейс, если были изменения
    if (changedCount > 0) {
        // Обновляем визуально все чекбоксы на странице
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            const code = checkbox.getAttribute('data-code');
            const row = checkbox.closest('tr');
            
            if (checkedItems.has(code)) {
                checkbox.classList.add('checked');
                if (row) row.classList.add('checked-row');
                checkbox.setAttribute('title', 'Отменить проверку');
            } else {
                checkbox.classList.remove('checked');
                if (row) row.classList.remove('checked-row');
                checkbox.setAttribute('title', 'Отметить как проверенное');
            }
        });
        
        // Обновляем счетчики и сохраняем
        updateTabCounters(comparisonResults);
        saveCheckedItems();
        showNotification('Отметка товаров', notificationMessage, notificationType);
        applyFilterAndSort(); // Перерисовываем таблицы
    } else {
        showNotification('Отметка товаров', 'Нет товаров без маркировки для изменения статуса отметки.', 'info');
    }
}

// Вспомогательная функция для поиска товара по коду во всех результатах
// Убедимся, что она определена глобально (или переместить ее определение выше, если нужно)
function findProductByCode(code) {
    if (!comparisonResults || !comparisonResults.all) return null;
    return comparisonResults.all.find(item => item.code === code);
}

// Функция для экспорта результатов в Excel
function exportToExcel() {
    if (!comparisonResults) {
        showNotification('Ошибка', 'Нет данных для экспорта. Сначала выполните сравнение файлов.', 'error');
        return;
    }

    try {
        // Создаем новую книгу Excel
        const wb = XLSX.utils.book_new();
        
        // Формируем заголовки таблицы
        const headers = ['МС Код', 'МС Наименование', 'МС Количество', 'СБИС Код', 'СБИС Наименование', 'СБИС Количество', 'Статус'];
        
        // Получаем все товары и сортируем их по МС Наименование (алфавитный порядок)
        let allProducts = [...comparisonResults.all];
        
        // Сортируем по наименованию в алфавитном порядке
        allProducts.sort((a, b) => {
            // Получаем названия товаров, для пустых значений используем пустую строку
            const nameA = a.name || '';
            const nameB = b.name || '';
            
            // Сортируем в алфавитном порядке
            return nameA.localeCompare(nameB);
        });
        
        // Данные для экспорта
        const data = [];
        data.push(headers); // Добавляем заголовки
        
        // Массив для хранения информации о стилях
        const statusStyles = [];
        
        // Добавляем данные о товарах
        allProducts.forEach((product, idx) => {
            // Определяем статус
            let status = getStatusText(product.status);
            let styleType = product.status;
            
            // Если товар отмечен как проверенный и не является соответствующим
            if (checkedItems && checkedItems.has(product.code) && 
                product.status !== 'match' && product.status !== 'ok') {
                status = 'Исправлено';
                styleType = 'fixed';
            }
            
            // Проверяем, является ли товар немаркированным
            const isUnmarked = isProductUnmarked(product);
            if (isUnmarked) {
                styleType = 'unmarked'; // Специальный тип для немаркированных товаров
                // Добавляем информацию о маркировке в статус
                status += ' (без марки)';
            }
            
            // Добавляем строку данных
            data.push([
                product.orderQuantity ? product.code : '',
                product.orderQuantity ? product.name : '',
                product.orderQuantity || '',
                product.scanQuantity ? product.code : '',
                product.scanQuantity ? (product.scanName || product.name) : '',
                product.scanQuantity || '',
                status
            ]);
            
            // Сохраняем информацию о стиле только для ячейки статуса
            statusStyles.push({
                row: idx + 1, // +1 потому что первая строка - заголовки
                type: styleType === 'ok' ? 'match' : styleType
            });
        });
        
        // Создаем лист
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Устанавливаем ширину столбцов
        ws['!cols'] = [
            { width: 15 }, // МС Код
            { width: 40 }, // МС Наименование
            { width: 12 }, // МС Количество
            { width: 15 }, // СБИС Код
            { width: 40 }, // СБИС Наименование
            { width: 12 }, // СБИС Количество
            { width: 20 }  // Статус
        ];
        
        // Добавляем таблицу в книгу
        XLSX.utils.book_append_sheet(wb, ws, 'Результаты сравнения');
        
        // Получаем диапазон данных
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Создаем HTML версию данных для сохранения с цветами
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        html += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Результаты сравнения</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
        html += '<style>';
        html += 'table, td, th { border: 1px solid #ccc; border-collapse: collapse; }';
        html += 'th { background-color: #4b5563; color: white; font-weight: bold; text-align: center; }';
        html += '.match { background-color: #d1e7dd; color: #0a3622; }'; // Светло-зеленый
        html += '.fixed { background-color: #cfe2ff; color: #084298; }'; // Светло-синий
        html += '.missing { background-color: #f8d7da; color: #842029; }'; // Светло-красный
        html += '.extra { background-color: #fff3cd; color: #664d03; }'; // Светло-желтый
        html += '.mismatch { background-color: #ffe6cc; color: #994d00; }'; // Светло-оранжевый
        html += '.incomplete { background-color: #e9ecef; color: #495057; }'; // Светло-серый
        html += '.unmarked { background-color: #9333ea; color: #ffffff; }'; // Фиолетовый для немаркированных товаров
        html += '</style>';
        html += '</head><body>';
        
        html += '<table>';
        
        // Добавляем заголовки
        html += '<tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr>';
        
        // Добавляем данные
        for (let i = 1; i <= range.e.r; i++) {
            html += '<tr>';
            
            for (let j = 0; j <= range.e.c; j++) {
                const cell = XLSX.utils.encode_cell({r: i, c: j});
                const value = ws[cell] ? (ws[cell].v || '') : '';
                
                // Применяем стиль только к ячейке статуса (последняя колонка)
                if (j === 6) { // Индекс колонки "Статус"
                    const style = statusStyles[i - 1] ? statusStyles[i - 1].type : '';
                    html += `<td class="${style}">${value}</td>`;
                } else {
                    html += `<td>${value}</td>`;
                }
            }
            
            html += '</tr>';
        }
        
        html += '</table></body></html>';
        
        // Формируем название файла с текущей датой
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU').replace(/\./g, '_');
        const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '_');
        const fileName = `Сравнение_заказа_${dateStr}_${timeStr}.xls`;
        
        // Сохраняем HTML как XLS файл
        const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        
        // Нажимаем на ссылку, чтобы скачать файл
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Успешно', 'Файл Excel успешно сохранен', 'success');
    } catch (error) {
        console.error('Ошибка при экспорте в Excel:', error);
        showNotification('Ошибка', 'Не удалось экспортировать данные: ' + error.message, 'error');
    }
}

// После инициализации событий добавляем обработчик для кнопки экспорта
document.addEventListener('DOMContentLoaded', function() {
    // ... Существующий код ...
    
    // Добавляем обработчик для кнопки экспорта
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }
}); 

// Функции для работы с обновлениями и ченджлогом
document.addEventListener('DOMContentLoaded', function() {
    // Проверка, запущено ли приложение в Electron
    const isElectron = window.electronAPI !== undefined;
    
    if (isElectron) {
        // Добавляем информацию о версии в модальное окно настроек
        const aboutSection = document.querySelector('.about-section');
        if (aboutSection) {
            const versionNumber = document.getElementById('versionNumber');
            if (versionNumber) {
                // Получаем версию приложения из Electron
                window.electronAPI.getAppVersion().then(version => {
                    versionNumber.textContent = `Версия: ${version}`;
                });
            }
            
            // Добавляем обработчик для кнопки проверки обновлений
            const updateCheckBtn = document.getElementById('updateCheckBtn');
            if (updateCheckBtn) {
                updateCheckBtn.addEventListener('click', checkForUpdates);
            }
        }
        
        // Изменяем поведение кнопки ченджлога
        const changelogBtn = document.getElementById('changelogBtn');
        if (changelogBtn) {
            // Заменяем стандартный обработчик события на наш
            changelogBtn.removeEventListener('click', function() {
                document.getElementById('changelogModal').style.display = 'flex';
            });
            changelogBtn.addEventListener('click', showChangelog);
        }
    }
});

// Функция для проверки обновлений
async function checkForUpdates() {
    if (!window.electronAPI) return;
    
    // Создаем модальное окно из шаблона, если оно еще не существует
    let updateModal = document.getElementById('updateModal');
    if (!updateModal) {
        const template = document.getElementById('updateModalTemplate');
        if (!template) return;
        
        // Клонируем содержимое шаблона
        const modalContent = template.innerHTML;
        updateModal = document.createElement('div');
        updateModal.id = 'updateModal';
        updateModal.className = 'modal';
        updateModal.setAttribute('role', 'dialog');
        updateModal.innerHTML = modalContent;
        document.body.appendChild(updateModal);
        
        // Добавляем обработчики для закрытия модального окна
        const closeButtons = updateModal.querySelectorAll('.close-modal, .close-update-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                updateModal.style.display = 'none';
                
                // Сбрасываем прогресс при закрытии
                const progressBar = document.getElementById('updateProgressBar');
                const progressText = document.getElementById('updateProgressText');
                if (progressBar) progressBar.style.width = '0%';
                if (progressText) progressText.textContent = '0%';
            });
        });
    }
    
    // Показываем модальное окно
    updateModal.style.display = 'flex';
    
    // Получаем элементы интерфейса
    const loadingIndicator = document.getElementById('updateLoadingIndicator');
    const updateResult = document.getElementById('updateResult');
    const updateInfo = document.getElementById('updateInfo');
    const progressBar = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');
    
    // Показываем индикатор загрузки и сбрасываем прогресс
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (updateResult) updateResult.style.display = 'none';
    if (updateInfo) updateInfo.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
    
    // Запускаем имитацию прогресса загрузки
    let progress = 0;
    const progressInterval = setInterval(() => {
        // Увеличиваем прогресс с замедлением на больших значениях
        if (progress < 90) {
            // Быстрое увеличение до 90%
            progress += Math.random() * 5;
        } else {
            // Медленное увеличение после 90%
            progress += Math.random() * 0.5;
        }
        
        // Ограничиваем максимальное значение до 95%
        progress = Math.min(progress, 95);
        
        // Обновляем прогресс-бар и текст
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.round(progress) + '%';
    }, 200);
    
    try {
        // Устанавливаем таймаут для проверки обновлений
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Время ожидания истекло')), 15000)
        );
        
        // Получаем информацию об обновлениях с таймаутом
        const result = await Promise.race([
            window.electronAPI.checkForUpdates(),
            timeoutPromise
        ]);
        
        // Останавливаем имитацию прогресса
        clearInterval(progressInterval);
        
        // Устанавливаем 100% прогресса
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        
        // Небольшая задержка для плавного завершения прогресса
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Скрываем индикатор загрузки
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Показываем результат
        if (updateResult) {
            updateResult.style.display = 'block';
            const messageElement = document.getElementById('updateMessage');
            if (messageElement) {
                messageElement.textContent = result.message || 'Обновления не найдены';
                
                // Добавляем стиль для сообщения в зависимости от наличия обновлений
                if (result.updateAvailable) {
                    messageElement.style.color = 'var(--success-text)';
                    messageElement.innerHTML = '<i class="fas fa-check-circle"></i> ' + messageElement.textContent;
                } else if (result.error) {
                    messageElement.style.color = 'var(--error-text)';
                    messageElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + messageElement.textContent;
                } else {
                    messageElement.style.color = 'var(--text-color)';
                    messageElement.innerHTML = '<i class="fas fa-info-circle"></i> ' + messageElement.textContent;
                }
            }
        }
        
        // Показываем информацию о версии
        const updateInfoDiv = document.getElementById('updateInfo');
        if (updateInfoDiv) {
            updateInfoDiv.style.display = 'block';
            
            // Информация о текущей версии
            const currentVersionInfo = document.getElementById('currentVersionInfo');
            if (currentVersionInfo && result.currentVersion) {
                currentVersionInfo.textContent = result.currentVersion;
            }
            
            // Информация о новой версии
            const newVersionElement = document.querySelector('.new-version-info');
            const newVersionInfo = document.getElementById('newVersionInfo');
            
            if (result.updateAvailable && result.newVersion) {
                if (newVersionElement) newVersionElement.style.display = 'block';
                if (newVersionInfo) newVersionInfo.textContent = result.newVersion;
            } else {
                if (newVersionElement) newVersionElement.style.display = 'none';
            }
            
            // Кнопка установки обновления
            const installBtn = document.getElementById('installUpdateBtn');
            if (installBtn) {
                installBtn.style.display = result.updateAvailable ? 'block' : 'none';
                
                // Добавляем обработчик для кнопки установки обновления
                if (result.updateAvailable) {
                    // Удаляем предыдущие обработчики
                    const newInstallBtn = installBtn.cloneNode(true);
                    installBtn.parentNode.replaceChild(newInstallBtn, installBtn);
                    
                    // Добавляем новый обработчик
                    newInstallBtn.addEventListener('click', () => {
                        window.electronAPI.restartApp();
                    });
                }
            }
            
            // Блок с информацией о изменениях
            const changelogElement = document.getElementById('updateChangelog');
            if (changelogElement) {
                changelogElement.style.display = result.updateAvailable ? 'block' : 'none';
                
                // Если есть обновление, загружаем changelog
                if (result.updateAvailable) {
                    try {
                        const changelogResult = await window.electronAPI.getChangelog();
                        if (changelogResult.success) {
                            // Парсим ченджлог и находим только информацию о новой версии
                            const lines = changelogResult.content.split('\n');
                            let newVersionChangelog = '<h5>Что нового:</h5><ul>';
                            let foundNewVersion = false;
                            let inNewVersionSection = false;
                            
                            for (const line of lines) {
                                if (line.includes(`## [${result.newVersion}]`)) {
                                    foundNewVersion = true;
                                    inNewVersionSection = true;
                                } else if (line.startsWith('## [') && inNewVersionSection) {
                                    inNewVersionSection = false;
                                    break;
                                }
                                
                                if (inNewVersionSection && line.startsWith('- ')) {
                                    // Преобразуем строку ченджлога в HTML
                                    const cleanedLine = line.substring(2).replace(/\*\*(.*?):\*\*/g, '<strong>$1:</strong>');
                                    newVersionChangelog += `<li>${cleanedLine}</li>`;
                                }
                            }
                            
                            newVersionChangelog += '</ul>';
                            
                            if (foundNewVersion) {
                                changelogElement.innerHTML = newVersionChangelog;
                            } else {
                                changelogElement.innerHTML = '<p>Подробная информация о новой версии недоступна.</p>';
                            }
                        } else {
                            changelogElement.innerHTML = '<p>Не удалось загрузить информацию об изменениях.</p>';
                        }
                    } catch (error) {
                        console.error('Ошибка при получении ченджлога:', error);
                        changelogElement.innerHTML = '<p>Ошибка при загрузке изменений.</p>';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке обновлений:', error);
        
        // Останавливаем имитацию прогресса
        clearInterval(progressInterval);
        
        // Устанавливаем 100% прогресса перед показом ошибки
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        
        // Небольшая задержка для отображения завершенного прогресса
        setTimeout(() => {
            // Скрываем индикатор загрузки
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Показываем сообщение об ошибке
            if (updateResult) {
                updateResult.style.display = 'block';
                const messageElement = document.getElementById('updateMessage');
                if (messageElement) {
                    messageElement.textContent = `Ошибка при проверке обновлений: ${error.message}`;
                    messageElement.style.color = 'var(--error-text)';
                    messageElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + messageElement.textContent;
                }
            }
            
            // Показываем информацию о текущей версии, несмотря на ошибку
            const updateInfoDiv = document.getElementById('updateInfo');
            if (updateInfoDiv) {
                updateInfoDiv.style.display = 'block';
                
                // Скрываем элементы, связанные с обновлением
                const newVersionElement = document.querySelector('.new-version-info');
                if (newVersionElement) newVersionElement.style.display = 'none';
                
                const installBtn = document.getElementById('installUpdateBtn');
                if (installBtn) installBtn.style.display = 'none';
                
                const changelogElement = document.getElementById('updateChangelog');
                if (changelogElement) changelogElement.style.display = 'none';
                
                // Получаем и отображаем текущую версию
                window.electronAPI.getAppVersion().then(version => {
                    const currentVersionInfo = document.getElementById('currentVersionInfo');
                    if (currentVersionInfo) currentVersionInfo.textContent = version;
                }).catch(err => {
                    console.error('Ошибка при получении версии:', err);
                });
            }
        }, 300);
    }
}

// Функция для отображения ченджлога из файла
async function showChangelog() {
    if (!window.electronAPI) {
        // Если Electron API недоступен, используем стандартное поведение
        const changelogModal = document.getElementById('changelogModal');
        if (changelogModal) {
            changelogModal.style.display = 'flex';
        }
        return;
    }
    
    try {
        // Показываем модальное окно ченджлога сразу для предотвращения задержки
        const changelogModal = document.getElementById('changelogModal');
        if (changelogModal) {
            changelogModal.style.display = 'flex';
            
            // Добавляем индикатор загрузки в тело ченджлога, если содержимое пустое
            const changelogBody = changelogModal.querySelector('.changelog-body');
            if (changelogBody && !changelogBody.innerHTML.trim()) {
                changelogBody.innerHTML = `
                    <div class="changelog-loading" style="text-align: center; padding: 30px 0;">
                        <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                        <p>Загрузка истории изменений...</p>
                    </div>
                `;
            }
            
            // Получаем содержимое ченджлога асинхронно
            const result = await window.electronAPI.getChangelog();
            
            if (result.success && changelogBody) {
                // Парсим содержимое ченджлога Markdown в HTML
                const parsedChangelog = parseChangelog(result.content);
                changelogBody.innerHTML = parsedChangelog;
            } else if (changelogBody) {
                console.error('Ошибка при получении ченджлога:', result.message);
                changelogBody.innerHTML = `
                    <div class="changelog-error" style="text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--error-text); margin-bottom: 15px;"></i>
                        <p>Не удалось загрузить историю изменений.</p>
                        <p>${result.message || 'Попробуйте позже.'}</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Ошибка при обработке ченджлога:', error);
        
        // В случае ошибки отображаем сообщение
        const changelogModal = document.getElementById('changelogModal');
        if (changelogModal) {
            const changelogBody = changelogModal.querySelector('.changelog-body');
            if (changelogBody) {
                changelogBody.innerHTML = `
                    <div class="changelog-error" style="text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--error-text); margin-bottom: 15px;"></i>
                        <p>Произошла ошибка при загрузке истории изменений.</p>
                        <p>${error.message || 'Попробуйте позже.'}</p>
                    </div>
                `;
            }
        }
    }
}

// Добавляем обработчик для кнопки "История изменений" при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Для кнопки в настройках
    const changelogBtn = document.getElementById('changelogBtn');
    if (changelogBtn) {
        // Сначала удаляем стандартный обработчик
        const newChangelogBtn = changelogBtn.cloneNode(true);
        changelogBtn.parentNode.replaceChild(newChangelogBtn, changelogBtn);
        
        // Добавляем наш обработчик
        newChangelogBtn.addEventListener('click', showChangelog);
    }
}); 

// Простой парсер для преобразования Markdown ченджлога в HTML
function parseChangelog(markdown) {
    // Разбиваем на строки
    const lines = markdown.split('\n');
    let html = '';
    let inVersionBlock = false;
    
    for (const line of lines) {
        if (line.startsWith('# ')) {
            // Заголовок 1 уровня (название ченджлога)
            html += `<h3>${line.substring(2)}</h3>`;
        } else if (line.startsWith('## [')) {
            // Заголовок 2 уровня (версия)
            // Формат: ## [1.0.0] - 2023-05-15
            const versionMatch = line.match(/## \[([\d\.]+)\] - ([\d-]+)/);
            if (versionMatch) {
                if (inVersionBlock) {
                    html += '</ul></div>';
                }
                html += `<div class="changelog-entry">
                    <div class="version-header">
                        <h4>Версия ${versionMatch[1]}</h4>
                        <span class="version-date">${versionMatch[2]}</span>
                    </div>
                    <ul class="changelog-list">`;
                inVersionBlock = true;
            } else {
                html += `<h4>${line.substring(3)}</h4>`;
            }
        } else if (line.startsWith('- **')) {
            // Пункт списка с выделением
            // Формат: - **Новое:** Текст изменения
            const typeMatch = line.match(/- \*\*(.*?):\*\* (.*)/);
            if (typeMatch) {
                const type = typeMatch[1];
                const content = typeMatch[2];
                let tagClass = 'feature-tag';
                
                if (type.includes('Улучшение')) {
                    tagClass = 'improvement-tag';
                } else if (type.includes('Исправлено')) {
                    tagClass = 'fix-tag';
                }
                
                html += `<li><span class="${tagClass}">${type}</span> ${content}</li>`;
            } else {
                html += `<li>${line.substring(2)}</li>`;
            }
        } else if (line.startsWith('- ')) {
            // Обычный пункт списка (дефис + пробел)
            html += `<li>${line.substring(2)}</li>`;
        } else if (line.startsWith('-')) {
            // Строка, начинающаяся с дефиса, но без пробела после (не пункт списка)
            html += `<p>${line}</p>`;
        } else if (line.trim() === '') {
            // Пустая строка
            html += '<br>';
        } else {
            // Обычный текст
            html += `<p>${line}</p>`;
        }
    }
    
    if (inVersionBlock) {
        html += '</ul></div>';
    }
    
    return html;
}

// --- Новая логика обновлений --- 

document.addEventListener('DOMContentLoaded', function() {
    if (window.electronAPI) {
        setupUpdateHandlers();
        initializeUpdateSection();
        setupNotificationBar();
        // setupDevTestButtons(); // <--- Удаляем вызов
    }
});

function setupUpdateHandlers() {
    const checkBtn = document.getElementById('updateCheckBtnNew');
    const installBtn = document.getElementById('installUpdateBtnNew');

    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            window.electronAPI.checkUpdates();
            // Блокируем кнопку на время проверки
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
        });
    }

    if (installBtn) {
        installBtn.addEventListener('click', () => {
            window.electronAPI.installUpdate();
            // Показываем сообщение о перезапуске
            updateStatusUI({ state: 'installing' }); 
        });
    }

    // Сначала удаляем старые слушатели, если они были
    window.electronAPI.removeUpdateListeners(); 
    // Добавляем слушатель для обновления статуса
    window.electronAPI.onUpdateStatus(updateStatusUI);
}

function initializeUpdateSection() {
    // Получаем текущую версию при загрузке
    window.electronAPI.getAppVersion().then(version => {
        const versionNumber = document.getElementById('versionNumber');
        if (versionNumber) {
            versionNumber.textContent = `Версия: ${version}`;
        }
    }).catch(err => {
        console.error('Error getting app version:', err);
        const versionNumber = document.getElementById('versionNumber');
        if (versionNumber) {
            versionNumber.textContent = 'Версия: Н/Д';
        }
    });
    // Устанавливаем начальный статус
    updateStatusUI({ state: 'idle' }); 
}

// --- НОВОЕ: Управление плашкой уведомления --- 
let isUpdateDownloaded = false; // Флаг для отслеживания статуса

function setupNotificationBar() {
    const bar = document.getElementById('updateNotificationBar');
    const installBtn = document.getElementById('updateNotificationInstallBtn');
    const settingsBtn = document.getElementById('updateNotificationSettingsBtn');
    const closeBtn = document.getElementById('updateNotificationCloseBtn');

    if (!bar || !installBtn || !settingsBtn || !closeBtn) return;

    installBtn.addEventListener('click', () => {
        window.electronAPI.installUpdate();
    });

    settingsBtn.addEventListener('click', () => {
        openSettingsModal(); // Открываем настройки
        bar.style.display = 'none'; // Скрываем плашку при переходе
    });

    closeBtn.addEventListener('click', () => {
        bar.style.display = 'none';
    });
}

function showUpdateNotification(status) {
    const bar = document.getElementById('updateNotificationBar');
    const text = document.getElementById('updateNotificationText');
    const installBtn = document.getElementById('updateNotificationInstallBtn');
    const settingsBtn = document.getElementById('updateNotificationSettingsBtn');

    if (!bar || !text || !installBtn || !settingsBtn) return;

    bar.style.backgroundColor = '#2ecc71'; // Зеленый по умолчанию
    installBtn.style.display = 'none';
    settingsBtn.style.display = 'inline-flex';

    if (status.state === 'available' || status.state === 'downloading') {
        text.innerHTML = `<i class="fas fa-download"></i> Доступно обновление ${status.version}. Загрузка...`;
        bar.style.display = 'flex';
    } else if (status.state === 'downloaded') {
        text.innerHTML = `<i class="fas fa-check-circle"></i> Обновление ${status.version} готово к установке.`;
        installBtn.style.display = 'inline-flex';
        bar.style.display = 'flex';
        isUpdateDownloaded = true; // Устанавливаем флаг
    } else if (status.state === 'error') {
         text.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Ошибка обновления: ${status.message || 'Неизвестная ошибка'}`;
         bar.style.backgroundColor = '#e74c3c'; // Красный для ошибки
         settingsBtn.style.display = 'none'; // Скрываем кнопку настроек при ошибке
         bar.style.display = 'flex';
    } else {
        bar.style.display = 'none'; // Скрываем для других статусов
    }
}
// -------------------------------------------

function updateStatusUI(status) {
    const statusTextElement = document.getElementById('updateStatus');
    const checkBtn = document.getElementById('updateCheckBtnNew');
    const installBtn = document.getElementById('installUpdateBtnNew');
    const progressContainer = document.querySelector('.update-progress');
    const progressBarInner = document.getElementById('updateProgressBarInner'); // <--- Используем внутренний div
    const progressText = document.getElementById('updateProgressText');

    // --- НОВОЕ: Показываем уведомление --- 
    // Не показываем плашку если статус 'idle', 'checking', 'not-available', 'not-available-dev'
    // или если обновление уже скачано (чтобы не дублировать кнопку установки)
    if (status.state !== 'idle' && 
        status.state !== 'checking' && 
        status.state !== 'not-available' && 
        status.state !== 'not-available-dev' && 
        !isUpdateDownloaded) {
        showUpdateNotification(status);
    }
    // Сбрасываем флаг, если статус изменился с downloaded
    if (status.state !== 'downloaded') {
        isUpdateDownloaded = false;
    }
    // ----------------------------------

    if (!statusTextElement || !checkBtn || !installBtn || !progressContainer || !progressBarInner || !progressText) {
        console.error('Update UI elements not found!');
        return;
    }

    // Сбрасываем состояние кнопок
    checkBtn.disabled = false;
    checkBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Проверить';
    checkBtn.style.display = 'inline-flex'; // Показываем по умолчанию
    installBtn.style.display = 'none';
    progressContainer.style.display = 'none';
    progressBarInner.style.width = '0%'; // <--- Сбрасываем внутренний div
    progressText.textContent = '0%';

    let statusHTML = '';
    switch (status.state) {
        case 'idle':
            statusHTML = '<i class="fas fa-info-circle"></i> Нажмите кнопку для проверки...';
            break;
        case 'checking':
            statusHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка наличия обновлений...';
            checkBtn.disabled = true; 
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Проверка...';
            break;
        case 'available':
            statusHTML = `<i class="fas fa-download"></i> Доступно обновление: ${status.version}. Загрузка...`;
            checkBtn.disabled = true; 
            break;
        case 'not-available':
            statusHTML = '<i class="fas fa-check-circle"></i> У вас установлена последняя версия.';
            break;
        case 'not-available-dev':
             statusHTML = '<i class="fas fa-laptop-code"></i> Обновления недоступны в режиме разработки.';
             checkBtn.disabled = true;
            break;
        case 'downloading':
            statusHTML = `<i class="fas fa-download"></i> Загрузка обновления: ${status.version}...`;
            progressContainer.style.display = 'flex';
            const percent = status.progress ? Math.round(status.progress) : 0;
            progressBarInner.style.width = `${percent}%`; // <--- Обновляем внутренний div
            progressText.textContent = `${percent}%`;
            checkBtn.disabled = true; 
            break;
        case 'downloaded':
            statusHTML = `<i class="fas fa-check-circle"></i> Обновление ${status.version} готово к установке.`;
            installBtn.style.display = 'inline-flex';
            checkBtn.style.display = 'none'; 
            break;
        case 'installing': 
             statusHTML = '<i class="fas fa-spinner fa-spin"></i> Установка обновления и перезапуск...';
             checkBtn.disabled = true;
             checkBtn.style.display = 'none'; 
             installBtn.disabled = true;
             installBtn.style.display = 'inline-flex';
             installBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Установка...';
             break;
        case 'error':
            statusHTML = `<i class="fas fa-exclamation-triangle"></i> Ошибка обновления: ${status.message || 'Неизвестная ошибка'}`;
            break;
        default:
            statusHTML = '<i class="fas fa-question-circle"></i> Неизвестный статус.';
            break;
    }
    statusTextElement.innerHTML = statusHTML;
}

// --- Удаляем всю функцию setupDevTestButtons --- 
/*
function setupDevTestButtons() {
    // ... весь код функции ...
}
*/
// -------------------------------------------------------

// --- Конец новой логики обновлений ---

// Функция для переключения отметок всех немаркированных товаров во всех вкладках
function toggleAllUnmarkedItems() {
    if (!comparisonResults) return;

    // Находим все немаркированные товары в результатах
    const allUnmarkedItems = comparisonResults.all.filter(item => isProductUnmarked(item));

    if (allUnmarkedItems.length === 0) {
        showNotification('Отметка товаров', 'В результатах нет товаров без маркировки.', 'info');
        return;
    }

    // Проверяем, все ли из них отмечены
    const allCodes = allUnmarkedItems.map(item => item.code);
    const allAreChecked = allCodes.every(code => checkedItems.has(code));

    let changedCount = 0;
    let notificationMessage = '';
    let notificationType = 'info';

    // Переключаем состояние отметок
    if (allAreChecked) {
        // Если все отмечены - снимаем отметки
        allCodes.forEach(code => {
            if (checkedItems.has(code)) {
                checkedItems.delete(code);
                changedCount++;
            }
        });
        
        if (changedCount > 0) {
            notificationMessage = `Сняты отметки со всех ${changedCount} товаров без маркировки.`;
        }
    } else {
        // Если не все отмечены - отмечаем все
        allCodes.forEach(code => {
            if (!checkedItems.has(code)) {
                checkedItems.set(code, true);
                changedCount++;
            }
        });
        
        if (changedCount > 0) {
            notificationMessage = `Отмечены все ${changedCount} товаров без маркировки.`;
            notificationType = 'success';
        }
    }

    // Обновляем интерфейс, если были изменения
    if (changedCount > 0) {
        // Обновляем визуально все чекбоксы на странице
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            const code = checkbox.getAttribute('data-code');
            const row = checkbox.closest('tr');
            
            if (checkedItems.has(code)) {
                checkbox.classList.add('checked');
                if (row) row.classList.add('checked-row');
                checkbox.setAttribute('title', 'Отменить проверку');
            } else {
                checkbox.classList.remove('checked');
                if (row) row.classList.remove('checked-row');
                checkbox.setAttribute('title', 'Отметить как проверенное');
            }
        });
        
        // Обновляем счетчики и сохраняем
        updateTabCounters(comparisonResults);
        saveCheckedItems();
        showNotification('Отметка товаров', notificationMessage, notificationType);
        applyFilterAndSort(); // Перерисовываем таблицы
    } else {
        showNotification('Отметка товаров', 'Нет товаров без маркировки для изменения статуса отметки.', 'info');
    }
}