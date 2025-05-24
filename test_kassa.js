// Тестовый скрипт для проверки функции extractProductsFromKassaText
const fs = require('fs');
const path = require('path');

// Импортируем функцию из script.js
// Так как мы не можем напрямую импортировать функцию из script.js, копируем её сюда
function extractProductsFromKassaText(text) {
    if (!text) return [];
    
    console.log('Извлечение товаров из текста кассы...');
    
    // Объект для хранения уникальных товаров и их количества
    const productMap = new Map();
    const lines = text.split('\n');
    
    // Регулярные выражения для различных форматов
    const formats = [
        // Формат: номер + название (номер и название идут слитно)
        /^(\d+)([A-Za-zА-Яа-я].+)/,
        
        // Формат: номер название цена x количество
        /^\d+\s+([A-Za-zА-Яа-я\s\-\(\)\.,"']+?)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        
        // Формат: название цена x количество
        /^([A-Za-zА-Яа-я\s\-\(\)\.,"']+?)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        
        // Формат: номер название (примечание) цена x количество
        /^\d+\s+([A-Za-zА-Яа-я\s\-\.,"']+)\s*\(([^)]+)\)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        
        // Формат: название (примечание) цена x количество
        /^([A-Za-zА-Яа-я\s\-\.,"']+)\s*\(([^)]+)\)\s+(\d+\.?\d*)\s*x\s*(\d+)/,
        
        // Формат с меткой NEW: номер1. NEW название
        /^(\d+)1\.\s*NEW\s+([A-Za-zА-Яа-я].+)/,
        
        // Формат с просто меткой NEW: 1. NEW название
        /^1\.\s*NEW\s+([A-Za-zА-Яа-я].+)/
    ];
    
    // Список служебных строк для пропуска
    const skipPatterns = [
        'Продажа', 'Найти', 'ХР', 'Скидка', 'Клиент', 'К оплате',
        'Итого', 'Сумма', 'Чек', 'Кассир', 'Дата', 'Время', 'Сдача'
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
                
                if (format.toString().includes('\\d+\\)\\([A-Za-zА-Яа-я]')) {
                    // Формат с номером и названием слитно
                    productName = match[2].trim();
                    // Для этого формата цена и количество должны быть на следующих строках
                } else if (match.length === 5) {
                    // Форматы с примечанием
                    productName = match[1].trim();
                    note = match[2] ? ` (${match[2].trim()})` : '';
                    price = parseFloat(match[3]);
                    quantity = parseInt(match[4]);
                } else if (match.length === 4) {
                    // Форматы без примечания
                    productName = match[1].trim();
                    price = parseFloat(match[2]);
                    quantity = parseInt(match[3]);
                } else if (match.length === 3) {
                    // Формат с номером и названием слитно или с меткой NEW
                    if (line.includes('NEW')) {
                        productName = match[2].trim();
                    } else {
                        productName = match[2].trim();
                    }
                    // Для этого формата цена и количество должны быть на следующих строках
                } else if (match.length === 2) {
                    // Формат только с меткой NEW и названием (без номера)
                    productName = match[1].trim();
                    // Для этого формата цена и количество должны быть на следующих строках
                }
                break;
            }
        }
        
        // Если у нас есть имя товара, но нет цены и количества, 
        // ищем их в следующих строках (особенно для формата из 6.txt)
        if (productName && (!price || !quantity)) {
            let j = i + 1;
            let priceFound = false;
            let quantityFound = false;
            let shippingFound = false; // Флаг для обнаружения строки "шт"
            
            // Максимальное количество строк для поиска цены и количества
            const maxLinesToSearch = 8;
            
            while (j < Math.min(i + maxLinesToSearch, lines.length) && (!priceFound || !quantityFound)) {
                const nextLine = lines[j].trim();
                
                // Пропускаем пустые строки
                if (!nextLine) {
                    j++;
                    continue;
                }
                
                // Проверяем, является ли строка ценой (формат "xxx.xx" или "xxx")
                if (!priceFound && /^\d+(?:\.\d+)?$/.test(nextLine)) {
                    price = parseFloat(nextLine);
                    priceFound = true;
                    j++;
                    continue;
                }
                
                // Проверяем, является ли строка символом "x"
                if (priceFound && nextLine === 'x') {
                    j++;
                    continue;
                }
                
                // Проверяем, является ли строка количеством (формат "x")
                if (priceFound && !quantityFound && /^\d+$/.test(nextLine)) {
                    quantity = parseInt(nextLine);
                    quantityFound = true;
                    j++;
                    
                    // После количества обычно идет строка "шт", пропустим её
                    if (j < lines.length && lines[j].trim() === 'шт') {
                        shippingFound = true;
                        j++;
                    }
                    
                    // Обновляем индекс основного цикла
                    i = j;
                    break;
                }
                
                // Если строка не соответствует ожидаемому формату, двигаемся дальше
                j++;
            }
            
            matched = priceFound && quantityFound;
        }
        
        // Если не удалось распознать по основным форматам,
        // пробуем извлечь название и цену из строки
        if (!matched && !productName) {
            // Пробуем найти формат с цифровым началом (номер товара) и названием
            const numNameMatch = line.match(/^(\d+)([A-Za-zА-Яа-я].+)/);
            if (numNameMatch) {
                productName = numNameMatch[2].trim();
                
                // Ищем цену и количество на следующих строках
                let j = i + 1;
                let priceFound = false;
                let quantityFound = false;
                
                while (j < Math.min(i + 8, lines.length) && (!priceFound || !quantityFound)) {
                    const nextLine = lines[j].trim();
                    
                    if (!nextLine) {
                        j++;
                        continue;
                    }
                    
                    if (!priceFound && /^\d+(?:\.\d+)?$/.test(nextLine)) {
                        price = parseFloat(nextLine);
                        priceFound = true;
                        j++;
                        continue;
                    }
                    
                    if (priceFound && nextLine === 'x') {
                        j++;
                        continue;
                    }
                    
                    if (priceFound && !quantityFound && /^\d+$/.test(nextLine)) {
                        quantity = parseInt(nextLine);
                        quantityFound = true;
                        
                        // Обновляем индекс основного цикла
                        i = j;
                        break;
                    }
                    
                    j++;
                }
                
                matched = priceFound && quantityFound;
            }
        }
        
        // Если получили название товара, добавляем или обновляем его в Map
        if (productName) {
            // Добавляем примечание к названию, если есть
            if (note && !productName.includes(note)) {
                productName += note;
            }
            
            // Очищаем название от лишних пробелов и символов
            productName = productName.replace(/\s+/g, ' ').trim();
            
            // Удаляем номер товара из начала названия, если он там остался
            productName = productName.replace(/^\d+\s*/, '');
            
            // Удаляем метку NEW из названия, если она есть
            productName = productName.replace(/^1\.\s*NEW\s+/, '')
                                    .replace(/^NEW\s+/, '');
            
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

// Читаем файл 6.txt
const filePath = path.join(__dirname, 'ПРИМЕР кассы', '6.txt');
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Ошибка при чтении файла:', err);
        return;
    }
    
    console.log('Файл успешно прочитан. Размер:', data.length, 'байт');
    
    // Запускаем анализ
    const products = extractProductsFromKassaText(data);
    
    // Выводим результаты
    console.log('===== РЕЗУЛЬТАТЫ АНАЛИЗА =====');
    console.log(`Всего найдено товаров: ${products.length}`);
    
    // Группируем товары по количеству
    const groupedByQuantity = products.reduce((acc, product) => {
        const qty = product.quantity;
        if (!acc[qty]) acc[qty] = [];
        acc[qty].push(product);
        return acc;
    }, {});
    
    // Выводим информацию о группах
    Object.keys(groupedByQuantity).sort((a, b) => b - a).forEach(qty => {
        console.log(`\nТовары с количеством ${qty} шт. (${groupedByQuantity[qty].length} наименований):`);
        groupedByQuantity[qty].forEach(product => {
            console.log(`- ${product.name} (${product.price} руб. за шт.)`);
        });
    });
}); 