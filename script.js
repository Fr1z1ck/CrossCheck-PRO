// Глобальные переменные для хранения данных
let orderData = null;  // Данные заказа МС
let scanData = null;   // Данные сканирования СБИС
let kassaTextData = null; // Данные из текстового поля КАССЫ
let comparisonResults = null;  // Результаты сравнения
let orderFile = null;  // Файл заказа
let scanFile = null;   // Файл сканирования
let currentTheme = 'classic';  // Текущая тема
let currentSort = { field: 'code', direction: 'asc' }; // Текущая сортировка
let currentFontSize = 100;  // Текущий размер шрифта в процентах
let currentUIScale = 100;   // Текущий масштаб интерфейса в процентах
let hideUnmarkedItems = false; // Флаг для скрытия/показа немаркированных товаров
let currentOrderHash = null; // Хеш текущего заказа
let currentMode = 'sbis'; // Текущий режим работы: 'sbis' или 'kassa'

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
    
    // Обработчики для переключателей режимов
    const sbisModeBtn = document.getElementById('sbisModeBtn');
    const kassaModeBtn = document.getElementById('kassaModeBtn');
    const kassaTextInputContainer = document.getElementById('kassaTextInputContainer');
    const fileLabel = document.getElementById('fileLabel');
    const fileHint = document.getElementById('fileHint');
    
    if (sbisModeBtn && kassaModeBtn) {
        sbisModeBtn.addEventListener('click', () => {
            if (currentMode !== 'sbis') {
                // Переключаем режим
                currentMode = 'sbis';
                sbisModeBtn.classList.add('active');
                kassaModeBtn.classList.remove('active');
                
                // Скрываем поле для текста
                if (kassaTextInputContainer) {
                    kassaTextInputContainer.style.display = 'none';
                }
                
                // Обновляем текст и настройки для режима СБИС
                if (fileLabel) {
                    fileLabel.textContent = 'Выберите файлы для сравнения';
                }
                
                if (fileHint) {
                    fileHint.innerHTML = 'Перетащите файлы в эту область или нажмите кнопку ниже для выбора через диалог<br><small>(заказ МС и сканирование СБИС)</small><br><small class="file-format-hint">Поддерживаемые форматы: Excel (.xls, .xlsx)</small>';
                }
                
                // Обновляем настройки для выбора нескольких файлов
                fileInput.setAttribute('multiple', 'multiple');
                
                // Сбрасываем данные
                resetFiles();
                
                // Обновляем заголовок вкладки со сканированием
                updateScanTabLabel('СБИС');
            }
        });
        
        kassaModeBtn.addEventListener('click', () => {
            if (currentMode !== 'kassa') {
                // Переключаем режим
                currentMode = 'kassa';
                kassaModeBtn.classList.add('active');
                sbisModeBtn.classList.remove('active');
                
                // Показываем поле для текста
                if (kassaTextInputContainer) {
                    kassaTextInputContainer.style.display = 'block';
                }
                
                // Обновляем текст и настройки для режима КАССА
                if (fileLabel) {
                    fileLabel.textContent = 'Выберите файл Excel заказа МС';
                }
                
                if (fileHint) {
                    fileHint.innerHTML = 'Перетащите файл в эту область или нажмите кнопку ниже для выбора через диалог<br><small>(только заказ МС)</small><br><small class="file-format-hint">Поддерживаемые форматы: Excel (.xls, .xlsx)</small>';
                }
                
                // Отображаем шаги для режима КАССА
                const fileSteps = document.querySelector('.file-steps');
                if (fileSteps) {
                    fileSteps.style.display = 'flex';
                }
                
                // Обновляем настройки для выбора одного файла
                fileInput.removeAttribute('multiple');
                
                // Сбрасываем данные
                resetFiles();
                
                // Очищаем поле текста кассы
                const kassaTextInput = document.getElementById('kassaTextInput');
                if (kassaTextInput) {
                    kassaTextInput.value = '';
                }
                
                // Обновляем заголовок вкладки со сканированием
                updateScanTabLabel('КАССЕ');
            }
        });
        
        // Скрываем шаги при запуске в режиме СБИС
        if (currentMode === 'sbis') {
            const fileSteps = document.querySelector('.file-steps');
            if (fileSteps) {
                fileSteps.style.display = 'none';
            }
        }
        
        sbisModeBtn.addEventListener('click', () => {
            if (currentMode !== 'sbis') {
                // Переключаем режим
                currentMode = 'sbis';
                sbisModeBtn.classList.add('active');
                kassaModeBtn.classList.remove('active');
                
                // Скрываем поле для текста
                if (kassaTextInputContainer) {
                    kassaTextInputContainer.style.display = 'none';
                }
                
                // Скрываем шаги для режима СБИС
                const fileSteps = document.querySelector('.file-steps');
                if (fileSteps) {
                    fileSteps.style.display = 'none';
                }
                
                // Обновляем текст и настройки для режима СБИС
                if (fileLabel) {
                    fileLabel.textContent = 'Выберите файлы для сравнения';
                }
                
                if (fileHint) {
                    fileHint.innerHTML = 'Перетащите файлы в эту область или нажмите кнопку ниже для выбора через диалог<br><small>(заказ МС и сканирование СБИС)</small><br><small class="file-format-hint">Поддерживаемые форматы: Excel (.xls, .xlsx)</small>';
                }
                
                // Обновляем настройки для выбора нескольких файлов
                fileInput.setAttribute('multiple', 'multiple');
                
                // Сбрасываем данные
                resetFiles();
                
                // Обновляем заголовок вкладки со сканированием
                updateScanTabLabel('СБИС');
            }
        });
    }

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

    // Обработчик для кнопки вставки из буфера обмена
    const pasteBtnKassa = document.getElementById('pasteBtnKassa');
    if (pasteBtnKassa) {
        pasteBtnKassa.addEventListener('click', async () => {
            try {
                const kassaTextInput = document.getElementById('kassaTextInput');
                if (kassaTextInput) {
                    // Запрашиваем доступ к буферу обмена
                    const text = await navigator.clipboard.readText();
                    kassaTextInput.value = text;
                    kassaTextInput.focus();
                    
                    // Генерируем событие input для активации кнопки анализа
                    kassaTextInput.dispatchEvent(new Event('input'));
                    
                    // Показываем уведомление
                    showNotification('Вставлено', 'Текст успешно вставлен из буфера обмена', 'success');
                }
            } catch (err) {
                console.error('Не удалось получить доступ к буферу обмена:', err);
                showNotification('Ошибка', 'Не удалось получить доступ к буферу обмена', 'error');
            }
        });
    }
}

