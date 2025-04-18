const fs = require('fs');
const path = require('path');

// Путь к package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Чтение текущего package.json
const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Получение текущей версии
const currentVersion = packageData.version;
console.log(`Текущая версия: ${currentVersion}`);

// Создание CHANGELOG.md, если он не существует
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
if (!fs.existsSync(changelogPath)) {
  const initialChangelog = `# История изменений CrossCheck SBIS

## [${currentVersion}] - ${new Date().toISOString().split('T')[0]}
- Первый релиз приложения
- Функционал сравнения заказов МС и сканирования СБИС
- Отображение отсутствующих, избыточных и несоответствующих товаров
- Поддержка темной и светлой темы
`;
  fs.writeFileSync(changelogPath, initialChangelog);
  console.log('Создан файл CHANGELOG.md');
}

// Обновление версии в файле main.js (если необходимо)
const mainJsPath = path.join(__dirname, '..', 'main.js');
if (fs.existsSync(mainJsPath)) {
  let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
  
  // Проверка, содержит ли main.js строку с версией
  if (mainJsContent.includes('app.setAboutPanelOptions') || 
      mainJsContent.includes('appVersion')) {
    console.log('Обновление версии в main.js');
    
    // Регулярное выражение для поиска упоминаний версии
    mainJsContent = mainJsContent.replace(
      /version\s*:\s*['"][\d\.]+['"]/g, 
      `version: '${currentVersion}'`
    );
    
    fs.writeFileSync(mainJsPath, mainJsContent);
    console.log('Версия в main.js обновлена');
  }
}

console.log('Обработка версии завершена!'); 