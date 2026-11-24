// State Management
const state = {
    gamePath: null,         // Đường dẫn thư mục game
    engineType: null,       // 'MV' or 'MZ'
    gameTitle: '',
    isHacked: false,
    gameInfo: {}
};

// DOM References
let btnSelectFolder, btnHack, btnUnhack, btnPlay, btnClearRecents, browserWarning;
let emptyGameState, stepInfo, stepAction;
let elGameTitle, elGamePathDisplay, infoEngine, infoMaps, infoItems, infoWeapons, infoArmors, infoStatus;
let actionFeedback, actionFeedbackText;

document.addEventListener('DOMContentLoaded', () => {
    btnSelectFolder = document.getElementById('btn-select-folder');
    btnHack = document.getElementById('btn-hack');
    btnUnhack = document.getElementById('btn-unhack');
    btnPlay = document.getElementById('btn-play');
    btnClearRecents = document.getElementById('btn-clear-recents');
    browserWarning = document.getElementById('browser-warning');

    emptyGameState = document.getElementById('empty-game-state');
    stepInfo = document.getElementById('step-info');
    stepAction = document.getElementById('step-action');

    elGameTitle = document.getElementById('game-title');
    elGamePathDisplay = document.getElementById('game-path-display');
    infoEngine = document.getElementById('info-engine');
    infoMaps = document.getElementById('info-maps');
    infoItems = document.getElementById('info-items');
    infoWeapons = document.getElementById('info-weapons');
    infoArmors = document.getElementById('info-armors');
    infoStatus = document.getElementById('info-status');

    actionFeedback = document.getElementById('action-feedback');
    actionFeedbackText = document.getElementById('action-feedback-text');

    // Kiểm tra Electron API
    if (typeof window.electronAPI === 'undefined') {
        browserWarning.classList.remove('hidden');
        btnSelectFolder.disabled = true;
    }

    // Load recent folders
    renderRecentFolders();

    // Event Listeners
    btnSelectFolder.addEventListener('click', selectGameFolder);
    btnHack.addEventListener('click', hackGame);
    btnUnhack.addEventListener('click', unhackGame);

    if (btnClearRecents) {
        btnClearRecents.addEventListener('click', clearAllRecentFolders);
    }

    if (btnPlay) {
        btnPlay.addEventListener('click', async () => {
            if (!state.gamePath) return;
            setStatus('Đang mở game...', 'working');
            try {
                await window.electronAPI.launchGame(state.gamePath);
                setStatus('Đã mở game!', 'success');
            } catch (err) {
                setStatus('Lỗi mở game: ' + err.message, 'error');
            }
        });
    }
});

// Tách tên thư mục cuối cùng từ đường dẫn
function getFolderName(folderPath) {
    const normalized = folderPath.replace(/[\\/]+$/, '');
    const parts = normalized.split(/[\\/]/);
    return parts[parts.length - 1] || folderPath;
}

// Tạo icon thư mục dạng SVG thuần DOM
function createFolderSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z');
    svg.appendChild(path);
    return svg;
}

// Hiển thị danh sách game gần đây
function renderRecentFolders() {
    const container = document.getElementById('recent-folders-container');
    const list = document.getElementById('recent-folders-list');
    const recents = JSON.parse(localStorage.getItem('rpgm-recent-folders')) || [];

    if (recents.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = '';

    recents.forEach(path => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        if (state.gamePath === path) {
            item.classList.add('active');
        }

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'recent-select-btn';
        selectBtn.title = path;

        const iconWrap = document.createElement('span');
        iconWrap.className = 'recent-folder-icon';
        iconWrap.setAttribute('aria-hidden', 'true');
        iconWrap.appendChild(createFolderSvg());

        const meta = document.createElement('span');
        meta.className = 'recent-meta';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'recent-folder-name';
        nameSpan.textContent = getFolderName(path);

        const pathSpan = document.createElement('span');
        pathSpan.className = 'recent-folder-path';
        pathSpan.textContent = path;

        meta.appendChild(nameSpan);
        meta.appendChild(pathSpan);

        selectBtn.appendChild(iconWrap);
        selectBtn.appendChild(meta);
        selectBtn.addEventListener('click', () => processGameFolder(path));

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'recent-remove-btn';
        removeBtn.title = 'Xóa khỏi danh sách gần đây';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeRecentFolder(path);
        });

        item.appendChild(selectBtn);
        item.appendChild(removeBtn);
        list.appendChild(item);
    });
}