// Вспомогательная функция для обновления заголовка вкладки сканирования
function updateScanTabLabel(type) {
    const scanTab = document.querySelector('.tab-btn[data-tab="scan"]');
    if (scanTab) {
        const icon = '<i class="fas fa-barcode"></i>';
        let count = '';
        const countSpan = scanTab.querySelector('.tab-counter');
        if (countSpan) {
            count = ` <span class="tab-counter">${countSpan.textContent}</span>`;
        }
        
        // Обновляем также заголовок в самой таблице
        const scanTableHeader = document.querySelector('#scanTab table thead tr th:nth-child(5)');
        if (scanTableHeader) {
            scanTableHeader.textContent = `Кол-во в ${type}`;
            scanTableHeader.setAttribute('title', `Нажмите для сортировки по количеству в ${type}`);
        }
        
        // Обновляем заголовки в остальных таблицах
        const allTableHeader = document.querySelector('#allTab table thead tr th:nth-child(5)');
        if (allTableHeader) {
            allTableHeader.textContent = `Кол-во в ${type}`;
            allTableHeader.setAttribute('title', `Нажмите для сортировки по количеству в ${type}`);
        }
        
        const errorsTableHeader = document.querySelector('#errorsTab table thead tr th:nth-child(5)');
        if (errorsTableHeader) {
            errorsTableHeader.textContent = `Кол-во в ${type}`;
            errorsTableHeader.setAttribute('title', `Нажмите для сортировки по количеству в ${type}`);
        }
        
        const mismatchTableHeader = document.querySelector('#mismatchTab table thead tr th:nth-child(5)');
        if (mismatchTableHeader) {
            mismatchTableHeader.textContent = `Кол-во в ${type}`;
            mismatchTableHeader.setAttribute('title', `Нажмите для сортировки по количеству в ${type}`);
        }
        
        const checkedTableHeader = document.querySelector('#checkedTab table thead tr th:nth-child(5)');
        if (checkedTableHeader) {
            checkedTableHeader.textContent = `Кол-во в ${type}`;
            checkedTableHeader.setAttribute('title', `Нажмите для сортировки по количеству в ${type}`);
        }
        
        // Обновляем также заголовок в блоке статистики
        const scanItemsLabel = document.querySelector('.stats-grid .stat-item:nth-child(2) .stat-label');
        if (scanItemsLabel) {
            scanItemsLabel.textContent = `Товаров в ${type}`;
        }
        
        scanTab.innerHTML = `${icon} Товары в ${type}${count}`;
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
    kassaTextData = null;
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
    
    if (currentMode === 'sbis') {
        // Стандартный режим СБИС - ищем файлы заказа и сканирования
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
    } else if (currentMode === 'kassa') {
        // Режим КАССА - нужен только файл заказа и текст из поля
        orderFile = files[0]; // Берем первый (и единственный) файл как заказ
        
        // Получаем текст из поля ввода
        const kassaTextInput = document.getElementById('kassaTextInput');
        kassaTextData = kassaTextInput ? kassaTextInput.value.trim() : '';
        
        // Разблокируем кнопку, если загружен файл и есть текст
        analyzeBtn.disabled = !(orderFile && kassaTextData);
        
        // Обновляем состояние кнопки при изменении текста в поле
        if (kassaTextInput) {
            kassaTextInput.addEventListener('input', function() {
                kassaTextData = this.value.trim();
                analyzeBtn.disabled = !(orderFile && kassaTextData);
                
                // Добавляем подсветку кнопки, если она активна
                if (!analyzeBtn.disabled) {
                    analyzeBtn.classList.add('active-btn');
                } else {
                    analyzeBtn.classList.remove('active-btn');
                }
            });
        }
        
        // Добавляем особое отображение для выбранного файла заказа в режиме КАССА
        if (orderFile) {
            const selectedFilesContainer = document.getElementById('selectedFiles');
            if (selectedFilesContainer) {
                // Добавляем информацию о выбранном файле заказа с дополнительными индикаторами
                const fileElement = document.createElement('div');
                fileElement.className = 'kassa-selected-file';
                
                // Создаем индикатор для следующего шага (вставить текст из кассы)
                const nextStepIndicator = document.createElement('div');
                nextStepIndicator.className = 'next-step-indicator';
                nextStepIndicator.innerHTML = `
                    <i class="fas fa-clipboard-check"></i>
                    <span>Файл выбран. Теперь вставьте текст из кассы →</span>
                `;
                
                fileElement.innerHTML = `
                    <i class="fas fa-file-excel"></i>
                    <div class="file-info">
                        <div class="file-name" title="${orderFile.name}">${orderFile.name}</div>
                        <div class="file-meta">Заказ МС, ${formatFileSize(orderFile.size)}</div>
                    </div>
                `;
                
                selectedFilesContainer.innerHTML = '';
                selectedFilesContainer.appendChild(fileElement);
                selectedFilesContainer.appendChild(nextStepIndicator);
                
                // Прокручиваем к текстовому полю
                const kassaTextInputContainer = document.getElementById('kassaTextInputContainer');
                if (kassaTextInputContainer) {
                    // Небольшая задержка для анимации
                    setTimeout(() => {
                        kassaTextInputContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Устанавливаем фокус на текстовое поле
                        if (kassaTextInput) {
                            kassaTextInput.focus();
                        }
                    }, 300);
                }
            }
        }
    }
    
    // Добавляем подсветку кнопки, если она активна
    if (!analyzeBtn.disabled) {
        analyzeBtn.classList.add('active-btn');
    } else {
        analyzeBtn.classList.remove('active-btn');
    }
}

// Функция форматирования размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        
        if (currentMode === 'sbis') {
            // Режим СБИС
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
            
            // Сравнение товаров по коду (стандартный режим)
            console.log('Сравнение товаров...');
            comparisonResults = compareProducts(orderItems, scanItems);
        } else if (currentMode === 'kassa') {
            // Режим КАССА
            console.log(`Файл заказа: ${orderFile.name}`);
            console.log('Текст кассы доступен: ' + (kassaTextData && kassaTextData.length > 0));
            
            // Показываем уведомление о начале анализа
            showNotification('Анализ', 'Начинаем сравнение данных в режиме "КАССА"...', 'info');
            
            // Обновляем текст кассы на случай, если он изменился
            const kassaTextInput = document.getElementById('kassaTextInput');
            if (kassaTextInput) {
                kassaTextData = kassaTextInput.value.trim();
            }
            
            // Чтение данных из файла заказа
            orderData = await readExcelFile(orderFile);
            
            // Извлечение товаров из данных файла
            console.log('Извлечение товаров из файла МС...');
            const orderItems = extractProductsFromMS(orderData);
            console.log(`Извлечено ${orderItems.length} товаров из файла МС`);
            
            // Извлечение товаров из текста кассы
            console.log('Извлечение товаров из текста кассы...');
            const kassaItems = extractProductsFromKassaText(kassaTextData);
            console.log(`Извлечено ${kassaItems.length} товаров из текста кассы`);
            
            // Сравнение товаров по названию (режим КАССА)
            console.log('Сравнение товаров по названию...');
            comparisonResults = compareProductsByName(orderItems, kassaItems);
        }
        
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
        showNotification('Успех', 'Анализ файлов успешно завершен', 'success');
        
    } catch (error) {
        console.error('Ошибка при анализе файлов:', error);
        
        // Показываем уведомление об ошибке
        showNotification('Ошибка', `Произошла ошибка при анализе файлов: ${error.message}`, 'error');
    } finally {
        // Разблокируем кнопку анализа и восстанавливаем ее текст
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> <span>Сравнить файлы</span>';
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
    // Проверяем наличие всех необходимых массивов
    results.all = results.all || [];
    results.scan = results.scan || [];
    results.errors = results.errors || [];
    results.missing = results.missing || [];
    results.extra = results.extra || [];
    results.mismatch = results.mismatch || [];
    results.incomplete = results.incomplete || [];
    
    // Добавляем класс к таблице ошибок для управления видимостью немаркированных товаров
    const errorsTab = document.getElementById('errorsTab');
    if (errorsTab) {
        errorsTab.classList.toggle('hide-unmarked', hideUnmarkedItems);
    }
    
    // Заполняем таблицу всех товаров
    fillTable('allTable', results.all, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
    // Заполняем таблицу товаров из СБИС/Кассы
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
    
    if (!items || items.length === 0) {
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
        let isChecked;
        let itemIdentifier;
        
        if (currentMode === 'kassa' && !item.code) {
            // В режиме КАССА используем название как идентификатор
            itemIdentifier = item.originalName || item.name;
            isChecked = checkedItems.has(itemIdentifier);
        } else {
            itemIdentifier = item.code;
            isChecked = checkedItems.has(itemIdentifier);
        }
        
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
        
        // Сохраняем идентификатор товара
        if (currentMode === 'kassa' && !item.code) {
            // В режиме КАССА для товаров без кода используем data-name
            checkbox.setAttribute('data-name', itemIdentifier);
        } else {
            checkbox.setAttribute('data-code', itemIdentifier);
        }
        
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
                else if (item.status === 'mismatch') icon = 'fa-exchange-alt';
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
                
                // Используем правильное название товара
                const nameText = document.createElement('span');
                
                if (currentMode === 'kassa') {
                    // Для режима КАССА приоритет выбора названия:
                    // 1. Оригинальное название из кассы (если доступно)
                    // 2. Название товара из кассы (если сопоставлено)
                    // 3. Оригинальное название товара
                    // 4. Обычное название товара
                    const displayName = item.originalName || item.kassaName || item.name;
                    nameText.textContent = displayName || '';
                } else {
                    // Для режима СБИС используем стандартное имя
                    nameText.textContent = item[column] || '';
                }
                
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
    const name = checkbox.getAttribute('data-name');
    const row = checkbox.closest('tr');
    
    // Определяем идентификатор товара
    let itemIdentifier = code;
    
    // Проверяем, используем ли мы имя как идентификатор
    if (!code && name && currentMode === 'kassa') {
        // В режиме КАССА для товаров без кода используем имя как идентификатор
        itemIdentifier = name;
    } else if (!code && currentMode === 'kassa') {
        // Если не удалось получить идентификатор из атрибутов, используем текст ячейки с именем
        const cells = row.querySelectorAll('td');
        if (cells.length > 1) {
            // Берем название товара из второй ячейки (первая - чекбокс)
            const nameCell = cells[1];
            const nameText = nameCell ? nameCell.textContent.trim() : '';
            itemIdentifier = nameText;
        }
    }
    
    // Если у нас есть какой-то идентификатор, продолжаем
    if (itemIdentifier) {
        // Переключаем состояние
        if (checkedItems.has(itemIdentifier)) {
            checkbox.classList.remove('checked');
            row.classList.remove('checked-row');
            checkedItems.delete(itemIdentifier);
        } else {
            checkbox.classList.add('checked');
            row.classList.add('checked-row');
            checkedItems.set(itemIdentifier, true);
        }
        
        // Определяем, используем ли мы имя для обновления других представлений
        const isNameMode = !code && currentMode === 'kassa';
        
        // Обновляем все представления одной и той же позиции в разных таблицах
        updateCheckedStatusAcrossTables(itemIdentifier, isNameMode);
    }
    
    // Если мы находимся во вкладке ошибок и отметили товар, скрываем его из этой вкладки
    const currentTabName = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    if (currentTabName === 'errors' && (checkedItems.has(itemIdentifier))) {
        // Скрываем строку в текущей вкладке после анимации
        row.style.transition = 'opacity 0.3s ease-out';
        row.style.opacity = '0';
        setTimeout(() => {
            // После завершения анимации, обновляем таблицы с сохранением текущей сортировки
            applyFilterAndSort();
        }, 300);
    } else if (currentTabName === 'checked' && !checkedItems.has(itemIdentifier)) {
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
function updateCheckedStatusAcrossTables(code, isNameMode = false) {
    // Если isNameMode == true, то code содержит название товара, а не его код
    let allCheckboxes;
    
    if (isNameMode) {
        // Ищем чекбоксы по содержимому ячейки с названием
        allCheckboxes = [];
        const allRows = document.querySelectorAll('tr');
        
        allRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 1) {
                // Ячейка с названием товара, обычно вторая колонка (после чекбокса)
                const nameCell = cells[1];
                const nameText = nameCell ? nameCell.textContent.trim() : '';
                
                if (nameText === code) { // code в этом случае - это имя товара
                    const checkbox = row.querySelector('.item-checkbox');
                    if (checkbox) {
                        allCheckboxes.push(checkbox);
                    }
                }
            }
        });
    } else {
        // Стандартный режим поиска по атрибуту data-code
        allCheckboxes = document.querySelectorAll(`.item-checkbox[data-code="${code}"]`);
    }
    
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
                // Используем getStatusText для получения читаемого статуса
                valueA = getStatusText(a.status);
                valueB = getStatusText(b.status);
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
    fillTable('scanTable', sortedScan, ['code', 'name', 'orderQuantity', 'scanQuantity', 'status']);
    
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
    fillTable('mismatchTable', sortedMismatch, ['code', 'name', 'orderQuantity', 'scanQuantity'], 'mismatch-row');
    
    // Добавляем фильтрацию и сортировку для некорректных товаров
    const filteredIncomplete = filterResults(comparisonResults.incomplete, 'incomplete');
    const sortedIncomplete = sortResults(filteredIncomplete, 'incomplete');
    fillTable('incompleteTable', sortedIncomplete, ['code', 'name', 'scanQuantity', 'issue'], 'incomplete-row');
    
    // Восстанавливаем иконки сортировки
    document.querySelectorAll('.sortable').forEach(header => {
        const field = header.getAttribute('data-field');
        const icon = header.querySelector('i');
        
        // Сбрасываем все иконки и атрибуты
        header.removeAttribute('aria-sort');
        
        // Проверяем, существует ли icon перед установкой className
        if (!icon) {
            // Создаем иконку, если она отсутствует
            const newIcon = document.createElement('i');
            newIcon.className = 'fas fa-sort';
            header.appendChild(newIcon);
            
            // Используем созданную иконку
            if (header.getAttribute('data-field') === currentSort.field) {
                if (currentSort.direction === 'asc') {
                    newIcon.className = 'fas fa-sort-up';
                    header.setAttribute('aria-sort', 'ascending');
                } else {
                    newIcon.className = 'fas fa-sort-down';
                    header.setAttribute('aria-sort', 'descending');
                }
            }
        } else {
            if (header.getAttribute('data-field') === currentSort.field) {
                if (currentSort.direction === 'asc') {
                    icon.className = 'fas fa-sort-up';
                    header.setAttribute('aria-sort', 'ascending');
                } else {
                    icon.className = 'fas fa-sort-down';
                    header.setAttribute('aria-sort', 'descending');
                }
            } else {
                icon.className = 'fas fa-sort';
            }
        }
    });
    
    // Обновляем счетчики во вкладках после фильтрации
    updateTabCounters(comparisonResults);
}

// Отображение сводной статистики
function displayStats(results) {
    // Проверяем наличие всех необходимых массивов
    results.all = results.all || [];
    results.missing = results.missing || [];
    results.extra = results.extra || [];
    results.mismatch = results.mismatch || [];
    results.incomplete = results.incomplete || [];
    
    document.getElementById('orderItems').textContent = results.all.filter(item => item.orderQuantity > 0).length;
    document.getElementById('scanItems').textContent = results.all.filter(item => item.scanQuantity > 0).length;
    document.getElementById('missingItems').textContent = results.missing.length;
    document.getElementById('extraItems').textContent = results.extra.length;
    document.getElementById('quantityMismatches').textContent = results.mismatch ? results.mismatch.length : 0;
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
    // Проверяем наличие всех необходимых массивов
    results.all = results.all || [];
    results.scan = results.scan || [];
    results.errors = results.errors || [];
    results.missing = results.missing || [];
    results.extra = results.extra || [];
    results.mismatch = results.mismatch || [];
    results.incomplete = results.incomplete || [];
    
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
    const errorsCount = results.errors.filter(item => !checkedItems.has(item.code)).length;
    const incompleteCount = results.incomplete.length;
    
    // Считаем количество всех отмеченных товаров с ошибками 
    // независимо от фильтра маркировки - проверяем только статус и наличие в Map checkedItems
    const checkedErrorsCount = results.all.filter(item => 
        checkedItems.has(item.code) && 
        (item.status === 'missing' || item.status === 'extra' || 
         item.status === 'mismatch' || item.status === 'incomplete')
    ).length;
    
    // Определяем текст для вкладки scanTab в зависимости от режима
    const scanTabText = currentMode === 'kassa' ? 'Товары в КАССЕ' : 'Товары в СБИС';
    
    // Обновляем текст вкладок с учетом количества элементов
    allTab.innerHTML = `<i class="fas fa-list"></i> Все товары <span class="tab-counter">${results.all.length}</span>`;
    scanTab.innerHTML = `<i class="fas fa-barcode"></i> ${scanTabText} <span class="tab-counter">${results.scan.length}</span>`;
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
    // Сбрасываем все данные
    orderData = null;
    scanData = null;
    kassaTextData = null;
    comparisonResults = null;
    orderFile = null;
    scanFile = null;
    currentOrderHash = null;
    
    // Очищаем отображение результатов
    statsContainer.style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(content => {
        const tableContainer = content.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.innerHTML = '<p class="no-data">Нет данных для отображения. Загрузите файлы и выполните анализ.</p>';
        }
        
        // Очищаем таблицы напрямую
        const table = content.querySelector('table tbody');
        if (table) {
            table.innerHTML = '';
        }
    });
    
    // Сбрасываем выбранные файлы
    fileInput.value = '';
    const selectedFilesContainer = document.getElementById('selectedFiles');
    if (selectedFilesContainer) {
        selectedFilesContainer.innerHTML = '';
    }
    
    // Блокируем кнопку анализа
    analyzeBtn.disabled = true;
    analyzeBtn.classList.remove('active-btn');
    
    // Очищаем все отмеченные позиции
    checkedItems.clear();
    
    // Очищаем поле текста кассы, если в режиме КАССА
    if (currentMode === 'kassa') {
        const kassaTextInput = document.getElementById('kassaTextInput');
        if (kassaTextInput) {
            kassaTextInput.value = '';
        }
    }
    
    // Показываем уведомление
    showNotification('Сброс', 'Все данные сброшены', 'info');
    
    console.log('Все данные сброшены');
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
                
                // Проверяем, существует ли icon перед установкой className
                if (!icon) {
                    // Создаем иконку, если она отсутствует
                    const newIcon = document.createElement('i');
                    newIcon.className = 'fas fa-sort';
                    h.appendChild(newIcon);
                    
                    // Используем созданную иконку
                    if (h.getAttribute('data-field') === currentSort.field) {
                        if (currentSort.direction === 'asc') {
                            newIcon.className = 'fas fa-sort-up';
                            h.setAttribute('aria-sort', 'ascending');
                        } else {
                            newIcon.className = 'fas fa-sort-down';
                            h.setAttribute('aria-sort', 'descending');
                        }
                    }
                } else {
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
            if (!checkbox) return; // Пропускаем, если чекбокс не найден
            
            const code = checkbox.getAttribute('data-code');
            if (!code) return; // Пропускаем, если код не найден
            
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
            if (!checkbox) return; // Пропускаем, если чекбокс не найден
            
            const code = checkbox.getAttribute('data-code');
            if (!code) return; // Пропускаем, если код не найден
            
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

// Функция для обработки текста из кассы
function extractProductsFromKassaText(text) {
    if (!text) return [];
    
    console.log('Извлечение товаров из текста кассы...');
    
    // Объект для хранения уникальных товаров и их количества
    const productMap = new Map();
    const lines = text.split('\n');
    
    // Регулярные выражения для различных форматов
    const formats = [
        // Формат: номер название цена x количество
        /^\d+\s+([A-Za-zА-Яа-я\s\-\(\)]+?)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        // Формат: название цена x количество
        /^([A-Za-zА-Яа-я\s\-\(\)]+?)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        // Формат: номер название (примечание) цена x количество
        /^\d+\s+([A-Za-zА-Яа-я\s\-]+)\s*\(([^)]+)\)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        // Формат: название (примечание) цена x количество
        /^([A-Za-zА-Яа-я\s\-]+)\s*\(([^)]+)\)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        // Формат: номерНазвание - для случаев, когда номер и название идут слитно
        /^(\d+)([A-Za-zА-Яа-я].+)/
    ];
    
    // Список служебных строк для пропуска
    const skipPatterns = [
        'Продажа', 'Найти', 'ХР', 'Скидка', 'Клиент', 'К оплате',
        'Итого', 'Сумма', 'Чек', 'Кассир', 'Дата', 'Время', 'Сдача', 'шт'
    ];
    
    // Проходим по строкам и обрабатываем их
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Пропускаем пустые строки и служебные строки
        if (!line || skipPatterns.some(pattern => line.includes(pattern))) {
            continue;
        }
        
        let productName = '';
        let quantity = 1;
        let price = 0;
        let note = '';
        
        // Пытаемся распознать по основным форматам
        let matched = false;
        for (const format of formats) {
            const match = line.match(format);
            if (match) {
                matched = true;
                // Извлекаем данные в зависимости от формата
                if (match.length === 4) {
                    // Форматы без примечания
                    productName = match[1].trim();
                    price = parseFloat(match[2]);
                    quantity = parseInt(match[3]);
                } else if (match.length === 5) {
                    // Форматы с примечанием
                    productName = match[1].trim();
                    note = ` (${match[2].trim()})`;
                    price = parseFloat(match[3]);
                    quantity = parseInt(match[4]);
                } else if (match.length === 3) {
                    // Формат с номером и названием слитно (новый формат)
                    productName = match[2].trim();
                    // Для этого формата цена и количество должны быть на следующих строках
                    // Продолжаем обработку ниже
                }
                break;
            }
        }
        
        // Если не удалось распознать по основным форматам,
        // проверяем формат типа "название" + "цена" + "x" + "количество" на отдельных строках
        if (!matched || (matched && productName && !price)) {
            // Проверяем, начинается ли строка с известных брендов или является названием товара
            if ((line.match(/^[A-Za-zА-Яа-я]/) && (line.includes(' - ') || line.includes('('))) || 
                (matched && productName)) {
                
                if (!productName) {
                    productName = line.trim();
                }
                
                // Проверяем следующие строки на наличие цены и количества
                let j = i + 1;
                let priceFound = false;
                let quantityFound = false;
                
                // Ищем до 5 строк вперед для поиска цены и количества
                while (j < Math.min(i + 6, lines.length) && (!priceFound || !quantityFound)) {
                    const nextLine = lines[j].trim();
                    
                    // Пропускаем пустые строки
                    if (!nextLine) {
                        j++;
                        continue;
                    }
                    
                    // Проверяем, является ли строка ценой
                    if (!priceFound && /^\d+[\s\.]?\d*$/.test(nextLine)) {
                        price = parseFloat(nextLine.replace(/\s/g, ''));
                        priceFound = true;
                        j++;
                        continue;
                    }
                    
                    // Проверяем, является ли строка символом "x"
                    if (priceFound && nextLine === 'x') {
                        j++;
                        continue;
                    }
                    
                    // Проверяем, является ли строка количеством
                    if (priceFound && !quantityFound && /^\d+$/.test(nextLine)) {
                        quantity = parseInt(nextLine);
                        quantityFound = true;
                        i = j; // Перемещаем указатель основного цикла
                        break;
                    }
                    
                    // Если строка не соответствует ожидаемому формату, двигаемся дальше
                    j++;
                }
                
                matched = priceFound && quantityFound;
            }
        }
        
        // Если не удалось распознать по основным форматам, 
        // пробуем извлечь название до метки количества
        if (!matched && line.includes('x')) {
            const parts = line.split('x');
            if (parts.length >= 2) {
                // Ищем цену и название в первой части
                const firstPart = parts[0].trim();
                const priceMatch = firstPart.match(/(\d+[\s\.]\d*|\d+)$/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1].replace(/\s/g, ''));
                    productName = firstPart.substring(0, firstPart.length - priceMatch[1].length).trim();
                    // Удаляем начальные цифры и пробелы, если они есть
                    productName = productName.replace(/^\d+\s*/, '');
                    
                    // Извлекаем количество из второй части
                    const quantityMatch = parts[1].match(/\d+/);
                    if (quantityMatch) {
                        quantity = parseInt(quantityMatch[0]);
                        matched = true;
                    }
                }
            }
        }
        
        // Если всё равно не удалось извлечь название, пробуем взять начало строки до цены
        if (!matched && !productName && /^\d+/.test(line)) {
            const nameStart = line.search(/[A-Za-zА-Яа-я]/);
            const pricePos = line.indexOf('x') > -1 ? line.indexOf('x') : line.length;
            
            if (nameStart > -1 && nameStart < pricePos) {
                productName = line.substring(nameStart, pricePos).trim();
                matched = true;
            }
        }
        
        // Если получили название товара, добавляем или обновляем его в Map
        if (productName) {
            // Добавляем примечание к названию, если есть
            if (note) {
                productName += note;
            }
            
            // Очищаем название от лишних пробелов и символов
            productName = productName.replace(/\s+/g, ' ').trim();
            
            console.log(`Извлечен товар: "${productName}" (${quantity} шт. по ${price} руб.)`);
            
            // Проверяем, есть ли уже такой товар в Map
            if (productMap.has(productName)) {
                // Если товар уже есть, увеличиваем его количество
                const product = productMap.get(productName);
                product.quantity += quantity;
            } else {
                // Если товара еще нет, создаем новую запись
                const product = {
                    code: '', // Нет артикула в режиме КАССА
                    name: productName,
                    originalName: productName,
                    quantity: quantity,
                    price: price,
                    barcode: '' // Нет штрих-кода в режиме КАССА
                };
                productMap.set(productName, product);
            }
        }
    }
    
    // Преобразуем Map в массив товаров
    const products = Array.from(productMap.values());
    
    console.log(`Извлечено ${products.length} уникальных товаров из текста кассы`);
    
    // Выводим информацию о товарах с количеством больше 1
    const multipleItems = products.filter(p => p.quantity > 1);
    if (multipleItems.length > 0) {
        console.log(`Товары с количеством > 1 (${multipleItems.length} шт.):`);
        multipleItems.forEach(p => {
            console.log(`- ${p.name}: ${p.quantity} шт. (${p.price} руб. за шт.)`);
        });
    }
    
    return products;
}

