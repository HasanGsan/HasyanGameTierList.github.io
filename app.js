const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];

// Известный адрес сайта - подстраховка на случай, если страница открыта
// в контексте, где относительные пути не разрешаются (fetch падает с
// "Failed to parse URL from ...").
const REPO_FALLBACK_BASE = 'https://hasangsan.github.io/HasyanGameTierList.github.io/';

function resolveRepoUrl(fileName) {
    try {
        const resolved = new URL(fileName, document.baseURI);
        if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
            return resolved.href;
        }
    } catch (e) {}
    return REPO_FALLBACK_BASE + fileName;
}

async function loadGames() {
    try {
        const resp = await fetch(resolveRepoUrl('tier-data.json'), { cache: 'no-store' });
        if (resp.ok) {
            const json = await resp.json();
            if (json && Array.isArray(json.games)) {
                return { games: json.games, meta: json.meta || null };
            }
        }
    } catch (e) {}
    const data = localStorage.getItem('tierListData');
    if (data) {
        return { games: JSON.parse(data), meta: null };
    }
    return { games: [], meta: null };
}

function groupGamesByTier(games) {
    const grouped = {};
    TIERS.forEach(tier => {
        grouped[tier] = games.filter(game => game.tier === tier);
    });
    return grouped;
}

async function renderTierList() {
    const { games, meta } = await loadGames();
    const grouped = groupGamesByTier(games);
    const tierListContainer = document.getElementById('tierList');
    
    tierListContainer.innerHTML = '';
    
    const tierRows = [];
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
        tierRows.push(tierRow);
    });

    // Animate rows in sequence
    tierRows.forEach((row, index) => {
        setTimeout(() => {
            row.classList.add('fade-in');
        }, index * 200);
    });
    
    updateStats(games, meta);
}

function updateStats(games, meta) {
    document.getElementById('totalGames').textContent = games.length;
    if (meta && meta.generatedAt) {
        document.getElementById('lastUpdate').textContent = formatDate(new Date(meta.generatedAt));
        return;
    }
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

function startHackingSequence() {
    const overlay = document.createElement('div');
    overlay.className = 'hacking-overlay';
    overlay.innerHTML = `
        <div class="hacking-terminal">
            <div class="hacking-content" id="hackingContent"></div>
            <div class="hack-progress"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';

    const content = document.getElementById('hackingContent');
    const hackLines = [
        {text: "> INITIATING BIOS HACK SEQUENCE...", delay: 50, type: 'command'},
        {text: "[SYSTEM]: Mounting virtual partitions...", delay: 100, type: 'output'},
        {text: "> sudo rm -rf / --no-preserve-root", delay: 75, type: 'command'},
        {text: "[ERROR]: Permission denied. Escalating privileges...", delay: 125, type: 'output'},
        {text: "> exploit CVE-2024-1337 --target=hasyan_archives", delay: 100, type: 'command'},
        {text: "[SUCCESS]: Vulnerability exploited. Bypassing security...", delay: 150, type: 'output'},
        {text: "> inject payload --type=mem_exec --offset=0x7FF", delay: 87, type: 'command'},
        {text: "[SYSTEM]: Memory injection successful. Overwriting kernel...", delay: 137, type: 'output'},
        {text: "> decrypt --algo=aes256 --key=0x4E336E --target=/sys/tier_data", delay: 112, type: 'command'},
        {text: "[SUCCESS]: Data decrypted. Loading archives...", delay: 175, type: 'output'},
        {text: "ACCESS GRANTED. WELCOME TO HASYAN ARCHIVES.", delay: 200, type: 'success'}
    ];

    let totalDelay = 0;
    
    hackLines.forEach((line, index) => {
        setTimeout(() => {
            const lineEl = document.createElement('div');
            lineEl.className = `hack-line ${line.type === 'command' ? 'hack-command' : 
                               line.type === 'success' ? 'hack-success' : 'hack-output'}`;
            lineEl.textContent = line.text;
            content.appendChild(lineEl);
            content.scrollTop = content.scrollHeight;

            if (index === hackLines.length - 1) {
                setTimeout(() => {
                    const logo = document.createElement('div');
                    logo.className = 'hack-logo';
                    logo.innerHTML = '⚡ H4SY4N ⚡';
                    content.appendChild(logo);

                    setTimeout(() => {
                        overlay.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(overlay);
                            renderTierList();
                        }, 300);
                    }, 500);
                }, 100);
            }
        }, totalDelay);
        totalDelay += line.delay;
    });

}

document.addEventListener('DOMContentLoaded', async () => {
    await startHackingSequence();
    
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
    const desc = document.getElementById('viewDescription');
    const modalWindow = overlay.querySelector('.modal-window');
    title.innerHTML = `${game.title} - <span class="tier-modal tier-${game.tier}">TIER ${game.tier}</span>`;
    img.src = game.image;
    img.alt = game.title;
    desc.textContent = game.description && game.description.length ? game.description : '[NO DESCRIPTION]';
    const tierVar = `var(--tier-${game.tier.toLowerCase()})`;
    modalWindow.style.borderColor = tierVar;
    modalWindow.style.boxShadow = `0 0 50px ${tierVar}, inset 0 0 30px rgba(0, 255, 65, 0.05)`;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const closeBtn = document.getElementById('viewCloseBtn');
    const close = () => {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    };
    closeBtn.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}