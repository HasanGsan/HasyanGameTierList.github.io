const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];

async function loadGames() {
    try {
        const resp = await fetch('tier-data.json', { cache: 'no-store' });
        if (resp.ok) {
            const json = await resp.json();
            if (json && Array.isArray(json.games)) {
                return json.games;
            }
        }
    } catch (e) {
        // игнорируем и падаем на localStorage
    }
    const data = localStorage.getItem('tierListData');
    if (data) {
        return JSON.parse(data);
    }
    return [];
}

function groupGamesByTier(games) {
    const grouped = {};
    TIERS.forEach(tier => {
        grouped[tier] = games.filter(game => game.tier === tier);
    });
    return grouped;
}

async function renderTierList() {
    const games = await loadGames();
    const grouped = groupGamesByTier(games);
    const tierListContainer = document.getElementById('tierList');
    
    tierListContainer.innerHTML = '';
    
    TIERS.forEach(tier => {
        const tierRow = document.createElement('div');
        tierRow.className = 'tier-row';
        tierRow.style.animationDelay = `${TIERS.indexOf(tier) * 0.1}s`;
        
        const tierLabel = document.createElement('div');
        tierLabel.className = `tier-label tier-${tier}`;
        tierLabel.textContent = tier;
        
        const tierContent = document.createElement('div');
        tierContent.className = 'tier-content';
        
        const tierGames = grouped[tier];
        
        if (tierGames.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-tier';
            emptyMessage.textContent = '[NO DATA IN THIS TIER]';
            tierContent.appendChild(emptyMessage);
        } else {
            tierGames.forEach((game, index) => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';
                gameCard.style.animationDelay = `${(TIERS.indexOf(tier) * 0.1) + (index * 0.05)}s`;
                
                const img = document.createElement('img');
                img.src = game.image;
                img.alt = game.title;
                
                const title = document.createElement('div');
                title.className = 'game-title';
                title.textContent = game.title;
                
                gameCard.appendChild(img);
                gameCard.appendChild(title);
                gameCard.addEventListener('click', () => showGameDescription(game));
                tierContent.appendChild(gameCard);
            });
        }
        
        tierRow.appendChild(tierLabel);
        tierRow.appendChild(tierContent);
        tierListContainer.appendChild(tierRow);
    });
    
    updateStats(games);
}

function updateStats(games) {
    document.getElementById('totalGames').textContent = games.length;
    
    const lastUpdateData = localStorage.getItem('lastUpdate');
    if (lastUpdateData) {
        const date = new Date(lastUpdateData);
        document.getElementById('lastUpdate').textContent = formatDate(date);
    } else {
        document.getElementById('lastUpdate').textContent = 'NEVER';
    }
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    await renderTierList();
    
    // Эффект печатающегося текста для промпта
    const prompt = document.querySelector('.command-prompt');
    const originalText = prompt.textContent;
    prompt.textContent = '';
    
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < originalText.length) {
            prompt.textContent += originalText.charAt(i);
            i++;
        } else {
            clearInterval(typeInterval);
        }
    }, 30);
});

function ensureViewModal() {
    if (document.getElementById('viewModal')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'viewModal';
    overlay.innerHTML = `
        <div class="modal-window">
            <div class="modal-header">
                <div class="modal-title" id="viewTitle"></div>
                <button class="btn btn-secondary" id="viewCloseBtn">CLOSE</button>
            </div>
            <div class="modal-body">
                <div class="view-image" id="viewImageWrap"><img id="viewImage" alt=""></div>
                <div class="view-tier" id="viewTier"></div>
                <div class="view-description" id="viewDescription"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function showGameDescription(game) {
    ensureViewModal();
    const overlay = document.getElementById('viewModal');
    const title = document.getElementById('viewTitle');
    const img = document.getElementById('viewImage');
    const tier = document.getElementById('viewTier');
    const desc = document.getElementById('viewDescription');
    title.textContent = game.title;
    img.src = game.image;
    img.alt = game.title;
    tier.textContent = `TIER: ${game.tier}`;
    desc.textContent = game.description && game.description.length ? game.description : '[NO DESCRIPTION]';
    overlay.style.display = 'flex';
    const closeBtn = document.getElementById('viewCloseBtn');
    const close = () => { overlay.style.display = 'none'; };
    closeBtn.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

