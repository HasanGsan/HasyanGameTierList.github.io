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
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        
        // Принудительно делаем выделение квадратным - чтобы все
        // картинки потом ложились в квадратную рамку без обрезки/пустот
        const dx = curX - cropStartX;
        const dy = curY - cropStartY;
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        cropEndX = Math.max(0, Math.min(canvas.width, cropStartX + Math.sign(dx || 1) * side));
        cropEndY = Math.max(0, Math.min(canvas.height, cropStartY + Math.sign(dy || 1) * side));
        
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
    
    // Если не выделено - берём центральный квадрат картинки
    if (cropStartX === 0 && cropEndX === 0) {
        const side = Math.min(canvas.width, canvas.height);
        cropStartX = (canvas.width - side) / 2;
        cropStartY = (canvas.height - side) / 2;
        cropEndX = cropStartX + side;
        cropEndY = cropStartY + side;
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
    const descriptionInput = document.getElementById('gameDescription');
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    
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
        image: croppedImageData,
        description: description
    };
    
    games.push(newGame);
    saveGames(games);
    
    // Очищаем форму
    document.getElementById('gameTitle').value = '';
    document.getElementById('gameTier').value = 'S';
    if (descriptionInput) descriptionInput.value = '';
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

// Переместить игру на позицию перед targetId (сохраняет порядок внутри тира,
// а если targetId в другом тире - переносит и туда тоже)
function moveGame(draggedId, targetId) {
    if (draggedId === targetId) return;
    const games = loadGames();
    const fromIdx = games.findIndex(g => g.id === draggedId);
    if (fromIdx === -1) return;
    const [dragged] = games.splice(fromIdx, 1);
    let toIdx = games.findIndex(g => g.id === targetId);
    if (toIdx === -1) toIdx = games.length;
    if (games[toIdx]) dragged.tier = games[toIdx].tier;
    games.splice(toIdx, 0, dragged);
    saveGames(games);
    renderGamesList();
}

