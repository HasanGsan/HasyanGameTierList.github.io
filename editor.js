const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];

let currentImage = null;
let croppedImageData = null;
let cropStartX = 0, cropStartY = 0;
let cropEndX = 0, cropEndY = 0;
let isCropping = false;

// Загрузка данных
function loadGames() {
    const data = localStorage.getItem('tierListData');
    if (data) {
        return JSON.parse(data);
    }
    return [];
}

// Сохранение данных
function saveGames(games) {
    localStorage.setItem('tierListData', JSON.stringify(games));
    localStorage.setItem('lastUpdate', new Date().toISOString());
}

// Обработка загрузки изображения
function handleImageLoad(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        currentImage = new Image();
        currentImage.onload = function() {
            showCropper(currentImage);
        };
        currentImage.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Показать инструмент обрезки
function showCropper(image) {
    const cropperContainer = document.getElementById('cropperContainer');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Устанавливаем размеры канваса
    const maxWidth = 800;
    const maxHeight = 600;
    let width = image.width;
    let height = image.height;
    
    // Масштабируем если изображение слишком большое
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Рисуем изображение
    ctx.drawImage(image, 0, 0, width, height);
    
    cropperContainer.style.display = 'block';
    
    // Сбрасываем параметры обрезки
    cropStartX = 0;
    cropStartY = 0;
    cropEndX = 0;
    cropEndY = 0;
    isCropping = false;
}

// Обработка обрезки на канвасе
function initCropHandlers() {
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        cropStartX = e.clientX - rect.left;
        cropStartY = e.clientY - rect.top;
        isCropping = true;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isCropping) return;
        
        const rect = canvas.getBoundingClientRect();
        cropEndX = e.clientX - rect.left;
        cropEndY = e.clientY - rect.top;
        
        // Перерисовываем изображение с прямоугольником выделения
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
        
        // Рисуем прямоугольник выделения
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            cropStartX,
            cropStartY,
            cropEndX - cropStartX,
            cropEndY - cropStartY
        );
        
        // Затемняем невыделенную область
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, cropStartY);
        ctx.fillRect(0, cropStartY, cropStartX, cropEndY - cropStartY);
        ctx.fillRect(cropEndX, cropStartY, canvas.width - cropEndX, cropEndY - cropStartY);
        ctx.fillRect(0, cropEndY, canvas.width, canvas.height - cropEndY);
    });
    
    canvas.addEventListener('mouseup', () => {
        isCropping = false;
    });
}

// Применить обрезку
function applyCrop() {
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Если не выделено - берем всё изображение
    if (cropStartX === 0 && cropEndX === 0) {
        cropStartX = 0;
        cropStartY = 0;
        cropEndX = canvas.width;
        cropEndY = canvas.height;
    }
    
    // Нормализуем координаты
    const x = Math.min(cropStartX, cropEndX);
    const y = Math.min(cropStartY, cropEndY);
    const width = Math.abs(cropEndX - cropStartX);
    const height = Math.abs(cropEndY - cropStartY);
    
    if (width === 0 || height === 0) {
        alert('Please select an area to crop');
        return;
    }
    
    // Создаем новый канвас для обрезанного изображения и конвертируем в WebP с ограничением размера
    const croppedCanvas = document.createElement('canvas');
    const maxSide = 320; // ограничиваем максимальную сторону для экономии места
    let targetW = width;
    let targetH = height;
    if (Math.max(width, height) > maxSide) {
        const scale = maxSide / Math.max(width, height);
        targetW = Math.round(width * scale);
        targetH = Math.round(height * scale);
    }
    croppedCanvas.width = targetW;
    croppedCanvas.height = targetH;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    // Копируем выделенную область с ресайзом
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, width, height);
    tempCtx.putImageData(imageData, 0, 0);
    croppedCtx.imageSmoothingQuality = 'high';
    croppedCtx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, targetW, targetH);
    
    // Сохраняем как WebP для меньшего размера
    croppedImageData = croppedCanvas.toDataURL('image/webp', 0.85);
    
    // Скрываем cropper и показываем превью
    document.getElementById('cropperContainer').style.display = 'none';
    
    // Обновляем upload area с превью
    const uploadArea = document.getElementById('imageUploadArea');
    uploadArea.innerHTML = `
        <div class="upload-prompt">
            <img src="${croppedImageData}" style="max-width: 200px; max-height: 200px; border: 2px solid var(--border-color);">
            <div style="margin-top: 10px;">IMAGE READY</div>
            <div class="upload-hint">Click to change image</div>
        </div>
    `;
}