// Переключение режимов СБИС и КАССА
document.getElementById('sbisModeBtn').addEventListener('click', function() {
    if (currentMode !== 'sbis') {
        currentMode = 'sbis';
        document.getElementById('sbisModeBtn').classList.add('active');
        document.getElementById('kassaModeBtn').classList.remove('active');
        
        // Скрываем поле для текста кассы
        const kassaTextInputContainer = document.getElementById('kassaTextInputContainer');
        if (kassaTextInputContainer) {
            kassaTextInputContainer.style.display = 'none';
        }
        
        // Обновляем заголовок вкладки со сканированием
        updateScanTabLabel('СБИС');
        
        // Сбрасываем все данные при переключении режимов
        resetFiles();
    }
});

document.getElementById('kassaModeBtn').addEventListener('click', function() {
    if (currentMode !== 'kassa') {
        currentMode = 'kassa';
        document.getElementById('kassaModeBtn').classList.add('active');
        document.getElementById('sbisModeBtn').classList.remove('active');
        
        // Показываем поле для текста кассы
        const kassaTextInputContainer = document.getElementById('kassaTextInputContainer');
        if (kassaTextInputContainer) {
            kassaTextInputContainer.style.display = 'block';
        }
        
        // Обновляем заголовок вкладки со сканированием
        updateScanTabLabel('КАССЕ');
        
        // Сбрасываем все данные при переключении режимов
        resetFiles();
    }
});    // Известные бренды для улучшенного распознавания
    const knownBrands = ['Musthave', 'Dark Side Core', 'Sebero Black'];