// Отобразить список игр
// Порядок в этом списке = порядок в массиве games = порядок на сайте.
// Игры группируются по тиру, но НЕ сортируются по алфавиту, чтобы
// перетаскивание карточек здесь напрямую управляло порядком на сайте.
function renderGamesList() {
    const games = loadGames();
    const gamesListContainer = document.getElementById('gamesList');

    if (games.length === 0) {
        gamesListContainer.innerHTML = '<div class="empty-tier">NO GAMES IN DATABASE</div>';
        return;
    }

    gamesListContainer.innerHTML = '';

    TIERS.forEach(tier => {
        const tierGames = games.filter(g => g.tier === tier);

        const header = document.createElement('div');
        header.style.cssText = 'margin: 16px 0 6px; font-weight: bold; opacity: 0.8; letter-spacing: 1px;';
        header.textContent = `— TIER ${tier} (${tierGames.length}) —`;
        gamesListContainer.appendChild(header);

        if (tierGames.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-tier';
            empty.style.padding = '8px';
            empty.textContent = '[перетащи карточку сюда]';
            // пустой тир как цель для дропа - добавит игру в конец этого тира
            empty.addEventListener('dragover', (e) => e.preventDefault());
            empty.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = Number(e.dataTransfer.getData('text/plain'));
                if (!Number.isNaN(draggedId)) changeTier(draggedId, tier);
            });
            gamesListContainer.appendChild(empty);
            return;
        }

        tierGames.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = 'game-item';
            gameItem.draggable = true;

            gameItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', String(game.id));
            });
            gameItem.addEventListener('dragover', (e) => e.preventDefault());
            gameItem.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const draggedId = Number(e.dataTransfer.getData('text/plain'));
                if (!Number.isNaN(draggedId)) moveGame(draggedId, game.id);
            });

            gameItem.innerHTML = `
                <div class="game-item-image">
                    <img src="${game.image}" alt="${game.title}" style="width:100%; height:100%; object-fit:cover; background:#000;">
                </div>
                <div class="game-item-info">
                    <div class="game-item-title">${game.title}</div>
                    <div class="game-item-tier">Tier: ${game.tier}</div>
                </div>
                <div class="game-item-actions">
                    <select class="terminal-select" style="width: 100px;" onchange="changeTier(${game.id}, this.value)">
                        ${TIERS.map(t => `<option value="${t}" ${game.tier === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                    <button class="btn btn-secondary" onclick="editDescription(${game.id})">EDIT DESC</button>
                    <button class="btn btn-danger" onclick="deleteGame(${game.id})">DELETE</button>
                </div>
            `;

            gamesListContainer.appendChild(gameItem);
        });
    });
}

// Если в браузере ещё нет локальных данных - подтягиваем актуальный
// tier-data.json из репозитория, чтобы редактор не открывался пустым
// (или со старыми данными) на новом устройстве/браузере.
async function autoLoadFromRepoIfEmpty() {
    if (localStorage.getItem('tierListData')) return;
    try {
        const resp = await fetch('tier-data.json', { cache: 'no-store' });
        if (!resp.ok) return;
        const json = await resp.json();
        if (json && Array.isArray(json.games)) {
            saveGames(json.games);
        }
    } catch (e) {}
}

// Принудительное обновление из репозитория (перетирает несохранённые
// локальные правки - поэтому со спросом подтверждения)
async function refreshFromRepo() {
    if (!confirm('Это заменит текущие локальные данные в редакторе данными из tier-data.json репозитория. Несохранённые правки потеряются. Продолжить?')) {
        return;
    }
    try {
        const resp = await fetch('tier-data.json', { cache: 'no-store' });
        if (!resp.ok) throw new Error('Не удалось загрузить tier-data.json');
        const json = await resp.json();
        if (!json || !Array.isArray(json.games)) throw new Error('Некорректный формат файла');
        saveGames(json.games);
        renderGamesList();
        alert('Обновлено из репозитория');
    } catch (err) {
        alert('Ошибка обновления: ' + err.message);
    }
}
window.refreshFromRepo = refreshFromRepo;

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await autoLoadFromRepoIfEmpty();
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

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn-secondary';
        refreshBtn.id = 'refreshRepoBtn';
        refreshBtn.style.marginLeft = '10px';
        refreshBtn.textContent = '🔄 ОБНОВИТЬ ИЗ РЕПОЗИТОРИЯ';
        refreshBtn.addEventListener('click', refreshFromRepo);
        footer.appendChild(refreshBtn);

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
                    image: g.image,
                    description: typeof g.description === 'string' ? g.description : ''
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
    // Панель синхронизации с GitHub - коммитит tier-data.json и новые
    // картинки напрямую в репозиторий, без скачивания файлов вручную
    if (footer && !document.getElementById('githubSyncPanel')) {
        const panel = document.createElement('div');
        panel.id = 'githubSyncPanel';
        panel.style.cssText = 'margin-top: 20px; padding: 15px; border: 1px solid var(--border-color);';
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">GITHUB SYNC</div>
            <div class="form-group">
                <label>OWNER:</label>
                <input type="text" id="ghOwner" class="terminal-input" value="hasangsan" placeholder="hasangsan">
            </div>
            <div class="form-group">
                <label>REPO:</label>
                <input type="text" id="ghRepo" class="terminal-input" value="HasyanGameTierList.github.io" placeholder="HasyanGameTierList.github.io">
            </div>
            <div class="form-group">
                <label>BRANCH:</label>
                <input type="text" id="ghBranch" class="terminal-input" value="main" placeholder="main">
            </div>
            <div class="form-group">
                <label>TOKEN (fine-grained PAT, доступ только к этому репо, Contents: Read and write):</label>
                <input type="password" id="ghToken" class="terminal-input" placeholder="github_pat_...">
            </div>
            <label style="font-size: 0.8rem; display: flex; gap: 6px; align-items: center; margin-bottom: 10px;">
                <input type="checkbox" id="ghRemember"> запомнить токен на время вкладки (sessionStorage)
            </label>
            <button class="btn btn-primary" id="ghSyncBtn">⬆ SAVE TO GITHUB</button>
            <div id="ghLog" style="margin-top: 10px; font-size: 0.8rem; white-space: pre-wrap;"></div>
        `;
        footer.appendChild(panel);

        const cfg = JSON.parse(localStorage.getItem('githubSyncConfig') || '{}');
        if (cfg.owner) document.getElementById('ghOwner').value = cfg.owner;
        if (cfg.repo) document.getElementById('ghRepo').value = cfg.repo;
        if (cfg.branch) document.getElementById('ghBranch').value = cfg.branch;
        const savedToken = sessionStorage.getItem('ghToken');
        if (savedToken) {
            document.getElementById('ghToken').value = savedToken;
            document.getElementById('ghRemember').checked = true;
        }

        document.getElementById('ghSyncBtn').addEventListener('click', syncToGithub);
    }

    try {
        const tierEl = document.getElementById('gameTier');
        if (tierEl && !document.getElementById('gameDescription')) {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label>DESCRIPTION:</label>
                <textarea id="gameDescription" class="terminal-input" rows="3" placeholder="Enter game description..."></textarea>
            `;
            const parent = tierEl.parentElement;
            if (parent && parent.parentElement) {
                parent.parentElement.insertBefore(group, parent.nextSibling);
            }
        }
    } catch {}
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
        exportGames.push({ id: game.id, title: game.title, tier: game.tier, image: `images/${fileName}`, description: game.description || '' });
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

function ensureDescModal() {
    if (document.getElementById('descModal')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'descModal';
    overlay.innerHTML = `
        <div class="modal-window">
            <div class="modal-title">EDIT DESCRIPTION</div>
            <div class="form-group" style="margin-top:10px;">
                <textarea id="descModalTextarea" class="terminal-input" rows="6" placeholder="Type description..."></textarea>
            </div>
            <div class="modal-actions">
                <button id="descCancelBtn" class="btn btn-secondary">CANCEL</button>
                <button id="descSaveBtn" class="btn btn-primary">SAVE</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function editDescription(id) {
    ensureDescModal();
    const games = loadGames();
    const game = games.find(g => g.id === id);
    if (!game) return;
    const overlay = document.getElementById('descModal');
    const textarea = document.getElementById('descModalTextarea');
    textarea.value = game.description || '';
    overlay.style.display = 'flex';
    const cancelBtn = document.getElementById('descCancelBtn');
    const saveBtn = document.getElementById('descSaveBtn');
    const close = () => { overlay.style.display = 'none'; };
    cancelBtn.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    saveBtn.onclick = () => {
        game.description = textarea.value.trim();
        saveGames(games);
        renderGamesList();
        close();
    };
}

window.editDescription = editDescription;

// ==== Синхронизация с GitHub через Git Data API ====
// Собирает новые/изменённые картинки + tier-data.json в один атомарный коммит,
// вместо ручного скачивания zip и коммита через веб-интерфейс/git.

function ghLog(msg) {
    const el = document.getElementById('ghLog');
    if (el) el.textContent += msg + '\n';
}

async function ghApi(url, token, opts = {}) {
    const resp = await fetch(`https://api.github.com${url}`, {
        ...opts,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            ...(opts.headers || {})
        }
    });
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`${resp.status} ${resp.statusText}: ${errText}`);
    }
    return resp.json();
}