// Сброс обрезки
function resetCrop() {
    if (currentImage) {
        showCropper(currentImage);
    }
}

// Добавить игру
function addGame() {
    const title = document.getElementById('gameTitle').value.trim();
    const tier = document.getElementById('gameTier').value;
    
    if (!title) {
        alert('Please enter game title');
        return;
    }
    
    if (!croppedImageData) {
        alert('Please upload and crop an image');
        return;
    }
    
    const games = loadGames();
    
    const newGame = {
        id: Date.now(),
        title: title,
        tier: tier,
        image: croppedImageData
    };
    
    games.push(newGame);
    saveGames(games);
    
    // Очищаем форму
    document.getElementById('gameTitle').value = '';
    document.getElementById('gameTier').value = 'S';
    croppedImageData = null;
    currentImage = null;
    document.getElementById('cropperContainer').style.display = 'none';
    
    // Сбрасываем upload area
    const uploadArea = document.getElementById('imageUploadArea');
    uploadArea.innerHTML = `
        <div class="upload-prompt">
            <div class="upload-icon">📁</div>
            <div>CLICK TO UPLOAD or PRESS CTRL+V TO PASTE</div>
            <div class="upload-hint">Supports: JPG, PNG, GIF, WebP</div>
        </div>
    `;
    
    // Обновляем список игр
    renderGamesList();
    
    alert('Game added successfully!');
}

// Удалить игру
function deleteGame(id) {
    if (!confirm('Are you sure you want to delete this game?')) {
        return;
    }
    
    let games = loadGames();
    games = games.filter(game => game.id !== id);
    saveGames(games);
    renderGamesList();
}

// Изменить tier игры
function changeTier(id, newTier) {
    const games = loadGames();
    const game = games.find(g => g.id === id);
    if (game) {
        game.tier = newTier;
        saveGames(games);
        renderGamesList();
    }
}