function saveRecentFolder(path) {
    let recents = JSON.parse(localStorage.getItem('rpgm-recent-folders')) || [];
    recents = recents.filter(p => p !== path);
    recents.unshift(path);
    if (recents.length > 6) recents.pop();
    localStorage.setItem('rpgm-recent-folders', JSON.stringify(recents));
    renderRecentFolders();
}

function removeRecentFolder(path) {
    let recents = JSON.parse(localStorage.getItem('rpgm-recent-folders')) || [];
    recents = recents.filter(p => p !== path);
    localStorage.setItem('rpgm-recent-folders', JSON.stringify(recents));
    renderRecentFolders();
}

function clearAllRecentFolders() {
    localStorage.removeItem('rpgm-recent-folders');
    renderRecentFolders();
}

// Xử lý chọn thư mục game
async function selectGameFolder() {
    try {
        const folderPath = await window.electronAPI.selectFolder();
        if (!folderPath) return;
        await processGameFolder(folderPath);
    } catch (err) {
        setStatus('Lỗi: ' + err.message, 'error');
        console.error(err);
    }
}

async function processGameFolder(folderPath) {
    try {
        state.gamePath = folderPath;
        setStatus('Đang phân tích game...', 'working');

        state.engineType = await window.electronAPI.detectEngine(folderPath);
        saveRecentFolder(folderPath);

        const info = await window.electronAPI.loadGameInfo(folderPath);
        state.gameTitle = info.title;
        state.gameInfo = info;

        state.isHacked = await window.electronAPI.checkHacked(folderPath);

        showGameInfo();
        renderRecentFolders();
    } catch (err) {
        setStatus('Lỗi: ' + err.message, 'error');
        console.error(err);
    }
}

// Hiển thị thông tin game lên UI
function showGameInfo() {
    emptyGameState.classList.add('hidden');
    stepInfo.classList.remove('hidden');
    stepAction.classList.remove('hidden');

    elGameTitle.textContent = state.gameTitle;
    elGamePathDisplay.textContent = state.gamePath;
    elGamePathDisplay.title = state.gamePath;

    infoEngine.textContent = 'RPG Maker ' + state.engineType;
    infoMaps.textContent = state.gameInfo.maps || '0';
    infoItems.textContent = state.gameInfo.items || '0';
    infoWeapons.textContent = state.gameInfo.weapons || '0';
    infoArmors.textContent = state.gameInfo.armors || '0';

    updateActionButtons();
    updateStatusBadge();

    if (state.isHacked) {
        setStatus('Game đã được hack — sẵn sàng mở chơi.', 'success');
    } else {
        setStatus('Đã tải thông tin game — sẵn sàng hack!', 'success');
    }
}

function updateStatusBadge() {
    if (state.isHacked) {
        infoStatus.textContent = 'Hacked';
        infoStatus.classList.add('is-hacked');
    } else {
        infoStatus.textContent = 'Clean';
        infoStatus.classList.remove('is-hacked');
    }
}

function updateActionButtons() {
    btnHack.disabled = state.isHacked;
    btnUnhack.disabled = !state.isHacked;
}

// Inject cheat vào game
async function hackGame() {
    try {
        setStatus('Đang hack game...', 'working');

        await window.electronAPI.hackGame(state.gamePath);

        state.isHacked = true;
        updateActionButtons();
        updateStatusBadge();
        setStatus('Hack thành công! Mở lại game (hoặc ấn F5) và nhấn F để mở panel.', 'success');
    } catch (err) {
        setStatus('Lỗi: ' + err.message, 'error');
        console.error(err);
    }
}

// Gỡ cheat khỏi game
async function unhackGame() {
    try {
        setStatus('Đang gỡ hack...', 'working');

        await window.electronAPI.unhackGame(state.gamePath);

        state.isHacked = false;
        updateActionButtons();
        updateStatusBadge();
        setStatus('Đã gỡ hack! Game trở về trạng thái gốc.', 'success');
    } catch (err) {
        setStatus('Lỗi: ' + err.message, 'error');
        console.error(err);
    }
}

// Cập nhật thanh trạng thái trên Top Bar và Action Feedback
function setStatus(message, type) {
    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');

    statusText.textContent = message;
    statusBar.className = 'status-pill';
    if (type) {
        statusBar.classList.add('status-' + type);
    }

    if (actionFeedback && actionFeedbackText && !stepAction.classList.contains('hidden')) {
        actionFeedbackText.textContent = message;
        actionFeedback.className = 'action-feedback';
        if (type) {
            actionFeedback.classList.add('is-' + type);
        }
    }
}