async function syncToGithub() {
    const owner = document.getElementById('ghOwner').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const branch = document.getElementById('ghBranch').value.trim() || 'main';
    const token = document.getElementById('ghToken').value.trim();
    const remember = document.getElementById('ghRemember').checked;
    const logEl = document.getElementById('ghLog');
    const btn = document.getElementById('ghSyncBtn');
    logEl.textContent = '';

    if (!owner || !repo || !token) {
        ghLog('ERROR: заполни owner, repo и token');
        return;
    }

    localStorage.setItem('githubSyncConfig', JSON.stringify({ owner, repo, branch }));
    if (remember) sessionStorage.setItem('ghToken', token);
    else sessionStorage.removeItem('ghToken');

    btn.disabled = true;
    try {
        const games = loadGames();
        if (!games.length) throw new Error('Нет игр для синхронизации');

        ghLog('Получаю последний коммит...');
        const refData = await ghApi(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token);
        const latestCommitSha = refData.object.sha;
        const commitData = await ghApi(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, token);
        const baseTreeSha = commitData.tree.sha;

        const treeEntries = [];
        const exportGames = [];

        for (const game of games) {
            let imagePath = game.image;
            // Новые/изменённые картинки хранятся как base64 dataURL - их надо
            // загрузить как blob. Старые уже ссылаются на images/xxx.webp.
            if (typeof game.image === 'string' && game.image.startsWith('data:')) {
                imagePath = `images/${game.id}.webp`;
                const base64Content = game.image.split(',')[1];
                ghLog(`Загружаю картинку: ${game.title}`);
                const blob = await ghApi(`/repos/${owner}/${repo}/git/blobs`, token, {
                    method: 'POST',
                    body: JSON.stringify({ content: base64Content, encoding: 'base64' })
                });
                treeEntries.push({ path: imagePath, mode: '100644', type: 'blob', sha: blob.sha });
                game.image = imagePath;
            }
            exportGames.push({
                id: game.id,
                title: game.title,
                tier: game.tier,
                image: imagePath,
                description: game.description || ''
            });
        }

        saveGames(games);

        const meta = { generatedAt: new Date().toISOString(), total: exportGames.length, tiers: TIERS };
        const dataJson = JSON.stringify({ meta, games: exportGames }, null, 2);
        treeEntries.push({ path: 'tier-data.json', mode: '100644', type: 'blob', content: dataJson });

        ghLog('Собираю дерево файлов...');
        const tree = await ghApi(`/repos/${owner}/${repo}/git/trees`, token, {
            method: 'POST',
            body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries })
        });

        ghLog('Создаю коммит...');
        const commit = await ghApi(`/repos/${owner}/${repo}/git/commits`, token, {
            method: 'POST',
            body: JSON.stringify({
                message: `Обновление тир-листа (${new Date().toLocaleString('ru-RU')})`,
                tree: tree.sha,
                parents: [latestCommitSha]
            })
        });

        ghLog('Обновляю ветку...');
        await ghApi(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
            method: 'PATCH',
            body: JSON.stringify({ sha: commit.sha })
        });

        ghLog(`ГОТОВО: https://github.com/${owner}/${repo}/commit/${commit.sha}`);
        renderGamesList();
    } catch (err) {
        ghLog(`ERROR: ${err.message}`);
    } finally {
        btn.disabled = false;
    }
}

window.syncToGithub = syncToGithub;