// Отобразить список игр
function renderGamesList() {
    const games = loadGames();
    const gamesListContainer = document.getElementById('gamesList');
    
    if (games.length === 0) {
        gamesListContainer.innerHTML = '<div class="empty-tier">NO GAMES IN DATABASE</div>';
        return;
    }
    
    // Сортируем по tier и названию
    games.sort((a, b) => {
        const tierOrder = TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier);
        if (tierOrder !== 0) return tierOrder;
        return a.title.localeCompare(b.title);
    });
    
    gamesListContainer.innerHTML = '';
    
    games.forEach(game => {
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        gameItem.draggable = true;
        gameItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', String(game.id));
        });
        
        gameItem.innerHTML = `
            <div class="game-item-image">
                <img src="${game.image}" alt="${game.title}">
            </div>
            <div class="game-item-info">
                <div class="game-item-title">${game.title}</div>
                <div class="game-item-tier">Tier: ${game.tier}</div>
            </div>
            <div class="game-item-actions">
                <select class="terminal-select" style="width: 100px;" onchange="changeTier(${game.id}, this.value)">
                    ${TIERS.map(tier => `<option value="${tier}" ${game.tier === tier ? 'selected' : ''}>${tier}</option>`).join('')}
                </select>
                <button class="btn btn-danger" onclick="deleteGame(${game.id})">DELETE</button>
            </div>
        `;
        
        gamesListContainer.appendChild(gameItem);
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initCropHandlers();
    renderGamesList();
    
    // Обработка клика на upload area
    const uploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');
    
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageLoad(e.target.files[0]);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');
        
        if (e.dataTransfer.files.length > 0) {
            handleImageLoad(e.dataTransfer.files[0]);
        }
    });
    
    // Paste from clipboard (Ctrl+V)
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                handleImageLoad(blob);
                break;
            }
        }
    });
    
    // Кнопка добавления игры
    document.getElementById('addGameBtn').addEventListener('click', addGame);
    
    // Кнопки cropper
    document.getElementById('applyCrop').addEventListener('click', applyCrop);
    document.getElementById('resetCrop').addEventListener('click', resetCrop);

    const gamesListContainer = document.getElementById('gamesList');
    const dropBar = document.createElement('div');
    dropBar.style.display = 'flex';
    dropBar.style.gap = '8px';
    dropBar.style.margin = '10px 0 20px 0';
    TIERS.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.textContent = `Drop -> ${t}`;
        btn.addEventListener('dragover', (e) => e.preventDefault());
        btn.addEventListener('drop', (e) => {
            e.preventDefault();
            const idStr = e.dataTransfer.getData('text/plain');
            const id = Number(idStr);
            if (!Number.isNaN(id)) {
                changeTier(id, t);
            }
        });
        dropBar.appendChild(btn);
    });
    gamesListContainer.parentElement.insertBefore(dropBar, gamesListContainer);

    // Добавляем кнопки IMPORT/EXPORT, если есть footer-info
    const footer = document.querySelector('.footer-info');
    if (footer && !document.getElementById('importBtn')) {
        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-secondary';
        importBtn.id = 'importBtn';
        importBtn.style.marginLeft = '10px';
        importBtn.textContent = '⬆ IMPORT JSON';
        footer.appendChild(importBtn);

        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'file';
        hiddenInput.accept = 'application/json,.json';
        hiddenInput.style.display = 'none';
        hiddenInput.id = 'importFileInput';
        footer.appendChild(hiddenInput);

        importBtn.addEventListener('click', () => {
            hiddenInput.click();
        });

        hiddenInput.addEventListener('change', async (e) => {
            if (!e.target.files || !e.target.files[0]) return;
            try {
                const file = e.target.files[0];
                const text = await file.text();
                const json = JSON.parse(text);
                if (!json || !Array.isArray(json.games)) {
                    alert('Invalid tier-data.json format');
                    return;
                }
                // Переносим в localStorage только нужные поля
                const imported = json.games.map(g => ({
                    id: g.id || Date.now() + Math.floor(Math.random()*1000),
                    title: g.title || 'Untitled',
                    tier: TIERS.includes(g.tier) ? g.tier : 'S',
                    image: g.image
                }));
                saveGames(imported);
                renderGamesList();
                alert('Import completed');
            } catch (err) {
                alert('Failed to import JSON');
            } finally {
                e.target.value = '';
            }
        });
    }
});

// ==== Экспорт данных в ZIP (tier-data.json + images/) ====
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

async function exportTierPackZip() {
    if (typeof JSZip === 'undefined') {
        alert('Export library not loaded');
        return;
    }
    const games = loadGames();
    if (!games.length) {
        alert('No games to export');
        return;
    }
    const zip = new JSZip();
    const imagesFolder = zip.folder('images');
    const exportGames = [];
    for (const game of games) {
        const imageBlob = dataURLToBlob(game.image);
        const fileName = `${game.id}.webp`;
        imagesFolder.file(fileName, imageBlob);
        exportGames.push({ id: game.id, title: game.title, tier: game.tier, image: `images/${fileName}` });
    }
    const meta = { generatedAt: new Date().toISOString(), total: games.length, tiers: TIERS };
    zip.file('tier-data.json', JSON.stringify({ meta, games: exportGames }, null, 2));
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tier-pack.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Глобально для вызова из кнопки админки
window.exportTierPackZip = exportTierPackZip;