// Функция для сравнения товаров в режиме КАССА
function compareProductsByName(orderProducts, kassaProducts) {
    console.log('Сравнение товаров по названию...');
    console.log(`Товаров в заказе: ${orderProducts.length}, Товаров в кассе: ${kassaProducts.length}`);
    
    const results = {
        orderItems: orderProducts,
        scanItems: kassaProducts,
        matched: [],
        missing: [],
        extra: [],
        quantityMismatch: [],
        incomplete: [],
        all: [],
        scan: [],
        mismatch: [],
        errors: []
    };
    
    // Функция для нормализации названия товара
    const normalizeProductName = (name) => {
        return name.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[\(\)]/g, '')
            .trim();
    };
    
    // Функция для вычисления схожести строк
    const calculateSimilarity = (str1, str2) => {
        const str1Normalized = normalizeProductName(str1);
        const str2Normalized = normalizeProductName(str2);
        
        // Проверяем полное совпадение
        if (str1Normalized === str2Normalized) {
            return 1.0;
        }
        
        // Проверяем, содержит ли одна строка другую
        if (str1Normalized.includes(str2Normalized)) {
            return 0.9;
        }
        
        if (str2Normalized.includes(str1Normalized)) {
            return 0.9;
        }
        
        // Подсчитываем количество общих слов
        const words1 = str1Normalized.split(' ');
        const words2 = str2Normalized.split(' ');
        
        let commonWords = 0;
        for (const word1 of words1) {
            if (word1.length < 3) continue; // Игнорируем короткие слова
            for (const word2 of words2) {
                if (word2.length < 3) continue;
                if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                    commonWords++;
                    break;
                }
            }
        }
        
        // Вычисляем коэффициент схожести
        const maxWords = Math.max(words1.length, words2.length);
        return commonWords / maxWords;
    };
    
    // Порог схожести для считания товаров одинаковыми
    const similarityThreshold = 0.7;
    
    // Создаем копии массивов для работы
    const remainingOrderProducts = [...orderProducts];
    const remainingKassaProducts = [...kassaProducts];
    
    // Ищем совпадения
    for (let i = 0; i < orderProducts.length; i++) {
        const orderProduct = orderProducts[i];
        let bestMatch = null;
        let bestMatchIndex = -1;
        let bestSimilarity = 0;
        
        for (let j = 0; j < remainingKassaProducts.length; j++) {
            const kassaProduct = remainingKassaProducts[j];
            const similarity = calculateSimilarity(orderProduct.name, kassaProduct.name);
            
            if (similarity > similarityThreshold && similarity > bestSimilarity) {
                bestMatch = kassaProduct;
                bestMatchIndex = j;
                bestSimilarity = similarity;
            }
        }
        
        if (bestMatch) {
            // Нашли совпадение
            const matchedItem = {
                code: orderProduct.code,
                name: orderProduct.name,
                kassaName: bestMatch.originalName || bestMatch.name,
                orderQuantity: orderProduct.quantity,
                scanQuantity: bestMatch.quantity,
                similarity: bestSimilarity,
                status: 'matched'
            };
            
            // Проверяем несовпадение количества
            if (orderProduct.quantity !== bestMatch.quantity && orderProduct.quantity > 0 && bestMatch.quantity > 0) {
                matchedItem.status = 'mismatch';
                matchedItem.difference = bestMatch.quantity - orderProduct.quantity;
                results.quantityMismatch.push(matchedItem);
                results.mismatch.push(matchedItem);
                results.errors.push(matchedItem);
            } else {
                matchedItem.status = 'ok';
                results.matched.push(matchedItem);
            }
            
            results.all.push(matchedItem);
            
            // Удаляем найденный товар из списка оставшихся
            remainingKassaProducts.splice(bestMatchIndex, 1);
        } else {
            // Не нашли совпадение - товар отсутствует
            const missingItem = {
                code: orderProduct.code,
                name: orderProduct.name,
                orderQuantity: orderProduct.quantity,
                scanQuantity: 0,
                status: 'missing'
            };
            results.missing.push(missingItem);
            results.all.push(missingItem);
            results.errors.push(missingItem);
        }
    }
    
    // Оставшиеся товары в кассе - это избыточные товары
    for (const kassaProduct of remainingKassaProducts) {
        const extraItem = {
            code: '',
            name: kassaProduct.originalName || kassaProduct.name,
            orderQuantity: 0,
            scanQuantity: kassaProduct.quantity,
            status: 'extra'
        };
        results.extra.push(extraItem);
        results.all.push(extraItem);
        results.errors.push(extraItem);
        
        // Добавляем в список scan
        results.scan.push({
            code: '',
            name: kassaProduct.originalName || kassaProduct.name,
            scanQuantity: kassaProduct.quantity,
            status: 'extra'
        });
    }
    
    // Добавляем все товары из кассы в список scan
    for (const kassaProduct of kassaProducts) {
        // Пропускаем товары, которые уже добавлены как избыточные
        if (remainingKassaProducts.includes(kassaProduct)) {
            continue;
        }
        
        // Ищем соответствующий товар в результатах
        const matchedItem = results.all.find(item => 
            item.kassaName === (kassaProduct.originalName || kassaProduct.name)
        );
        
        if (matchedItem) {
            results.scan.push({
                code: matchedItem.code,
                name: kassaProduct.originalName || kassaProduct.name,
                orderQuantity: matchedItem.orderQuantity,
                scanQuantity: kassaProduct.quantity,
                status: matchedItem.status
            });
        }
    }
    
    // Сортируем все массивы по имени товара
    const sortByName = (a, b) => a.name.localeCompare(b.name);
    results.missing.sort(sortByName);
    results.extra.sort(sortByName);
    results.mismatch.sort(sortByName);
    results.matched.sort(sortByName);
    results.all.sort(sortByName);
    results.scan.sort(sortByName);
    results.errors.sort(sortByName);
    
    console.log(`Результаты сравнения:
        Всего товаров: ${results.all.length}
        Отсутствуют в кассе: ${results.missing.length}
        Лишние в кассе: ${results.extra.length}
        Несоответствие количества: ${results.mismatch.length}
        Совпадающие товары: ${results.matched.length}
        Всего ошибок: ${results.errors.length}`);
    
    return results;
}